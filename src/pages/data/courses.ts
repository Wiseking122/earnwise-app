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

const METADATA_MAPPING: Record<string, { category: string; price: number; steps: string[] }> = {
  "tiktok-shop": {
    category: "E-commerce",
    price: 7000,
    steps: [
      "TikTok Shop Seller Setup: Build, register, and verify your professional merchant or creator storefront with complete tax clearances.",
      "High-Margin Sourcing: Isolate trending micro-products with viral potential using fast shipping links and verified suppliers.",
      "The Affiliate Outreach Script: Contact 50 micro-influencers daily with high-converting pitch scripts to secure free-sample promotion reviews.",
      "Discount Strategy Blueprint: Craft custom flash offers and automated coupon structures inside the seller center to command action.",
      "Viral Video Faceless Hooks: Film or stitch together 15-second visual templates focusing exclusively on psychological pain point triggers.",
      "Live Integration Strategy: Run live broadcast streams or host virtual streaming loops with automated shop links to scale orders multi-fold.",
      "Funnel Performance Metrics: Check the conversion tracking panel to locate product margin drop-offs and optimize image assets.",
      "Autonomous Logistical Scaling: Set up automated inventory synchronization networks and outsourced customer support loops."
    ]
  },
  "pinterest-traffic": {
    category: "Marketing",
    price: 7000,
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
    price: 7000,
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
    price: 7000,
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
    price: 7000,
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
    price: 7000,
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

export const COURSES: Course[] = courses.map(c => {
  const meta = METADATA_MAPPING[c.id] || {
    category: (c as any).category || "Marketing",
    price: (c as any).price || 7000,
    steps: (c as any).steps || [
      `${c.title} Fundamentals: Establish baseline theoretical mastery of this high-income vertical.`,
      `Core Strategy Implementation: Execute initial practical tests and validate structural setup.`,
      `Optimized Channel Management: Deploy client reporting metrics to secure consistent delivery streams.`,
      `The Escape Velocity Phase: Scale your operations through smart micro-resource delegation.`
    ]
  };
  return {
    id: c.id,
    title: c.title,
    description: c.description,
    price: meta.price,
    category: meta.category,
    steps: meta.steps,
    incomePotential: c.subtitle,
    image: c.image,
    imageUrl: c.image
  };
});
