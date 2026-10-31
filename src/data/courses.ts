import { Course } from '../types';

export const courses = [
  // Newly optimized high-ticket courses
  {
    id: "tiktok-shop",
    title: "TikTok Shop Growth Strategy",
    subtitle: "$1,000 - $5,000 / Month",
    description: "Leverage the viral ecosystem of TikTok Shop to dominate social e-commerce.",
    image: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "pinterest-traffic",
    title: "Pinterest Traffic Harvesting",
    subtitle: "$300 - $1,000 / Month",
    description: "Drive mass organic traffic to blogs, shops, or affiliate links using the visual search power of Pinterest.",
    image: "https://images.unsplash.com/photo-1611162616493-2a0754546c1f?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "discord-management",
    title: "Elite Discord Community Management",
    subtitle: "$400 - $1,500 / Month",
    description: "Master the architectural and psychological frameworks for managing high-engagement communities.",
    image: "https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "instagram-growth",
    title: "Instagram Page Flipping & Growth",
    subtitle: "$500 - $2,000 / Month",
    description: "Build, optimize, and monetize high-retention theme pages on Instagram from scratch.",
    image: "https://images.unsplash.com/photo-1611224885990-ab7363d1f2a9?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "whatsapp-lead-siphon",
    title: "WhatsApp Organic Lead Siphon",
    subtitle: "₦200k - ₦500k / Month",
    description: "Transform your WhatsApp status into a lucrative digital sales funnel and siphon thousands of buyers on autopilot.",
    image: "https://images.unsplash.com/photo-1573804633927-bfcbcd909acd?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "premium-ghostwriting",
    title: "Premium Ghostwriting & Foreign Arbitrage",
    subtitle: "$500 - $3,000 / Month",
    description: "Write high-converting content for international executives and businesses to secure stable dollar payouts from Nigeria.",
    image: "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "smartphone-video",
    title: "Smartphone Video Editing & Content Creation",
    subtitle: "₦150k - ₦500k / Month",
    description: "Master cinematic mobile editing workflows on CapCut to create high-retaining short-form video ads for local brands.",
    image: "https://images.unsplash.com/photo-1512499617640-c74ae3a79d37?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "ai-graphic-design",
    title: "AI-Powered Graphic Design Mastery",
    subtitle: "₦100k - ₦400k / Month",
    description: "Leverage tools like Midjourney and Canva to design professional marketing flyers, logos, and digital branding sets.",
    image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80"
  },

  // Classic formal courses
  {
    id: "c1",
    title: "High-Ticket Digital Arbitrage",
    subtitle: "$1,000 - $4,000 / Month",
    description: "Master dollar arbitrage by flipping digital resources, services, and high-value domains dynamically.",
    category: "Freelancing",
    image: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "c2",
    title: "Social Media Ghostwriting",
    subtitle: "$500 - $2,500 / Month",
    description: "Master the secrets of written persuasion and structure viral posts for international micro-influencer channels.",
    category: "Writing",
    image: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "c3",
    title: "AI-Powered Content Empire",
    subtitle: "$600 - $3,000 / Month",
    description: "Deploy generative AI workflow machines to produce high-retention content bundles at lightning-fast scales or speeds.",
    category: "AI Strategy",
    image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "c4",
    title: "Micro-SaaS for Campus Problems",
    subtitle: "₦150,000 - ₦450,000 / Month",
    description: "Engineer lightweight web and text utilities that resolve high-friction college student or local community pain points. No-code built.",
    category: "E-commerce",
    image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "c5",
    title: "The Faceless YouTube Blueprint",
    subtitle: "$400 - $2,000 / Month",
    description: "Establish complete automated video networks on YouTube without revealing personal presence, harvesting high ad yields.",
    category: "Marketing",
    image: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "c6",
    title: "Newsletter Monetization Magic",
    subtitle: "$300 - $1,500 / Month",
    description: "Create premium newsletter templates, curate niche updates, and convert email distributions into sponsorship assets.",
    category: "Writing",
    image: "https://images.unsplash.com/photo-1466096115632-44558e2b86cc?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "c7",
    title: "Elite Discord Community Management",
    subtitle: "$400 - $1,500 / Month",
    description: "Master discord server mechanics, moderative bot designs, and engagement models to secure elite community contract retainers.",
    category: "Freelancing",
    image: "https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "c8",
    title: "Notion Workspace Engineering",
    subtitle: "$300 - $1,200 / Month",
    description: "Organize relational databases and craft sleek client dashboard files on Notion to charge global entrepreneurs.",
    category: "Design",
    image: "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "c9",
    title: "Affiliate Marketing Sniper",
    subtitle: "₦100,000 - ₦300,000 / Month",
    description: "Perform precise audience diagnostics and promote evergreen foreign tools to local buyer circles with instant setups.",
    category: "Marketing",
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "c10",
    title: "UGC Content Creator Elite",
    subtitle: "₦150,000 - ₦500,000 / Month",
    description: "Produce user-generated video assets for fast-growing African digital shops and agencies to earn immediate payouts.",
    category: "Design",
    image: "https://images.unsplash.com/photo-1588196749597-9ff075ee6b5b?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "c11",
    title: "TikTok Shop Growth Strategy (Classic)",
    subtitle: "$1,000 - $5,000 / Month",
    description: "Classic blueprint on managing TikTok shop client loops, automated inventory checks, and affiliate setups.",
    category: "E-commerce",
    image: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "c12",
    title: "SEO Auditing for Small Biz",
    subtitle: "$300 - $1,200 / Month",
    description: "Diagnose crawl bugs, optimize heading maps, and help growing service firms rank on organic maps search flows.",
    category: "Freelancing",
    image: "https://images.unsplash.com/photo-1562577309-4932fdd64cd1?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "c13",
    title: "Stock Photography Portfolio",
    subtitle: "₦50,000 - ₦150,000 / Month",
    description: "Capture beautiful localized stock graphics and list them globally across major commercial libraries.",
    category: "Photography",
    image: "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "c14",
    title: "Amazon KDP Self-Publishing",
    subtitle: "$200 - $1,000 / Month",
    description: "Learn manuscript formatting pipelines and distribute beautiful notebooks or micro guides on Kindle for USD cash.",
    category: "Writing",
    image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "c15",
    title: "Pinterest Traffic Harvesting (Classic)",
    subtitle: "$300 - $1,000 / Month",
    description: "Classic system of visual pinning models to extract free premium traffic towards high-converting landing sites.",
    category: "Marketing",
    image: "https://images.unsplash.com/photo-1611162616493-2a0754546c1f?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "c16",
    title: "Digital Product Launchpad",
    subtitle: "$400 - $2,000 / Month",
    description: "Package your insights into digital download sheets, kits, or workbooks to construct infinite-leverage income assets.",
    category: "E-commerce",
    image: "https://images.unsplash.com/photo-1512428559087-560fa5ceab42?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "c17",
    title: "Print on Demand Strategy",
    subtitle: "₦100,000 - ₦300,000 / Month",
    description: "Publish your artistic overlays onto virtual clothing formats, leaving fulfilling distribution and printing entirely on autopilot.",
    category: "Design",
    image: "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "c18",
    title: "Voiceover Artistry Protocol",
    subtitle: "$300 - $1,500 / Month",
    description: "Train vocal qualities, configure cheap dynamic microphone spacing, and win premium audio projects on foreign boards.",
    category: "Freelancing",
    image: "https://images.unsplash.com/photo-1478737270239-2fccd27ffebb?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "c19",
    title: "Virtual Assistant Elite",
    subtitle: "$400 - $1,800 / Month",
    description: "Secure stable monthly contracts by mastering schedules, client interfaces, inbox management, and standard spreadsheets.",
    category: "Freelancing",
    image: "https://images.unsplash.com/photo-1484417894907-623942c8ee29?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "c20",
    title: "Online Course Launchpad",
    subtitle: "₦200,000 - ₦600,000 / Month",
    description: "Structure high-integrity coaching pipelines, design premium lesson loops, and launch on modern publishing engines.",
    category: "Education",
    image: "https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "c21",
    title: "Podcast Production Agency",
    subtitle: "$500 - $2,500 / Month",
    description: "Mix pristine audio streams, overlay transitional melodies, and edit video shorts to earn rich retainer payouts.",
    category: "Freelancing",
    image: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "c23",
    title: "Business Process Automation",
    subtitle: "$600 - $2,500 / Month",
    description: "Deploy automated workflows, connect data systems, and simplify corporate administration structures for enterprises.",
    category: "AI Strategy",
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "c24",
    title: "LinkedIn Authority Protocol",
    subtitle: "$400 - $2,000 / Month",
    description: "Establish professional command hierarchies, maximize profile layouts, and attract warm corporate b2b contracts.",
    category: "Marketing",
    image: "https://images.unsplash.com/photo-1611944212129-29977ae1398c?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "c25",
    title: "Paid Newsletter Architecture",
    subtitle: "$300 - $1,500 / Month",
    description: "Build secure premium publishing tracks, secure direct-response users, and earn stable recurring monthly subscriptions.",
    category: "Writing",
    image: "https://images.unsplash.com/photo-1557200134-90327ee9fafa?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "c26",
    title: "Graphic Design Branding Agency",
    subtitle: "₦150,000 - ₦400,000 / Month",
    description: "Design corporate visual symbols, layout brand books, and assemble vector sets for premium local startups.",
    category: "Design",
    image: "https://images.unsplash.com/photo-1626785774573-4b799315345d?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "c27",
    title: "App Store Optimization (ASO) Mastery",
    subtitle: "$400 - $1,800 / Month",
    description: "Optimize keywords, write compelling store bios, and direct download ranking algorithms for smartphone applications.",
    category: "Marketing",
    image: "https://images.unsplash.com/photo-1551650975-87deedd944c3?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "c28",
    title: "Direct Response Copywriting",
    subtitle: "$500 - $3,000 / Month",
    description: "Write highly persuasive sales letters, landing files, and conversion-optimized checkout structures.",
    category: "Writing",
    image: "https://images.unsplash.com/photo-1516962215378-7fa2e137ae93?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "c29",
    title: "Sponsorship Outreach Agency",
    subtitle: "$400 - $2,000 / Month",
    description: "Broker sponsor commitments between companies and content authors, taking high-margin commission shares from each deal.",
    category: "Marketing",
    image: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "c30",
    title: "Elite Student Investing Protocol",
    subtitle: "₦50,000 - ₦200,000 / Month",
    description: "Acquire risk avoidance habits, optimize portfolio allocations, and identify stable growth vehicles on campus.",
    category: "Education",
    image: "https://images.unsplash.com/photo-1611974714024-46274ad030c6?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "c31",
    title: "Digital Real Estate Flipped",
    subtitle: "₦100,000 - ₦400,000 / Month",
    description: "Buy, improve, and sell cash-producing online domains, templates, and micro utilities for rapid, high returns.",
    category: "E-commerce",
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "c32",
    title: "Short-Form Video Monetization",
    subtitle: "₦150,000 - ₦500,000 / Month",
    description: "Build rapid viral content loops, deploy smartphone audio patterns, and win platform creator funds.",
    category: "Marketing",
    image: "https://images.unsplash.com/photo-1611605698335-8b15d27e03f9?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "c33",
    title: "High-Ticket Sales Closer Protocol",
    subtitle: "$500 - $2,500 / Month",
    description: "Negotiate business terms, handle objections, and close high-premium client pipelines to receive rich percentages.",
    category: "Freelancing",
    image: "https://images.unsplash.com/photo-1552581230-2640742677bc?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "c34",
    title: "SaaS Newsletter Architecture",
    subtitle: "$400 - $2,000 / Month",
    description: "Research tech developments, write elegant micro newsletters, and capture active technical subscribers.",
    category: "AI Strategy",
    image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "c35",
    title: "Smartphone Canva & Mobile Design Mastery",
    subtitle: "₦100,000 - ₦300,000 / Month",
    description: "Assemble gorgeous social flyers, custom vectors, and business cards entirely on a mobile phone layout.",
    category: "Design",
    image: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "c36",
    title: "WhatsApp Organic Lead Siphon (Classic)",
    subtitle: "₦200,000 - ₦500,000 / Month",
    description: "Classic blueprint to turn simple status graphics into buyer funnels and drive bulk messages.",
    category: "Marketing",
    image: "https://images.unsplash.com/photo-1573804633927-bfcbcd909acd?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "c37",
    title: "CapCut Smartphone Video Editing (Classic)",
    subtitle: "₦150,000 - ₦400,000 / Month",
    description: "Master baseline timeline splices, sound tracks, and simple overlays inside the mobile app.",
    category: "Design",
    image: "https://images.unsplash.com/photo-1512499617640-c74ae3a79d37?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "c38",
    title: "Upwork US Dollar Freelance Speedrun",
    subtitle: "$400 - $2,000 / Month",
    description: "Draft high-converting proposals, setup professional freelancer portfolios, and earn steady dollar payouts securely.",
    category: "Freelancing",
    image: "https://images.unsplash.com/photo-15222075469751-3a6694fb2f61?w=600&auto=format&fit=crop&q=80"
  }
];

const METADATA_MAPPING: Record<string, { 
  category: string; 
  price: number; 
  steps: string[];
  targetAudience?: string;
  whatYouWillLearn?: string[];
  swipeCopy?: {
    headline: string;
    whatsapp: string;
    twitter: string;
    statusHook: string;
    targetAudience: string;
    objectionBuster: string;
  };
}> = {
  "tiktok-shop": {
    category: "E-commerce",
    price: 7000,
    targetAudience: "Content creators, e-commerce hustlers, and agency operators seeking high-margin social commerce sales.",
    whatYouWillLearn: [
      "Master TikTok Shop algorithm hooks & viral product discovery",
      "End-to-end seller & affiliate partnership structures",
      "Short-form product demonstration video scripts with 70%+ retention",
      "Cross-border remote agency arbitrage for Nigerian operators"
    ],
    swipeCopy: {
      headline: "How to Build a ₦500k/mo TikTok Shop Business (Without Holding Physical Inventory)",
      whatsapp: "🔥 Have you seen how people are quietly printing money on TikTok Shop without dancing? This master course breaks down the exact product research formulas, supplier links, and viral video scripts. Check out the curriculum and enroll here: {{LINK}}",
      twitter: "TikTok isn't just an entertainment app anymore—it's the highest converting e-commerce platform right now. Here's the complete playbook for selling trending products or partnering with brands: {{LINK}}",
      statusHook: "Slide 1: If you spend 2+ hours a day scrolling TikTok, you're on the wrong side of the algorithm...\nSlide 2: People are making ₦250k - ₦1M/month selling trending items on TikTok Shop without holding inventory.\nSlide 3: Grab the complete TikTok Shop blueprint here before enrollment closes 👉 {{LINK}}",
      targetAudience: "Smartphone users, creators, students looking for digital sales skills.",
      objectionBuster: "Does this work in Nigeria? Yes! The curriculum includes remote agency models and cross-border partnership frameworks built specifically for international arbitrage."
    },
    steps: [
      "Module 1: TikTok Shop Fundamentals — Ecosystem Architecture, Seller vs Affiliate Models & Market Eligibility",
      "Module 2: High-Demand Product & Niche Research — Data Signals, Competitor Forensics & Net Margin Unit Economics",
      "Module 3: Shop Readiness & High-Converting Listings — Store Setup, Mobile SEO Titles & Visual Asset Stack",
      "Module 4: Viral Short-Form Video Creation — Psychological Hooks, Demonstration Scripts & Retention Architecture",
      "Module 5: Affiliate Marketing & Creator Partnerships — Recruitment Systems, Commission Architecture & Cold Outreach",
      "Module 6: Order Fulfillment, Customer Care & Logistics — Fulfillment SLAs, 3PL Warehousing & Account Health",
      "Module 7: Analytics, Unit Economics & Conversion Optimization — Metrics Dashboards, Funnel Diagnosis & Systematic Scaling",
      "Module 8: Practical Launch Capstone Project — End-to-End Store Execution, Launch Sprint & Remote Agency Simulation"
    ]
  },
  "pinterest-traffic": {
    category: "Marketing",
    price: 6000,
    targetAudience: "Bloggers, affiliate marketers, and digital product owners needing consistent, free buyer traffic.",
    whatYouWillLearn: [
      "Pinterest visual SEO algorithms and keyword ranking structures",
      "Batch-designing high-converting 2:3 vertical pins in minutes",
      "Automated multi-board scheduling for 10,000+ monthly visits",
      "Directing Pinterest visual searchers directly to high-ticket affiliate checkouts"
    ],
    swipeCopy: {
      headline: "Drive 10,000+ Free Buyer Clicks Monthly from Pinterest (No Ad Spend)",
      whatsapp: "Stop burning money on paid ads! Pinterest is a visual search engine full of people with their credit cards out. This master guide shows you how to harvest thousands of organic visitors every single week for free: {{LINK}}",
      twitter: "Pinterest isn't just for wedding dresses and recipes—it's the highest purchasing-intent search engine on the web. Here is how to siphon free organic traffic to your affiliate links: {{LINK}}",
      statusHook: "Slide 1: Most people don't know Pinterest is actually a search engine like Google.\nSlide 2: You can get 10,000+ free clicks every single month with simple Canva pins.\nSlide 3: See the step-by-step traffic harvesting framework here 👉 {{LINK}}",
      targetAudience: "Affiliates, digital sellers, and webmasters seeking zero-cost traffic.",
      objectionBuster: "Do I need design skills? No! We provide editable Canva templates sized to the exact 2:3 standard."
    },
    steps: [
      "Pinterest SEO Configuration: Transition to a Pinterest Business setup and insert keywords in your domain, bio, and board headers.",
      "Visual Ratio Composition: Compose high-contrast pins matching the absolute 2:3 vertical standard ratio utilizing Canva templates.",
      "The Board Optimization Routine: Create 10 boards targeting curated user interests, adding descriptive tags to pull high traffic volumes.",
      "The Autopilot Pin Scheduler: Use Tailwind or internal schedule tools to publish 5 high-value pins daily at optimized traffic timezone slots.",
      "Affiliate Redirect Siphoning: Frame custom bridging web domains to redirect Pinterest clicks to affiliate or shop checkouts cleanly.",
      "The Visual Analytics Audit: Track high-performing pin impressions inside Pinterest analytics to prioritize top-tier search metrics.",
      "Group Board Infiltration: Connect with established, high-traffic visual curators to syndicate your boards globally for free.",
      "Passive Multi-Asset Monetization: Scale your traffic loops to direct premium audiences onto newsletters, print sales, or digital portals."
    ]
  },
  "discord-management": {
    category: "Freelancing",
    price: 6000,
    targetAudience: "Freelancers, moderators, and community builders seeking $500 - $1,500/month remote retainers.",
    whatYouWillLearn: [
      "Professional Discord server hierarchy, channels, and security shields",
      "Automated bot setups, spam guards, and verification flows",
      "Gamified role leveling systems that skyrocket member retention",
      "How to pitch high-ticket community management retainers to global Web3 & SaaS brands"
    ],
    swipeCopy: {
      headline: "Land $500 - $1,500/Month Retainers as an Elite Discord Manager",
      whatsapp: "Global companies and NFT/SaaS founders are desperately paying $500 - $1,500 monthly retainers for people to manage their Discord communities. This course gives you the exact setup templates, bot configurations, and client pitch scripts: {{LINK}}",
      twitter: "Community management is one of the highest-paid remote skills right now. You can manage 2-3 servers from home on your laptop or phone. Here is how to land foreign retainers: {{LINK}}",
      statusHook: "Slide 1: Want to earn in foreign currencies without complex coding or video editing?\nSlide 2: Discord community managers earn between $400 and $1,500 monthly per client.\nSlide 3: Get the exact community architecture & client pitch scripts here 👉 {{LINK}}",
      targetAudience: "College students and young professionals seeking foreign-exchange earnings.",
      objectionBuster: "Can I manage servers using a smartphone? Yes! Discord mobile lets you moderate and engage from anywhere."
    },
    steps: [
      "Server Hierarchy Construction: Design visual structures sorting channels from announcements to premium alpha segments.",
      "Verification and Shield Deployment: Integrate custom bot systems to defend your community server from automated spam or raid loops.",
      "Onboarding Automation Suite: Setup automated messages, direct guidelines, and instant role selection modules for newcomers.",
      "The Engagement Ritual Schedule: Frame a 30-day activity blueprint involving weekly masterclasses, AMAs, and interactive events.",
      "Gamified Role Leveling Schemes: Set up dynamic tier assignments rewarding active discord users with special rights and tags.",
      "Constitutional Moderation Matrix: Hire, brief, and lead a junior moderator circle on conflict resolution rules and safety.",
      "Community Dashboard Analytics: Analyze discord's internal server insights to track high-retention topics and member counts.",
      "Retainer Pipeline Closure: Convert your advanced community build frameworks into premium high-ticket management retainers."
    ]
  },
  "instagram-growth": {
    category: "Marketing",
    price: 6500,
    targetAudience: "Entrepreneurs, creators, and page flippers wanting 50k+ followers and profitable brand sponsorships.",
    whatYouWillLearn: [
      "High-retention Reels formatting and viral sound selection",
      "DM automation funnels that convert profile visits to automated sales",
      "Landing paid sponsorships and co-promotions with international brands",
      "Valuing and safely flipping high-engagement theme pages for lump sums"
    ],
    swipeCopy: {
      headline: "Grow 50k+ Instagram Followers & Flip Theme Pages for High Cash Exits",
      whatsapp: "Stop posting randomly on Instagram hoping for views. There is an exact algorithmic blueprint for viral Reels, story sales funnels, and flipping pages for ₦200k - ₦500k. Learn how the top creators do it here: {{LINK}}",
      twitter: "Theme pages on Instagram are digital real estate. Build them organically with viral short-form content, monetize with brand deals, then flip them for profit. Complete guide: {{LINK}}",
      statusHook: "Slide 1: Did you know you don't even need to show your face to make money on Instagram?\nSlide 2: Faceless theme pages make ₦300k+ monthly from affiliate links and brand shoutouts.\nSlide 3: Learn the step-by-step growth and flipping system here 👉 {{LINK}}",
      targetAudience: "Creators, affiliate promoters, and digital theme page builders.",
      objectionBuster: "Do I need to show my face? Not at all! This course specifically focuses on faceless theme page strategies."
    },
    steps: [
      "Aesthetic Profile Setup: Write a short bio detailing the visual theme and place a clean, professional profile asset.",
      "The Reels Engagement Formula: Repurpose, edit, and caption trending industry topics overlaid with algorithm hooks.",
      "Daily Grid Story Cycles: Program regular interactive story polls combined with high-retention feed posts to drive impressions.",
      "DM Trigger Funnel Integration: Deploy automation setups (such as ManyChat) to auto-direct active users to your checkout forms.",
      "Strategic Creator Co-promotions: Partner with niche creators to co-author high-performing posts and share audience metrics.",
      "Direct Brand Sponsorship Pitch: Build a single media pack outlining your counts, open rates, and reach to pitch to high-paying sponsors.",
      "Profile-Flipping Launchpad: Package highly active accounts with steady follower trends for high-multiple cash exits.",
      "The Monetization Stack: Integrate recurring digital consulting, community models, and private memberships directly in your bio."
    ]
  },
  "whatsapp-lead-siphon": {
    category: "Marketing",
    price: 7000,
    targetAudience: "Vendors, course creators, and affiliates wanting 500+ daily WhatsApp status views that buy.",
    whatYouWillLearn: [
      "Automated VCF lead siphon funnels that bypass manual number saving",
      "Attention-Agitation-Proof-Offer copywriting for status slides",
      "Organizing buyers with WhatsApp Business tags, catalogs, and quick replies",
      "Hosting high-conversion 1-day WhatsApp masterclasses that generate bulk sales"
    ],
    swipeCopy: {
      headline: "Transform Your WhatsApp Status into a ₦300k/Month Sales Machine",
      whatsapp: "If you have more than 50 WhatsApp contacts, you are sitting on an untapped goldmine. This master blueprint shows you how to siphon hundreds of hot buyers daily and close sales effortlessly using your status slides. See how here: {{LINK}}",
      twitter: "WhatsApp is the highest-converting sales channel in Nigeria right now. If your status views aren't bringing in direct bank alerts daily, you need this lead siphon framework: {{LINK}}",
      statusHook: "Slide 1: Most people use WhatsApp status just to post memes and updates.\nSlide 2: Smart earners turn that exact same status into ₦200,000+ weekly using automated siphon links.\nSlide 3: Check out the exact system and swipe scripts here 👉 {{LINK}}",
      targetAudience: "Local business owners, students, affiliate promoters, and service sellers.",
      objectionBuster: "What if I have few contacts? Module 1 & 2 teach automated lead generation methods that bring in 50-100 new contacts daily!"
    },
    steps: [
      "The Magnet Asset Blueprint: Build a high-value checklist, slide template, or mini video course in under 3 hours to capture intent.",
      "Contact List Automation Setup: Build web links that pre-populate save request sentences, making saver VCFs easily distributable.",
      "Story Layout Progression: Structure your status slides using the ultimate Attention-Agitation-Proof-Offer copywriting blueprint.",
      "WhatsApp Business Scaling: Maintain custom categories, templates, and labeling structures to filter hot buyers.",
      "TikTok & Reels Status Feeder: Publish high-hook, zero-friction short videos telling users to retrieve the free asset in your bio.",
      "Interactive Class Seminars: Direct warm prospects into a temporary class group. Feed values, then introduce a high-velocity offer.",
      "High-Margin Affiliate Bridge: Source and affiliate-promote premium software or educational materials inside your statuses.",
      "Status Ad Slot Monetization: Sell valuable ad slots to other vendors starting at ₦5,000 per post once your status impressions scale."
    ]
  },
  "premium-ghostwriting": {
    category: "Writing",
    price: 7000,
    targetAudience: "Writers, researchers, and aspiring freelancers wanting $500 - $3,000 international client contracts.",
    whatYouWillLearn: [
      "Deconstructing voice patterns of tech executives and LinkedIn influencers",
      "Writing high-impact thought leadership posts, newsletters, and Twitter threads",
      "The 'Free-Trial Pitch' framework that turns cold outreach into signed retainers",
      "Receiving USD payments into Nigerian multi-currency accounts safely"
    ],
    swipeCopy: {
      headline: "Write for US/European Founders and Earn $500 - $3,000/Month in Foreign Exchange",
      whatsapp: "You don't need a literature degree to get paid in dollars. Foreign tech founders and CEOs are too busy to write their own LinkedIn and Twitter posts. This course trains you to ghostwrite for them and close $1,000+ retainers from Nigeria: {{LINK}}",
      twitter: "High-ticket ghostwriting is the cleanest way to earn foreign currency without upfront investment. Write 1-2 hours a day for global executives: {{LINK}}",
      statusHook: "Slide 1: Did you know international CEOs pay up to $2,000 a month just for someone to write 3 LinkedIn posts a week for them?\nSlide 2: It's called executive ghostwriting, and you can do it from anywhere in Nigeria.\nSlide 3: Check out the full foreign client outreach blueprint here 👉 {{LINK}}",
      targetAudience: "Writers, students, communicators, and remote job seekers.",
      objectionBuster: "Do I need previous writing experience? No. The vocal signature matrices and fill-in-the-blank templates make it easy to produce high-value content immediately."
    },
    steps: [
      "High-Ticket Client Discovery: Source CEOs, VCs, and tech founders on LinkedIn who post infrequently but command heavy prestige.",
      "Vocal Blueprint Breakdown: Design linguistic matrices tracking their sentence pacing, favorite vocabulary, and focus topics.",
      "Mock Proposal Development: Compose 3 custom status drafts mimicking their writing signature to prove immediate capability.",
      "The Free Week Blueprint Pitch: Offer a zero-risk 7-day trial managing their visual channels to build absolute confidence.",
      "Outsourced Research Protocols: Gather skilled virtual helpers to carry out background study and data drafting stages for you.",
      "Premium Retainer Close: Present performance metrics from the trial week to lock in stable recurring monthly contracts.",
      "Dynamic Notion Approval Board: Streamline the reviewing process with custom statuses requiring 1-click approvals of updates.",
      "Secure Foreign Settlements Setup: Connect Wise, Payoneer, or foreign gateway pipelines to withdraw USD earnings safely of Nigeria."
    ]
  },
  "smartphone-video": {
    category: "Freelancing",
    price: 5500,
    targetAudience: "Aspiring video editors, content creators, and mobile creatives with only a smartphone.",
    whatYouWillLearn: [
      "Professional CapCut mobile workflows, 60fps export tuning, and bitrate control",
      "Dynamic auto-captions, word-by-word highlights, and sound-effect timing",
      "Fast hook sequencing: Zoom-cuts and split timeline transitions",
      "Packaging monthly 15-video retainer packs for local businesses at ₦150k - ₦300k"
    ],
    swipeCopy: {
      headline: "Master CapCut Video Editing & Charge ₦150k+ Monthly with Just Your Phone",
      whatsapp: "You don't need an expensive laptop or camera to edit viral video ads. Local boutiques, gyms, and digital businesses are hungry for short-form video editors. Learn mobile CapCut editing and start closing clients: {{LINK}}",
      twitter: "Video editing on your smartphone is one of the quickest skills to monetize today. CapCut has everything you need. Full step-by-step masterclass here: {{LINK}}",
      statusHook: "Slide 1: Your smartphone camera and CapCut are all you need to start a ₦150k/month editing side hustle.\nSlide 2: Every local business needs TikTok and Reels ads right now.\nSlide 3: Master the mobile editing masterclass here 👉 {{LINK}}",
      targetAudience: "Mobile users, creative students, and social media creators.",
      objectionBuster: "Is a laptop required? 100% no! Every single module is recorded on mobile devices."
    },
    steps: [
      "CapCut Mobile Workspace Tuning: Configure quality rendering setups (1080p, 60fps) and customize quick-accessible sound-FX folders.",
      "The Zoom-Cut Attraction Hook: Arrange timelines to split unneeded silences and layer zoom movements in the first 3 seconds.",
      "Dynamic Text Outline Generator: Output subtitles on custom brand shapes, combining animated highlights on spoken words.",
      "Dual-Timeline Audio Engineering: Merge professional voice recordings with active background layers and transition sound-effects.",
      "High-Quality Stock Overlays: Arrange relevant visual overlays to maintain active user attention throughout long narratives.",
      "The High-Conversion Format Plan: Size assets explicitly for smartphone video ads, framing elements within non-obstructed safe zones.",
      "The Retainer Sales Pitch: Pitch a monthly production schedule of 15 reels to small local boutiques starting at premium fees.",
      "Mobile Studio Asset Upgrades: Reinvest early payouts into portable ring lights, tripods, and premium lavalier audio microphones."
    ]
  },
  "ai-graphic-design": {
    category: "Design",
    price: 5000,
    targetAudience: "Beginner designers, small business owners, and non-creatives wanting professional design assets.",
    whatYouWillLearn: [
      "Midjourney prompt engineering for photorealistic marketing and logo designs",
      "Converting raster images to high-resolution vector print assets",
      "Canva Pro layout grids, typographic harmony, and visual contrast rules",
      "Selling ready-made digital graphic templates on social media for passive income"
    ],
    swipeCopy: {
      headline: "Create Professional Marketing Graphics in Minutes Using AI & Canva",
      whatsapp: "Stop paying graphic designers ₦15,000 for simple flyers! Learn how to use Midjourney and Canva to generate studio-grade marketing graphics, branding sets, and logos in minutes: {{LINK}}",
      twitter: "AI graphic design is the biggest productivity cheat code of 2026. Design stunning flyers, pitch decks, and social posts without prior Photoshop experience: {{LINK}}",
      statusHook: "Slide 1: You no longer need 3 years of Photoshop training to design like a pro.\nSlide 2: Generative AI tools and Canva let you create incredible brand flyers in 5 minutes.\nSlide 3: Learn the full prompt templates and design blueprints here 👉 {{LINK}}",
      targetAudience: "Non-designers, business owners, and digital marketers.",
      objectionBuster: "Do I need artistic drawing talent? Not at all! AI handles generation, and Canva provides the intuitive drag-and-drop alignment."
    },
    steps: [
      "Midjourney Prompt Frameworks: Master styling variables, aspect ratios, and design weights to render clean background plates.",
      "Clean Scale Vector Conversion: Convert detailed raster files into infinite-scale vector formats for print materials.",
      "Canva Pro Layout Alignment: Compose graphics using structured grid systems and select font combinations for clear visibility.",
      "Sufficiency of Visual Contrast: Integrate semi-transparent dividers and backing elements behind titles to command readability.",
      "Digital Presentation Mockups: Frame your graphics on real-world items (product boxes, folders) to validate prestige with leads.",
      "High-Velocity Client Cold-Outreach: Pitch original branding and social designs to growing local gyms, diners, and agencies.",
      "Printing and Physical Upsells: Double your net profit margins by partnering with reliable offline print groups to fulfill assets.",
      "Editable Source Link Packages: Upload fully customizable design bundles onto digital marketplaces for passive income."
    ]
  }
};

export const COURSES: Course[] = courses.map((c, idx) => {
  const meta = METADATA_MAPPING[c.id];
  // Strictly enforce price bounds between ₦5,000 and ₦7,000
  let calculatedPrice = 6000;
  if (meta && meta.price) {
    calculatedPrice = meta.price;
  } else if ((c as any).price) {
    calculatedPrice = (c as any).price;
  } else {
    // Generate an authentic price within 5,000 to 7,000
    const priceVariants = [5000, 5500, 6000, 6500, 7000];
    calculatedPrice = priceVariants[idx % priceVariants.length];
  }
  // Hard clamp: Must be >= 5000 and <= 7000
  const finalPrice = Math.min(7000, Math.max(5000, calculatedPrice));
  const commissionRate = 0.30; // 70/30 platform/user split: 30% to user promoter, 70% to platform
  const commissionAmount = Math.round(finalPrice * commissionRate);

  const steps = meta?.steps || (c as any).steps || [
    `${c.title} Foundations: Theoretical mastery, market opportunities, and workspace setup.`,
    `Core Execution Blueprint: Practical workflows, over-the-shoulder demonstration, and tool mastery.`,
    `High-Ticket Monetization: Finding high-paying buyers, client outreach scripts, and pricing models.`,
    `Automated Scaling & SOPs: Establishing delegation pipelines and recurring income retainers.`
  ];

  const targetAudience = meta?.targetAudience || "Students, freelancers, and aspiring digital earners looking to establish reliable monthly cashflow.";
  const whatYouWillLearn = meta?.whatYouWillLearn || [
    `Comprehensive end-to-end framework for ${c.title}`,
    "Practical worksheets, templates, and downloadable checklists",
    "Direct monetization and client acquisition strategies",
    "Full access to the 24/7 AI Master Tutor for real-time guidance"
  ];

  const swipeCopy = meta?.swipeCopy || {
    headline: `Master ${c.title} & Build a Lucrative Digital Income Stream`,
    whatsapp: `Check out this complete, practical masterclass on ${c.title}. It includes step-by-step video frameworks, downloadable templates, and AI tutor support to help you start earning quickly. View curriculum here: {{LINK}}`,
    twitter: `Want to master ${c.title} and turn it into real income? Here is the exact step-by-step masterclass with practical templates included: {{LINK}}`,
    statusHook: `Slide 1: High-income digital skills are the fastest way to beat inflation.\nSlide 2: Learn ${c.title} with practical step-by-step blueprints.\nSlide 3: Check out the full curriculum & templates here 👉 {{LINK}}`,
    targetAudience: "Digital earners and modern side-hustlers.",
    objectionBuster: "Everything is broken down step-by-step so even complete beginners can implement immediately."
  };

  return {
    id: c.id,
    title: c.title,
    description: c.description,
    price: finalPrice,
    category: meta?.category || (c as any).category || "Marketing",
    steps: steps,
    incomePotential: c.subtitle,
    image: c.image,
    imageUrl: c.image,
    affiliateCommissionRate: commissionRate,
    affiliateCommissionAmount: commissionAmount,
    targetAudience,
    whatYouWillLearn,
    swipeCopy
  };
});

