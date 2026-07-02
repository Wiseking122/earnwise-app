import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import http from "http";
import { WebSocketServer } from "ws";
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
  let credential;
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      credential = admin.credential.cert(serviceAccount);
    } catch (e) {
      console.error("[FIREBASE] Could not parse FIREBASE_SERVICE_ACCOUNT_KEY, falling back to default.", e);
    }
  }

  firebaseApp = admin.apps.find(app => app?.name === 'earnwise-app') || admin.initializeApp({
    credential: credential || admin.credential.applicationDefault(),
    projectId: firebaseConfig.projectId
  }, 'earnwise-app');
} catch (err) {
  console.error("[FIREBASE] Admin App init error, trying default app:", err);
  firebaseApp = admin.apps.length > 0 ? admin.apps[0] : admin.initializeApp({
    credential: admin.credential.applicationDefault(),
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
  console.log("[FIREBASE] Using explicit Database ID:", dbId || '(default)');
} catch (err) {
  console.error("[FIREBASE] Error initializing with explicit DB ID:", err);
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
    
    if (firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)') {
       try {
         const fallbackDb = getFirestore(firebaseApp, '(default)');
         await fallbackDb.collection('users').limit(1).get();
         dbAdmin = fallbackDb;
         isDbAdminCapable = true;
         console.log("[FIREBASE] Fallback to (default) database succeeded.");
         await ensureOwnerAdminStatus();
       } catch (innerErr) {
         isDbAdminCapable = false;
       }
    }
    
    if (!isDbAdminCapable) {
      console.info("[FIREBASE] Server Admin SDK is running in restricted/client fallback mode. (Missing service account key or permissions). This is expected in the sandbox without FIREBASE_SERVICE_ACCOUNT_KEY set.");
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

// --- GEMINI INITIALIZATION ---
let aiInstance: GoogleGenAI | null = null;
function getAi() {
  const apiKey = (process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey || apiKey === "your_gemini_api_key_here") {
    return null;
  }
  
  if (!aiInstance) {
    console.log(`[GEMINI] Initializing client with key: ${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`);
    aiInstance = new GoogleGenAI({ 
      apiKey: apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });
  }
  return aiInstance;
}
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
  diamond: 10000,
  silver: 20000,
  platinum: 30000,
  golden: 50000
};

const PLAN_LIMITS: Record<string, { cap: number; daily: number }> = {
  free: { cap: 0, daily: 0 },
  elite: { cap: 7000, daily: 235 },
  starter: { cap: 14000, daily: 470 },
  pro: { cap: 22000, daily: 735 },
  bronze: { cap: 35000, daily: 1170 },
  diamond: { cap: 45000, daily: 1500 },
  silver: { cap: 9999999, daily: 2500 },
  platinum: { cap: 9999999, daily: 3000 },
  golden: { cap: 9999999, daily: 4000 }
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

// --- GEMINI RETRY HELPER ---
async function withRetry<T>(fn: (modelName: string) => Promise<T>, maxRetries = 6, initialDelay = 2000): Promise<T> {
  let lastError: any;
  // Use permitted Gemini 3 series models as defined by the SDK skill rules
  const models = ["gemini-3.5-flash", "gemini-3.1-flash-lite"];
  
  for (let i = 0; i < maxRetries; i++) {
    const modelIndex = i % models.length;
    const currentModel = models[modelIndex];
    try {
      return await fn(currentModel);
    } catch (err: any) {
      lastError = err;
      
      const errorMessage = err.message || "";
      const errorStatus = err.status || (errorMessage.includes('503') ? 503 : errorMessage.includes('429') ? 429 : 0);
      
      // Retry on transient errors OR if a specific model is not found (might be version mismatch)
      const isRetryable = 
        errorStatus === 503 || 
        errorStatus === 429 || 
        errorStatus === 404 || // Model not found for this specific version/key, try next in rotation
        errorMessage.toLowerCase().includes('unavailable') ||
        errorMessage.toLowerCase().includes('busy') ||
        errorMessage.toLowerCase().includes('high demand') ||
        errorMessage.toLowerCase().includes('overloaded') ||
        errorMessage.toLowerCase().includes('not found') ||
        errorMessage.toLowerCase().includes('deadline exceeded');

      if (isRetryable && i < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, Math.floor(i / models.length)) + Math.random() * 1000;
        console.warn(`[GEMINI] Retryable error (${errorStatus}) on ${currentModel}. Retrying with ${models[(i+1)%models.length]} in ${Math.round(delay)}ms... (Attempt ${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      console.error(`[GEMINI] Fatal error on ${currentModel}:`, errorMessage);
      throw err;
    }
  }
  throw lastError;
}

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      // or any localhost, vercel.app, render.com, run.app domain
      if (!origin || 
          origin.includes('localhost') || 
          origin.includes('vercel.app') || 
          origin.includes('onrender.com') || 
          origin.includes('run.app')) {
        callback(null, true);
      } else {
        callback(null, true); // Fallback to allow all origins so users never hit CORS issues
      }
    },
    credentials: true
  }));

  app.use(express.json({ limit: '50mb' })); // Increase body size limit to 50MB for video uploads as well

  // Run startup admin check (called from checkDbAdminCapability)
  // ensureOwnerAdminStatus();


  /**
   * Helper: Find a referrer doc by referralCode or username in a case-insensitive way.
   */
  async function findReferrerDoc(referredBy: string) {
    if (!referredBy || !isDbAdminCapable) return null;
    const cleanReferredBy = referredBy.trim();
    
    // 1. Try exact match
    let referrers = await dbAdmin.collection('users').where('referralCode', '==', cleanReferredBy).limit(1).get();
    if (!referrers.empty) return referrers.docs[0];
    
    // 2. Try lowercase match on referralCode
    referrers = await dbAdmin.collection('users').where('referralCode', '==', cleanReferredBy.toLowerCase()).limit(1).get();
    if (!referrers.empty) return referrers.docs[0];
    
    // 3. Try uppercase match on referralCode
    referrers = await dbAdmin.collection('users').where('referralCode', '==', cleanReferredBy.toUpperCase()).limit(1).get();
    if (!referrers.empty) return referrers.docs[0];
    
    // 4. Try lowercase match on username
    referrers = await dbAdmin.collection('users').where('username', '==', cleanReferredBy.toLowerCase()).limit(1).get();
    if (!referrers.empty) return referrers.docs[0];
    
    // 5. Try uppercase match on username
    referrers = await dbAdmin.collection('users').where('username', '==', cleanReferredBy.toUpperCase()).limit(1).get();
    if (!referrers.empty) return referrers.docs[0];
    
    return null;
  }

  /**
   * Helper: Awards referral bonus to referrer when a referred user upgrades.
   * Only awarded once per referred user.
   * @param userId The ID of the user who upgraded
   * @param planId The ID of the plan they upgraded to (to calculate 10% commission)
   */
  async function handleReferralUpgradeBonus(userId: string, planId: string) {
    if (!isDbAdminCapable) return;
    try {
      const userRef = dbAdmin.collection('users').doc(userId);
      const userDoc = await userRef.get();
      if (!userDoc.exists) return;
      const userData = userDoc.data();
      
      // Only award if they haven't received it yet and they have a referrer
      if (userData?.referredBy && !userData.hasReceivedReferralBonus) {
        const referrerDoc = await findReferrerDoc(userData.referredBy);
        
        if (referrerDoc) {
          // Calculate 30% of plan cost
          const planCost = PLAN_COSTS[planId] || 0;
          const bonusAmount = Math.floor(planCost * 0.3);
          
          if (bonusAmount <= 0) return; // No bonus for free or zero cost plans

          await dbAdmin.runTransaction(async (transaction) => {
            // Update referrer
            transaction.update(referrerDoc.ref, {
              balance: admin.firestore.FieldValue.increment(bonusAmount),
              referralBalance: admin.firestore.FieldValue.increment(bonusAmount),
              withdrawableBalance: admin.firestore.FieldValue.increment(bonusAmount),
              referralEarnings: admin.firestore.FieldValue.increment(bonusAmount),
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            
            // Set flag on referred user to prevent duplicate bonuses
            transaction.update(userRef, {
              hasReceivedReferralBonus: true
            });
            
            // Send notification to referrer
            const notifRef = dbAdmin.collection('notifications').doc();
            transaction.set(notifRef, {
              userId: referrerDoc.id,
              title: '🎁 Referral Upgrade Commission!',
              message: `Your friend upgraded to ${planId}! You have received a 30% commission of ₦${bonusAmount}.`,
              type: 'reward',
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              readBy: []
            });
          });
          
          console.log(`[REFERRAL] Awarded ₦${bonusAmount} (30% of ${planId}) bonus to referrer ${referrerDoc.id} for user ${userId}`);
        }
      }
    } catch (err) {
      console.error("[REFERRAL] FAILED to award upgrade bonus:", err);
    }
  }

  /**
   * Processes a referral reward when a referred user successfully deposits any amount.
   * Calculates exactly 20% of the deposit amount and credits it to the inviter's balance.
   * Uses a Firestore transaction for safe incrementing and idempotent protection (double-crediting prevention).
   * 
   * @param userId The ID of the user who made the deposit
   * @param depositAmount The amount of the deposit
   * @param reference The Paystack payment reference (used for idempotency verification)
   */
  async function handleReferralDepositBonus(userId: string, depositAmount: number, reference: string) {
    if (!isDbAdminCapable) return;
    try {
      console.log(`[REFERRAL_REWARD] Deposit referral bonus is deprecated per user instructions. Rewards are only given upon plan activation. Skipping for User ${userId}, Ref: ${reference}`);
      return;
    } catch (err: any) {
      console.error("[REFERRAL_REWARD] Fail inside handleReferralDepositBonus:", err.message);
    }
  }

  // --- FCM PUSH NOTIFICATIONS HELPERS ---
  async function sendPushNotification(userId: string, title: string, body: string, data = {}) {
    if (!isDbAdminCapable) return;
    try {
      const userDoc = await dbAdmin.collection('users').doc(userId).get();
      if (!userDoc.exists) return;
      const userData = userDoc.data();
      const tokens = userData?.fcmTokens || [];
      if (tokens.length === 0 || !userData?.pushEnabled) return;

      const message = {
        notification: { title, body },
        data: { ...data, click_action: "FLUTTER_NOTIFICATION_CLICK" },
        tokens
      };

      const response = await admin.messaging(firebaseApp).sendEachForMulticast(message);
      console.log(`[FCM] Sent to User ${userId}: ${response.successCount} success, ${response.failureCount} failure`);

      // Clean up invalid tokens
      if (response.failureCount > 0) {
        const failedTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const errCode = (resp.error as any)?.code;
            if (errCode === 'messaging/registration-token-not-registered' || errCode === 'messaging/invalid-registration-token') {
               failedTokens.push(tokens[idx]);
            }
          }
        });
        if (failedTokens.length > 0) {
          await dbAdmin.collection('users').doc(userId).update({
            fcmTokens: admin.firestore.FieldValue.arrayRemove(...failedTokens)
          });
        }
      }
    } catch (err) {
      console.error("[FCM] Error sending message:", err);
    }
  }

  async function broadcastPushNotification(title: string, body: string, data = {}) {
    if (!isDbAdminCapable) return;
    try {
      const usersSnap = await dbAdmin.collection('users').where('pushEnabled', '==', true).get();
      const allTokens: string[] = [];
      usersSnap.forEach(doc => {
        const tokens = doc.data().fcmTokens || [];
        allTokens.push(...tokens);
      });
      if (allTokens.length === 0) return;

      // FCM sendEachForMulticast limit is 500 tokens per call
      for (let i = 0; i < allTokens.length; i += 500) {
        const batch = allTokens.slice(i, i + 500);
        const message = {
          notification: { title, body },
          data,
          tokens: batch
        };
        await admin.messaging(firebaseApp).sendEachForMulticast(message);
      }
      console.log(`[FCM] Broadcasted to ${allTokens.length} tokens`);
    } catch (err) {
      console.error("[FCM] Broadcast error:", err);
    }
  }

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
        const baseUrl = "https://earnwise1.vercel.app";
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
        ctx.reply("👥 *Refer & Earn 30% Commission*\n\nInvite your friends and earn:\n1. 30% Upgrade Commission when they activate any plan\n\nGet your unique link in the app!", {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: "🔗 Get Referral Link", url: getWebAppUrl('/referral') }]
            ]
          }
        });
      });

      bot.command('group', (ctx) => {
        ctx.reply("👥 *Join the Official Earnwise Chat Group*\n\nConnect with over 10,000+ active earners in Nigeria. Share tips, proofs, and get community support.\n\n🔗 Join here: https://t.me/Earnwise01", {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: "🤝 Join Telegram Group", url: "https://t.me/Earnwise01" }]
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
                [{ text: "🤝 Join Telegram Group", url: "https://t.me/Earnwise01" }],
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
          await bot.telegram.sendMessage(userId, `🇳🇬 *Welcome to the Earnwise community, ${userName}!* 🎉\n\nYou've just entered Nigeria's #1 digital wealth community. Let's get you set up to start earning real cash daily! 🚀\n\n📖 *YOUR COMPLETE GUIDE TO EARNWISE:*\n\n1️⃣ *Launch the Web App*\nClick the *"💰 Open Earnwise"* button below (or run /start) and sign in to access your customized dashboard directly inside Telegram.\n\n2️⃣ *Activate Your Plan (Multiply Profits)*\nTo unlock high-paying tasks, head over to the *Upgrade* page. Choose a Tier that fits your goal to multiply your rewards up to 500%:\n• *Elite Tier* (1.25x Earning Multiplier)\n• *Lite Tier* (1.5x Earning Multiplier)\n• *Bronze Tier* (2.0x Earning Multiplier)\n• *Silver Tier* (3.0x Earning Multiplier)\n• *Golden Tier* (5.0x Earning Multiplier) 💎\n\n3️⃣ *Complete Micro-Tasks*\nVisit the **Tasks** page. Like, subscribe, share, or download apps, and upload an honest screenshot. Submissions are verified instantly by our smart audit engine.\n\n4️⃣ *Withdraw Instantly*\nAccumulate up to ₦1,000 and select your local Nigerian bank. Withdrawals are processed 24/7 automatically via paystack!\n\n5️⃣ *Refers and Bonuses*\nTap *Referrals* to share your unique link. You'll receive a commission instantly for every friend who signs up and registers!\n\n👇 Click the buttons below to launch the App and join our community!`, {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: "💰 Open Earnwise App", url: getWebAppUrl() }],
                [{ text: "🤝 Join Telegram Group", url: "https://t.me/Earnwise01" }],
                [{ text: "⚡ Open via Bot Private Chat", url: `https://t.me/${botUsername}?start=start` }]
              ]
            }
          });

          // Also post a welcome greeting directly to the chat they joined (or fallback to community group)
          const announceChatId = ctx.chat.type === 'supergroup' ? ctx.chat.id : '@Earnwise01';
          await bot.telegram.sendMessage(announceChatId, `🇳🇬 *Let's welcome ${userName} to Earnwise!* 🎉\n\nYour request has been approved. Launch your app and activate your earnings below:`, {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: "💰 Open Earnwise App", url: getWebAppUrl() }],
                [{ text: "🤝 Join Telegram Group", url: "https://t.me/Earnwise01" }],
                [{ text: "⚡ Open via Bot Private Chat", url: `https://t.me/${botUsername}?start=start` }]
              ]
            }
          }).catch(e => console.warn(`[BOT] Could not post welcome update in group:`, e.message));
        } catch (err: any) {
          console.warn(`[BOT] chat_join_request handler was unable to message user (it requires the user to have interacted with the bot in private before):`, err.message);
          
          const userName = ctx.chatJoinRequest.from.first_name || "New Earnwise Earner";
          // Fallback: If messaging them privately failed, we post the welcome to the group so they can see their welcome guide and open it!
          const fallbackChatId = ctx.chat.type === 'supergroup' ? ctx.chat.id : '@Earnwise01';
          await bot.telegram.sendMessage(fallbackChatId, `🇳🇬 *Welcome to the Earnwise community, ${userName}!* 🎉\n\nI tried to send you the official Setup Guide in private, but please use the links below to start earning:\n\n📖 *YOUR QUICK START GUIDE:*\n• 1️⃣ Click *"💰 Open Earnwise App"* to register/login.\n• 2️⃣ Go to *Upgrade* inside the app to activate your multiplication tier panels (1.25x - 5.0x).\n• 3️⃣ Click *Tasks* to complete easy social earning tasks.\n• 4️⃣ Withdraw directly to your local Nigerian bank!\n\n👇 Use the active links below to start:`, {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: "💰 Open Earnwise App", url: getWebAppUrl() }],
                [{ text: "🤝 Join Telegram Group", url: "https://t.me/Earnwise01" }],
                [{ text: "⚡ Open via Bot Private Chat", url: `https://t.me/${botUsername}?start=start` }]
              ]
            }
          }).catch(e => console.warn(`[BOT] Could not post fallback welcome in group:`, e.message));
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
  async function runAutomatedCoachingCycle(force = false) {
    if (!isDbAdminCapable) {
      console.info("[COACHING-AUTO] DB Admin is not write capable. Skipping cycle.");
      return;
    }

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn("[COACHING-AUTO] EMAIL_USER or EMAIL_PASS not configured. Coaching emails will fail.");
    }

    console.log(`[COACHING-AUTO] Starting coaching cycle at ${new Date().toISOString()}. Force: ${force}`);
    try {
      // Get a batch of users to process. We'll filter for enabled coaching in memory 
      // because Firestore != query doesn't include documents where the field is missing.
      const usersSnap = await dbAdmin.collection('users').get();

      if (usersSnap.empty) {
        console.log("[COACHING-AUTO] No users found in database.");
        return;
      }

      const eligibleUsers = usersSnap.docs.filter(doc => {
        const data = doc.data();
        // Eligible if not explicitly disabled
        return data.dailyEmailEnabled !== false;
      });

      if (eligibleUsers.length === 0) {
        console.log("[COACHING-AUTO] No eligible users (coaching enabled) found in this batch.");
        return;
      }

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
      const minIntervalMs = 2 * 60 * 60 * 1000; // 2 hour cycle gap

      for (const userDoc of eligibleUsers) {
        const userData = userDoc.data();
        
        let lastCoachingTime = 0;
        if (userData.lastCoachingAt) {
          lastCoachingTime = userData.lastCoachingAt.toMillis ? userData.lastCoachingAt.toMillis() : new Date(userData.lastCoachingAt).getTime();
        }

        if (force || lastCoachingTime === 0 || (now - lastCoachingTime >= minIntervalMs)) {
          const currentStep = userData.coachingStep || 0;
          const selectedTopic = topics[currentStep % topics.length];
          const nextStep = (currentStep + 1) % topics.length;

          // Dispatch simultaneously for speed
          const dispatches = [];

          // 1. In-app Notification
          dispatches.push(
            dbAdmin.collection('notifications').add({
              userId: userDoc.id,
              title: `🌅 Wise AI Daily: ${selectedTopic.headline}`,
              message: `${selectedTopic.quote} 👉 Tip: ${selectedTopic.tip}`,
              type: 'reward',
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              readBy: [],
              read: false
            })
          );

          // 2. Email (if configured)
          if (userData.email && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            dispatches.push(
              transporter.sendMail({
                from: `"Wise AI Coaching" <${process.env.EMAIL_USER}>`,
                to: userData.email,
                replyTo: 'earnwise29@gmail.com',
                subject: selectedTopic.subject,
                html: `<div style="font-family: Arial; padding: 20px;"><h2>${selectedTopic.headline}</h2><p><i>"${selectedTopic.quote}"</i></p><p>${selectedTopic.tip}</p></div>`
              })
            );
          }

          // 3. Update User Metadata
          dispatches.push(
            userDoc.ref.update({
              coachingStep: nextStep,
              lastCoachingAt: admin.firestore.FieldValue.serverTimestamp()
            })
          );

          await Promise.all(dispatches).catch(err => console.error(`[COACHING-AUTO] Partial failure for user ${userDoc.id}:`, err.message));
        }
      }
      if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        try {
          await transporter.sendMail({
            from: `"Wise AI Coaching" <${process.env.EMAIL_USER}>`,
            to: 'wiseking7890@gmail.com',
            subject: `✅ Coaching Cycle Dispatched`,
            html: `<div style="font-family: Arial; padding: 20px;"><h2>Coaching Cycle Complete</h2><p>The coaching engine successfully scanned ${usersSnap.size} users.</p></div>`
          });
        } catch (e) {}
      }

      console.log(`[COACHING-AUTO] Cycle completed for ${usersSnap.size} scanned users.`);
    } catch (err: any) {
      console.error("[COACHING-AUTO] Fatal cycle error:", err);
    }
  }

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", botActive: !!bot });
  });

  app.get("/api/debug-user", async (req, res) => {
    try {
      const email = "wiseking7890@gmail.com";
      console.log("[DEBUG-USER] Request received for email:", email);
      
      if (!isDbAdminCapable) {
        return res.json({ error: "Server Admin SDK is not capable/authenticated in this environment." });
      }

      const usersSnap = await dbAdmin.collection('users').where('email', '==', email).get();
      if (usersSnap.empty) {
        // Let's list some users so we know what emails exist
        const allUsers = await dbAdmin.collection('users').limit(10).get();
        const usersList = allUsers.docs.map(doc => ({ id: doc.id, email: doc.data().email, plan: doc.data().plan }));
        return res.json({ 
          error: "No user found with email " + email,
          sampleUsers: usersList 
        });
      }

      const userDoc = usersSnap.docs[0];
      const userId = userDoc.id;
      const userData = userDoc.data();

      // Retrieve completions
      const completionsSnap = await dbAdmin.collection('completions').where('userId', '==', userId).get();
      const completionsList = completionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // If fix query parameter is set to 'true', auto-approve any pending completions and credit the user
      const fixedCompletions = [];
      const fix = req.query.fix === "true";
      if (fix) {
        for (const comp of completionsSnap.docs) {
          const compData = comp.data();
          if (compData.status === 'pending') {
            const reward = Number(compData.rewardEarned) || 0;
            if (reward > 0) {
              await dbAdmin.runTransaction(async (transaction) => {
                const userRef = dbAdmin.collection('users').doc(userId);
                const compRef = dbAdmin.collection('completions').doc(comp.id);

                transaction.update(userRef, {
                  balance: admin.firestore.FieldValue.increment(reward),
                  withdrawableBalance: admin.firestore.FieldValue.increment(reward),
                  taskBalance: admin.firestore.FieldValue.increment(reward),
                  taskEarnings: admin.firestore.FieldValue.increment(reward),
                  totalEarnings: admin.firestore.FieldValue.increment(reward),
                  tasksCompleted: admin.firestore.FieldValue.increment(1),
                  updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });

                transaction.update(compRef, {
                  status: 'approved',
                  updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
              });
              fixedCompletions.push({ taskId: compData.taskId, rewardEarned: reward });
            }
          }
        }
      }

      // Re-fetch user details if we ran a fix
      let updatedUserData = userData;
      if (fix && fixedCompletions.length > 0) {
        const refreshedUser = await dbAdmin.collection('users').doc(userId).get();
        updatedUserData = refreshedUser.data();
      }

      return res.json({
        userId,
        email,
        fixed: fixedCompletions.length > 0,
        fixedCompletions,
        userData: updatedUserData,
        completions: completionsList
      });
    } catch (err: any) {
      console.error("[DEBUG-USER] Error in endpoint:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /api/rewards/verify
   * Secure endpoint for verifying ad completions and crediting user accounts.
   */
  app.post("/api/rewards/verify", async (req, res) => {
    const { userId, taskId, type, deviceFingerprint } = req.body;
    
    console.log(`[REWARD-VERIFY] Processing reward for User: ${userId}, Task: ${taskId}, Type: ${type}`);
    
    if (!userId || !taskId) {
      return res.status(400).json({ success: false, message: "Missing required parameters" });
    }

    // Velocity Gate (Anti-Bot & Multi-Account Farming)
    const now = Date.now();
    const cooldownMs = 45 * 1000;
    
    // Check both User ID and Device Fingerprint for cooldown
    const lastUserActivityTime = lastUserActivity.get(userId.toString()) || 0;
    const lastDeviceActivityTime = deviceFingerprint ? (lastUserActivity.get(`DEV_${deviceFingerprint}`) || 0) : 0;
    
    const maxLastActivity = Math.max(lastUserActivityTime, lastDeviceActivityTime);

    if (now - maxLastActivity < cooldownMs) {
      const remaining = Math.ceil((cooldownMs - (now - maxLastActivity)) / 1000);
      return res.status(429).json({ 
        success: false, 
        message: `Fraud Detection: Pacing required. Please wait ${remaining}s.` 
      });
    }
    
    lastUserActivity.set(userId.toString(), now);
    if (deviceFingerprint) lastUserActivity.set(`DEV_${deviceFingerprint}`, now);

    try {
      if (isDbAdminCapable) {
        const userRef = dbAdmin.collection('users').doc(userId.toString());
        const userDoc = await userRef.get();

        if (userDoc.exists) {
          const userData = userDoc.data()!;

          // Device Binding Security Check (One-Phone-One-Account)
          if (deviceFingerprint) {
            // Check if THIS device is owned by someone ELSE
            const deviceOwnerSnap = await dbAdmin.collection('users')
              .where('deviceFingerprint', '==', deviceFingerprint)
              .limit(1)
              .get();
            
            if (!deviceOwnerSnap.empty && deviceOwnerSnap.docs[0].id !== userId.toString()) {
              return res.status(403).json({
                success: false,
                message: "Security Violation: This device is associated with another Earnwise account. Multi-account usage on one device is strictly prohibited."
              });
            }

            // Bind device if not set or update if changed (and verified above as not owned)
            if (userData.deviceFingerprint !== deviceFingerprint) {
              await userRef.update({ deviceFingerprint });
            }
          }

          // Calculate dynamic reward based on task type or specific taskId
          let rewardAmount = 50; // Default reward
          if (type === 'video_ad') {
            // Find reward from predefined list if possible, or use default
            rewardAmount = 50; 
          }
          
          const multiplier = TIER_MULTIPLIERS[userData.plan || 'free'] || 1.0;
          const finalReward = rewardAmount * multiplier;

          await userRef.update({
             balance: admin.firestore.FieldValue.increment(finalReward),
             withdrawableBalance: admin.firestore.FieldValue.increment(finalReward),
             taskBalance: admin.firestore.FieldValue.increment(finalReward),
             taskEarnings: admin.firestore.FieldValue.increment(finalReward),
             totalEarnings: admin.firestore.FieldValue.increment(finalReward),
             updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          
          // Log task completion in a subcollection
          await userRef.collection('task_completions').add({
            taskId,
            type,
            reward: finalReward,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            status: 'verified'
          });

          // Record Transaction
          await dbAdmin.collection('transactions').add({
            userId: userId.toString(),
            amount: finalReward,
            type: 'earning',
            description: `Ad Reward: ${type.replace('_', ' ')}`,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          });

          sendPushNotification(userId.toString(), "🎯 Reward Received", `You earned ₦${finalReward} for completing a ${type.replace('_', ' ')} task!`);
        }
      }

      return res.json({ 
        success: true, 
        message: "Reward processed successfully",
        preview: !isDbAdminCapable 
      });
    } catch (err) {
      console.error("[REWARD-VERIFY] Error crediting reward:", err);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
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
            taskBalance: admin.firestore.FieldValue.increment(Number(amount_local)),
            totalSurveyEarnings: admin.firestore.FieldValue.increment(Number(amount_local)),
            taskEarnings: admin.firestore.FieldValue.increment(Number(amount_local)),
            totalEarnings: admin.firestore.FieldValue.increment(Number(amount_local)),
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
   * ANY /api/postbacks/wannads
   * Wannads Postback Webhook Handler
   * Verifies signature and credits user balance on successful completion.
   */
  app.all("/api/postbacks/wannads", async (req, res) => {
    // Wannads can send data via GET or POST depending on your setup
    const data = { ...req.query, ...req.body };
    const { subId, transId, reward, signature, status } = data;

    console.log(`[WEBHOOK-WANNADS] Received callback: User: ${subId}, Trans: ${transId}, Reward: ${reward}, Status: ${status}`);

    if (!subId || !transId || !reward || !signature) {
      console.warn("[WEBHOOK-WANNADS] Missing required parameters.");
      return res.status(400).send("Missing parameters");
    }

    // Verify Signature: md5(subId + transId + reward + WANNADS_POSTBACK_SECRET)
    const secret = process.env.WANNADS_POSTBACK_SECRET;
    if (!secret) {
      console.error("[WEBHOOK-WANNADS] WANNADS_POSTBACK_SECRET is missing.");
      return res.status(500).send("Configuration error");
    }

    const calculatedSignature = crypto.createHash('md5')
      .update(`${subId}${transId}${reward}${secret}`)
      .digest('hex');

    if (signature !== calculatedSignature) {
      console.warn(`[WEBHOOK-WANNADS] Signature mismatch. Received: ${signature}, Expected: ${calculatedSignature}`);
      return res.status(403).send("Invalid signature");
    }

    try {
      // Status 1 = Success/Approved, Status 2 = Chargeback/Reversal
      if (status === '1' || status === 1) {
        if (isDbAdminCapable) {
          const userRef = dbAdmin.collection('users').doc(subId as string);
          const userDoc = await userRef.get();
          
          if (!userDoc.exists) {
            console.warn(`[WEBHOOK-WANNADS] User ${subId} not found in database.`);
            return res.status(200).send("OK"); // Still return OK to avoid retries if signature is valid
          }

          const rewardNum = Number(reward);

          await dbAdmin.runTransaction(async (transaction) => {
            transaction.update(userRef, {
              balance: admin.firestore.FieldValue.increment(rewardNum),
              withdrawableBalance: admin.firestore.FieldValue.increment(rewardNum),
              taskBalance: admin.firestore.FieldValue.increment(rewardNum),
              totalOfferwallEarnings: admin.firestore.FieldValue.increment(rewardNum),
              taskEarnings: admin.firestore.FieldValue.increment(rewardNum),
              totalEarnings: admin.firestore.FieldValue.increment(rewardNum),
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            // Record Transaction
            const transRef = dbAdmin.collection('transactions').doc();
            transaction.set(transRef, {
              userId: subId,
              amount: rewardNum,
              type: 'earning',
              description: `Wannads Reward - TID: ${transId}`,
              createdAt: admin.firestore.FieldValue.serverTimestamp()
            });

            // Add notification
            const notifRef = dbAdmin.collection('notifications').doc();
            transaction.set(notifRef, {
              userId: subId,
              title: "🎁 Wannads Reward Credited!",
              message: `You earned ₦${rewardNum} from Wannads tasks/surveys.`,
              type: 'reward',
              read: false,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              readBy: []
            });
          });
          
          console.log(`[WEBHOOK-WANNADS] SUCCESS: Credited User ${subId} with ₦${rewardNum}`);
        }
      } else if (status === '2' || status === 2) {
        console.log(`[WEBHOOK-WANNADS] CHARGEBACK: Revoking ${reward} for User ${subId}`);
        if (isDbAdminCapable) {
          const userRef = dbAdmin.collection('users').doc(subId as string);
          const rewardNum = Number(reward);

          await dbAdmin.runTransaction(async (transaction) => {
            transaction.update(userRef, {
              balance: admin.firestore.FieldValue.increment(-rewardNum),
              withdrawableBalance: admin.firestore.FieldValue.increment(-rewardNum),
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            const transRef = dbAdmin.collection('transactions').doc();
            transaction.set(transRef, {
              userId: subId,
              amount: -rewardNum,
              type: 'earning',
              description: `Wannads Chargeback - TID: ${transId}`,
              createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
          });
        }
      }
      
      // Wannads expects a "1" or "OK" to stop retrying
      return res.status(200).send("1");
    } catch (err: any) {
      console.error("[WEBHOOK-WANNADS] Processing error:", err.message);
      return res.status(500).send("Internal error");
    }
  });

  /**
   * GET /api/postbacks/rapidoreach
   * RapidoReach Postback Webhook Handler
   * Verifies signature and credits user balance.
   */
  app.get("/api/postbacks/rapidoreach", async (req, res) => {
    const { transactionId, endUserId, status, currencyAmt, txnHash } = req.query;

    console.log(`[WEBHOOK-RAPIDOREACH] Received: User: ${endUserId}, Trans: ${transactionId}, Amount: ${currencyAmt}, Status: ${status}`);

    if (!transactionId || !endUserId || !status || !txnHash) {
      console.warn("[WEBHOOK-RAPIDOREACH] Missing required parameters.");
      return res.status(400).send("0");
    }

    // Source IP Whitelisting
    const whitelistedIPs = ['161.97.78.55', '173.212.227.149', '75.119.139.250', '75.119.139.251'];
    const clientIP = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    // In production environment, check if the clientIP is in the whitelist
    // Note: If behind proxies, ensure proper headers are trusted.
    console.log(`[WEBHOOK-RAPIDOREACH] Request from IP: ${clientIP}`);

    // Verify Signature: md5(transactionId + RAPIDOREACH_APP_KEY)
    const appKey = process.env.RAPIDOREACH_APP_KEY;
    if (!appKey) {
      console.error("[WEBHOOK-RAPIDOREACH] RAPIDOREACH_APP_KEY is missing.");
      return res.status(500).send("0");
    }

    const calculatedHash = crypto.createHash('md5')
      .update(`${transactionId}${appKey}`)
      .digest('hex');

    if (txnHash !== calculatedHash) {
      console.warn(`[WEBHOOK-RAPIDOREACH] Signature mismatch. Received: ${txnHash}, Expected: ${calculatedHash}`);
      return res.status(403).send("0");
    }

    try {
      // Status "C" = Completed
      if (status === 'C') {
        if (isDbAdminCapable) {
          const userRef = dbAdmin.collection('users').doc(endUserId as string);
          const userDoc = await userRef.get();

          if (!userDoc.exists) {
            console.warn(`[WEBHOOK-RAPIDOREACH] User ${endUserId} not found.`);
            return res.status(200).send("1"); 
          }

          const amount = Number(currencyAmt);

          await dbAdmin.runTransaction(async (transaction) => {
            transaction.update(userRef, {
              balance: admin.firestore.FieldValue.increment(amount),
              withdrawableBalance: admin.firestore.FieldValue.increment(amount),
              taskBalance: admin.firestore.FieldValue.increment(amount),
              totalSurveyEarnings: admin.firestore.FieldValue.increment(amount),
              taskEarnings: admin.firestore.FieldValue.increment(amount),
              totalEarnings: admin.firestore.FieldValue.increment(amount),
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            // Record Transaction
            const transRef = dbAdmin.collection('transactions').doc();
            transaction.set(transRef, {
              userId: endUserId,
              amount: amount,
              type: 'earning',
              description: `RapidoReach Survey Reward - TID: ${transactionId}`,
              createdAt: admin.firestore.FieldValue.serverTimestamp()
            });

            // Notification
            const notifRef = dbAdmin.collection('notifications').doc();
            transaction.set(notifRef, {
              userId: endUserId,
              title: "🚀 RapidoReach Reward!",
              message: `You earned ₦${amount} from a RapidoReach survey.`,
              type: 'reward',
              read: false,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              readBy: []
            });
          });

          console.log(`[WEBHOOK-RAPIDOREACH] SUCCESS: Credited User ${endUserId} with ₦${amount}`);
        }
      } else if (status === 'P') {
        // Status "P" = Attempted/Screenout
        console.log(`[WEBHOOK-RAPIDOREACH] INFO: User ${endUserId} screened out of survey ${transactionId}.`);
      }

      // RapidoReach expects "1" on success
      return res.status(200).send("1");
    } catch (err: any) {
      console.error("[WEBHOOK-RAPIDOREACH] Error processing reward:", err.message);
      return res.status(500).send("0");
    }
  });

  /**
   * GET /api/cpx/signed-url
   * Generates a signed survey URL to keep the secret hash hidden from the client.
   */
  app.get("/api/cpx/signed-url", async (req, res) => {
    const { user_id, username, email } = req.query;
    const appId = process.env.CPX_APP_ID || '33341';
    const secureHash = process.env.CPX_SECURE_HASH;

    if (!user_id) {
      return res.status(400).json({ error: "User ID is required" });
    }

    let signedUrl = `https://offers.cpx-research.com/index.php?app_id=${appId}&ext_user_id=${user_id}&username=${encodeURIComponent(String(username || ''))}&email=${encodeURIComponent(String(email || ''))}&subid_1=&subid_2=`;

    if (secureHash) {
      const hash = crypto.createHash('md5').update(`${user_id}-${secureHash}`).digest('hex');
      signedUrl += `&secure_hash=${hash}`;
    }

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

  app.post("/api/admin/broadcast", async (req, res) => {
    const { title, message, type } = req.body;
    if (!title || !message) return res.status(400).json({ error: "Broadcasting requires title and message." });

    if (!isDbAdminCapable) return res.status(503).json({ error: "Database node restricted." });

    try {
      console.log(`[ADMIN-BROADCAST] Initiating global broadcast: ${title}`);
      
      await dbAdmin.collection('notifications').add({
        userId: 'all',
        title,
        message,
        type: type || 'system',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        readBy: []
      });

      res.json({ status: "success", message: "Global broadcast successfully decentralized to all active nodes." });
    } catch (err: any) {
      console.error("[ADMIN-BROADCAST] Logic breach:", err);
      res.status(500).json({ error: "Broadcast failed." });
    }
  });

  app.post("/api/admin/trigger-coaching", async (req, res) => {
    try {
      const force = req.query.force === 'true';
      console.log(`[ADMIN] Manual coaching trigger received. Force mode: ${force}`);
      await runAutomatedCoachingCycle(force);
      res.json({ status: "success", message: force ? "Force coaching cycle dispatched successfully." : "Standard coaching cycle scan completed successfully." });
    } catch (err: any) {
      console.error("[ADMIN] Manual coaching trigger failed:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/admin/send-payout-email", async (req, res) => {
    const { email, name, amount, netPayout, fee, withdrawalId, bankName, accountName, accountNumber, withdrawalType } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    try {
      if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        await transporter.sendMail({
          from: `"Earnwise Payouts" <${process.env.EMAIL_USER}>`,
          to: email,
          replyTo: 'earnwise29@gmail.com',
          subject: `💸 Payout Approved & Processed - ₦${Number(netPayout).toLocaleString()}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #f0f0f0; border-radius: 20px; background-color: #ffffff;">
              <div style="text-align: center; margin-bottom: 25px;">
                <h1 style="color: #10b981; font-size: 24px; font-weight: 800; margin: 0; text-transform: uppercase;">Earnwise Payout Approved</h1>
                <p style="color: #64748b; font-size: 13px; margin: 5px 0 0 0;">Transaction Successful • Reference: #${withdrawalId ? withdrawalId.slice(0, 8) : ''}</p>
              </div>
              
              <div style="background-color: #ecfdf5; border-left: 5px solid #10b981; padding: 20px; border-radius: 12px; margin: 25px 0; text-align: center;">
                <h3 style="margin-top: 0; color: #065f46; font-size: 14px; text-transform: uppercase; font-weight: 800; letter-spacing: 0.05em; margin-bottom: 5px;">Net Credit Amount</h3>
                <h2 style="color: #047857; font-size: 32px; font-weight: 900; margin: 0;">₦${Number(netPayout).toLocaleString()}</h2>
              </div>

              <div style="border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; background-color: #fafafa; margin-bottom: 25px;">
                <h4 style="margin-top: 0; color: #1e293b; font-size: 13px; text-transform: uppercase; font-weight: 800; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 12px;">Transaction Details</h4>
                <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
                  <tr style="height: 30px;">
                    <td style="color: #64748b; font-weight: 500;">Beneficiary</td>
                    <td style="color: #1e293b; font-weight: 700; text-align: right;">${name || 'Earner'}</td>
                  </tr>
                  <tr style="height: 30px;">
                    <td style="color: #64748b; font-weight: 500;">Bank Name</td>
                    <td style="color: #1e293b; font-weight: 700; text-align: right;">${bankName || 'N/A'}</td>
                  </tr>
                  <tr style="height: 30px;">
                    <td style="color: #64748b; font-weight: 500;">Account Number</td>
                    <td style="color: #1e293b; font-weight: 700; text-align: right;">${accountNumber || 'N/A'}</td>
                  </tr>
                  <tr style="height: 30px;">
                    <td style="color: #64748b; font-weight: 500;">Gross Amount</td>
                    <td style="color: #1e293b; font-weight: 700; text-align: right;">₦${Number(amount).toLocaleString()}</td>
                  </tr>
                  <tr style="height: 30px;">
                    <td style="color: #64748b; font-weight: 500;">Processing Fee (${withdrawalType === 'referral' ? 'Free' : '10%'})</td>
                    <td style="${withdrawalType === 'referral' ? 'color: #10b981;' : 'color: #e11d48;'} font-weight: 700; text-align: right;">${withdrawalType === 'referral' ? 'Free (₦0)' : `-₦${Number(fee).toLocaleString()}`}</td>
                  </tr>
                </table>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <p style="color: #475569; font-size: 14px; margin-bottom: 15px;">Your digital earner proof receipt is ready. Share it on your status to earn referrals!</p>
                <a href="${currentAppUrl || 'https://ais-pre-ucu3byd4dxfepn7umejqhx-558253480073.europe-west2.run.app'}/earnings" style="background-color: #10b981; color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 12px; font-weight: 800; font-size: 14px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.2); text-transform: uppercase;">Download Proof Receipt</a>
              </div>

              <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #f1f5f9;">
                <p style="color: #94a3b8; font-size: 10px; margin-bottom: 5px; text-transform: uppercase;">Earnwise Elite Financial Protocol</p>
                <p style="color: #64748b; font-size: 12px; line-height: 1.5; margin: 0;">If you did not initiate this transaction, please contact support immediately.</p>
              </div>
            </div>
          `
        });
        console.log(`[PAYOUT-EMAIL] Successfully sent payout approved email via SMTP to ${email}`);
        return res.json({ status: "success", message: "Email sent successfully" });
      } else {
        console.warn(`[PAYOUT-EMAIL] EMAIL_USER/EMAIL_PASS not configured. Email simulated for ${email}.`);
        return res.json({ status: "success", message: "Email simulation complete (credentials missing)" });
      }
    } catch (err: any) {
      console.error("[PAYOUT-EMAIL] Failed to send payout approval email:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /api/v1/tasks/breakdown
   * Uses AI to convert a vague user task into 5 specific actionable sub-tasks.
   */
  app.post("/api/v1/tasks/breakdown", async (req, res) => {
    const { taskTitle, userId } = req.body;
    if (!taskTitle) return res.status(400).json({ error: "Task title required" });

    const mockSubtasks = [
      {
        title: "Identify Target Audience Demographics",
        description: `Analyze who will benefit most from "${taskTitle}" and locate where they hang out online.`,
        monetizationAngle: "Maximizes click-through rate and affiliate commission margins."
      },
      {
        title: "Create Compelling Marketing Content",
        description: "Draft 3 persuasive copy variations focusing on the unique benefits or income potential.",
        monetizationAngle: "Increases user engagement and conversions by up to 40%."
      },
      {
        title: "Promote Across High-Traffic Channels",
        description: "Distribute your crafted content on Twitter, WhatsApp status, and Facebook digital earner groups.",
        monetizationAngle: "Leverages organic social media reach for zero-acquisition digital conversions."
      },
      {
        title: "Track & Optimize Conversion Metrics",
        description: "Set up simplified spreadsheet trackers or link shorthand monitors to measure high performing sources.",
        monetizationAngle: "Enables optimization and scaling of best traffic nodes."
      },
      {
        title: "Claim and Re-invest Referral Bonus",
        description: "Ensure all commissions are credited, then use payouts to active multipliers or upgrade plans.",
        monetizationAngle: "Compounds passive streams exponentially via tier multiplier nodes (Elite, Lite, Bronze)."
      }
    ];

    try {
      const ai = getAi();
      if (!ai) {
        return res.json({ subtasks: mockSubtasks });
      }

      let finalData = { subtasks: [] };
      try {
        const response = await withRetry((modelName) => ai.models.generateContent({
          model: modelName,
          contents: [{
            role: 'user',
            parts: [{
              text: `Break down the following task into 5 specific, high-leverage, actionable sub-tasks that help monetize the effort. 
              Task: "${taskTitle}"
              Return JSON only in this format: { "subtasks": [ { "title": "...", "description": "...", "monetizationAngle": "..." } ] }`
            }]
          }],
          config: {
            responseMimeType: "application/json"
          }
        }));

        if (response.text) {
          finalData = JSON.parse(response.text.trim());
        }
      } catch (err: any) {
        console.warn(`[TASK-BREAKDOWN] Generation failed:`, err.message);
      }

      if (finalData.subtasks && finalData.subtasks.length > 0) {
        return res.json(finalData);
      }
      return res.json({ subtasks: mockSubtasks });
    } catch (error: any) {
      console.warn("AI Breakdown Error (sending highly optimized fallback):", error);
      res.json({ subtasks: mockSubtasks });
    }
  });

  // Helper function to provide high-quality context-aware fallback answers if Gemini quota is exceeded
  const getFallbackAssistantResponse = (prompt: string): string => {
    const p = (prompt || "").toLowerCase();
    if (p.includes('withdraw') || p.includes('cash') || p.includes('naira') || p.includes('bank') || p.includes('payout')) {
      return `To withdraw your earnings on Earnwise, please ensure you have reached the minimum threshold of ₦1,000. Under our secure platform protocol, there is a standard 7-day escrow period for newly credited funds to verify task compliance. Once cleared, you can initiate a standard bank withdrawal, processed securely through our Paystack gateway directly to your registered Nigerian bank account. No vendor codes or offline validation required!`;
    }
    if (p.includes('upgrade') || p.includes('plan') || p.includes('tier') || p.includes('subscribe')) {
      return `Upgrading your membership tier is the best way to multiply your daily task earnings! To upgrade:\n1. Go to 'Deposit' on your dashboard.\n2. Fund your wallet balance securely via Paystack.\n3. Head over to the 'Plans' tab and click 'Activate Now' on your desired tier.\nOur current tiers include Elite (1.25x), Lite (1.5x), Bronze (2.0x), Silver (3.0x), Golden (5.0x). Essential Warning: Do NOT buy activation codes from anyone or contact external vendors. Upgrades are strictly self-serve inside your secure wallet dashboard.`;
    }
    if (p.includes('task') || p.includes('complete') || p.includes('facebook') || p.includes('twitter') || p.includes('instagram') || p.includes('screenshot')) {
      return `To complete a task on Earnwise and credit your balance:\n1. Choose an active task from your Task list.\n2. Click 'Start Task' to open the social media target link (follow, like, or comment as requested).\n3. Take a screenshot or grab your profile handle to serve as completion proof.\n4. Upload or enter this proof in the Task Detail page and click 'Submit Proof'.\nOur automated 'Wise AI' engine will review your submission and automatically credit your wallet upon instant verification. Keep your streak alive to gain daily multipliers!`;
    }
    if (p.includes('refer') || p.includes('recruit') || p.includes('invite') || p.includes('commission') || p.includes('affiliate')) {
      return `Earnwise offers a highly lucrative, unlimited 30% referral commission structure. Share your unique referral link from your Profile tab with friends and digital earners. Every time your direct referrals purchase plans or activate tiers, you instantly receive a 30% commission credited directly to your withdrawable wallet balance!`;
    }
    if (p.includes('vault') || p.includes('stake') || p.includes('growth')) {
      return `Our premium 'Vault' feature allows you to stake or lock a portion of your digital balance for fixed-term growth bonuses of up to 40% per annum. Select a fixed term, deposit the minimum requirement, and watch your capital compound passively with guaranteed safety. Interest and capital are automatically returned to your withdrawable wallet at the conclusion of the term.`;
    }
    if (p.includes('spin') || p.includes('lucky') || p.includes('wheel')) {
      return `The Lucky Spin wheel is a daily engagement feature where users can spin to win instant cash rewards, multiplier boosters, or extra free tasks. Simply watch one required short sponsored ad video, then click 'Spin' to claim your random daily bounty!`;
    }
    if (p.includes('who is the owner') || p.includes('ceo') || p.includes('founder') || p.includes('sterling')) {
      return `The official founder, owner, and CEO of EarnWise is Johnathan Sterling. Under his core guidance, EarnWise has grown to become Nigeria's #1 digital task-based rewards platform of choice.`;
    }
    return `Welcome! I am Wise AI, your digital earning coach at Earnwise. You can earn daily cash rewards in Nigerian Naira by completing simple social media tasks, interacting with high-yielding sponsored ads, completing courses in the Academy, entering the daily Lucky Spin, and leveraging our 30% team referral commissions. Tell me, how can I help you maximize your income streams today?`;
  };

  /**
   * POST /api/ai/insights
   * Generates custom Wise AI daily earning strategies & insights.
   */
  app.post("/api/ai/insights", async (req, res) => {
    try {
      const { userId, balance, level, streak, plan } = req.body;
      const estimatedEarning = Number(balance || 0) + (plan === 'golden' ? 15000 : plan === 'platinum' ? 7500 : 2500);
      
      return res.json({
        prediction: `₦${estimatedEarning.toLocaleString()} daily earning potential based on your ${plan || 'free'} tier`,
        insights: [
          { 
            title: "🔥 Wise AI Direct Strategy", 
            description: "Complete the SingingFiles high-yield survey or web verification offer in your Ads Center for an instant ₦20.00 credit. Make sure to complete all required steps to the very last screen to verify your reward.", 
            type: "quick_win" 
          },
          { 
            title: "Streak Boost Active", 
            description: `You have a ${streak || 1} day active streak. Complete at least one ad task from the Ads Center daily to maintain your 1.5x earnings multiplier!`, 
            type: "strategy" 
          },
          { 
            title: "VIP Multiplier Tip", 
            description: plan === 'free' ? "Upgrade to Gold or VIP tier to unlock instant 3x task reward payouts and priority escrow clearance." : "Share your VIP referral link to earn instant ₦2,500 bonus per verified invite.", 
            type: "upgrade" 
          }
        ]
      });
    } catch (err: any) {
      console.error("[AI-INSIGHTS] Error generating insights:", err.message);
      return res.status(500).json({ error: "Internal error" });
    }
  });

  const getNigerianDateString = () => {
    const d = new Date();
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    const wat = new Date(utc + (3600000 * 1)); // WAT is UTC+1
    return wat.toISOString().split('T')[0];
  };

  async function checkAndIncrementAiLimit(userId: string): Promise<{ allowed: boolean; message?: string }> {
    if (!isDbAdminCapable) {
      return { allowed: true };
    }

    try {
      const userRef = dbAdmin.collection('users').doc(userId);
      const userDoc = await userRef.get();
      if (!userDoc.exists) {
        return { allowed: false, message: "User profile not found. Please log in again." };
      }

      const userData = userDoc.data();
      const role = userData?.role || 'user';
      const email = userData?.email || '';
      const plan = userData?.plan || 'free';

      if (role === 'admin' || email === 'wiseking7890@gmail.com') {
        return { allowed: true };
      }

      if (plan === 'free') {
        return { 
          allowed: false, 
          message: "Wise AI Assistant is not available on the Free plan. Please upgrade to Elite or higher in the Upgrade tab to unlock AI support!" 
        };
      }

      const limitedPlans = ['elite', 'starter', 'pro', 'bronze', 'diamond'];
      const isLimited = limitedPlans.includes(plan);

      if (!isLimited) {
        return { allowed: true };
      }

      // Check if user has bought any course - if they have, they get unlimited AI
      try {
        const coursePurchases = await dbAdmin.collection('coursePurchases')
          .where('userId', '==', userId)
          .limit(1)
          .get();
        
        if (!coursePurchases.empty) {
          return { allowed: true };
        }
      } catch (courseErr: any) {
        console.warn("[AI-LIMIT] Course check failed:", courseErr.message);
      }

      const today = getNigerianDateString();
      const lastAiUsedDate = userData?.lastAiUsedDate || '';
      let aiTodayCount = userData?.aiTodayCount || 0;

      if (lastAiUsedDate !== today) {
        aiTodayCount = 0;
      }

      if (aiTodayCount >= 3) {
        return { 
          allowed: false, 
          message: "Daily AI Limit Reached! Under your current plan, you can use Wise AI up to 3 times a day. Upgrade to DIAMOND or higher to get UNLIMITED AI requests, or wait until tomorrow!" 
        };
      }

      await userRef.update({
        lastAiUsedDate: today,
        aiTodayCount: admin.firestore.FieldValue.increment(1)
      });

      return { allowed: true };
    } catch (err: any) {
      console.error("[AI-LIMIT] Error checking or incrementing limit:", err.message);
      return { allowed: true };
    }
  }

  /**
   * POST /api/ai/assistant
   * Centralized AI Assistant for Earnwise
   */
  app.post("/api/ai/assistant", async (req, res) => {
    const { action, payload } = req.body;
    const userId = req.body.userId || payload?.userId;
    const activeApiKey = (process.env.GEMINI_API_KEY || "").trim();
    const promptMessage = payload?.prompt || "";

    if (userId) {
      const limitCheck = await checkAndIncrementAiLimit(userId);
      if (!limitCheck.allowed) {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.write(`⚠️ ${limitCheck.message}`);
        res.end();
        return;
      }
    }

    if (!activeApiKey || activeApiKey === "your_gemini_api_key_here") {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Transfer-Encoding', 'chunked');
      const fallbackText = getFallbackAssistantResponse(promptMessage);
      let index = 0;
      const chunkSize = 5;
      const interval = setInterval(() => {
        if (index < fallbackText.length) {
          res.write(fallbackText.substring(index, index + chunkSize));
          index += chunkSize;
        } else {
          clearInterval(interval);
          res.end();
        }
      }, 15);
      return;
    }

    try {
      if (action === 'generate-text') {
        const history = payload?.history || [];
        const systemInstruction = `You are an expert marketing and earning assistant for EarnWise, a leading task-based earning and advertising platform in Nigeria.
Your goal is to help users succeed on EarnWise. Answer all their questions about EarnWise features including:
- Task List & Detail: How to perform social tasks (follow, like, comment) and submit proof for automated verification.
- Earnings & Withdrawals: How to track revenue, the 7-day escrow period for funds, and automated withdrawals via Paystack.
- Membership Tiers (Free, Elite, Starter, Pro, Bronze, Diamond, Silver, Platinum, Golden): Explain the cost and the EARNING MULTIPLIERS for each.
- Advertiser Portal: How businesses can launch targetted campaigns and social follow tasks.
- Academy: Access to high-income skill courses and blueprints.
- Referrals & Team Building: The 10% lifetime referral bonus structure.
- Vault: Staking funds for fixed-term growth bonuses.
- Support: How to reach out for assistance.

IMPORTANT INSTRUCTIONS:
- ONLY explain what the user asks about. Do NOT volunteer facts about the owner, CEO, or sponsors unless the user explicitly asks for them.
- If explicitly asked about the owner, CEO, or founder of EarnWise, state clearly that the owner, founder, and CEO is Johnathan Sterling. Maintain total anonymity for any other identities.
- If asked how to earn, accurately explain earning through tasks, ads, courses, upgrades, buying plans, referral, and lucky spin. Do NOT mention the owner in a general guide.
- If asked about Wise AI, state that Wise AI is proudly owned by EarnWise.
- Be highly professional, encouraging, and informative. Keep responses natural and conversational.`;

        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Transfer-Encoding', 'chunked');

        const ai = getAi();
        if (!ai) {
          res.write("\n\n⚠️ AI Key not configured. Using fallback assistant responses.");
          const fallbackText = getFallbackAssistantResponse(promptMessage);
          res.write(fallbackText);
          res.end();
          return;
        }

        try {
          const contents = [
            ...history.map((h: any) => ({
              role: h.role === 'user' ? 'user' : 'model',
              parts: [{ text: h.content || "" }]
            })),
            { role: 'user', parts: [{ text: promptMessage }] }
          ];

          const responseStream = await withRetry((modelName) => ai.models.generateContentStream({
            model: modelName,
            contents: contents,
            config: {
              systemInstruction: systemInstruction,
              temperature: 0.5,
              topP: 0.8,
              maxOutputTokens: 800,
            }
          }));

          for await (const chunk of responseStream) {
            if (chunk.text) {
              res.write(chunk.text);
            }
          }
          res.end();
        } catch (err: any) {
          console.error("[AI-Assistant] Gemini stream error:", err);
          res.write("\n\n⚠️ I'm having trouble connecting to the AI service right now. Please try again in a moment.");
          res.end();
        }
      } else {
        res.status(400).json({ error: "Unknown action" });
      }
    } catch (err: any) {
      console.error("[AI-Assistant] Real error:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: err.message || "Unknown AI error" });
      }
    }
  });

  app.get("/api/debug-user", async (req, res) => {
    try {
      const email = "wiseking7890@gmail.com";
      console.log("[DEBUG-USER] Request received for email:", email);
      
      if (!isDbAdminCapable) {
        return res.json({ error: "Server Admin SDK is not capable/authenticated in this environment." });
      }

      const usersSnap = await dbAdmin.collection('users').where('email', '==', email).get();
      if (usersSnap.empty) {
        return res.json({ error: "No user found with email " + email });
      }

      const userDoc = usersSnap.docs[0];
      const userId = userDoc.id;
      const userData = userDoc.data();

      return res.json({
        userId,
        email,
        userData: userData,
      });
    } catch (err: any) {
      console.error("[DEBUG-USER] Error in endpoint:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /api/v1/tasks/verify-proof
   */
  app.post("/api/v1/tasks/verify-proof", async (req, res) => {
    const { userId, taskId, taskTitle, proof, rewardAmount, screenshot, deviceFingerprint } = req.body;

    if (!userId || !taskId || (!proof && !screenshot)) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Velocity Gate (Anti-Bot & Hardware Pacing)
    const now = Date.now();
    const cooldownMs = 45 * 1000;
    
    const lastUserActivityTime = lastUserActivity.get(userId.toString()) || 0;
    const lastDeviceActivityTime = deviceFingerprint ? (lastUserActivity.get(`DEV_${deviceFingerprint}`) || 0) : 0;
    
    const maxLastActivity = Math.max(lastUserActivityTime, lastDeviceActivityTime);

    if (now - maxLastActivity < cooldownMs) {
      const remaining = Math.ceil((cooldownMs - (now - maxLastActivity)) / 1000);
      return res.status(429).json({ 
        error: `Submission Pacing: Please wait ${remaining}s.` 
      });
    }
    
    lastUserActivity.set(userId.toString(), now);
    if (deviceFingerprint) lastUserActivity.set(`DEV_${deviceFingerprint}`, now);

    // Ensure rewardAmount is a valid positive number
    const numericReward = Math.max(0, Number(rewardAmount) || 0);

    try {
      if (isDbAdminCapable) {
        const userRef = dbAdmin.collection('users').doc(userId);
        const userDoc = await userRef.get();
        if (userDoc.exists) {
          const userData = userDoc.data()!;
          if ((!userData.plan || userData.plan === 'free') && userData.role !== 'admin' && userData.email !== 'wiseking7890@gmail.com') {
            return res.status(403).json({ error: "Upgrade your plan to start earning from tasks." });
          }

          // Device Binding Security Check
          if (deviceFingerprint) {
            const deviceOwnerSnap = await dbAdmin.collection('users')
              .where('deviceFingerprint', '==', deviceFingerprint)
              .limit(1)
              .get();
            
            if (!deviceOwnerSnap.empty && deviceOwnerSnap.docs[0].id !== userId) {
              return res.status(403).json({
                error: "Fraud Protection: This device is already linked to another profile. One-Phone-One-Account rule enforced."
              });
            }

            if (userData.deviceFingerprint !== deviceFingerprint) {
              await userRef.update({ deviceFingerprint });
            }
          }
        }
      }

      if (!isDbAdminCapable) {
        console.warn("[FIREBASE] Server Admin SDK is not ready. Returning client-side fallback approval.");
        return res.json({
          approved: true,
          fallback: true,
          message: "Proof received. Server is in client-fallback mode, updating wallet."
        });
      }

      let verificationResult = { 
        approved: true, 
        reason: "Proof submitted successfully and approved under standard verification protocol." 
      };

      if (proof || screenshot) {
        const ai = getAi();
        if (ai) {
          try {
            const prompt = `You are the Wise AI Task Auditor for Earnwise. A user is submitting completion proof for a social media task titled: "${taskTitle || 'Social Task'}".
Proof text/description provided by user: "${proof || 'No description provided'}"
Screenshot uploaded: ${screenshot ? 'Yes' : 'No'}

Please verify if the submission is a plausible and honest completion of a social media task (e.g., following, liking, subscribing). Be generous and supportive. Respond ONLY with a JSON object containing keys "approved" (boolean) and "reason" (string).`;

            const response = await withRetry((modelName) => ai.models.generateContent({
              model: modelName,
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
              config: {
                responseMimeType: "application/json",
              }
            }));

            if (response?.text) {
               const parsed = JSON.parse(response.text.trim());
               if (typeof parsed.approved === 'boolean') {
                 verificationResult = parsed;
               }
            }
          } catch (error: any) {
            console.warn("Wise AI Verification failed due to API model error (approving proof automatically):", error.message || error);
          }
        }
      }

      // Handle the results based on Wise AI decision
      const finalStatus = verificationResult.approved ? 'approved' : 'pending';

      await dbAdmin.runTransaction(async (transaction) => {
        const completionRef = dbAdmin.collection('completions').doc(`${userId}_${taskId}`);
        const userRef = dbAdmin.collection('users').doc(userId);
        
        // 1. Write Completion Doc
        transaction.set(completionRef, {
            userId,
            taskId,
            taskTitle: taskTitle || 'Social Task',
            status: finalStatus,
            proof: proof || 'Screenshot provided',
            screenshot: screenshot || null,
            rewardEarned: numericReward,
            submittedAt: admin.firestore.FieldValue.serverTimestamp(),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            aiVerified: verificationResult.approved,
            aiReason: verificationResult.reason
        });

        // 2. If approved, add reward to balance
        if (verificationResult.approved) {
          transaction.update(userRef, {
            balance: admin.firestore.FieldValue.increment(numericReward),
            taskBalance: admin.firestore.FieldValue.increment(numericReward),
            taskEarnings: admin.firestore.FieldValue.increment(numericReward)
          });

          // 3. Log transaction
          const txRef = dbAdmin.collection('transactions').doc();
          transaction.set(txRef, {
            userId,
            amount: numericReward,
            type: 'task_completion',
            status: 'completed',
            description: `Wise AI Verified: ${taskTitle}`,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }
      });

      return res.json({ 
        approved: verificationResult.approved, 
        status: verificationResult.approved ? "approved" : "pending", 
        message: verificationResult.approved 
            ? verificationResult.reason 
            : "Proof submitted successfully. Awaiting admin manual review." 
      });
    } catch (error: any) {
      console.error("Verification Error:", error);
      res.status(500).json({ error: error.message });
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
      const taskRef = dbAdmin.collection('tasks').doc();
      await taskRef.set({
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
      }, { merge: true });

      broadcastPushNotification("🔥 New Task Available!", `A new ${type || 'earning'} task has been posted. Earn ₦${Math.floor(userRewardBaseline)} now!`);

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

  /**
   * POST /api/v1/admin/upload-media
   * Receives base64 fileData and fileName, writes to ./uploads and returns URL.
   */
  app.post("/api/v1/admin/upload-media", async (req, res) => {
    const { fileData, fileName } = req.body;
    if (!fileData) {
      return res.status(400).json({ error: "No file data provided" });
    }

    try {
      let buffer: Buffer;
      let ext = "bin";
      if (fileData.startsWith("data:")) {
        const matches = fileData.match(/^data:([^;]+);base64,([\s\S]+)$/);
        if (!matches || matches.length !== 3) {
          return res.status(400).json({ error: "Invalid base64 file data format" });
        }
        const mime = matches[1];
        buffer = Buffer.from(matches[2], "base64");
        ext = mime.split("/")[1] || "bin";
      } else {
        buffer = Buffer.from(fileData, "base64");
      }

      const uploadsDir = path.join(process.cwd(), "uploads");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const safeName = (fileName || "file").replace(/[^a-zA-Z0-9.\-_]/g, "_");
      const uniqueFilename = `${Date.now()}_${safeName}`;
      const uploadPath = path.join(uploadsDir, uniqueFilename);

      fs.writeFileSync(uploadPath, buffer);

      const mediaUrl = `/uploads/${uniqueFilename}`;
      res.json({ success: true, url: mediaUrl });
    } catch (err: any) {
      console.error("Media Upload API Error:", err);
      res.status(500).json({ error: "Failed to write uploaded media to disk: " + err.message });
    }
  });

  app.post("/api/support/message", async (req, res) => {
    const { subject, message, email } = req.body;
    try {
      await transporter.sendMail({
        from: `Wise AI Support <${process.env.EMAIL_USER}>`,
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
  app.post("/api/user/complete-task", async (req, res) => {
    const { userId, taskId, deviceFingerprint } = req.body;
    const userIp = req.ip;

    try {
      if (!isDbAdminCapable) {
        console.warn("[FIREBASE] Server Admin SDK is not ready. Returning client-side fallback completion.");
        return res.json({
          status: "success",
          fallback: true,
          message: "Task completed. Server is in client-fallback mode, updating wallet."
        });
      }

      await dbAdmin.runTransaction(async (transaction) => {
        const userRef = dbAdmin.collection('users').doc(userId);
        const taskRef = dbAdmin.collection('tasks').doc(taskId);
        const payoutsRef = dbAdmin.collection('system_settings').doc('payouts');
        
        const [userDoc, taskDoc, payoutsDoc] = await Promise.all([
          transaction.get(userRef),
          transaction.get(taskRef),
          transaction.get(payoutsRef)
        ]);

        if (!userDoc.exists || !taskDoc.exists) throw new Error("Verification target not found");
        
        const userData = userDoc.data()!;
        const taskData = taskDoc.data()!;

        // SECURITY: Automated Pacing (IVT Prevention)
        const nowMs = Date.now();
        const lastActivityTime = lastUserActivity.get(userId) || 0;
        const cooldownSeconds = 45; 
        if (nowMs - lastActivityTime < cooldownSeconds * 1000 && userData.role !== 'admin') {
           const waitRemaining = Math.ceil((cooldownSeconds * 1000 - (nowMs - lastActivityTime)) / 1000);
           throw new Error(`Security Pacing: Quality verification in progress. Please wait ${waitRemaining}s before your next submission.`);
        }
        lastUserActivity.set(userId, nowMs);

        // Check 30-Day Plan Expiration
        let currentPlan = userData.plan || 'free';
        const payoutsData = payoutsDoc.exists ? payoutsDoc.data() : null;
        const isRenewalRequired = payoutsData && payoutsData.isRenewalRequired !== undefined ? !!payoutsData.isRenewalRequired : true;

        if (isRenewalRequired) {
          const planEndDate = userData.planEndDate ? (userData.planEndDate.toDate ? userData.planEndDate.toDate() : new Date(userData.planEndDate)) : null;
          if (planEndDate && new Date() > planEndDate) {
            currentPlan = 'free';
            // Update DB atomically as expired
            transaction.update(userRef, {
              plan: 'free',
              subscriptionTier: 'free',
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
          }
        }

        // Restriction: Free plans are locked
        if (currentPlan === 'free' && userData.role !== 'admin' && userData.email !== 'wiseking7890@gmail.com') {
           throw new Error("Upgrade your plan to start earning from tasks.");
        }

        // Security Layer
        if (userData.securityMetrics?.isSuspended) throw new Error("Account is under safety review");
        if (taskData.remainingBudget <= 0) throw new Error("Task allocation exhausted");

        // Calculate dynamic reward based on tier multiplier
        const multiplier = TIER_MULTIPLIERS[currentPlan] || 1.0;
        const finalPayout = taskData.userPayout * multiplier;

        // Enforce Limits for Non-Admins
        const isAdmin = userData.role === 'admin' || userData.email === 'wiseking7890@gmail.com';
        if (!isAdmin) {
          const planLimit = PLAN_LIMITS[currentPlan] || { cap: 0, daily: 0 };

          // 1. Total Task Cap Check
          const activePlanTaskEarnings = userData.activePlanTaskEarnings || 0;
          if (activePlanTaskEarnings + finalPayout > planLimit.cap) {
            throw new Error(`Total plan task earning cap reached (₦${planLimit.cap.toLocaleString()}). Upgrade your plan to continue earning.`);
          }

          // 2. Daily Earning Limit Check
          const lagosParts = new Intl.DateTimeFormat('en-US', {
            timeZone: 'Africa/Lagos',
            year: 'numeric',
            month: 'numeric',
            day: 'numeric'
          }).formatToParts(new Date());
          const lYear = lagosParts.find(p => p.type === 'year')?.value || '';
          const lMonth = lagosParts.find(p => p.type === 'month')?.value || '';
          const lDay = lagosParts.find(p => p.type === 'day')?.value || '';
          const todayStr = `${lYear}-${lMonth.padStart(2, '0')}-${lDay.padStart(2, '0')}`;

          const dailyTracking = userData.dailyTaskEarningsTracking || {};
          const dailyEarnedToday = dailyTracking.date === todayStr ? (dailyTracking.amount || 0) : 0;
          if (dailyEarnedToday + finalPayout > planLimit.daily) {
            throw new Error("Daily high-quality task limit reached. Resumes tomorrow!");
          }

          // Update Limits Tracking fields
          transaction.update(userRef, {
            activePlanTaskEarnings: admin.firestore.FieldValue.increment(finalPayout),
            dailyTaskEarningsTracking: {
              date: todayStr,
              amount: dailyEarnedToday + finalPayout
            }
          });
        }

        // Atomic multi-variable update - Immediate Payout (Restored to yesterday's behavior)
        transaction.update(userRef, {
          balance: admin.firestore.FieldValue.increment(finalPayout),
          withdrawableBalance: admin.firestore.FieldValue.increment(finalPayout),
          taskBalance: admin.firestore.FieldValue.increment(finalPayout),
          taskEarnings: admin.firestore.FieldValue.increment(finalPayout),
          totalEarnings: admin.firestore.FieldValue.increment(finalPayout),
          tasksCompleted: admin.firestore.FieldValue.increment(1),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Award Task Referral Bonus (10%)
        if (userData.referredBy) {
          const referrerDoc = await findReferrerDoc(userData.referredBy);
          if (referrerDoc) {
             const taskReferralBonus = finalPayout * 0.10;
             if (taskReferralBonus > 0) {
               transaction.update(referrerDoc.ref, {
                 balance: admin.firestore.FieldValue.increment(taskReferralBonus),
                 referralBalance: admin.firestore.FieldValue.increment(taskReferralBonus),
                 withdrawableBalance: admin.firestore.FieldValue.increment(taskReferralBonus),
                 referralEarnings: admin.firestore.FieldValue.increment(taskReferralBonus),
                 updatedAt: admin.firestore.FieldValue.serverTimestamp()
               });
             }
          }
        }

        // Deduct from task pool
        transaction.update(taskRef, {
          remainingBudget: admin.firestore.FieldValue.increment(-taskData.userPayout)
        });

        // Create transaction log: Immediate
        const transRef = dbAdmin.collection('transactions').doc();
        transaction.set(transRef, {
          userId,
          amount: finalPayout,
          type: 'earning',
          status: 'completed',
          description: `Verified Reward: ${taskData.title}`,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      });

      res.json({ status: "success", message: "Task verified. Reward added to your balance." });
    } catch (error: any) {
      console.error("Verification Error:", error.message);
      res.status(400).json({ error: error.message });
    }
  });



  // Initialize Wallet Deposit
  app.post("/api/paystack/initialize-deposit", async (req, res) => {
    const { userId, amount, email } = req.body;
    
    // Fallback simulation when Paystack is not configured in sandbox environment
    if (!PAYSTACK_SECRET) {
      console.warn("[PAYMENT] PAYSTACK_SECRET not configured. Simulating initialized response for testing environment.");
      const depositAmt = Number(amount) || 500;
      const reference = `SIM_PAY_${Date.now()}_${depositAmt}`;
      return res.json({
        status: true,
        message: "Simulated initialization success",
        data: {
          authorization_url: `${currentAppUrl}/deposit?reference=${reference}&amount=${depositAmt}`,
          reference,
          access_code: `SIM_CODE_${Date.now()}`
        }
      });
    }
    
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

    if (!isDbAdminCapable) {
      console.warn("[PAYMENT] Webhook received but Admin SDK is restricted. Skipping database updates.");
      return res.status(200).send("Webhook received (SDK restricted)");
    }

    try {
      if (event.event === 'charge.success') {
        const { metadata, reference } = event.data;
        if (metadata?.type === 'deposit') {
          const userRef = dbAdmin.collection('users').doc(metadata.userId);
          await userRef.update({
            balance: admin.firestore.FieldValue.increment(metadata.amount),
            withdrawableBalance: admin.firestore.FieldValue.increment(metadata.amount),
            depositBalance: admin.firestore.FieldValue.increment(metadata.amount),
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

          // Award dynamic 20% referral deposit bonus
          await handleReferralDepositBonus(metadata.userId, metadata.amount, reference);
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

          // Award referral bonus if applicable
          handleReferralUpgradeBonus(metadata.userId, metadata.planId);
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
    const { reference, userId, amount } = req.body;
    console.log(`[PAYMENT] Verifying deposit for User: ${userId}, Ref: ${reference}, bodyAmt: ${amount}`);
    
    // Safely parse user requested amount or extract from simulated reference format (SIM_PAY_timestamp_amount)
    let depositAmtParsed = Number(amount);
    if (isNaN(depositAmtParsed) || !depositAmtParsed) {
      const parts = reference?.split('_') || [];
      if (parts.length >= 4) {
        depositAmtParsed = Number(parts[3]);
      }
    }
    // Safely default/clip to 500 if still falsy/invalid, never default to 5000 (which is a 10x inflation of 500)
    if (isNaN(depositAmtParsed) || !depositAmtParsed) {
      depositAmtParsed = 500;
    }

    if (!isDbAdminCapable) {
      console.info("[PAYMENT] Server Admin SDK is running in restricted mode. Automatically engaging Client SDK fallback execution...");
      return res.json({ status: "success", useClientFallback: true, amount: depositAmtParsed });
    }
    
    // Simulate deposit verification if PAYSTACK_SECRET is not configured or reference is a simulated reference
    if (!PAYSTACK_SECRET || (reference && reference.startsWith('SIM_PAY_'))) {
      console.warn("[PAYMENT] Simulating successful verification for reference:", reference);
      try {
        let depositAmount = Number(amount);
        if (isNaN(depositAmount) || !depositAmount) {
          // Parse amount from reference if encoded (SIM_PAY_timestamp_amount)
          const parts = reference?.split('_') || [];
          if (parts.length >= 4) {
            depositAmount = Number(parts[3]);
          }
        }
        
        // If still no amount, use our parsed and safe amount
        if (isNaN(depositAmount) || !depositAmount) {
          depositAmount = depositAmtParsed;
        }

        // STRICT VALIDATION FOR SIMULATED TRANSACTIONS:
        // If the reference includes an encoded amount, the client-supplied amount must match it
        const parts = reference?.split('_') || [];
        if (parts.length >= 4) {
          const encodedRefAmount = Number(parts[3]);
          if (!isNaN(encodedRefAmount) && Math.abs(depositAmount - encodedRefAmount) > 0.05) {
            console.error(`[SECURITY ALERT] Simulated amount mismatch! User ${userId} requested ₦${depositAmount}, but simulated reference encoded ₦${encodedRefAmount}.`);
            return res.status(400).json({
              status: "failed",
              message: `Simulated transaction verification mismatch. Requested amount does not match simulated reference.`
            });
          }
        }

        const userRef = dbAdmin.collection('users').doc(userId);
        
        // Check idempotency
        const transSnap = await dbAdmin.collection('transactions').where('reference', '==', reference).limit(1).get();
        if (!transSnap.empty) {
          return res.json({ status: "success", message: "Deposit already reflected (Simulated)", amount: depositAmount });
        }

        await userRef.update({
          balance: admin.firestore.FieldValue.increment(depositAmount),
          withdrawableBalance: admin.firestore.FieldValue.increment(depositAmount),
          depositBalance: admin.firestore.FieldValue.increment(depositAmount),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        await dbAdmin.collection('transactions').add({
          userId,
          amount: depositAmount,
          type: 'bonus',
          description: `Wallet Deposit (Simulated Verification: ${reference})`,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          reference
        });

        await dbAdmin.collection('notifications').add({
          userId,
          title: '💰 Deposit Successful!',
          message: `₦${depositAmount.toLocaleString()} has been added to your wallet (Simulation).`,
          type: 'success',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          readBy: []
        });

        // Award dynamic 20% referral deposit bonus
        await handleReferralDepositBonus(userId, depositAmount, reference);
        sendPushNotification(userId, "💰 Deposit Successful", `₦${depositAmount.toLocaleString()} has been added to your wallet.`);

        return res.json({ status: "success", message: "Simulated deposit verified effectively", amount: depositAmount });
      } catch (err: any) {
        console.error("Simulated verification error:", err.message);
        return res.status(500).json({ error: "Failed to process simulated verification" });
      }
    }

    try {
      const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
        headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` }
      });

      const data = response.data.data;
      console.log(`[PAYMENT] Paystack response for ref ${reference}:`, data);
      if (data.status === "success") {
        const verifiedAmount = data.amount / 100; // to Naira
        console.log(`[PAYMENT] Verified amount for ref ${reference}:`, verifiedAmount);
        
        // STRICTOR VALIDATION ENFORCEMENT:
        // Reject attempts to inflate the balance where the body amount is different from what Paystack verified.
        if (amount) {
          const clientSuppliedNaira = Number(amount);
          console.log(`[PAYMENT] Client claimed: ${clientSuppliedNaira}`);
          if (!isNaN(clientSuppliedNaira) && Math.abs(clientSuppliedNaira - verifiedAmount) > 5.0) { // Relaxed to 5 Naira
            console.error(`[SECURITY ALERT] Possible balance inflation attempt! User ${userId} claimed ₦${clientSuppliedNaira}, but Paystack verified response is ₦${verifiedAmount}. Reference: ${reference}`);
            return res.status(400).json({
              status: "failed",
              message: `Transaction verification mismatch. Claimed amount (₦${clientSuppliedNaira.toLocaleString()}) does not match Paystack verified record (₦${verifiedAmount.toLocaleString()}).`
            });
          } else if (!isNaN(clientSuppliedNaira) && Math.abs(clientSuppliedNaira - verifiedAmount) > 0.05) {
            console.warn(`[PAYMENT] Minor amount mismatch (within fee tolerance): User ${userId} claimed ₦${clientSuppliedNaira}, verified ₦${verifiedAmount}. Proceeding...`);
          }
        }

        const userRef = dbAdmin.collection('users').doc(userId);
        
        // Check if this reference was already processed (idempotency)
        const transSnap = await dbAdmin.collection('transactions').where('reference', '==', reference).limit(1).get();
        if (!transSnap.empty) {
          return res.json({ status: "success", message: "Deposit already reflected", amount: verifiedAmount });
        }

        console.log(`[PAYMENT] Updating user ${userId} balance for reference ${reference}, amount: ${verifiedAmount}`);
        await userRef.update({
          balance: admin.firestore.FieldValue.increment(verifiedAmount),
          withdrawableBalance: admin.firestore.FieldValue.increment(verifiedAmount),
          depositBalance: admin.firestore.FieldValue.increment(verifiedAmount),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`[PAYMENT] Updated user ${userId} balance successfully.`);

        await dbAdmin.collection('transactions').add({
          userId,
          amount: verifiedAmount,
          type: 'bonus',
          description: `Wallet Deposit (Verified: ${reference})`,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          reference
        });

        // Send Notification
        await dbAdmin.collection('notifications').add({
          userId,
          title: '💰 Deposit Successful!',
          message: `₦${verifiedAmount.toLocaleString()} has been added to your wallet.`,
          type: 'success',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          readBy: []
        });

        // Award dynamic 20% referral deposit bonus
        await handleReferralDepositBonus(userId, verifiedAmount, reference);
        sendPushNotification(userId, "💰 Deposit Successful", `₦${verifiedAmount.toLocaleString()} has been added to your wallet.`);

        res.json({ status: "success", message: "Deposit verified effectively", amount: verifiedAmount });
      } else {
        res.status(400).json({ status: "failed", message: "Payment not successful" });
      }
    } catch (error: any) {
      console.error("[PAYMENT] Verify deposit error:", error.response?.data || error.message);
      
      // If the error is not due to a payment mismatch, try to return a clearer message
      res.status(500).json({ 
        status: "failed",
        message: "Server verification failed. Please try again later.",
        details: error.message 
      });
    }
  });

  // Get Nigerian Banks
  app.get("/api/paystack/banks", async (req, res) => {
    // Elegant fallback list of real Nigerian banks for high-fidelity testing
    const fallbackBanks = {
      status: true,
      message: "Banks retrieved successfully",
      data: [
        { name: "Access Bank", code: "044" },
        { name: "Guaranty Trust Bank (GTB)", code: "058" },
        { name: "Zenith Bank", code: "057" },
        { name: "United Bank for Africa (UBA)", code: "033" },
        { name: "First Bank of Nigeria", code: "011" },
        { name: "Kuda Bank", code: "50211" },
        { name: "OPay", code: "999992" },
        { name: "PalmPay", code: "999991" },
        { name: "Fidelity Bank", code: "070" },
        { name: "Stanbic IBTC Bank", code: "039" },
        { name: "Sterling Bank", code: "050" },
        { name: "Wema Bank", code: "035" }
      ]
    };

    if (!PAYSTACK_SECRET) {
      console.warn("[PAYMENT] PAYSTACK_SECRET not configured. Serving local Nigerian banks list.");
      return res.json(fallbackBanks);
    }

    try {
      const response = await axios.get("https://api.paystack.co/bank?country=nigeria", {
        headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` }
      });
      res.json(response.data);
    } catch (error: any) {
      console.warn("Using offline bank list fallback due to API issue.");
      res.json(fallbackBanks);
    }
  });

  // Resolve Nigerian Bank Account Name
  app.get("/api/paystack/resolve", async (req, res) => {
    const { accountNumber, bankCode } = req.query;
    if (!accountNumber || !bankCode) {
      return res.status(400).json({ error: "Account number and bank code are required." });
    }
    
    if (!PAYSTACK_SECRET) {
      console.warn("[PAYMENT] PAYSTACK_SECRET not configured. Simulating bank account resolution.");
      return res.json({
        status: true,
        message: "Account number resolved successfully",
        data: {
          account_number: accountNumber,
          account_name: "EARNWISE VERIFIED SUBSCRIBER"
        }
      });
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
        console.warn(`[PAYMENT] Account resolution validation mismatch (accountNumber: ${accountNumber}, bankCode: ${bankCode})`);
        return res.status(422).json({
          status: "failed",
          type: "validation_error",
          error: paystackData?.message || "Could not resolve account name. Please check selection."
        });
      }
      // Give simulated fallback instead of failing completely if Paystack is rate-limited/failing
      console.warn("[PAYMENT] Resolve failed, serving simulated resolve fallback.");
      res.json({
        status: true,
        message: "Account number resolved successfully (Fallback)",
        data: {
          account_number: accountNumber,
          account_name: "EARNWISE SUBSCRIBER"
        }
      });
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
          const nowTime = new Date();
          const planEndDate = new Date(nowTime.getTime() + 30 * 24 * 60 * 60 * 1000);
          
          transaction.update(userRef, {
            plan: planId,
            subscriptionTier: 'premium',
            activePlanTaskEarnings: 0,
            planStartDate: admin.firestore.FieldValue.serverTimestamp(),
            planEndDate: planEndDate,
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

          // Award referral bonus in background
          handleReferralUpgradeBonus(userId, planId);
          sendPushNotification(userId, "⚡ Upgrade Successful", `Your account has been upgraded to the ${planId} plan.`);
        });

        return res.json({ status: "success", message: "Plan activated via wallet" });
      }

      // Case 2: Paystack Verification
      if (!PAYSTACK_SECRET || (reference && reference.startsWith('SIM_PAY_'))) {
        console.warn("[PAYMENT] PAYSTACK_SECRET not configured or simulated reference used. Simulating upgrade success.");
        
        const nowTime = new Date();
        const planEndDate = new Date(nowTime.getTime() + 30 * 24 * 60 * 60 * 1000);
        await userRef.update({
          plan: planId,
          subscriptionTier: 'premium',
          activePlanTaskEarnings: 0,
          planStartDate: admin.firestore.FieldValue.serverTimestamp(),
          planEndDate: planEndDate,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        await dbAdmin.collection('transactions').add({
          userId,
          amount: 0,
          type: 'earning',
          description: `Upgraded to ${planId} Plan (Simulated Verification)`,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          reference
        });

        await dbAdmin.collection('notifications').add({
          userId,
          title: '⚡ Plan Upgraded Successfully!',
          message: `Your account has been upgraded to the ${planId} plan (Simulation).`,
          type: 'success',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          readBy: []
        });

        // Award referral bonus in background
        handleReferralUpgradeBonus(userId, planId);

        return res.json({ status: "success", message: `Upgraded to ${planId} successfully (Simulated)` });
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

        const nowTime = new Date();
        const planEndDate = new Date(nowTime.getTime() + 30 * 24 * 60 * 60 * 1000);
        await userRef.update({
          plan: planId,
          subscriptionTier: 'premium',
          activePlanTaskEarnings: 0,
          planStartDate: admin.firestore.FieldValue.serverTimestamp(),
          planEndDate: planEndDate,
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

        // Award referral bonus in background
        handleReferralUpgradeBonus(userId, planId);
        sendPushNotification(userId, "⚡ Upgrade Successful", `Your account has been upgraded to the ${planId} plan.`);

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

  // Anti-fraud registration constraints
  app.post("/api/auth/register-check", async (req, res) => {
    const { deviceFingerprint, telegramId } = req.body;

    if (!isDbAdminCapable) {
      console.warn("[AUTH_CHECK] Admin SDK is not capable. Bypassing registration check.");
      return res.status(200).json({ success: true });
    }

    try {
      if (telegramId) {
        const tgSnap = await dbAdmin.collection('users')
          .where('telegramId', '==', String(telegramId))
          .limit(1)
          .get();
        if (!tgSnap.empty) {
          return res.status(400).json({
            error: "This Telegram account is already linked to an existing Earnwise profile."
          });
        }
      }

      if (deviceFingerprint) {
        // 1. Check if anyone originally registered with this fingerprint
        const regSnap = await dbAdmin.collection('users')
          .where('registeredDeviceFingerprint', '==', String(deviceFingerprint))
          .limit(1)
          .get();
        
        // 2. Fallback check for legacy profiles that don't have registeredDeviceFingerprint yet
        let legacySnap = null;
        if (regSnap.empty) {
          legacySnap = await dbAdmin.collection('users')
            .where('deviceFingerprint', '==', String(deviceFingerprint))
            .limit(1)
            .get();
        }

        if (!regSnap.empty || (legacySnap && !legacySnap.empty)) {
          return res.status(400).json({
            error: "Registration limit reached. Only one Earnwise account can be registered per device."
          });
        }
      }

      return res.status(200).json({ success: true });
    } catch (err: any) {
      console.error("[AUTH_CHECK] Error in registration validation:", err);
      return res.status(500).json({ error: "Internal validation error. Please try again." });
    }
  });

  app.post("/api/auth/login-check", async (req, res) => {
    const { email, deviceFingerprint, telegramId } = req.body;

    if (!isDbAdminCapable) {
      console.warn("[AUTH_LOGIN_CHECK] Admin SDK is not capable. Bypassing login check.");
      return res.status(200).json({ success: true });
    }

    try {
      if (!email) return res.status(400).json({ error: "Email is required" });

      const userSnap = await dbAdmin.collection('users').where('email', '==', email).limit(1).get();
      if (userSnap.empty) return res.status(200).json({ success: true }); 

      const userDoc = userSnap.docs[0];
      const userData = userDoc.data();

      // Telegram Binding Check
      if (telegramId && userData.telegramId && String(userData.telegramId) !== String(telegramId)) {
        return res.status(403).json({
          error: "Security Alert: This account is bound to a different Telegram profile."
        });
      }

      // Login is now allowed on any device to support "friend login"
      // Fingerprint will be updated/tracked in the login endpoint
      
      return res.status(200).json({ success: true });
    } catch (err: any) {
      console.error("[AUTH_LOGIN_CHECK] Error:", err);
      return res.status(500).json({ error: "Security validation error." });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    const { deviceFingerprint, telegramId } = req.body;

    if (!isDbAdminCapable) {
      console.warn("[AUTH_REGISTER] Admin SDK is not capable. Bypassing check.");
      return res.status(200).json({ success: true });
    }

    try {
      if (telegramId) {
        const tgSnap = await dbAdmin.collection('users')
          .where('telegramId', '==', String(telegramId))
          .limit(1)
          .get();
        if (!tgSnap.empty) {
          return res.status(400).json({
            error: "This Telegram account is already linked to an existing Earnwise profile."
          });
        }
      }

      if (deviceFingerprint) {
        // 1. Check if anyone originally registered with this fingerprint
        const regSnap = await dbAdmin.collection('users')
          .where('registeredDeviceFingerprint', '==', String(deviceFingerprint))
          .limit(1)
          .get();
        
        // 2. Fallback check for legacy profiles
        let legacySnap = null;
        if (regSnap.empty) {
          legacySnap = await dbAdmin.collection('users')
            .where('deviceFingerprint', '==', String(deviceFingerprint))
            .limit(1)
            .get();
        }

        if (!regSnap.empty || (legacySnap && !legacySnap.empty)) {
          return res.status(400).json({
            error: "Registration limit reached. Only one Earnwise account can be registered per device."
          });
        }
      }

      return res.status(200).json({ success: true });
    } catch (err: any) {
      console.error("[AUTH_REGISTER] Error in registration logic:", err);
      return res.status(500).json({ error: "Internal validation error. Please try again." });
    }
  });

  // Login endpoint - updates device fingerprint
  app.post("/api/auth/login", async (req, res) => {
    const { email, deviceFingerprint, telegramId } = req.body;
    
    if (!isDbAdminCapable) {
      console.warn("[AUTH_LOGIN] Admin SDK is not capable. Bypassing device binding update.");
      return res.status(200).json({ 
        success: true, 
        message: "Session authenticated (Admin SDK offline fallback)." 
      });
    }

    try {
      if (email && deviceFingerprint) {
        const userSnap = await dbAdmin.collection('users').where('email', '==', email).limit(1).get();
        if (!userSnap.empty) {
          const userDoc = userSnap.docs[0];
          await userDoc.ref.update({
            deviceFingerprint,
            telegramId: telegramId || userDoc.data().telegramId || null,
            lastLoginAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }
      }
      return res.status(200).json({ 
        success: true, 
        message: "Session authenticated securely." 
      });
    } catch (err) {
      return res.status(500).json({ error: "Session update failed." });
    }
  });

  // Send Welcome Email
  app.post("/api/auth/send-welcome-email", async (req, res) => {
    const { email, name } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    try {
      console.log(`[AUTH] Processing welcome sequence for ${email}...`);
      let emailSent = false;
      
      if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        try {
          await transporter.sendMail({
            from: `"Wise AI Support" <${process.env.EMAIL_USER}>`,
            to: email,
            replyTo: 'earnwise29@gmail.com',
            subject: `Welcome to Earnwise, ${name || ''}!`,
            text: `Welcome to Earnwise! You're now part of Nigeria's #1 digital wealth platform, powered by Wise AI. Complete high-paying tasks, withdraw real cash, and earn referral commissions.\n\nGet started now by logging into your dashboard: ${currentAppUrl || 'https://ais-pre-ucu3byd4dxfepn7umejqhx-558253480073.europe-west2.run.app'}`,
            html: `
              <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #f0f0f0; border-radius: 20px; background-color: #ffffff;">
                <div style="text-align: center; margin-bottom: 20px;">
                  <img src="cid:earnwise_logo" alt="Earnwise Logo" style="max-width: 150px; margin-bottom: 15px;" />
                  <h1 style="color: #2563eb; font-size: 28px; font-weight: 800; margin: 0; padding: 10px;">Earnwise</h1>
                  <p style="color: #94a3b8; font-size: 14px; margin-top: 5px;">Powered by Wise AI</p>
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
                  <a href="${currentAppUrl || 'https://ais-pre-ucu3byd4dxfepn7umejqhx-558253480073.europe-west2.run.app'}" style="background-color: #2563eb; color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: 800; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">Go to Your Dashboard</a>
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
              path: path.join(process.cwd(), 'public/icon.png'),
              cid: 'earnwise_logo'
            }]
          });
          emailSent = true;
          console.log(`[AUTH] SUCCESS! Welcome email sent to ${email}`);
        } catch (mailErr: any) {
          console.error(`[AUTH] Welcome transporter failed for ${email}:`, mailErr.message);
        }
      } else {
        console.warn(`[AUTH] EMAIL_USER or EMAIL_PASS not configured. Skipping transporter dispatch for ${email}.`);
      }

      // Always fallback to injecting in-door welcome notification to ensure continuous operation
      if (isDbAdminCapable) {
        try {
          const userSnap = await dbAdmin.collection('users').where('email', '==', email).limit(1).get();
          if (!userSnap.empty) {
            const uid = userSnap.docs[0].id;
            const notifCheck = await dbAdmin.collection('notifications')
              .where('userId', '==', uid)
              .where('title', '==', 'Welcome to Earnwise!')
              .get();

            if (notifCheck.empty) {
              await dbAdmin.collection('notifications').add({
                userId: uid,
                title: "Welcome to Earnwise!",
                message: `Welcome aboard, ${name || 'Earner'}! We're thrilled to have you. Complete high-paying tasks, withdraw real cash in Naira, and earn referral commissions!`,
                type: 'success',
                read: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                readBy: []
              });
              console.log(`[AUTH] In-door notification appended for ${email} (${uid})`);

              // Automatically trigger their first daily coaching topic (Chapter 1) so coaching is completely automatic
              const firstCoachingTopic = {
                subject: "💸 Secrets to 10X Your Daily Earnings on Earnwise",
                headline: "The Compound Earning Framework",
                quote: "Average members work for individual micro-tasks. Elite earners build network engines.",
                tip: "Maintain a consecutive 7-day streak to unlock a 2.5x multiplier on all personal task reward submissions. Pair this by recruiting 5 active friends to tap into a lifelong 10% cash bonus on all their task approval reserves!"
              };

              // Send in-app notification for Chapter 1
              await dbAdmin.collection('notifications').add({
                userId: uid,
                title: `🌅 Wise AI Daily: ${firstCoachingTopic.headline}`,
                message: `${firstCoachingTopic.quote} 👉 Tip: ${firstCoachingTopic.tip}`,
                type: 'reward',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                readBy: [],
                read: false
              });

              // If SMTP configured, dispatch email coaching immediately
              if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
                await transporter.sendMail({
                  from: `"Earnwise Coaching" <${process.env.EMAIL_USER}>`,
                  to: email,
                  replyTo: 'earnwise29@gmail.com',
                  subject: firstCoachingTopic.subject,
                  html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #f0f0f0; border-radius: 20px; background-color: #ffffff;">
                      <div style="text-align: center; margin-bottom: 25px;">
                        <h1 style="color: #2563eb; font-size: 24px; font-weight: 800; margin: 0; text-transform: uppercase;">Earnwise Daily Coach</h1>
                        <p style="color: #64748b; font-size: 13px; margin: 5px 0 0 0;">Automated Success Coach • Active Multipliers</p>
                      </div>
                      
                      <p style="font-size: 15px; color: #475569; line-height: 1.6;">Hello ${name || 'Earner'},</p>
                      <p style="font-size: 15px; color: #475569; line-height: 1.6;">We've automatically dispatched your first masterclass lesson to kickstart your journey:</p>

                      <div style="background-color: #eff6ff; border-left: 5px solid #2563eb; padding: 20px; border-radius: 12px; margin: 25px 0;">
                        <h3 style="margin-top: 0; color: #1e3a8a; font-size: 16px; text-transform: uppercase; font-weight: 800; letter-spacing: 0.05em;">${firstCoachingTopic.headline}</h3>
                        <p style="color: #1e40af; font-size: 15px; font-style: italic; margin-bottom: 0;">"${firstCoachingTopic.quote}"</p>
                      </div>

                      <div style="border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; background-color: #fafafa; margin-bottom: 25px;">
                        <h4 style="margin-top: 0; color: #1e293b; font-size: 14px; text-transform: uppercase; font-weight: 800;">Strategic Action Tip:</h4>
                        <p style="font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 0;">${firstCoachingTopic.tip}</p>
                      </div>

                      <div style="text-align: center; margin: 30px 0;">
                        <a href="${currentAppUrl || 'https://ais-pre-ucu3byd4dxfepn7umejqhx-558253480073.europe-west2.run.app'}" style="background-color: #2563eb; color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 12px; font-weight: 800; font-size: 14px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2); text-transform: uppercase;">Access Dashboard</a>
                      </div>

                      <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #f1f5f9;">
                        <p style="color: #94a3b8; font-size: 11px; margin-bottom: 5px; text-transform: uppercase;">Active Streak Protection Alert</p>
                        <p style="color: #64748b; font-size: 12px; line-height: 1.5; margin: 0;">You are receiving this because you registered on Earnwise. Daily email coaching is active.</p>
                      </div>
                    </div>
                  `
                }).catch(e => console.error("[AUTH] Automatic first coaching email dispatch failed:", e.message));
              }

              // Update coaching step to 1 so the next scheduled drops follow sequentially
              await userSnap.docs[0].ref.update({
                coachingStep: 1,
                lastCoachingAt: admin.firestore.FieldValue.serverTimestamp()
              }).catch(e => console.error("[AUTH] Failed updating coaching step metadata:", e.message));
            }
          }
        } catch (dbErr: any) {
          console.error("[AUTH] Welcome notification/coaching automatic dispatch failed:", dbErr.message);
        }
      }

      res.json({ 
        status: "success", 
        message: "Welcome processed", 
        emailDelivered: emailSent 
      });
    } catch (error: any) {
      console.error("[AUTH] Error in send-welcome-email:", error);
      res.status(500).json({ error: "Failed to process welcome request" });
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
            readBy: [],
            read: false
          });
          console.log(`[AUTH] In-app notification created for ${userId}`);
          storedServerSide = true;
        } catch (dbErr: any) {
          console.warn("[AUTH] Server Admin SDK failed writing in-app notification document:", dbErr.message || dbErr);
        }
      }

      // 2. Send email via Nodemailer
      let emailSent = false;
      if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        try {
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
                  <a href="${currentAppUrl || 'https://ais-pre-ucu3byd4dxfepn7umejqhx-558253480073.europe-west2.run.app'}" style="background-color: #2563eb; color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 12px; font-weight: 800; font-size: 14px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2); text-transform: uppercase;">Access Dashboard</a>
                </div>

                <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #f1f5f9;">
                  <p style="color: #94a3b8; font-size: 11px; margin-bottom: 5px; text-transform: uppercase;">Active Streak Protection Alert</p>
                  <p style="color: #64748b; font-size: 12px; line-height: 1.5; margin: 0;">You are receiving this because you enabled Daily Earning Reminders on Earnwise. Engage everyday to scale.</p>
                </div>
              </div>
            `
          });
          emailSent = true;
          console.log(`[AUTH] SUCCESS! Daily encouragement sent via SMTP to ${email}`);
        } catch (mailErr: any) {
          console.error(`[AUTH] Custom operational encourager failed for ${email}:`, mailErr.message);
        }
      } else {
        console.warn(`[AUTH] EMAIL_USER/EMAIL_PASS not set. Simulated sending operational encouragement quote to ${email}`);
      }

      res.json({ 
        status: "success", 
        message: "Daily encouragement processed", 
        quote: selectedTopic,
        emailDelivered: emailSent,
        storeNotificationClientSide: !storedServerSide
      });
    } catch (error: any) {
      console.error("[AUTH] Error in send-daily-encouragement:", error);
      res.status(500).json({ error: "Failed to send daily encouragement email" });
    }
  });

  // Automated Payout (Withdrawal)
  app.post("/api/paystack/withdraw", async (req, res) => {
    const { userId, amount, withdrawalType = 'task', bankDetails } = req.body;
    if (!PAYSTACK_SECRET) return res.status(500).json({ error: "Paystack secret not configured" });

    try {
      const userRef = dbAdmin.collection('users').doc(userId);
      const userDoc = await userRef.get();
      
      if (!userDoc.exists) return res.status(404).json({ error: "User not found" });
      const userData = userDoc.data() || {};
      
      if (userData.balance < amount) {
        return res.status(400).json({ error: "Insufficient balance" });
      }

      const isAdmin = userData.role === 'admin' || userData.email === 'wiseking7890@gmail.com';
      if (!isAdmin && (!userData.plan || userData.plan === 'free')) {
        return res.status(400).json({ error: "Upgrade your plan to start withdrawing." });
      }

      // --- ADVANCED DUAL-WALLET CALENDAR & WITHDRAWAL LOGIC ---
      let isWindowOpen = false;
      let windowMessage = "";

      const payoutsDoc = await dbAdmin.collection('system_settings').doc('payouts').get();
      const payoutsData = payoutsDoc.exists ? payoutsDoc.data() : null;
      const now = new Date();

      if (isAdmin) {
        isWindowOpen = true;
      } else if (payoutsData && payoutsData.payoutsForceClosed) {
        isWindowOpen = false;
        windowMessage = "Withdrawal gateway is temporarily locked by administrative override for security audits.";
      } else {
        const isTaskOverride = payoutsData ? !!payoutsData.taskOverrideOpen : false;
        const isReferralOverride = payoutsData ? !!payoutsData.referralOverrideOpen : false;

        let isCustomScheduleActive = false;
        if (payoutsData && payoutsData.payoutStartDate && payoutsData.payoutEndDate) {
          const start = new Date(payoutsData.payoutStartDate);
          const end = new Date(payoutsData.payoutEndDate);
          if (now >= start && now <= end) {
            isCustomScheduleActive = true;
          }
        }

        if (withdrawalType === 'task') {
          const lagosDay = parseInt(new Intl.DateTimeFormat('en-US', { timeZone: 'Africa/Lagos', day: 'numeric' }).format(now));
          if (isTaskOverride || isCustomScheduleActive) {
            isWindowOpen = true;
          } else if (lagosDay === 30) {
            isWindowOpen = true;
          } else {
            isWindowOpen = false;
            windowMessage = "📺 Video Task portal opens monthly on the 30th.";
          }
        } else if (withdrawalType === 'referral') {
          const lagosHour = parseInt(new Intl.DateTimeFormat('en-US', { timeZone: 'Africa/Lagos', hour: 'numeric', hour12: false }).format(now));
          const lagosWeekday = new Intl.DateTimeFormat('en-US', { timeZone: 'Africa/Lagos', weekday: 'long' }).format(now);
          const isLagosSaturday = lagosWeekday === 'Saturday';
          const isOpenHours = lagosHour >= 8 && lagosHour < 18;

          if (isReferralOverride || isCustomScheduleActive) {
            isWindowOpen = true;
          } else if (isLagosSaturday && isOpenHours) {
            isWindowOpen = true;
          } else {
            isWindowOpen = false;
            windowMessage = "🗓️ Referral portal opens Saturdays 8:00 AM – 6:00 PM.";
          }
        }
      }

      if (!isWindowOpen) {
        return res.status(400).json({ error: windowMessage || "Payout Gateway Closed. Processing windows are strictly scheduled by Administration." });
      }

      // --- DYNAMIC FEE CALCULATION (10% Task, Free Referral) ---
      const feeRate = withdrawalType === 'referral' ? 0.0 : 0.10;
      const netPayout = amount * (1 - feeRate);
      const fee = amount * feeRate;

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
        amount: Math.round(netPayout * 100),
        recipient: recipientCode,
        reason: "Earnwise Withdrawal"
      }, {
        headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` }
      });

      if (transferResponse.data.status) {
        const walletField = withdrawalType === 'referral' ? 'referralBalance' : 'taskBalance';
        await userRef.update({
          balance: admin.firestore.FieldValue.increment(-amount),
          withdrawableBalance: admin.firestore.FieldValue.increment(-amount),
          [walletField]: admin.firestore.FieldValue.increment(-amount),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        const withdrawalDocRef = await dbAdmin.collection('withdrawals').add({
          userId,
          amount,
          status: 'completed',
          withdrawalType,
          bankDetails,
          fee,
          netPayout,
          paystackTransferId: transferResponse.data.data.id,
          requestedAt: admin.firestore.FieldValue.serverTimestamp(),
          processedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        await dbAdmin.collection('transactions').add({
          userId,
          amount: -amount,
          type: 'withdrawal',
          description: `Automated Withdrawal via Paystack`,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          receiptDetails: {
            withdrawalType,
            fee,
            netPayout,
            bankName: bankDetails.bankName || '',
            accountName: bankDetails.accountName || '',
            accountNumber: bankDetails.accountNumber || ''
          }
        });

        // Send Notification
        await dbAdmin.collection('notifications').add({
          userId,
          title: '💸 Payment Processed!',
          message: `Your withdrawal of ₦${amount.toLocaleString()} was successful (Net: ₦${netPayout.toLocaleString()}, Fee: ₦${fee.toLocaleString()}) and sent to your bank.`,
          type: 'success',
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          readBy: []
        });

        // Trigger Automated Withdrawal Email to User
        if (userData.email && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
          try {
            const isReferral = withdrawalType === 'referral';
            const feeRate = isReferral ? 0.0 : 0.10;
            const netPayout = amount * (1 - feeRate);
            const fee = amount * feeRate;
            const name = userData.displayName || `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || "Earner";
            await transporter.sendMail({
              from: `"Earnwise Payouts" <${process.env.EMAIL_USER}>`,
              to: userData.email,
              replyTo: 'earnwise29@gmail.com',
              subject: `💸 Payout Approved & Processed - ₦${Number(netPayout).toLocaleString()}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #f0f0f0; border-radius: 20px; background-color: #ffffff;">
                  <div style="text-align: center; margin-bottom: 25px;">
                    <h1 style="color: #10b981; font-size: 24px; font-weight: 800; margin: 0; text-transform: uppercase;">Earnwise Payout Approved</h1>
                    <p style="color: #64748b; font-size: 13px; margin: 5px 0 0 0;">Transaction Successful • Reference: #${withdrawalDocRef.id ? withdrawalDocRef.id.slice(0, 8) : ''}</p>
                  </div>
                  
                  <div style="background-color: #ecfdf5; border-left: 5px solid #10b981; padding: 20px; border-radius: 12px; margin: 25px 0; text-align: center;">
                    <h3 style="margin-top: 0; color: #065f46; font-size: 14px; text-transform: uppercase; font-weight: 800; letter-spacing: 0.05em; margin-bottom: 5px;">Net Credit Amount</h3>
                    <h2 style="color: #047857; font-size: 32px; font-weight: 900; margin: 0;">₦${Number(netPayout).toLocaleString()}</h2>
                  </div>
 
                  <div style="border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; background-color: #fafafa; margin-bottom: 25px;">
                    <h4 style="margin-top: 0; color: #1e293b; font-size: 13px; text-transform: uppercase; font-weight: 800; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 12px;">Transaction Details</h4>
                    <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
                      <tr style="height: 30px;">
                        <td style="color: #64748b; font-weight: 500;">Beneficiary</td>
                        <td style="color: #1e293b; font-weight: 700; text-align: right;">${name}</td>
                      </tr>
                      <tr style="height: 30px;">
                        <td style="color: #64748b; font-weight: 500;">Bank Name</td>
                        <td style="color: #1e293b; font-weight: 700; text-align: right;">${bankDetails.bankName || 'N/A'}</td>
                      </tr>
                      <tr style="height: 30px;">
                        <td style="color: #64748b; font-weight: 500;">Account Number</td>
                        <td style="color: #1e293b; font-weight: 700; text-align: right;">${bankDetails.accountNumber || 'N/A'}</td>
                      </tr>
                      <tr style="height: 30px;">
                        <td style="color: #64748b; font-weight: 500;">Gross Amount</td>
                        <td style="color: #1e293b; font-weight: 700; text-align: right;">₦${Number(amount).toLocaleString()}</td>
                      </tr>
                      <tr style="height: 30px;">
                        <td style="color: #64748b; font-weight: 500;">Processing Fee (${isReferral ? 'Free' : '10%'})</td>
                        <td style="${isReferral ? 'color: #10b981;' : 'color: #e11d48;'} font-weight: 700; text-align: right;">${isReferral ? 'Free (₦0)' : `-₦${Number(fee).toLocaleString()}`}</td>
                      </tr>
                    </table>
                  </div>

                  <div style="text-align: center; margin: 30px 0;">
                    <p style="color: #475569; font-size: 14px; margin-bottom: 15px;">Your digital earner proof receipt is ready. Share it on your status to earn referrals!</p>
                    <a href="${currentAppUrl || 'https://ais-pre-ucu3byd4dxfepn7umejqhx-558253480073.europe-west2.run.app'}/earnings" style="background-color: #10b981; color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 12px; font-weight: 800; font-size: 14px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.2); text-transform: uppercase;">Download Proof Receipt</a>
                  </div>

                  <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #f1f5f9;">
                    <p style="color: #94a3b8; font-size: 10px; margin-bottom: 5px; text-transform: uppercase;">Earnwise Elite Financial Protocol</p>
                    <p style="color: #64748b; font-size: 12px; line-height: 1.5; margin: 0;">If you did not initiate this transaction, please contact support immediately.</p>
                  </div>
                </div>
              `
            });
            console.log(`[PAYOUT-EMAIL] Successfully sent payout approved email automatically for automated withdrawal to ${userData.email}`);
          } catch (emailErr) {
            console.error("[PAYOUT-EMAIL] Failed to send automated withdrawal email:", emailErr);
          }
        }

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
        const depositBalance = userData?.depositBalance || 0;

        // Determine free credits based on plan
        let maxFreeCredits = 0;
        if (plan === 'golden') maxFreeCredits = 5;
        else if (plan === 'platinum') maxFreeCredits = 2;

        const hasFreeCredits = (freeCoursesUsed < maxFreeCredits) || isAdmin;
        const cost = hasFreeCredits ? 0 : 7000;

        if (!hasFreeCredits && depositBalance < 7000) {
          throw new Error("Insufficient deposited balance. ₦7,000 required from direct bank deposits to purchase this course.");
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
            withdrawableBalance: admin.firestore.FieldValue.increment(-7000),
            depositBalance: admin.firestore.FieldValue.increment(-7000)
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

  // Gemini AI Tutor Endpoint Health Check
  app.get("/api/v1/academy/ai-status", (req, res) => {
    res.json({ 
      active: !!process.env.GEMINI_API_KEY, 
      configured: true,
      node: "Elite Academy Master Node" 
    });
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
          // Check if the user is an admin (Admins automatically bypass purchase checks)
          const userDoc = await dbAdmin.collection('users').doc(userId).get();
          if (userDoc.exists && userDoc.data()?.role === 'admin') {
            hasAccess = true;
          } else {
            const purchaseCheck = await dbAdmin.collection('coursePurchases')
              .where('userId', '==', userId)
              .where('courseId', '==', courseId)
              .limit(1)
              .get();

            if (!purchaseCheck.empty) {
              hasAccess = true;
            }
          }
        } catch (dbErr: any) {
          console.warn("[ACADEMY] Database check failed during admin mode:", dbErr.message);
          hasAccess = true;
        }
      } else {
        hasAccess = true;
      }

      if (!hasAccess) {
        return res.status(403).json({ error: "Access Denied: Enrollment required for AI assistance." });
      }

      const ai = getAi();
      if (!ai) {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Transfer-Encoding', 'chunked');
        res.write(`🎓 **Elite Academy Assistant — Developer Configuration Needed**\n\nPlease add your **GEMINI_API_KEY** in the Secrets section.`);
        return res.end();
      }

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Transfer-Encoding', 'chunked');

      try {
        const responseStream = await withRetry((modelName) => ai.models.generateContentStream({
          model: modelName,
          contents: [
            {
              role: "user",
              parts: [{
                text: `Student is studying: "${courseTitle || courseId}".
                    Current Course Context: ${context || 'General earning strategy'}.
                    Student Question: ${question}`
              }]
            }
          ],
          config: {
            systemInstruction: "You are the Earnwise Elite Academy Master Tutor. Your goal is to help students understand financial concepts and earning strategies in the context of Nigeria and the Earnwise platform.",
            temperature: 0.5,
            topP: 0.8,
            maxOutputTokens: 800,
          }
        }));

        for await (const chunk of responseStream) {
          if (chunk.text) {
            res.write(chunk.text);
          }
        }
        res.end();
      } catch (aiErr: any) {
        console.error("[ACADEMY] AI Generation failed:", aiErr);
        res.write("\n\n*AI Tutor temporarily offline. Please try again soon.*");
        res.end();
      }
    } catch (err: any) {
      console.error("[ACADEMY] AI Tutor Error:", err);
      if (!res.headersSent) res.status(500).json({ error: "AI Tutor node offline." });
      else res.end();
    }
  });

  // --- Static Uploads Folder ---
  const uploadsDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use("/uploads", express.static(uploadsDir));

  // --- Vite / Static Files ---
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res, next) => {
      // Don't handle API routes here
      if (req.path.startsWith('/api')) return next();
      
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // --- 10. DAILY ENGAGEMENT ENGINE (Notifications & Email) ---
  // Runs daily at 9:00 AM to keep users active
  cron.schedule('0 9 * * *', async () => {
    if (!isDbAdminCapable) {
      console.info("[CRON] Skipping daily engagement loop (DB Admin not capable).");
      return;
    }
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
              from: `"Wise AI Updates" <${process.env.EMAIL_USER}>`,
              to: email,
              subject: `Today's Earnings Opportunity Is Live!`,
              text: `Hello ${name},\n\nYour Wise AI powered dashboard has been refreshed with new high-payout tasks. Don't leave your multipliers idle!\n\nCheck your dashboard: ${currentAppUrl}`,
              html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                  <h2 style="color: #2563eb;">🚀 Wise AI Bonus Refreshed!</h2>
                  <p>Hello <strong>${name}</strong>,</p>
                  <p>New tasks are waiting for you today via Wise AI. Log in now to keep your streak alive and maximize your revenue multipliers.</p>
                  <div style="margin: 30px 0;">
                    <a href="${currentAppUrl}" style="background-color: #2563eb; color: white; padding: 12px 25px; text-decoration: none; border-radius: 8px; font-weight: bold;">Launch My Dashboard</a>
                  </div>
                  <p style="font-size: 12px; color: #666;">Earnwise Elite Protocol • Powered by Wise AI</p>
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



  // Daily coaching scan at 10 AM for extra reliability (in addition to the rolling interval)
  cron.schedule('0 10 * * *', async () => {
    console.log("[CRON] Running daily scheduled coaching scan...");
    runAutomatedCoachingCycle().catch(e => console.error("Daily coaching cron error:", e));
  });

  // Trigger once on system start after 8 seconds
  setTimeout(() => {
    runAutomatedCoachingCycle().catch(e => console.error("Initial coaching cycle error:", e));
  }, 8000);

  // Scan every 3 minutes to keep the pipeline highly active and ready to process due dispatches
  setInterval(() => {
    runAutomatedCoachingCycle().catch(e => console.error("Interval coaching cycle error:", e));
  }, 3 * 60 * 1000);

  const server = http.createServer(app);

  const wss = new WebSocketServer({ noServer: true });
  
  server.on('upgrade', (request, socket, head) => {
    if (request.url && request.url.startsWith('/api/ws')) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on('connection', (ws) => {
    console.log('[WS] Client connected to Wise AI Stream');
    
    ws.on('message', async (data) => {
      try {
        const payload = JSON.parse(data.toString());
        const { message, userId, history = [] } = payload;
        
        if (!message) return;

        if (userId) {
          const limitCheck = await checkAndIncrementAiLimit(userId);
          if (!limitCheck.allowed) {
            ws.send(JSON.stringify({ type: 'chunk', content: `⚠️ ${limitCheck.message}` }));
            ws.send(JSON.stringify({ type: 'done' }));
            return;
          }
        }

        const ai = getAi();
        if (!ai) {
          ws.send(JSON.stringify({ type: 'chunk', content: "API Key not configured. Please add GEMINI_API_KEY to your environment variables." }));
          ws.send(JSON.stringify({ type: 'done' }));
          return;
        }

        try {
          const responseStream = await withRetry((modelName) => ai.models.generateContentStream({
            model: modelName,
            contents: [
                ...history.map((h: any) => ({
                    role: h.role === 'user' ? 'user' : 'model',
                    parts: [{ text: h.content || "" }]
                })),
                { role: 'user', parts: [{ text: message }] }
            ],
            config: {
              systemInstruction: "You are 'Wise AI', the ultimate financial coach for Earnwise members. \n\nCRITICAL INSTRUCTIONS:\n- ONLY answer what the user is explicitly asking about. Keep it conversational, helpful, and natural.\n- OWNER & CEO: ONLY if explicitly asked 'who is the owner/CEO', say it is Johnathan Sterling. NEVER spit these facts out randomly in a general guide.\n- UPGRADING & PLANS: Users MUST NOT contact vendors or use activation codes. To upgrade/buy plans, go to 'Deposit', fund via Paystack, then go to 'Plans' and click 'Activate Now'.\n- REWARDS & EARNINGS: Give accurate answers. Users earn ₦ by interacting with sponsored ads, social media, uploading screenshots, taking courses, lucky spin, and referrals.\n- TIERS: Elite (1.25x), Lite (1.5x), Bronze (2.0x), Silver (3.0x), Golden (5.0x).\n- WITHDRAWAL: Minimum ₦1,000 to any Nigerian bank.\n- SPONSORS: ONLY if asked, EarnWise is sponsored by Google, CPX Limited, Giminai, Adsense, Dune & Oak. Do NOT volunteer this by default.",
              temperature: 0.5,
              topP: 0.8,
              maxOutputTokens: 800,
            }
          }));

          for await (const chunk of responseStream) {
            if (chunk.text) {
              ws.send(JSON.stringify({ type: 'chunk', content: chunk.text }));
            }
          }
          ws.send(JSON.stringify({ type: 'done' }));
        } catch (err: any) {
          console.error("[WS] Gemini Error:", err);
          ws.send(JSON.stringify({ type: 'error', message: "I'm having a little trouble with the connection right now." }));
        }

      } catch (error: any) {
        console.error('[WS] Wise AI Stream Error:', error);
        ws.send(JSON.stringify({ type: 'error', message: error.message || 'Stream processing failure' }));
      }
    });

    ws.on('close', () => console.log('[WS] Client disconnected'));
  });

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT} (isProd: ${isProd})`);
  });

  // Enable graceful stop
  process.once('SIGINT', () => bot?.stop('SIGINT'));
  process.once('SIGTERM', () => bot?.stop('SIGTERM'));
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
});
