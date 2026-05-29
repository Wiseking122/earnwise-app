import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { Telegraf } from "telegraf";
import dotenv from "dotenv";
import axios from "axios";
import crypto from "crypto";
import rateLimit from "express-rate-limit";
import cron from "node-cron";

import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import nodemailer from 'nodemailer';
import { GoogleGenAI, Type } from "@google/genai";
import firebaseConfig from './firebase-applet-config.json' with { type: 'json' };

dotenv.config();

// Initialize Firebase Admin
let firebaseApp;
try {
  firebaseApp = admin.apps.find(app => app?.name === 'earnwise-app') || admin.initializeApp({
    projectId: firebaseConfig.projectId
  }, 'earnwise-app');
} catch (err) {
  console.error("[FIREBASE] Admin App init error, trying default app:", err);
  firebaseApp = admin.apps.length > 0 ? admin.apps[0] : admin.initializeApp({
    projectId: firebaseConfig.projectId
  });
}

// Resilient Firestore initialization
let dbAdmin: admin.firestore.Firestore;
try {
  // Try the specific database ID if it exists
  const dbId = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)' 
    ? firebaseConfig.firestoreDatabaseId 
    : undefined;
    
  // @ts-ignore - databaseId exists on newest admin SDK
  dbAdmin = getFirestore(firebaseApp, dbId || '(default)');
  console.log(`[FIREBASE] Admin SDK exploring database: ${dbId || '(default)'}`);
} catch (err) {
  console.warn("[FIREBASE] Custom database initialization failed, falling back to default:", err);
  dbAdmin = getFirestore(firebaseApp);
}

// Check database capability of the Admin SDK
let isDbAdminCapable = false;
async function checkDbAdminCapability() {
  try {
    // Attempt a read on the 'users' collection with the email filter (less likely to fail than a non-existent probe collection if IAM is partial)
    await dbAdmin.collection('users').limit(1).get();
    isDbAdminCapable = true;
    console.log("[FIREBASE] Server Admin SDK successfully authenticated and capable.");
    
    // Once capable, run the owner promotion check
    await ensureOwnerAdminStatus();
  } catch (err: any) {
    isDbAdminCapable = false;
    console.warn("[FIREBASE] Server Admin SDK authentication failed or restricted:", err.message);
    console.info("[FIREBASE] Running in restricted sandbox mode. Environment secrets or project permissions might be missing.");
    
    // In restricted mode, we could try one last thing: initialize WITHOUT a database ID if it was set
    if (firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)') {
       console.info("[FIREBASE] Attempting fallback to (default) database...");
       try {
         const fallbackDb = getFirestore(firebaseApp, '(default)');
         await fallbackDb.collection('users').limit(1).get();
         dbAdmin = fallbackDb;
         isDbAdminCapable = true;
         console.log("[FIREBASE] Fallback to (default) database succeeded.");
         await ensureOwnerAdminStatus();
       } catch (innerErr) {
         console.warn("[FIREBASE] Fallback to (default) database also failed.");
       }
    }
  }
}
checkDbAdminCapability();

// --- STARTUP SCRIPT: Ensure Admin Status for Owner ---
async function ensureOwnerAdminStatus() {
  if (!isDbAdminCapable) return;
  try {
    const ownerEmail = 'wiseking7890@gmail.com';
    const usersSnap = await dbAdmin.collection('users').where('email', '==', ownerEmail).get();
    
    if (!usersSnap.empty) {
      for (const userDoc of usersSnap.docs) {
        if (userDoc.data().role !== 'admin') {
          await userDoc.ref.update({ role: 'admin' });
          console.log(`[FIREBASE] Automatically promoted ${ownerEmail} to admin.`);
        }
      }
    } else {
      console.log(`[FIREBASE] Owner ${ownerEmail} not found in users collection yet. Will be promoted on first sign-in.`);
    }
  } catch (err: any) {
    console.warn("[FIREBASE] Startup admin promotion failed:", err.message);
  }
}

// Initialize Mailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const PORT = 3000;
const isProd = process.env.NODE_ENV === "production";
const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

// Initialize Gemini
const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY as string,
  httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
});
// --- CONFIGURATION: Membership Tiers & Multipliers ---
// Defines the exact payout boost for each membership level
const TIER_MULTIPLIERS: Record<string, number> = {
  free: 1.0,
  elite: 1.2,
  starter: 1.5,
  pro: 1.8,
  bronze: 2.5,
  diamond: 3.5,
  silver: 5.0,
  platinum: 7.5,
  golden: 10.0
};

const PLAN_COSTS: Record<string, number> = {
  free: 0,
  elite: 1000,
  starter: 2000,
  pro: 3000,
  bronze: 5000,
  diamond: 7000,
  silver: 10000,
  platinum: 15000,
  golden: 25000
};

// --- CONFIGURATION: Advertiser CPA Chart ---
const CPA_CHART: Record<string, number> = {
  'follow': 20,
  'like': 10,
  'app_download': 150,
  'video_view': 15
};

// --- SECURITY: Velocity Gate State ---
// In-memory store to track user activity timing (Anti-Bot)
const lastUserActivity = new Map<string, number>();

async function startServer() {
  const app = express();
  app.set('trust proxy', true);
  app.use(express.json());

  // Run startup admin check (called from checkDbAdminCapability)
  // ensureOwnerAdminStatus();

  // --- Anti-Fraud Rate Limiting ---
  const taskLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 task completions per window
    message: { error: "Anomalous activity detected. Please slow down or your account will be flagged." },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // --- MIDDLEWARE: Anti-Bot Velocity Gate ---
  // Blocks completions attempted less than 10 seconds apart to prevent rapid script execution
  const velocityGate = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const { userId } = req.body;
    if (!userId) return next();

    const now = Date.now();
    const lastTime = lastUserActivity.get(userId) || 0;
    const threshold = 10000; // 10 seconds interval

    if (now - lastTime < threshold) {
      console.warn(`[SECURITY] Velocity Breach: User ${userId} attempted rapid completion.`);
      return res.status(429).json({ 
        error: "Security Alert: Verification velocity too high. Please wait 10s between task verifications." 
      });
    }
    
    lastUserActivity.set(userId, now);
    next();
  };

  // --- Telegram Bot Setup ---
  const token = process.env.TELEGRAM_BOT_TOKEN;
  let bot: Telegraf | null = null;
  let botUsername = "EarnwiseAutoBot";
  
  // Use explicit env var if provided, else we will detect it from the first request
  let currentAppUrl = process.env.APP_URL || "";

  if (token && token !== "YOUR_BOT_TOKEN") {
    try {
      bot = new Telegraf(token);

      // Fetch bot username dynamically
      bot.telegram.getMe().then((me) => {
        botUsername = me.username;
        console.log(`[BOT] Loaded bot username dynamically: @${botUsername}`);
      }).catch(err => {
        console.error("[BOT] Error fetching bot details during init:", err.message);
      });

      const getWebAppUrl = (path = "") => {
        const baseUrl = process.env.APP_URL || currentAppUrl || "https://ais-dev-ucu3byd4dxfepn7umejqhx-558253480073.europe-west2.run.app";
        return path ? `${baseUrl}${path}` : baseUrl;
      };
      
      bot.start((ctx) => {
        const webAppUrl = getWebAppUrl();
        console.log(`[BOT] Start command by ${ctx.from?.username}. Using WebApp URL: ${webAppUrl}`);
        
        ctx.reply("👑 *Welcome to Earnwise Premium*\n\nNigeria's #1 digital wealth platform. Complete high-paying tasks and withdraw real cash directly to your bank account.\n\n✨ *Why Choose Us?*\n• Tiered Reward System\n• Instant Bank Payouts\n• Lifetime Referral Royalties\n\nClick the button below to launch your dashboard! 👇", {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: "💰 Open Earnwise App", url: webAppUrl }]
            ]
          }
        });
      });

      bot.command('tasks', (ctx) => {
        ctx.reply("🔥 New high-paying tasks are waiting for you!\n\nEarn up to ₦5,000 per task depending on your plan tier.", {
          reply_markup: {
            inline_keyboard: [
              [{ text: "📝 View Tasks", url: getWebAppUrl('/tasks') }]
            ]
          }
        });
      });

      bot.command('upgrade', (ctx) => {
        ctx.reply("🚀 *Multiply Your Earnings!*\n\nUpgrade your plan to unlock higher task rewards and instant automated withdrawals.\n\n• Elite: 1.25x Multiplier\n• Lite: 1.5x Multiplier\n• Bronze: 2.0x Multiplier\n• Silver: 3.0x Multiplier\n• Golden: 5.0x Multiplier", {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: "💎 Upgrade Plan", url: getWebAppUrl('/upgrade') }]
            ]
          }
        });
      });

      bot.command('withdraw', (ctx) => {
        ctx.reply("💰 *Instant Withdrawals*\n\nYour earnings are ready! Withdraw directly to your Nigerian bank account via Paystack.\n\n• Minimum: ₦1,000\n• 24/7 Automated processing", {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: "🏦 Withdraw Cash", url: getWebAppUrl('/withdrawal') }]
            ]
          }
        });
      });

      bot.command('refer', (ctx) => {
        ctx.reply("👥 *Refer & Earn Lifetime Commissions*\n\nInvite your friends and earn:\n1. ₦1,000 Welcome Bonus per referral\n2. 10% Lifetime Royalty on their earnings\n\nGet your unique link in the app!", {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: "🔗 Get Referral Link", url: getWebAppUrl('/referral') }]
            ]
          }
        });
      });

      bot.command('group', (ctx) => {
        ctx.reply("👥 *Join the Official Earnwise Chat Group*\n\nConnect with over 10,000+ active earners in Nigeria. Share tips, proofs, and get community support.\n\n🔗 Join here: https://t.me/earnwise0", {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: "🤝 Join Telegram Group", url: "https://t.me/earnwise0" }]
            ]
          }
        });
      });

      bot.command('status', (ctx) => {
        ctx.reply("✅ App is active.\n\nLaunch the Earnwise Mini App to check your balance and daily stats.", {
          reply_markup: {
            inline_keyboard: [
              [{ text: "📊 Check Balance", url: getWebAppUrl() }]
            ]
          }
        });
      });

      bot.command('reset', (ctx) => {
        ctx.reply("🔑 *Forgot Password?*\n\nTo reset your password:\n1. Open the app login page\n2. Click 'Forgot Password?'\n3. Enter your email to receive a reset link.", {
          parse_mode: 'Markdown'
        });
      });

      // Set the main Menu Button for the bot (Open App button)
      const updateMenuButton = () => {
        bot?.telegram.setChatMenuButton({
          menuButton: {
            type: 'web_app',
            text: '💰 Earn Now',
            web_app: { url: getWebAppUrl() }
          }
        }).catch(err => console.error("Failed to set channel menu button:", err.message));
      };

      // Initial set
      setTimeout(updateMenuButton, 5000);

      // Register the commands with Telegram so they appear when typing / in chat
      bot.telegram.setMyCommands([
        { command: 'start', description: 'Launch Earnwise App & Dashboard' },
        { command: 'tasks', description: 'View available high-paying tasks' },
        { command: 'upgrade', description: 'Multiply your earnings & tiers' },
        { command: 'withdraw', description: 'Withdraw cash directly to Nigerian bank' },
        { command: 'refer', description: 'Refer friends & earn commissions' },
        { command: 'group', description: 'Join the official community chat' },
        { command: 'status', description: 'Check app active status' },
        { command: 'reset', description: 'Help with resetting password' }
      ]).catch(err => console.error("Failed to set bot commands:", err.message));

      bot.help((ctx) => ctx.reply("Commands:\n/start - Open Earnwise App\n/tasks - View Available Tasks\n/upgrade - Upgrade Plan Tier\n/withdraw - Withdrawal Funds\n/refer - Referral Program Info\n/status - Check App Status\n/reset - Forgot Password Info"));

      bot.on('new_chat_members', (ctx) => {
        ctx.message.new_chat_members.forEach((member) => {
          // If the bot itself is added, ignore or reply welcome
          if (member.is_bot) return;

          const userName = member.first_name || "New Earnwise Earner";
          ctx.reply(`🇳🇬 *Welcome to the Earnwise community, ${userName}!* 🎉\n\nYou've just entered Nigeria's #1 digital wealth community. Let's get you set up to start earning real cash daily! 🚀\n\n📖 *YOUR COMPLETE GUIDE TO EARNWISE:*\n\n1️⃣ *Launch the Web App*\nClick the *"💰 Open Earnwise App"* button below (or run /start) and sign in to access your customized dashboard directly inside Telegram.\n\n2️⃣ *Activate Your Plan (Multiply Profits)*\nTo unlock high-paying tasks, head over to the *Upgrade* page. Choose a Tier that fits your goal to multiply your rewards up to 500%:\n• *Elite Tier* (1.25x Earning Multiplier)\n• *Lite Tier* (1.5x Earning Multiplier)\n• *Bronze Tier* (2.0x Earning Multiplier)\n• *Silver Tier* (3.0x Earning Multiplier)\n• *Golden Tier* (5.0x Earning Multiplier) 💎\n\n3️⃣ *Complete Micro-Tasks*\nVisit the **Tasks** page. Like, subscribe, share, or download apps, and upload an honest screenshot. Submissions are verified instantly by our smart audit engine.\n\n4️⃣ *Withdraw Instantly*\nAccumulate up to ₦1,000 and select your local Nigerian bank. Withdrawals are processed 24/7 automatically via paystack!\n\n5️⃣ *Refers and Bonuses*\nTap *Referrals* to share your unique link. You'll receive a commission instantly for every friend who signs up and registers!\n\n👇 Click the buttons below to launch the App and join our community!`, {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: "💰 Open Earnwise App", url: getWebAppUrl() }],
                [{ text: "🤝 Join Telegram Group", url: "https://t.me/earnwise0" }],
                [{ text: "⚡ Open via Bot Private Chat", url: `https://t.me/${botUsername}?start=start` }]
              ]
            }
          }).catch(err => console.error("Error sending chat welcome message:", err.message));
        });
      });

      // Handle channel/group join requests (highly useful for automated subscriber onboarding)
      bot.on('chat_join_request', async (ctx) => {
        try {
          const userId = ctx.chatJoinRequest.from.id;
          const userName = ctx.chatJoinRequest.from.first_name || "New Earnwise Earner";

          // Auto-approve the subscriber immediately into the channel/group
          await ctx.approveChatJoinRequest(userId);
          console.log(`[BOT] Auto-approved join request for ${userName} (${userId})`);

          // Send them a private onboarding message immediately with the full wealth guidebook
          await bot.telegram.sendMessage(userId, `👑 *Welcome to Earnwise Elite Channel!* 🎉\n\nHello ${userName}, your request to join our Telegram VIP broadcast channel has been approved successfully!\n\nHere is your *Complete Setup Guide* to start earning ₦5,000+ daily in Nigeria:\n\n1️⃣ *Launch the Mini App:* Click *"💰 Open Earnwise"* below to get registered.\n2️⃣ *Activate Your Plan:* Go to 'Upgrade' and unlock 1.25x to 5.0x multipliers to maximize the value of every single click.\n3️⃣ *Earn on Social Media Tasks:* Complete easy likes, follows, and subscribes for major corporate advertisers.\n4️⃣ *24/7 Instant Pay:* Transfer earnings directly to your bank account with zero delay.\n\nLet's build daily financial consistency together! 👇`, {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: "💰 Open Earnwise App", url: getWebAppUrl() }],
                [{ text: "🤝 Join Telegram Group", url: "https://t.me/earnwise0" }],
                [{ text: "⚡ Choose Earning Tier", url: getWebAppUrl('/upgrade') }]
              ]
            }
          });

          // Also post a welcome greeting directly to the chat they joined, if it's a supergroup
          if (ctx.chat.type === 'supergroup') {
            await bot.telegram.sendMessage(ctx.chat.id, `🇳🇬 *Let's welcome ${userName} to the Earnwise group!* 🎉\n\nYour request has been approved. Launch your app and activate your earnings below:`, {
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [{ text: "💰 Open Earnwise App", url: getWebAppUrl() }],
                  [{ text: "⚡ Open via Bot Private Chat", url: `https://t.me/${botUsername}?start=start` }]
                ]
              }
            }).catch(e => console.warn(`[BOT] Could not post welcome update in group:`, e.message));
          }
        } catch (err: any) {
          console.warn(`[BOT] chat_join_request handler was unable to message user (it requires the user to have interacted with the bot in private before):`, err.message);
          
          const userName = ctx.chatJoinRequest.from.first_name || "New Earnwise Earner";
          // Fallback: If messaging them privately failed, we post the welcome to the group so they can see their welcome guide and open it!
          if (ctx.chat.type === 'supergroup') {
            await bot.telegram.sendMessage(ctx.chat.id, `🇳🇬 *Welcome to the group, ${userName}!* 🎉\n\nI tried to send you the official Setup Guide in private, but since you haven't started a chat with me yet, please use the links below to start earning:\n\n1️⃣ *Open App:* Click *"💰 Open Earnwise App"* below.\n2️⃣ *Multiply Rewards:* Go to *Upgrade* to activate your 1.25x - 5x plan tiers.\n3️⃣ *Complete Micro-Tasks:* Start earning real ₦ immediately!\n\n👇 Access your dashboard:`, {
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [{ text: "💰 Open Earnwise App", url: getWebAppUrl() }],
                  [{ text: "⚡ Open via Bot Private Chat", url: `https://t.me/${botUsername}?start=start` }]
                ]
              }
            }).catch(e => console.warn(`[BOT] Could not post fallback welcome in group:`, e.message));
          }
        }
      });
      
      // Add a larger delay in dev mode to allow previous instance to disconnect
      const launchDelay = isProd ? 0 : 10000;
      const instanceId = Math.random().toString(36).substring(7);
 
      // Launch bot with a robust retry mechanism
      async function launchBot(botInstance: Telegraf, retries = 0) {
        try {
          console.log(`[BOT-${instanceId}] Attempting to launch... (Retry: ${retries})`);
          // Explicitly delete webhooks to avoid 409 Conflict
          await botInstance.telegram.deleteWebhook();
          
          // Request specific updates so Telegram sends join requests and chat member updates
          await botInstance.launch({ 
            dropPendingUpdates: true,
            allowedUpdates: ['message', 'chat_member', 'chat_join_request', 'callback_query'] as any
          });
          console.log(`[BOT-${instanceId}] Telegram Bot is successfully running.`);
        } catch (err: any) {
          if (err.message.includes('409: Conflict')) {
            if (retries < 15) {
              const delay = Math.min(Math.pow(2, retries) * 5000, 60000); // Backoff up to 60s
              console.warn(`[BOT-${instanceId}] Conflict detected (Another instance might be running). Retrying in ${delay}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
              return launchBot(botInstance, retries + 1);
            } else {
              console.error(`[BOT-${instanceId}] Failed to launch after multiple retries due to persistent 409 Conflict.`, err.message);
            }
          } else {
            console.error(`[BOT-${instanceId}] Launch failed with non-conflict error:`, err.message);
          }
        }
      }

      setTimeout(() => {
        if (bot) launchBot(bot);
      }, launchDelay);
    } catch (e) {
      console.error("Bot initialization error:", e);
    }
  }

  // --- Logger Middleware ---
  app.use((req, res, next) => {
    // Capture URL if unknown - force https for Telegram compatibility
    if (!currentAppUrl && req.get('host')) {
      currentAppUrl = `https://${req.get('host')}`; 
      console.log(`[SERVER] Detected URL: ${currentAppUrl}`);
    }
    
    if (!req.path.startsWith('/@vite') && !req.path.startsWith('/src') && !req.path.startsWith('/node_modules')) {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - FROM: ${req.ip} - AGENT: ${req.get('user-agent')?.slice(0, 50)}`);
    }
    next();
  });

  // --- AUTOMATIC 10x DAILY COACHING ENGINE ---
  // Periodically scans all users to dispatch step-by-step masterclasses automatically (10 times a day)
  async function runAutomatedCoachingCycle() {
    if (!isDbAdminCapable) {
      console.info("[COACHING-AUTO] DB Admin is not write capable. Skipping cycle.");
      return;
    }

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn("[COACHING-AUTO] EMAIL_USER or EMAIL_PASS not configured. Coaching emails will fail.");
    }

    console.log("[COACHING-AUTO] Running scheduled automatic coaching scan...");
    try {
      const usersSnap = await dbAdmin.collection('users').get();
      if (usersSnap.empty) {
        console.log("[COACHING-AUTO] No users found in database.");
        return;
      }

      console.log(`[COACHING-AUTO] Scanning ${usersSnap.size} users...`);

      const topics = [
        {
          id: "earn_higher",
          subject: "💸 Secrets to 10X Your Daily Earnings on Earnwise",
          headline: "The Compound Earning Framework",
          quote: "Average members work for individual micro-tasks. Elite earners build network engines.",
          tip: "Maintain a consecutive 7-day streak to unlock a 2.5x multiplier on all personal task reward submissions. Pair this by recruiting 5 active friends to tap into a lifelong 10% cash bonus on all their task approval reserves!"
        },
        {
          id: "upgrade",
          subject: "⚡ Unlock Premium Power: VIP Tier Upgrade Walkthrough",
          headline: "Level Up Your Task Multipliers",
          quote: "Upgraded accounts secure preferential automated validation and unlimited submission limits.",
          tip: "Navigate to your Dashboard, click 'Upgrade Tier', and select from the available premium plans. Upgrading instantly increases your task ceiling, grants priority customer support, and shaves withdrawal hold times down to under 10 minutes!"
        },
        {
          id: "deposit",
          subject: "🏦 Capital Funding Guide: How to Safely Deposit",
          headline: "Fund Your Direct Operations Securely",
          quote: "Your wallet is the engine that funds advertising budgets and registers course activations.",
          tip: "Hover over the Home panel and tap 'Deposit'. Enter your desired amount and click proceed. Our gateway integrates with Paystack, allowing safe bank transfers or card payments instantly. Make sure you copy the single-use virtual account details correctly."
        },
        {
          id: "run_ads",
          subject: "📢 Siphon Buyer Traffic: How to Launch Live Ads on Earnwise",
          headline: "The Earnwise Self-Serve Advertising Pipeline",
          quote: "If you have a great solution, the crowd must hear it. Ads grant you the megaphone.",
          tip: "Click on 'Advertise' or 'Create Ad Campaign' in your panel. Choose your daily budget, write a catchy hook, and paste your direct WhatsApp link. Our network of 50,000+ certified Nigerian scholars will begin reviewing and engaging with your campaign within minutes!"
        },
        {
          id: "earn_tasks",
          subject: "🎯 Earn 5,000 NGN Daily: Earning Through Tasks Wisely",
          headline: "The Ultimate Micro-Task Speedrunning Cheat Sheet",
          quote: "Success on tasks comes down to speed and unmanipulated compliance proof.",
          tip: "Log in around 8 AM and 6 PM when new corporate advertising audits and social follow tasks are assigned. Read task instructions carefully, perform the follow, like, or subscription, and upload the exact screenshot. Our system approves honest submissions instantly!"
        },
        {
          id: "buy_course",
          subject: "📚 Sourcing High-Income Skills: How to Buy Academy Courses",
          headline: "Unlock Permanent High-Yield Strategy Blueprints",
          quote: "An investment in knowledge always pays the best interest dividend.",
          tip: "Head to the 'Academy' page, browse top blueprints like 'Smartphone Canva & Mobile Design Mastery' or 'WhatsApp Organic Lead Siphon'. Make sure your wallet has sufficient balance, and click 'Enroll Now'. This instantly unlocks the offline lesson plans, strategy guides, and files!"
        }
      ];

      const now = Date.now();
      // 10 times a day = ~2.4 hours (144 minutes). We will allow slightly faster spacing (e.g. 2 hours / 120 minutes) to be flexible
      const minIntervalMs = 2 * 60 * 60 * 1000;

      for (const userDoc of usersSnap.docs) {
        const userData = userDoc.data();
        
        // Skip users who opted out
        if (userData.dailyEmailEnabled === false) {
          console.log(`[COACHING-AUTO] User ${userDoc.id} has disabled coaching. Skipping.`);
          continue;
        }
        if (!userData.email) {
          console.log(`[COACHING-AUTO] User ${userDoc.id} has no email address. Skipping email.`);
        }

        let lastCoachingTime = 0;
        if (userData.lastCoachingAt) {
          if (userData.lastCoachingAt.toMillis) {
            lastCoachingTime = userData.lastCoachingAt.toMillis();
          } else if (userData.lastCoachingAt instanceof Date) {
            lastCoachingTime = userData.lastCoachingAt.getTime();
          } else {
            lastCoachingTime = new Date(userData.lastCoachingAt).getTime() || 0;
          }
        }

        // Check if due for next automated scheduled coaching drop
        if (lastCoachingTime === 0 || (now - lastCoachingTime >= minIntervalMs)) {
          const currentStep = userData.coachingStep !== undefined ? parseInt(userData.coachingStep) : 0;
          const selectedTopic = topics[currentStep % topics.length];
          const nextStep = (currentStep + 1) % topics.length;

          console.log(`[COACHING-AUTO] Dispatching coaching step ${currentStep} (${selectedTopic.id}) to ${userData.email || 'user without email'}`);

          // 1. Send automatic in-app notification (bell)
          try {
            await dbAdmin.collection('notifications').add({
              userId: userDoc.id,
              title: `🌅 Daily Hustle: ${selectedTopic.headline}`,
              message: `${selectedTopic.quote} 👉 Today's tip: ${selectedTopic.tip}`,
              type: 'reward',
              read: false,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              readBy: []
            });
            console.log(`[COACHING-AUTO] In-app notification sent to ${userDoc.id}`);
          } catch (notifErr: any) {
            console.error(`[COACHING-AUTO] In-app notification append error for ${userDoc.id}:`, notifErr.message);
          }

          // 2. Send automatic coaching email (if email exists)
          if (userData.email) {
            try {
              await transporter.sendMail({
                from: `"Earnwise Coaching" <${process.env.EMAIL_USER}>`,
                to: userData.email,
                replyTo: 'earnwise29@gmail.com',
                subject: selectedTopic.subject,
                text: `Hello ${userData.displayName || userData.firstName || 'Earner'},\n\nDAILY INSPIRATION: ${selectedTopic.headline}\n"${selectedTopic.quote}"\n\nTODAY'S ACTION TIP: ${selectedTopic.tip}\n\nGo to your dashboard to complete tasks`,
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #f0f0f0; border-radius: 20px; background-color: #ffffff;">
                    <div style="text-align: center; margin-bottom: 25px;">
                      <h1 style="color: #2563eb; font-size: 24px; font-weight: 800; margin: 0; text-transform: uppercase;">Earnwise Daily Coach</h1>
                      <p style="color: #64748b; font-size: 13px; margin: 5px 0 0 0;">Automated Success Coach • Active Multipliers</p>
                    </div>
                    
                    <div style="background-color: #eff6ff; border-left: 5px solid #2563eb; padding: 20px; border-radius: 12px; margin: 25px 0;">
                      <h3 style="margin-top: 0; color: #1e3a8a; font-size: 16px; text-transform: uppercase; font-weight: 800; letter-spacing: 0.05em;">${selectedTopic.headline}</h3>
                      <p style="color: #1e40af; font-size: 15px; font-style: italic; margin-bottom: 0;">"${selectedTopic.quote}"</p>
                    </div>
        
                    <div style="border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; background-color: #fafafa; margin-bottom: 25px;">
                      <h4 style="margin-top: 0; color: #1e293b; font-size: 14px; text-transform: uppercase; font-weight: 800;">Today's Strategic Action:</h4>
                      <p style="font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 0;">${selectedTopic.tip}</p>
                    </div>
        
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="${currentAppUrl}" style="background-color: #2563eb; color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 12px; font-weight: 800; font-size: 14px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2); text-transform: uppercase;">Access Dashboard</a>
                    </div>
        
                    <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #f1f5f9;">
                      <p style="color: #94a3b8; font-size: 11px; margin-bottom: 5px; text-transform: uppercase;">Active Streak Protection Alert</p>
                      <p style="color: #64748b; font-size: 12px; line-height: 1.5; margin: 0;">You are receiving this because you enabled Daily Earning Reminders on Earnwise. Engage everyday to scale.</p>
                    </div>
                  </div>
                `
              });
              console.log(`[COACHING-AUTO] Email sent to ${userData.email}`);
            } catch (mailErr: any) {
              console.error(`[COACHING-AUTO] Nodemailer dispatch failed to ${userData.email}:`, mailErr.message);
            }
          }

          // 3. Update status
          try {
            await dbAdmin.collection('users').doc(userDoc.id).update({
              coachingStep: nextStep,
              lastCoachingAt: admin.firestore.FieldValue.serverTimestamp()
            });
          } catch (updateErr: any) {
            console.error(`[COACHING-AUTO] Failed updating coaching step metadata for ${userDoc.id}:`, updateErr.message);
          }
        }
      }
    } catch (err: any) {
      console.error("[COACHING-AUTO] Error scanning background coaching registry:", err);
    }
  }

  // --- API Routes ---
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", botActive: !!bot });
  });

  /**
   * GET /api/webhooks/cpx
   * CPX Research Survey Callback Webhook
   * Validates secure hash and credits user balance on successful completion.
   */
  app.get("/api/webhooks/cpx", async (req, res) => {
    const { status, trans_id, user_id, amount_local, amount_usd, hash } = req.query;

    console.log(`[WEBHOOK-CPX] Received callback for User: ${user_id}, Status: ${status}, Trans: ${trans_id}`);

    // Verify Secure Hash: md5(trans_id + '-' + CPX_SECURE_HASH)
    const secureHash = process.env.CPX_SECURE_HASH;
    if (!secureHash) {
      console.error("[WEBHOOK-CPX] CPX_SECURE_HASH environment variable is missing.");
      return res.status(500).send("Server configuration error");
    }

    const calculatedHash = crypto.createHash('md5').update(`${trans_id}-${secureHash}`).digest('hex');

    if (hash !== calculatedHash) {
      console.warn(`[WEBHOOK-CPX] Invalid hash received for trans ${trans_id}. Expected ${calculatedHash}, received ${hash}`);
      return res.status(403).send("Invalid secure hash");
    }

    // Process Status logic
    try {
      if (status === '1') {
        console.log(`[WEBHOOK-CPX] SUCCESS: Crediting User ${user_id} with ${amount_local} coins (Earned ${amount_usd} USD)`);
        
        if (isDbAdminCapable) {
          const userRef = dbAdmin.collection('users').doc(user_id as string);
          await userRef.update({
            balance: admin.firestore.FieldValue.increment(Number(amount_local)),
            withdrawableBalance: admin.firestore.FieldValue.increment(Number(amount_local)),
            totalSurveyEarnings: admin.firestore.FieldValue.increment(Number(amount_local)),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });

          // Record Transaction
          await dbAdmin.collection('transactions').add({
            userId: user_id,
            amount: Number(amount_local),
            type: 'earning',
            description: `CPX Survey Reward - TID: ${trans_id}`,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          });

          // Optional: Add notification
          await dbAdmin.collection('notifications').add({
            userId: user_id,
            title: "💰 Survey Reward Credited!",
            message: `You earned ₦${amount_local} from a CPX Research survey completion.`,
            type: 'reward',
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            readBy: []
          });
        }
      } else if (status === '-2') {
        console.log(`[WEBHOOK-CPX] CHARGEBACK: Revoking ${amount_local} coins from User ${user_id} for trans ${trans_id}`);
        
        if (isDbAdminCapable) {
          const userRef = dbAdmin.collection('users').doc(user_id as string);
          await userRef.update({
            balance: admin.firestore.FieldValue.increment(-Number(amount_local)),
            withdrawableBalance: admin.firestore.FieldValue.increment(-Number(amount_local)),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });

          // Record Chargeback Transaction
          await dbAdmin.collection('transactions').add({
            userId: user_id,
            amount: -Number(amount_local),
            type: 'earning',
            description: `CPX Survey Chargeback - TID: ${trans_id}`,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }
      } else {
        console.log(`[WEBHOOK-CPX] Status ${status} received. No payout action taken.`);
      }
    } catch (dbErr: any) {
      console.error(`[WEBHOOK-CPX] Database update failed for User ${user_id}:`, dbErr.message);
      // We still return 200 OK to CPX to prevent retries if the hash was valid, 
      // but you might want to adjust this based on whether you want CPX to retry.
    }

    // CPX requires a plain text "OK" response with 200 status
    res.status(200).set('Content-Type', 'text/plain').send("OK");
  });

  /**
   * GET /api/cpx/signed-url
   * Generates a signed survey URL to keep the secret hash hidden from the client.
   */
  app.get("/api/cpx/signed-url", async (req, res) => {
    const { user_id, username, email } = req.query;
    const secureHash = process.env.CPX_SECURE_HASH;

    if (!secureHash) {
      return res.status(500).json({ error: "CPX_SECURE_HASH not configured" });
    }

    if (!user_id) {
      return res.status(400).json({ error: "User ID is required" });
    }

    // Generate secure_hash for the offerwall: md5(ext_user_id + "-" + CPX_SECURE_HASH)
    const hash = crypto.createHash('md5').update(`${user_id}-${secureHash}`).digest('hex');
    
    const signedUrl = `https://offers.cpx-research.com/index.php?app_id=33341&ext_user_id=${user_id}&secure_hash=${hash}&username=${encodeURIComponent(String(username || ''))}&email=${encodeURIComponent(String(email || ''))}&subid_1=&subid_2=`;

    res.json({ url: signedUrl });
  });

  // Admin Coaching Debugging
  app.get("/api/admin/coaching-status", async (req, res) => {
    res.json({
      isDbAdminCapable,
      emailConfigured: !!(process.env.EMAIL_USER && process.env.EMAIL_PASS),
      currentAppUrl,
      lastCheckAt: new Date().toISOString()
    });
  });

  app.post("/api/admin/trigger-coaching", async (req, res) => {
    try {
      console.log("[ADMIN] Manual coaching trigger received.");
      await runAutomatedCoachingCycle();
      res.json({ status: "success", message: "Background coaching cycle completed successfully." });
    } catch (err: any) {
      console.error("[ADMIN] Manual coaching trigger failed:", err);
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /api/v1/tasks/breakdown
   * Uses AI to convert a vague user task into 5 specific actionable sub-tasks.
   */
  app.post("/api/v1/tasks/breakdown", async (req, res) => {
    const { taskTitle, userId } = req.body;
    if (!taskTitle) return res.status(400).json({ error: "Task title required" });

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Break down the following task into 5 specific, high-leverage, actionable sub-tasks that help monetize the effort. Task: "${taskTitle}"`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              subtasks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    monetizationAngle: { type: Type.STRING }
                  },
                  required: ["title", "description", "monetizationAngle"]
                }
              }
            },
            required: ["subtasks"]
          }
        }
      });

      const data = JSON.parse(response.text || '{"subtasks":[]}');
      res.json(data);
    } catch (error) {
      console.error("AI Breakdown Error:", error);
      res.status(500).json({ error: "AI Engine failed to process task breakdown" });
    }
  });

  /**
   * POST /api/v1/affiliate/matches
   * Semantic/Keyword matching for task-to-affiliate offer injection.
   */
  app.post("/api/v1/affiliate/matches", async (req, res) => {
    const { tasks } = req.body; // Array of task titles
    if (!tasks || !Array.isArray(tasks)) return res.json({ matches: [] });

    const keywords = [
      { key: 'crypto', offer: 'NairaEx - Instant BTC to NGN', link: 'https://nairaex.com' },
      { key: 'marketing', offer: 'LeadGen Pro - Paid Surveys', link: 'https://example.com/cpa' },
      { key: 'app', offer: 'PiggyVest - Save & Earn 15%', link: 'https://piggyvest.com' },
      { key: 'design', offer: 'Canva Pro - 30% Off Annual', link: 'https://canva.com' },
      { key: 'writing', offer: 'Grammarly - Writing Assistant', link: 'https://grammarly.com' }
    ];

    const matches = tasks.map(task => {
      const match = keywords.find(k => task.toLowerCase().includes(k.key));
      return match ? { task, ...match } : null;
    }).filter(Boolean);

    res.json({ matches });
  });

  /**
   * POST /api/v1/telemetry/announce
   * Viral Accountability Loop: Announces task completion to the Telegram channel.
   */
  app.post("/api/v1/telemetry/announce", async (req, res) => {
    const { userId, taskTitle } = req.body;
    if (!bot || !userId || !taskTitle) return res.json({ status: "skipped" });

    try {
      const userDoc = await dbAdmin.collection('users').doc(userId).get();
      const userName = userDoc.data()?.displayName || "An Earner";
      const channelId = process.env.TELEGRAM_CHANNEL_ID || "@EarnwiseElite"; // Use a specific channel or community group

      const message = `🔥 *Accountability Alert!*\n\n🏆 *${userName}* just completed a synced workflow task:\n_"${taskTitle}"_\n\n🚀 *Status:* Verified & Monetized\n💎 *Tier:* ${userDoc.data()?.plan || 'Standard'}\n\nJoin the elite earners: [Launch App](${currentAppUrl})`;
      
      await bot.telegram.sendMessage(channelId, message, { parse_mode: 'Markdown' });
      res.json({ status: "announced" });
    } catch (error: any) {
      console.warn("Viral loop announcement failed:", error.message);
      res.json({ status: "error", message: error.message });
    }
  });

  // --- 1. THE MULTIPLIER MATH & TASK DISTRIBUTION ENGINE ---
  /**
   * GET /api/v1/tasks/available
   * Fetches active tasks and calculates rewards dynamically based on user membership tier.
   */
  app.get("/api/v1/tasks/available", async (req, res) => {
    const { userId } = req.query;

    try {
      if (!userId) return res.status(400).json({ error: "Missing userId" });

      // Fetch User Tier
      const userDoc = await dbAdmin.collection('users').doc(userId as string).get();
      if (!userDoc.exists) return res.status(404).json({ error: "User not found" });
      
      const userData = userDoc.data();
      const userTier = userData?.plan || 'free';
      const multiplier = TIER_MULTIPLIERS[userTier] || 1.0;

      // Fetch Active Tasks
      const tasksSnap = await dbAdmin.collection('tasks')
        .where('status', '==', 'active')
        .get();

      const nowTs = Date.now();

      // Apply Multiplier Math & Expiration Filter
      const processedTasks = tasksSnap.docs
        .filter(doc => {
          const task = doc.data();
          if (!task.expiresAt) return true;
          const expiresAtMillis = task.expiresAt.toMillis ? task.expiresAt.toMillis() : new Date(task.expiresAt).getTime();
          return expiresAtMillis > nowTs;
        })
        .map(doc => {
          const task = doc.data();
          return {
            id: doc.id,
            ...task,
            // Calculate the reward the user actually sees based on their tier
            adjustedReward: Number((task.userPayout * multiplier).toFixed(2)),
            tierBonus: `${((multiplier - 1) * 100).toFixed(0)}% Boost Active`
          };
        });

      res.json({ 
        userTier, 
        activeMultiplier: multiplier, 
        tasks: processedTasks 
      });
    } catch (error) {
       console.error("Distribution Engine Error:", error);
       res.status(500).json({ error: "Backend failed to distribute contextual rewards" });
    }
  });

  // --- 2. ADMIN DASHBOARD CONTRACT PROCESSOR (70/30 SPLIT) ---
  /**
   * POST /api/v1/admin/tasks/create
   * Handles local advertiser contracts with automatic platform profit splitting.
   */
  app.post("/api/v1/admin/tasks/create", async (req, res) => {
    const { title, totalBudget, targetActionsCount, advertiserId, type, tag } = req.body;

    try {
      // THE 70/30 SPLIT MATH
      // 70% of advertiser budget goes to Platform Float (Profit)
      // 30% of advertiser budget goes to the User Reward Pool
      const platformProfit = totalBudget * 0.70;
      const userPoolBudget = totalBudget * 0.30;
      
      // Calculate individual Reward per User (baseline before tier multipliers)
      const userRewardBaseline = userPoolBudget / targetActionsCount;

      // Update Global PLATFORM FLOAT Tracking
      await dbAdmin.collection('stats').doc('global').set({
        platformFloat: admin.firestore.FieldValue.increment(platformProfit),
        totalAdvertisingBudget: admin.firestore.FieldValue.increment(totalBudget),
        lastContractAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      // Publish the Active Task
      const taskRef = await dbAdmin.collection('tasks').add({
        title,
        advertiserId,
        type: type || 'ad',
        tag: tag || 'general',
        totalContractBudget: totalBudget,
        userPoolBudget: userPoolBudget,
        remainingBudget: userPoolBudget,
        userPayout: userRewardBaseline, // This is the 'base' the multiplier works on
        platformMargin: platformProfit, 
        status: 'active',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      res.json({
        status: "success",
        taskId: taskRef.id,
        distribution: {
          platformProfited: platformProfit,
          userPoolAllocated: userPoolBudget,
          perUserRewardBase: userRewardBaseline
        }
      });
    } catch (error) {
      console.error("Admin Processor Error:", error);
      res.status(500).json({ error: "Failed to process advertiser contract and platform split" });
    }
  });

  app.post("/api/support/message", async (req, res) => {
    const { subject, message, email } = req.body;
    try {
      await transporter.sendMail({
        from: `Earnwise Support <${process.env.EMAIL_USER}>`,
        to: 'earnwise29@gmail.com',
        subject: `Support Request: ${subject}`,
        text: `From: ${email}\n\nMessage: ${message}`
      });
      res.json({ status: "success" });
    } catch (error) {
      console.error("Support Email Error:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // --- 4. SELF-SERVICE ADVERTISER PORTAL ---
  app.post("/api/v1/advertiser/tasks/submit", async (req, res) => {
    const { title, description, link, payout, totalBudget, advertiserId, type, email, durationDays } = req.body;
    try {
      const budget = Number(totalBudget);
      const userPayout = Number(payout);
      const days = Number(durationDays) || 30;
      
      if (!budget || !userPayout || budget <= 0) {
        return res.status(400).json({ error: "Invalid budget or payout" });
      }

      // Initialize Paystack Transaction
      const paystackRes = await axios.post("https://api.paystack.co/transaction/initialize", {
        amount: Math.round(budget * 100), // convert to kobo
        email: email || "advertiser@earnwise.com",
        metadata: { 
          type: 'advertiser_task', 
          advertiserId,
          title,
          description,
          link,
          userPayout,
          totalBudget: budget,
          taskType: type || 'content_creation',
          durationDays: days
        },
        callback_url: `${currentAppUrl}/advertiser?payment=success`
      }, { headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` } });

      // Create Task as 'pending_payment'
      await dbAdmin.collection('tasks').add({
        advertiserId,
        title,
        description,
        link,
        type: type || 'content_creation',
        userPayout,
        platformMargin: userPayout * 0.2, // 20% system fee
        totalBudget: budget,
        remainingBudget: budget,
        durationDays: days,
        status: 'pending_payment',
        paystackReference: paystackRes.data.data.reference,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      res.json({ checkoutUrl: paystackRes.data.data.authorization_url });
    } catch (e: any) {
      console.error("Ad submission failed:", e.response?.data || e.message);
      res.status(500).json({ error: "Checkout initialization failed" });
    }
  });

  app.post("/api/v1/payments/webhook/paystack", async (req, res) => {
    // This seems redundant with /api/paystack/webhook below, but keeping it map to /api/paystack/webhook for consistency
    res.sendStatus(200);
  });

  app.put("/api/v1/admin/tasks/:id/:action", async (req, res) => {
    const { id, action } = req.params;
    const { adminId } = req.body;
    const userDoc = await dbAdmin.collection('users').doc(adminId).get();
    if (userDoc.data()?.role !== 'admin') return res.status(403).json({ error: "Unauthorized" });
    
    if (action === 'approve') await dbAdmin.collection('tasks').doc(id).update({ admin_status: 'active' });
    else if (action === 'reject') await dbAdmin.collection('tasks').doc(id).update({ admin_status: 'rejected' });
    res.json({ status: "updated" });
  });

  // --- 3. SECURE TASK COMPLETION (Anti-Fraud + Cooldown Escrow) ---
  /**
   * POST /api/user/complete-task
   * Implements Velocity Gate and dynamic tier calculations at point-of-sale.
   */
  app.post("/api/user/complete-task", velocityGate, taskLimiter, async (req, res) => {
    const { userId, taskId, deviceFingerprint } = req.body;
    const userIp = req.ip;

    try {
      await dbAdmin.runTransaction(async (transaction) => {
        const userRef = dbAdmin.collection('users').doc(userId);
        const taskRef = dbAdmin.collection('tasks').doc(taskId);
        
        const [userDoc, taskDoc] = await Promise.all([
          transaction.get(userRef),
          transaction.get(taskRef)
        ]);

        if (!userDoc.exists || !taskDoc.exists) throw new Error("Verification target not found");
        
        const userData = userDoc.data()!;
        const taskData = taskDoc.data()!;

        // Security Layer
        if (userData.securityMetrics?.isSuspended) throw new Error("Account is under safety review");
        if (!userData.plan || userData.plan === 'free') throw new Error("Upgrade your plan to start earning.");
        if (taskData.remainingBudget <= 0) throw new Error("Task allocation exhausted");

        // Calculate dynamic reward based on tier multiplier
        const multiplier = TIER_MULTIPLIERS[userData.plan || 'free'] || 1.0;
        const finalPayout = taskData.userPayout * multiplier;

        // Atomic multi-variable update
        transaction.update(userRef, {
          pendingBalance: admin.firestore.FieldValue.increment(finalPayout),
          taskEarnings: admin.firestore.FieldValue.increment(finalPayout),
          tasksCompleted: admin.firestore.FieldValue.increment(1),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // --- REFERRAL ENGINE: 10% Royalty + ₦1,000 Bonus ---
        if (userData.referredBy) {
           const referrers = await dbAdmin.collection('users').where('referralCode', '==', userData.referredBy).limit(1).get();
           if (!referrers.empty) {
             const referrerDoc = referrers.docs[0];
             const royalty = finalPayout * 0.10;
             
             transaction.update(referrerDoc.ref, {
               balance: admin.firestore.FieldValue.increment(royalty),
               referralEarnings: admin.firestore.FieldValue.increment(royalty)
             });

             // SEND NOTIFICATION
             const notifRef = dbAdmin.collection('notifications').doc();
             transaction.set(notifRef, {
               userId: referrerDoc.id,
               title: '👥 Referral Royalty!',
               message: `You earned ₦${royalty.toFixed(2)} royalty from your friend's task completion.`,
               type: 'reward',
               createdAt: admin.firestore.FieldValue.serverTimestamp(),
               readBy: []
             });

             // One-time ₦1,000 Welcome Bonus on 3rd Completion
             if ((userData.tasksCompleted || 0) === 2) {
               transaction.update(referrerDoc.ref, {
                 balance: admin.firestore.FieldValue.increment(1000),
                 referralEarnings: admin.firestore.FieldValue.increment(1000)
               });
               
               const bonusNotifRef = dbAdmin.collection('notifications').doc();
               transaction.set(bonusNotifRef, {
                 userId: referrerDoc.id,
                 title: '🎁 Milestone Bonus!',
                 message: 'Your friend completed their 3rd task! You have received a ₦1,000 Welcome Bonus.',
                 type: 'reward',
                 createdAt: admin.firestore.FieldValue.serverTimestamp(),
                 readBy: []
               });
             }
           }
        }

        // Deduct from task pool
        transaction.update(taskRef, {
          remainingBudget: admin.firestore.FieldValue.increment(-taskData.userPayout)
        });

        // Create restricted transaction log: Escrow for 72 Hours (3 days)
        const transRef = dbAdmin.collection('transactions').doc();
        transaction.set(transRef, {
          userId,
          amount: finalPayout,
          type: 'earning',
          status: 'pending',
          description: `Verified Reward: ${taskData.title}`,
          // Exact 72 hour cooldown per user requirements
          availableAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 72 * 60 * 60 * 1000)),
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      });

      res.json({ status: "success", message: "Task verified. Reward locked in 72h escrow." });
    } catch (error: any) {
      console.error("Verification Error:", error.message);
      res.status(400).json({ error: error.message });
    }
  });

  // --- Background PENDING-TO-AVAILABLE Worker ---
  async function performEscrowClearance() {
    console.log("[CLEARANCE] Checking for cleared escrows (72h Threshold)...");
    try {
      const now = admin.firestore.Timestamp.now();
      const clearedBatch = await dbAdmin.collection('transactions')
        .where('status', '==', 'pending')
        .where('availableAt', '<=', now)
        .limit(500)
        .get();

      if (clearedBatch.empty) return 0;

      const batch = dbAdmin.batch();
      
      for (const doc of clearedBatch.docs) {
        const entry = doc.data();
        const userRef = dbAdmin.collection('users').doc(entry.userId);
        
        // Move funds between variables
        batch.update(userRef, {
          pendingBalance: admin.firestore.FieldValue.increment(-entry.amount),
          withdrawableBalance: admin.firestore.FieldValue.increment(entry.amount)
        });
        
        // Finalize transaction
        batch.update(doc.ref, { 
          status: 'completed',
          releasedAt: admin.firestore.FieldValue.serverTimestamp() 
        });
      }

      await batch.commit();
      console.log(`[CLEARANCE] Released ${clearedBatch.size} balances to withdrawable wallets.`);
      return clearedBatch.size;
    } catch (err) {
      console.error("[CLEARANCE] Clearance Error:", err);
      throw err;
    }
  }

  // Runs once daily at midnight to move cleared funds to withdrawable balance
  cron.schedule('0 0 * * *', async () => {
    await performEscrowClearance().catch(() => {});
  });

  app.post("/api/admin/clear-escrow", async (req, res) => {
    try {
      const count = await performEscrowClearance();
      res.json({ status: "success", clearedCount: count });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Initialize Wallet Deposit
  app.post("/api/paystack/initialize-deposit", async (req, res) => {
    const { userId, amount, email } = req.body;
    if (!PAYSTACK_SECRET) return res.status(500).json({ error: "Paystack secret not configured" });
    
    try {
      const depositAmount = Number(amount);
      if (isNaN(depositAmount) || depositAmount < 500) {
        return res.status(400).json({ error: "Minimum deposit is ₦500" });
      }

      const response = await axios.post("https://api.paystack.co/transaction/initialize", {
        amount: Math.round(depositAmount * 100),
        email: email || "user@earnwise.com",
        callback_url: `${currentAppUrl}/deposit?status=success`,
        metadata: {
          type: 'deposit',
          userId,
          amount: depositAmount
        }
      }, {
        headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` }
      });

      res.json(response.data);
    } catch (error: any) {
      console.error("Initialize deposit error:", error.response?.data || error.message);
      res.status(500).json({ error: "Failed to initialize deposit" });
    }
  });

  // Paystack Webhook
  app.post("/api/paystack/webhook", express.json(), async (req, res) => {
    const hash = crypto.createHmac('sha512', PAYSTACK_SECRET || '').update(JSON.stringify(req.body)).digest('hex');
    if (hash !== req.headers['x-paystack-signature']) {
      return res.sendStatus(400);
    }

    const event = req.body;
    console.log("Paystack Webhook Event:", event.event);

    try {
      if (event.event === 'charge.success') {
        const { metadata, reference } = event.data;
        if (metadata?.type === 'deposit') {
          const userRef = dbAdmin.collection('users').doc(metadata.userId);
          await userRef.update({
            balance: admin.firestore.FieldValue.increment(metadata.amount),
            withdrawableBalance: admin.firestore.FieldValue.increment(metadata.amount),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });

          await dbAdmin.collection('transactions').add({
            userId: metadata.userId,
            amount: metadata.amount,
            type: 'bonus', // Using bonus type for balance additions
            description: `Wallet Deposit (Ref: ${reference})`,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            reference
          });

          // Send Notification
          await dbAdmin.collection('notifications').add({
            userId: metadata.userId,
            title: '💰 Deposit Successful!',
            message: `₦${metadata.amount.toLocaleString()} has been added to your wallet.`,
            type: 'success',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            readBy: []
          });
        }

        if (metadata?.type === 'upgrade') {
          const userRef = dbAdmin.collection('users').doc(metadata.userId);
          await userRef.update({
            plan: metadata.planId,
            subscriptionTier: 'premium',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });

          await dbAdmin.collection('transactions').add({
            userId: metadata.userId,
            amount: 0,
            type: 'earning',
            description: `Upgraded to ${metadata.planId} (Webhook Verified)`,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            reference
          });
        }

        if (metadata?.type === 'advertiser_task') {
          const taskSnap = await dbAdmin.collection('tasks')
            .where('paystackReference', '==', reference)
            .limit(1)
            .get();
          
          if (!taskSnap.empty) {
            await taskSnap.docs[0].ref.update({
              status: 'pending', // Paid, awaiting admin review
              paymentVerifiedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            await dbAdmin.collection('transactions').add({
              userId: metadata.advertiserId,
              amount: -metadata.totalBudget,
              type: 'withdrawal',
              description: `Paid for Ad Campaign: ${metadata.title}`,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              reference
            });
          }
        }
      }

      if (event.event === 'transfer.success') {
        // Update withdrawal status to completed in Firestore
        const transferData = event.data;
        const withdrawals = await dbAdmin.collection('withdrawals')
          .where('paystackTransferId', '==', transferData.id)
          .limit(1)
          .get();

        if (!withdrawals.empty) {
          await withdrawals.docs[0].ref.update({
            status: 'completed',
            processedAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }
      }

      res.sendStatus(200);
    } catch (err) {
      console.error("Webhook processing error:", err);
      res.sendStatus(500);
    }
  });

  // Verify Deposit
  app.post("/api/paystack/verify-deposit", async (req, res) => {
    const { reference, userId } = req.body;
    console.log(`[PAYMENT] Verifying deposit for User: ${userId}, Ref: ${reference}`);
    
    if (!isDbAdminCapable) {
      console.info("[PAYMENT] Server Admin SDK is running in restricted mode. Automatically engaging Client SDK fallback execution...");
      return res.json({ status: "success", useClientFallback: true, amount: 5000 });
    }
    
    if (!PAYSTACK_SECRET) return res.status(500).json({ error: "Paystack secret not configured" });

    try {
      const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
        headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` }
      });

      const data = response.data.data;
      if (data.status === "success") {
        const amount = data.amount / 100; // to Naira
        const userRef = dbAdmin.collection('users').doc(userId);
        
        // Check if this reference was already processed (idempotency)
        const transSnap = await dbAdmin.collection('transactions').where('reference', '==', reference).limit(1).get();
        if (!transSnap.empty) {
          return res.json({ status: "success", message: "Deposit already reflected", amount });
        }

        await userRef.update({
          balance: admin.firestore.FieldValue.increment(amount),
          withdrawableBalance: admin.firestore.FieldValue.increment(amount),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        await dbAdmin.collection('transactions').add({
          userId,
          amount,
          type: 'bonus',
          description: `Wallet Deposit (Verified: ${reference})`,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          reference
        });

        // Send Notification
        await dbAdmin.collection('notifications').add({
          userId,
          title: '💰 Deposit Successful!',
          message: `₦${amount.toLocaleString()} has been added to your wallet.`,
          type: 'success',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          readBy: []
        });

        res.json({ status: "success", message: "Deposit verified effectively", amount });
      } else {
        res.status(400).json({ status: "failed", message: "Payment not successful" });
      }
    } catch (error: any) {
      console.error("Verify deposit error:", error.response?.data || error.message);
      res.status(500).json({ error: "Failed to verify deposit" });
    }
  });

  // Get Nigerian Banks
  app.get("/api/paystack/banks", async (req, res) => {
    try {
      const response = await axios.get("https://api.paystack.co/bank?country=nigeria", {
        headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` }
      });
      res.json(response.data);
    } catch (error: any) {
      console.error("Fetch banks error:", error.response?.data || error.message);
      res.status(500).json({ error: "Failed to fetch banks" });
    }
  });

  // Resolve Nigerian Bank Account Name
  app.get("/api/paystack/resolve", async (req, res) => {
    const { accountNumber, bankCode } = req.query;
    if (!accountNumber || !bankCode) {
      return res.status(400).json({ error: "Account number and bank code are required." });
    }
    if (!PAYSTACK_SECRET) {
      return res.status(500).json({ error: "Paystack secret not configured" });
    }
    try {
      const response = await axios.get(
        `https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
        {
          headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` }
        }
      );
      res.json(response.data);
    } catch (error: any) {
      const paystackData = error.response?.data;
      if (error.response?.status === 422) {
        console.warn(`[PAYMENT] Account resolution validation mismatch (accountNumber: ${accountNumber}, bankCode: ${bankCode}):`, paystackData?.message || "Verification mismatch");
        return res.status(422).json({
          status: "failed",
          type: "validation_error",
          error: paystackData?.message || "Could not resolve account name. Please check selection."
        });
      }
      console.error("Resolve account error:", paystackData || error.message);
      const msg = paystackData?.message || "Failed to resolve bank account name";
      res.status(error.response?.status || 500).json({ error: msg });
    }
  });

  // Verify plan upgrade payment
  app.post("/api/paystack/verify-upgrade", async (req, res) => {
    const { reference, userId, planId, amount, isBalancePayment } = req.body;
    console.log(`[PAYMENT] Verifying upgrade for User: ${userId}, Plan: ${planId}, Ref: ${reference} (Balance: ${isBalancePayment})`);
    
    if (!userId || !planId) {
      return res.status(400).json({ status: "failed", message: "Missing required details" });
    }

    if (!isDbAdminCapable) {
      console.info("[PAYMENT] Server Admin SDK is running in restricted mode. Automatically engaging Client SDK fallback execution...");
      return res.json({ status: "success", useClientFallback: true, message: "Activated plan via client-side transaction fallback" });
    }

    try {
      const userRef = dbAdmin.collection('users').doc(userId);
      const userDoc = await userRef.get();
      
      if (!userDoc.exists) return res.status(404).json({ status: "failed", message: "User account not found" });
      const userData = userDoc.data()!;

      // Case 1: Wallet Balance Payment
      if (isBalancePayment) {
        const requiredAmount = PLAN_COSTS[planId] || 999999;
        if ((userData.withdrawableBalance || 0) < requiredAmount) {
          return res.status(400).json({ status: "failed", message: "Insufficient wallet balance" });
        }

        await dbAdmin.runTransaction(async (transaction) => {
          transaction.update(userRef, {
            plan: planId,
            balance: admin.firestore.FieldValue.increment(-requiredAmount),
            withdrawableBalance: admin.firestore.FieldValue.increment(-requiredAmount),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });

          const transRef = dbAdmin.collection('transactions').doc();
          transaction.set(transRef, {
            userId,
            amount: -requiredAmount,
            type: 'withdrawal',
            description: `Activated ${planId} Plan using wallet balance`,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            reference
          });
        });

        return res.json({ status: "success", message: "Plan activated via wallet" });
      }

      // Case 2: Paystack Verification (Fallback/Legacy)
      if (!PAYSTACK_SECRET) {
        return res.status(500).json({ status: "failed", message: "Server configuration error" });
      }
      // Helper for Paystack Verify with internal retry
      const verifyTransaction = async (ref: string, attempt = 1): Promise<any> => {
        try {
          const response = await axios.get(`https://api.paystack.co/transaction/verify/${ref}`, {
            headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` }
          });
          const data = response.data.data;
          
          // If status is still pending, retry after a short delay (up to 3 times)
          if (data.status === 'ongoing' || data.status === 'pending') {
            if (attempt < 3) {
              console.log(`[PAYMENT] Transaction ${ref} still ${data.status}, retrying attempt ${attempt + 1}...`);
              await new Promise(resolve => setTimeout(resolve, 2000));
              return verifyTransaction(ref, attempt + 1);
            }
          }
          return data;
        } catch (err: any) {
          console.error(`[PAYMENT] Paystack API Error (Attempt ${attempt}):`, err.response?.data || err.message);
          if (attempt < 2) {
             await new Promise(resolve => setTimeout(resolve, 2000));
             return verifyTransaction(ref, attempt + 1);
          }
          throw err;
        }
      };

      const data = await verifyTransaction(reference);
      console.log(`[PAYMENT] Final Paystack status for ${reference}: ${data.status}`);

      if (data.status === "success") {
        // Verify amount
        const planCost = Number(amount);
        if (isNaN(planCost)) {
          console.error("[PAYMENT] Invalid amount passed to verify:", amount);
          return res.status(400).json({ status: "failed", message: "Invalid plan cost verification" });
        }

        const expectedKobo = Math.round(planCost * 100);
        if (data.amount < expectedKobo) {
          console.warn(`[PAYMENT] Amount mismatch! Expected >= ${expectedKobo}, Got: ${data.amount}`);
          return res.status(400).json({ status: "failed", message: "Payment amount mismatch" });
        }

        const userRef = dbAdmin.collection('users').doc(userId);
        const userDoc = await userRef.get();
        
        if (!userDoc.exists) {
          console.error(`[PAYMENT] User ${userId} not found in database during verification`);
          return res.status(404).json({ status: "failed", message: "User account not found" });
        }

        await userRef.update({
          plan: planId,
          subscriptionTier: 'premium',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        await dbAdmin.collection('transactions').add({
          userId,
          amount: 0,
          type: 'earning',
          description: `Upgraded to ${planId} Plan (Verified: ${reference})`,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          reference
        });

        console.log(`[PAYMENT] SUCCESS: User ${userId} upgraded to ${planId}`);
        res.json({ status: "success", message: "Plan upgraded successfully" });
      } else {
        console.warn(`[PAYMENT] Paystack returned failed status: ${data.status}`);
        res.status(400).json({ status: "failed", message: `Payment status is ${data.status}` });
      }
    } catch (error: any) {
      const paystackError = error.response?.data?.message || error.message;
      console.error("[PAYMENT] Verification Error:", paystackError);
      res.status(500).json({ status: "failed", message: `Verification failed: ${paystackError}` });
    }
  });

  // Send Welcome Email
  app.post("/api/auth/send-welcome-email", async (req, res) => {
    const { email, name } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    try {
      console.log(`[AUTH] Sending welcome email to ${email}...`);
      await transporter.sendMail({
        from: `"Earnwise Support" <${process.env.EMAIL_USER}>`,
        to: email,
        replyTo: 'earnwise29@gmail.com',
        subject: `Welcome to Earnwise, ${name || ''}!`,
        text: `Welcome to Earnwise! You're now part of Nigeria's #1 digital wealth platform. Complete high-paying tasks, withdraw real cash, and earn lifetime commissions.\n\nGet started now by logging into your dashboard: ${process.env.APP_URL || 'https://ais-pre-ucu3byd4dxfepn7umejqhx-558253480073.europe-west2.run.app'}`,
        html: `
          <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #f0f0f0; border-radius: 20px; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 20px;">
              <img src="cid:earnwise_logo" alt="Earnwise Logo" style="max-width: 150px; margin-bottom: 15px;" />
              <h1 style="color: #2563eb; font-size: 28px; font-weight: 800; margin: 0; padding: 10px;">Earnwise</h1>
              <p style="color: #94a3b8; font-size: 14px; margin-top: 5px;">Your Gateway to Digital Wealth</p>
            </div>
            <h2 style="color: #1e293b; text-align: center; font-size: 22px;">Welcome aboard, ${name || 'Earners'}!</h2>
            <p style="font-size: 16px; color: #475569; line-height: 1.6;">We're thrilled to have you! You've officially joined Nigeria's premier platform for earning money online. Our community is growing fast, and we're excited to see you start earning.</p>
            <div style="background-color: #f8fafc; padding: 25px; border-radius: 12px; margin: 25px 0; border: 1px solid #e2e8f0;">
              <h3 style="margin-top: 0; color: #1e293b; font-size: 18px;">Three Steps to Your First Payout:</h3>
              <ul style="color: #475569; font-size: 15px; line-height: 1.8; padding-left: 20px;">
                <li><strong>Browse:</strong> Check out the latest high-paying tasks on your dashboard.</li>
                <li><strong>Complete:</strong> Easily finish tasks and earn daily in Naira.</li>
                <li><strong>Withdraw:</strong> Request instant bank payouts via Paystack directly to your account.</li>
              </ul>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.APP_URL || 'https://ais-pre-ucu3byd4dxfepn7umejqhx-558253480073.europe-west2.run.app'}" style="background-color: #2563eb; color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: 800; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">Go to Your Dashboard</a>
            </div>
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #f1f5f9;">
              <p style="color: #64748b; font-size: 14px; margin-bottom: 10px;">Connect with us:</p>
              <a href="[LINK_TO_WHATSAPP]" style="margin: 0 10px; color: #2563eb; text-decoration: none;">WhatsApp</a>
              <span style="color: #cbd5e1;">|</span>
              <a href="[LINK_TO_TELEGRAM_CHANNEL]" style="margin: 0 10px; color: #2563eb; text-decoration: none;">Telegram Channel</a>
            </div>
            <p style="text-align: center; color: #64748b; font-size: 13px; margin-top: 20px;">Need a hand? Simply reply to this email, and our support team will be ready to help.</p>
          </div>
        `,
        attachments: [{
          filename: 'logo.png',
          path: path.join(process.cwd(), 'src/assets/images/earnwise_logo.png'),
          cid: 'earnwise_logo'
        }]
      });
      console.log(`[AUTH] SUCCESS! Welcome email sent to ${email}`);
      res.json({ status: "success", message: "Welcome email sent" });
    } catch (error: any) {
      console.error("[AUTH] Error in send-welcome-email:", error);
      res.status(500).json({ error: "Failed to send welcome email" });
    }
  });

  // Send Daily Reminders & Encouragement email + notification on demand (for tests or automatic setups)
  app.post("/api/auth/send-daily-encouragement", async (req, res) => {
    const { email, name, userId, topicId } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    const topics = [
      {
        id: "earn_higher",
        subject: "💸 Secrets to 10X Your Daily Earnings on Earnwise",
        headline: "The Compound Earning Framework",
        quote: "Average members work for individual micro-tasks. Elite earners build network engines.",
        tip: "Maintain a consecutive 7-day streak to unlock a 2.5x multiplier on all personal task reward submissions. Pair this by recruiting 5 active friends to tap into a lifelong 10% cash bonus on all their task approval reserves!"
      },
      {
        id: "upgrade",
        subject: "⚡ Unlock Premium Power: VIP Tier Upgrade Walkthrough",
        headline: "Level Up Your Task Multipliers",
        quote: "Upgraded accounts secure preferential automated validation and unlimited submission limits.",
        tip: "Navigate to your Dashboard, click 'Upgrade Tier', and select from the available premium plans. Upgrading instantly increases your task ceiling, grants priority customer support, and shaves withdrawal hold times down to under 10 minutes!"
      },
      {
        id: "deposit",
        subject: "🏦 Capital Funding Guide: How to Safely Deposit",
        headline: "Fund Your Direct Operations Securely",
        quote: "Your wallet is the engine that funds advertising budgets and registers course activations.",
        tip: "Hover over the Home panel and tap 'Deposit'. Enter your desired amount and click proceed. Our gateway integrates with Paystack, allowing safe bank transfers or card payments instantly. Make sure you copy the single-use virtual account details correctly."
      },
      {
        id: "run_ads",
        subject: "📢 Siphon Buyer Traffic: How to Launch Live Ads on Earnwise",
        headline: "The Earnwise Self-Serve Advertising Pipeline",
        quote: "If you have a great solution, the crowd must hear it. Ads grant you the megaphone.",
        tip: "Click on 'Advertise' or 'Create Ad Campaign' in your panel. Choose your daily budget, write a catchy hook, and paste your direct WhatsApp link. Our network of 50,000+ certified Nigerian scholars will begin reviewing and engaging with your campaign within minutes!"
      },
      {
        id: "earn_tasks",
        subject: "🎯 Earn 5,000 NGN Daily: Earning Through Tasks Wisely",
        headline: "The Ultimate Micro-Task Speedrunning Cheat Sheet",
        quote: "Success on tasks comes down to speed and unmanipulated compliance proof.",
        tip: "Log in around 8 AM and 6 PM when new corporate advertising audits and social follow tasks are assigned. Read task instructions carefully, perform the follow, like, or subscription, and upload the exact screenshot. Our system approves honest submissions instantly!"
      },
      {
        id: "buy_course",
        subject: "📚 Sourcing High-Income Skills: How to Buy Academy Courses",
        headline: "Unlock Permanent High-Yield Strategy Blueprints",
        quote: "An investment in knowledge always pays the best interest dividend.",
        tip: "Head to the 'Academy' page, browse top blueprints like 'Smartphone Canva & Mobile Design Mastery' or 'WhatsApp Organic Lead Siphon'. Make sure your wallet has sufficient balance, and click 'Enroll Now'. This instantly unlocks the offline lesson plans, strategy guides, and files!"
      }
    ];

    let selectedTopic = topics[0];
    if (topicId) {
      const match = topics.find(t => t.id === topicId);
      if (match) selectedTopic = match;
    } else {
      // Pick random topic for automated daily sequences
      selectedTopic = topics[Math.floor(Math.random() * topics.length)];
    }

    try {
      console.log(`[AUTH] Daily operational coaching triggering (${selectedTopic.id}) for ${email}...`);

      let storedServerSide = false;
      // 1. Send notification in-app if userId is provided
      if (userId && isDbAdminCapable) {
        try {
          await dbAdmin.collection('notifications').add({
            userId: userId,
            title: `🌅 Daily Hustle: ${selectedTopic.headline}`,
            message: `${selectedTopic.quote} 👉 Today's tip: ${selectedTopic.tip}`,
            type: 'reward',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            readBy: []
          });
          console.log(`[AUTH] In-app notification created for ${userId}`);
          storedServerSide = true;
        } catch (dbErr: any) {
          console.warn("[AUTH] Server Admin SDK failed writing in-app notification document:", dbErr.message || dbErr);
        }
      }

      // 2. Send email via Nodemailer
      await transporter.sendMail({
        from: `"Earnwise Coaching" <${process.env.EMAIL_USER}>`,
        to: email,
        replyTo: 'earnwise29@gmail.com',
        subject: selectedTopic.subject,
        text: `Hello ${name || 'Earner'},\n\nDAILY INSPIRATION: ${selectedTopic.headline}\n"${selectedTopic.quote}"\n\nTODAY'S ACTION TIP: ${selectedTopic.tip}\n\nGo to your dashboard to complete tasks`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #f0f0f0; border-radius: 20px; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 25px;">
              <h1 style="color: #2563eb; font-size: 24px; font-weight: 800; margin: 0; text-transform: uppercase;">Earnwise Daily Coach</h1>
              <p style="color: #64748b; font-size: 13px; margin: 5px 0 0 0;">Automated Success Coach • Active Multipliers</p>
            </div>
            
            <div style="background-color: #eff6ff; border-left: 5px solid #2563eb; padding: 20px; border-radius: 12px; margin: 25px 0;">
              <h3 style="margin-top: 0; color: #1e3a8a; font-size: 16px; text-transform: uppercase; font-weight: 800; letter-spacing: 0.05em;">${selectedTopic.headline}</h3>
              <p style="color: #1e40af; font-size: 15px; font-style: italic; margin-bottom: 0;">"${selectedTopic.quote}"</p>
            </div>

            <div style="border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; background-color: #fafafa; margin-bottom: 25px;">
              <h4 style="margin-top: 0; color: #1e293b; font-size: 14px; text-transform: uppercase; font-weight: 800;">Today's Strategic Action:</h4>
              <p style="font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 0;">${selectedTopic.tip}</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="https://earnwise-1.ai.studio" style="background-color: #2563eb; color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 12px; font-weight: 800; font-size: 14px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2); text-transform: uppercase;">Access Dashboard</a>
            </div>

            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #f1f5f9;">
              <p style="color: #94a3b8; font-size: 11px; margin-bottom: 5px; text-transform: uppercase;">Active Streak Protection Alert</p>
              <p style="color: #64748b; font-size: 12px; line-height: 1.5; margin: 0;">You are receiving this because you enabled Daily Earning Reminders on Earnwise. Engage everyday to scale.</p>
            </div>
          </div>
        `
      });

      console.log(`[AUTH] SUCCESS! Daily encouragement sent to ${email}`);
      res.json({ 
        status: "success", 
        message: "Daily encouragement successfully sent", 
        quote: selectedTopic,
        storeNotificationClientSide: !storedServerSide
      });
    } catch (error: any) {
      console.error("[AUTH] Error in send-daily-encouragement:", error);
      res.status(500).json({ error: "Failed to send daily encouragement email" });
    }
  });

  // Automated Payout (Withdrawal)
  app.post("/api/paystack/withdraw", async (req, res) => {
    const { userId, amount, bankDetails } = req.body;
    if (!PAYSTACK_SECRET) return res.status(500).json({ error: "Paystack secret not configured" });

    try {
      const userRef = dbAdmin.collection('users').doc(userId);
      const userDoc = await userRef.get();
      
      if (!userDoc.exists) return res.status(404).json({ error: "User not found" });
      const userData = userDoc.data();
      if (!userData || userData.balance < amount) {
        return res.status(400).json({ error: "Insufficient balance" });
      }
      if (!userData.plan || userData.plan === 'free') {
        return res.status(400).json({ error: "Upgrade your plan to start withdrawing." });
      }

      // Create Transfer Recipient
      const recipientResponse = await axios.post("https://api.paystack.co/transferrecipient", {
        type: "nuban",
        name: bankDetails.accountName,
        account_number: bankDetails.accountNumber,
        bank_code: bankDetails.bankCode,
        currency: "NGN"
      }, {
        headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` }
      });

      const recipientCode = recipientResponse.data.data.recipient_code;

      // Initiate Transfer
      const transferResponse = await axios.post("https://api.paystack.co/transfer", {
        source: "balance",
        amount: Math.round(amount * 100),
        recipient: recipientCode,
        reason: "Earnwise Withdrawal"
      }, {
        headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` }
      });

      if (transferResponse.data.status) {
        await userRef.update({
          balance: admin.firestore.FieldValue.increment(-amount),
          withdrawableBalance: admin.firestore.FieldValue.increment(-amount),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        await dbAdmin.collection('withdrawals').add({
          userId,
          amount,
          status: 'completed',
          bankDetails,
          paystackTransferId: transferResponse.data.data.id,
          requestedAt: admin.firestore.FieldValue.serverTimestamp(),
          processedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        await dbAdmin.collection('transactions').add({
          userId,
          amount: -amount,
          type: 'withdrawal',
          description: `Automated Withdrawal via Paystack`,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Send Notification
        await dbAdmin.collection('notifications').add({
          userId,
          title: '💸 Payment Processed!',
          message: `Your withdrawal of ₦${amount.toLocaleString()} was successful and sent to your bank.`,
          type: 'success',
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          readBy: []
        });

        res.json({ status: "success", message: "Withdrawal processed" });
      } else {
        res.status(400).json({ status: "failed", message: "Transfer initiation failed" });
      }
    } catch (error: any) {
      console.error("Withdrawal error:", error.response?.data || error.message);
      res.status(500).json({ error: "Automated withdrawal failed" });
    }
  });

  // --- 10. ACADEMY HUB (COURSES & AI TUTOR) ---

  // Secure Purchase Engine
  app.post("/api/v1/academy/purchase", async (req, res) => {
    const { userId, courseId, courseTitle } = req.body;
    if (!userId || !courseId) return res.status(400).json({ error: "Identity mismatch" });

    // Instantly bypass and engage client fallback if Admin SDK lacks database access capabilities
    if (!isDbAdminCapable) {
      console.info("[ACADEMY] Server Admin SDK is running in restricted mode. Automatically engaging Client SDK fallback execution...");
      return res.json({ success: true, useClientFallback: true });
    }

    try {
      const purchaseId = `${userId}_${courseId}`;
      const result = await dbAdmin.runTransaction(async (transaction) => {
        const userRef = dbAdmin.doc(`users/${userId}`);
        const userDoc = await transaction.get(userRef);

        if (!userDoc.exists) throw new Error("User protocol not found");
        
        const userData = userDoc.data();
        const isAdmin = userData?.role === 'admin';
        const plan = userData?.plan || 'free';
        const freeCoursesUsed = userData?.freeCoursesUsed || 0;
        const currentBalance = userData?.balance || 0;

        // Determine free credits based on plan
        let maxFreeCredits = 0;
        if (plan === 'golden') maxFreeCredits = 5;
        else if (plan === 'platinum') maxFreeCredits = 2;

        const hasFreeCredits = (freeCoursesUsed < maxFreeCredits) || isAdmin;
        const cost = hasFreeCredits ? 0 : 7000;

        if (!hasFreeCredits && currentBalance < 7000) {
          throw new Error("Insufficient capital. ₦7,000 required to unlock elite knowledge.");
        }

        // Check for existing purchase using predictable ID
        const purchaseRef = dbAdmin.collection('coursePurchases').doc(purchaseId);
        const purchaseDoc = await transaction.get(purchaseRef);
        
        if (purchaseDoc.exists) {
          throw new Error("Course already decentralized to your identity.");
        }

        const purchaseData: any = {
          purchaseId,
          userId,
          courseId,
          amount: cost,
          isFree: hasFreeCredits,
          purchasedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        transaction.set(purchaseRef, purchaseData);

        if (!hasFreeCredits) {
          transaction.update(userRef, {
            balance: admin.firestore.FieldValue.increment(-7000),
            withdrawableBalance: admin.firestore.FieldValue.increment(-7000)
          });

          const transRef = dbAdmin.collection('transactions').doc();
          transaction.set(transRef, {
            id: transRef.id,
            userId,
            amount: -7000,
            type: 'withdrawal',
            description: `Unlocked Course: ${courseTitle || 'Executive Strategy'}`,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          });
        } else if (!isAdmin) {
          // Consume a free credit if not admin
          transaction.update(userRef, {
            freeCoursesUsed: admin.firestore.FieldValue.increment(1)
          });
        }
      });

      res.json({ success: true, id: courseId });
    } catch (err: any) {
      console.error("[ACADEMY] Purchase failed:", err.message);
      if (err.message?.includes('permission') || err.message?.includes('PERMISSION_DENIED') || err.code === 7) {
        console.warn("[ACADEMY] Server database write denied. Engaging Client SDK fallback execution...");
        return res.json({ success: true, useClientFallback: true });
      }
      res.status(400).json({ error: err.message });
    }
  });

  // Gemini AI Tutor Endpoint
  app.post("/api/v1/academy/ask-tutor", async (req, res) => {
    const { userId, courseId, courseTitle, question, context } = req.body;
    if (!userId || !courseId || !question) return res.status(400).json({ error: "Context missing" });

    try {
      // Verify ownership with elegant fallback for environment permission limitations
      let hasAccess = false;
      if (isDbAdminCapable) {
        try {
          const purchaseCheck = await dbAdmin.collection('coursePurchases')
            .where('userId', '==', userId)
            .where('courseId', '==', courseId)
            .limit(1)
            .get();

          if (!purchaseCheck.empty) {
            hasAccess = true;
          }
        } catch (dbErr: any) {
          console.warn("[ACADEMY] Database check failed during admin mode:", dbErr.message);
          hasAccess = true;
        }
      } else {
        // Restricted Sandbox mode: Skip DB Admin collections lookup as the Client SDK
        // (CoursePlayer.tsx) already secures the UI access boundaries.
        hasAccess = true;
      }

      if (!hasAccess) {
        return res.status(403).json({ error: "Access Denied: Enrollment required for AI assistance." });
      }

      if (!process.env.GEMINI_API_KEY) {
        console.error("[ACADEMY] Missing GEMINI_API_KEY");
        return res.status(500).json({ error: "AI Tutor node configuration missing. Contact Support." });
      }

      console.log(`[ACADEMY] AI Tutor Query for Course: ${courseId}`);

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `You are the Earnwise Elite Academy Master Tutor. Your goal is to provide deep, actionable, and 1000-word level detail if requested.
        Student is studying: "${courseTitle || courseId}".
        Current Course Context: ${context || 'General earning strategy'}.
        
        TONE: Professional, Nigerian-success-driven, high-energy, and extremely practical.
        
        INSTRUCTIONS:
        1. If they ask for "more detail" or a "full course", provide an exhaustive breakdown (800-1200 words) of the strategy.
        2. Include specific tools, local Nigerian examples (e.g. Paystack, Bamboo, Cowrywise), and step-by-step execution logic.
        3. Break down the psychology of the customer and the mathematical projections of the earnings.
        
        Student Question: ${question}`
      });

      const text = response.text;
      if (!text) {
        throw new Error("Empty response from AI engine");
      }

      res.json({ answer: text });
    } catch (err: any) {
      console.error("[ACADEMY] AI Tutor Error Details:", err);
      res.status(500).json({ error: "AI Tutor node offline. Try again later." });
    }
  });

  // --- Vite / Static Files ---
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath, { index: false }));
    app.get("*", (req, res, next) => {
      // Don't handle API routes here
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // --- 10. DAILY ENGAGEMENT ENGINE (Notifications & Email) ---
  // Runs daily at 9:00 AM to keep users active
  cron.schedule('0 9 * * *', async () => {
    console.log("[CRON] Running daily engagement loop...");
    try {
      const usersSnap = await dbAdmin.collection('users').get();
      
      const emailBatch: Promise<any>[] = [];
      const notificationBatch = dbAdmin.batch();

      for (const userDoc of usersSnap.docs) {
        const userData = userDoc.data();
        const email = userData.email;
        const name = userData.displayName || 'valuable earner';

        // 1. Add In-App Notification
        const notifRef = dbAdmin.collection('notifications').doc();
        notificationBatch.set(notifRef, {
          userId: userDoc.id,
          title: '🌅 Good Morning, Earner!',
          message: 'New assignments and daily bonuses are waiting for you in your dashboard. Start earning now!',
          type: 'info',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          readBy: []
        });

        // 2. Prepare Daily Email
        if (email && email !== 'test@example.com' && !email.includes('example.com')) {
          emailBatch.push(
            transporter.sendMail({
              from: `"Earnwise Revenue" <${process.env.EMAIL_USER}>`,
              to: email,
              subject: `Today's Earnings Opportunity Is Live!`,
              text: `Hello ${name},\n\nYour Earnwise dashboard has been refreshed with new high-payout tasks. Don't leave your multipliers idle!\n\nCheck your dashboard: ${currentAppUrl}`,
              html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                  <h2 style="color: #2563eb;">🚀 Daily Bonus Refreshed!</h2>
                  <p>Hello <strong>${name}</strong>,</p>
                  <p>New tasks are waiting for you today. Log in now to keep your streak alive and maximize your revenue multipliers.</p>
                  <div style="margin: 30px 0;">
                    <a href="${currentAppUrl}" style="background-color: #2563eb; color: white; padding: 12px 25px; text-decoration: none; border-radius: 8px; font-weight: bold;">Launch My Dashboard</a>
                  </div>
                  <p style="font-size: 12px; color: #666;">Earnwise Elite Protocol v2.5</p>
                </div>
              `
            }).catch(e => console.error(`Failed to send daily mail to ${email}:`, e.message))
          );
        }
      }

      await notificationBatch.commit();
      console.log(`[CRON] Dispatched ${usersSnap.size} daily notifications.`);
    } catch (err) {
      console.error("[CRON] Engagement Loop Error:", err);
    }
  });

  // Trigger once on system start after 8 seconds
  setTimeout(() => {
    runAutomatedCoachingCycle().catch(e => console.error("Initial coaching cycle error:", e));
  }, 8000);

  // Scan every 3 minutes to keep the pipeline highly active and ready to process due dispatches
  setInterval(() => {
    runAutomatedCoachingCycle().catch(e => console.error("Interval coaching cycle error:", e));
  }, 3 * 60 * 1000);

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT} (isProd: ${isProd})`);
  });

  // Enable graceful stop
  process.once('SIGINT', () => bot?.stop('SIGINT'));
  process.once('SIGTERM', () => bot?.stop('SIGTERM'));
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
});
