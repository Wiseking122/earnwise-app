export interface TikTokModuleLesson {
  subtitle: string;
  content: string;
  workedScenario?: string;
  proTip?: string;
  commonPitfall?: string;
}

export interface TikTokQuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface TikTokAssignmentRubric {
  criteria: string;
  points: string;
  standard: string;
}

export interface TikTokModuleData {
  moduleIndex: number;
  moduleTitle: string;
  headline: string;
  learningObjectives: string[];
  lessons: TikTokModuleLesson[];
  knowledgeCheck: TikTokQuizQuestion[];
  assignment: {
    title: string;
    purpose: string;
    instructions: string[];
    expectedOutput: string;
    rubric: TikTokAssignmentRubric[];
    alternativeSimulation: string;
    tasks: string[];
  };
  resource: {
    name: string;
    filename: string;
    type: 'PDF' | 'spreadsheet';
    description: string;
    downloadUrl: string;
    googleDriveViewerUrl?: string;
    previewContent: {
      summary: string;
      keyPoints: string[];
      sampleSnippet: string;
    };
  };
}

export const TIKTOK_SHOP_MODULES: TikTokModuleData[] = [
  // --------------------------------------------------------------------------
  // MODULE 1: TikTok Shop Fundamentals
  // --------------------------------------------------------------------------
  {
    moduleIndex: 0,
    moduleTitle: "Module 1: TikTok Shop Fundamentals",
    headline: "Ecosystem Architecture, Seller vs Affiliate Models & Market Eligibility",
    learningObjectives: [
      "Understand how TikTok Shop differs from traditional e-commerce (intent search vs algorithmic impulse).",
      "Differentiate between the Seller, Affiliate, and Agency models and choose the right path.",
      "Master the technical transaction flow: yellow shopping anchor to checkout and payout settlement.",
      "Navigate geographic availability and understand official verification rules for international learners.",
      "Establish realistic financial and operational milestones (30, 60, and 90-day trajectory)."
    ],
    lessons: [
      {
        subtitle: "1. The Social Commerce Revolution: Search vs Discovery",
        content: `Traditional e-commerce platforms like Amazon, eBay, and standard Shopify stores rely predominantly on search intent: a consumer realizes they need an ergonomic office chair, types "ergonomic chair" into a search bar, and evaluates products based on price, reviews, and delivery speed. 

TikTok Shop inverts this entire consumer paradigm into discovery-driven impulse commerce. Over 1 billion active monthly users browse TikTok not to shop, but for entertainment, relaxation, or humor. When a compelling 20-second video showcases a solution to a subtle, unaddressed frustration (e.g. cleaning dirty eyeglasses without smudging lenses), the viewer transitions from passive consumption to an active impulse purchase in under 60 seconds without ever leaving the application.

This native in-app checkout eliminates 80% of typical e-commerce friction. The user never leaves the video feed, credit card details and Apple/Google Pay credentials are authenticated natively by TikTok, and shipping addresses are auto-populated. As a seller or affiliate, your job is not to build a bloated storefront; it is to engineer high-retention video moments that trigger immediate emotional justification for the purchase.`,
        workedScenario: `A seller lists an Ultrasonic Cleaner at $27.99. On a Shopify store with Facebook Ads, cost-per-click might be $1.50 with a 1.8% conversion rate, yielding an unprofitable acquisition cost of $83 per customer. On TikTok Shop, an organic video reaching 45,000 views generates 120 direct orders at a 3.8% in-app conversion rate with ZERO paid ad spend, resulting in over $3,300 in gross revenue from a single 25-second video.`,
        proTip: "Keep the impulse price point strictly between $15 and $45. Products priced above $50 trigger buyer research hesitation (viewers will leave TikTok to price-check on Amazon), killing the spontaneous in-app purchase impulse.",
        commonPitfall: "Treating TikTok Shop like an online catalog. Posting sterile product pictures on white backgrounds with corporate elevator music guarantees zero algorithmic distribution. The video must look like native, authentic user-generated content."
      },
      {
        subtitle: "2. The Three Operating Paths: Seller, Affiliate & Agency Arbitrage",
        content: `Before touching inventory, you must choose your operational model based on your capital, location, and risk tolerance:

1. THE SELLER MODEL:
You register an official TikTok Shop merchant account, source physical inventory, create product listings, manage inventory levels, and fulfill orders within TikTok's mandatory 2-business-day Service Level Agreement (SLA).
• Advantages: You retain full profit margins (typically 35% to 55%), own customer relationships, control branding, and can enlist thousands of affiliate creators to sell your stock for you.
• Capital Requirement: Medium to High ($500 to $2,500+ for inventory, samples, and shipping reserves).

2. THE AFFILIATE MODEL:
You operate as a verified TikTok Creator. You do not purchase inventory or handle customer support. You simply browse the TikTok Shop Product Marketplace, request free sample units from merchants, film compelling demonstration videos, and tag the merchant's product via the yellow shopping cart icon.
• Advantages: Zero inventory risk, zero fulfillment duties, completely location-independent, and you earn 10% to 25% gross commission on every sale tracked.
• Capital Requirement: Near zero ($0 to $100 for basic smartphone lighting and microphone).

3. THE AGENCY ARBITRAGE MODEL:
You act as an outsourced social commerce manager for overseas brands. You negotiate monthly management retainers (e.g. $500 to $1,500/month) plus a 5% to 10% performance cut of GMV by providing product research, video scripts, and recruiting domestic creator affiliates on the brand's behalf.`,
        workedScenario: `Operating as an Affiliate promoting an Ergonomic Seat Cushion ($34.99 retail at 20% commission): You post 2 videos daily for 30 days. On Day 14, one video achieves 85,000 views and generates 190 sales. Your commission payout: 190 orders × $7.00 per unit = $1,330 net profit earned in 72 hours with zero logistics involvement.`,
        proTip: "If you have limited startup capital (< $300), start exclusively with the Affiliate or Agency Arbitrage path. Use the commissions generated to fund your own merchant inventory once you understand viral video mechanics.",
        commonPitfall: "Attempting to dropship directly from overseas AliExpress or Chinese warehouses without domestic local dispatch. TikTok Shop strictly penalizes shipping delays longer than 48 hours with severe account penalty points."
      },
      {
        subtitle: "3. Regional Eligibility, Account Verification & International Rules",
        content: `TikTok Shop is currently natively open for seller registration in the United States, United Kingdom, Indonesia, Malaysia, Philippines, Singapore, Thailand, and Vietnam. The platform enforces strict geographic compliance: seller accounts require local company registration documents (e.g. US LLC with EIN, UK Ltd, or local national ID/passport) and domestic bank payout routing.

FOR LEARNERS IN NIGERIA AND UNSUPPORTED REGIONS:
Direct individual Nigerian passports cannot be used to open a native TikTok Shop seller account. However, international entrepreneurs legally and profitably operate using three proven structural approaches:

1. Foreign Entity Registration (US LLC / UK Ltd):
Registering an offshore business entity (via services like Firstbase, Doola, or UK 1st Formations) costs between $150 and $400. This provides a legitimate US Employer Identification Number (EIN) or UK Company Registration Number, an official business address, and access to a US/UK business bank account (via Wise Business, Mercury, or Payoneer) to satisfy TikTok Seller Center verification.

2. International Remote Creator / Affiliate Model:
You can manage TikTok creator accounts targeted to US/UK audiences by pairing clean residential proxies/VPN setups with foreign physical SIM cards (e.g. US T-Mobile or UK Three prepaid SIM cards) inserted into a secondary, wiped smartphone. This routes your algorithmic video distribution into high-purchasing Western markets.

3. The Agency & Consulting Model (Zero-Restriction):
You partner with existing US/UK sellers as an outsourced Growth Strategist. You write their scripts, identify viral products, manage their creator outreach, and receive foreign currency retainers via Wise or direct bank wire without ever needing your own seller account.`,
        workedScenario: `A Nigerian digital strategist registers a UK Limited company for £50 using a London virtual address, pairs it with a Wise Business multi-currency GBP account, and successfully verifies a TikTok Shop UK merchant store to sell domestic UK print-on-demand and local 3PL products with zero domestic shipping friction.`,
        proTip: "Never attempt to use fake identity documents or public free VPNs to spoof TikTok Shop verification. TikTok's fraud detection engine analyzes device IMEI fingerprints, GPS coordinates, and payment routing; use legitimate corporate structures or partner agreements.",
        commonPitfall: "Assuming TikTok Shop is permanently closed to non-Western entrepreneurs. Millions of dollars in GMV are generated monthly by international remote operators using legal foreign holding structures and affiliate partnerships."
      }
    ],
    knowledgeCheck: [
      {
        question: "How does consumer purchase behavior on TikTok Shop fundamentally differ from Amazon?",
        options: [
          "TikTok shoppers always spend at least 3 days comparing reviews and prices.",
          "TikTok Shop relies on passive algorithmic entertainment triggering immediate impulse buying in under 60 seconds.",
          "TikTok Shop only sells luxury goods priced above $250.",
          "Amazon does not allow customers to search for products using keywords."
        ],
        correctIndex: 1,
        explanation: "TikTok Shop converts passive entertainment browsing into spontaneous, friction-free in-app impulse purchases through short-form visual demonstration."
      },
      {
        question: "What is the recommended retail price range for high-converting impulse products on TikTok Shop?",
        options: [
          "$1 to $5",
          "$15 to $45",
          "$100 to $300",
          "$500 and above"
        ],
        correctIndex: 1,
        explanation: "The $15 to $45 bracket is the golden impulse zone: low enough that consumers buy spontaneously without external price-checking, yet high enough to yield healthy profit margins."
      },
      {
        question: "What is the mandatory shipping dispatch timeframe (SLA) enforced by TikTok Shop for sellers?",
        options: [
          "Within 14 calendar days",
          "Within 7 business days",
          "Within 2 business days",
          "Whenever the supplier feels like dispatching"
        ],
        correctIndex: 2,
        explanation: "TikTok Shop strictly mandates tracking dispatch updates within 2 business days (48 hours) to prevent negative customer reviews and shop suspension."
      }
    ],
    assignment: {
      title: "Assignment 1: Product Niche Research Report & Ecosystem Audit",
      purpose: "Define your chosen operational model (Seller, Affiliate, or Agency) and audit 3 distinct niche categories against TikTok Shop impulse buying criteria.",
      instructions: [
        "Select your primary operating path: Seller (Inventory), Affiliate (Commission), or Remote Agency (Client Retainer).",
        "Identify 3 niche categories you are interested in (e.g. Desk Gadgets, Beauty Accessories, Kitchen Innovations).",
        "Audit 5 competitor stores or affiliate creator accounts in those niches on TikTok.",
        "Document whether products meet the $15-$45 impulse price range, visual demonstration criteria, and shipping feasibility.",
        "Formulate your 30-day execution milestone goals."
      ],
      expectedOutput: "A structured 2-page research report detailing your chosen operating model, 3 audited niches, competitor observations, and your 30-day milestone roadmap.",
      rubric: [
        { criteria: "Operating Model Justification", points: "25 pts", standard: "Clear selection of Seller, Affiliate, or Agency with realistic capital and geographic alignment." },
        { criteria: "Niche Feasibility Audit", points: "35 pts", standard: "3 niches analyzed against the 5 golden impulse criteria with verifiable competitor examples." },
        { criteria: "Milestone Realism", points: "25 pts", standard: "Concrete 30/60/90-day targets based on realistic conversion and posting volume metrics." },
        { criteria: "Compliance & Risk Plan", points: "15 pts", standard: "Demonstrated awareness of regional policies and account verification requirements." }
      ],
      alternativeSimulation: "If you do not currently have an active TikTok account or access to TikTok Shop, complete this audit using public TikTok Creative Center data (accessible via web browser at ads.tiktok.com/business/creativecenter) and Amazon Best Sellers as your competitor baseline.",
      tasks: [
        "Download the TikTok Shop Complete Master Study Guide (PDF) from the resources panel.",
        "Select your primary path: Seller, Affiliate Creator, or Growth Agency Consultant.",
        "Conduct browser-based research on TikTok Creative Center to isolate 3 viral product trends.",
        "Verify your selected products fall strictly within the $15-$45 impulse retail price zone.",
        "Document 3 competitor accounts with active yellow shopping cart links and note their video styles.",
        "Draft your 30-day milestone checklist and save your notes in your learning portfolio."
      ]
    },
    resource: {
      name: "TikTok Shop Complete Master Study Guide",
      filename: "TikTok-Shop-Complete-Study-Guide.pdf",
      type: "PDF",
      description: "Comprehensive 8-module field manual covering platform mechanics, terminology, unit economics formulas, and cross-border operations.",
      downloadUrl: "/downloads/tiktok-shop/TikTok-Shop-Complete-Study-Guide.pdf",
      previewContent: {
        summary: "This comprehensive field guide details the full operational architecture of TikTok Shop, from platform algorithms and seller onboarding to affiliate recruitment and international holding company setups.",
        keyPoints: [
          "Search vs Discovery: Why impulse commerce converts at 3-4x standard website rates.",
          "Unit economics breakdown: GMV, COGS, Platform Fees (5-8%), and Target 35%+ Net Margin.",
          "Detailed instructions for establishing US LLC / UK Ltd corporate accounts for international learners.",
          "Complete glossary of 25 essential social commerce terms and formulas."
        ],
        sampleSnippet: "CORE FINANCIAL METRIC: Target Retail Price = (COGS + Shipping) × 3.5. If your product costs $4.00 to purchase and $3.50 to ship, your minimum retail price must be ($4.00 + $3.50) × 3.5 = $26.25."
      }
    }
  },

  // --------------------------------------------------------------------------
  // MODULE 2: Product and Niche Research
  // --------------------------------------------------------------------------
  {
    moduleIndex: 1,
    moduleTitle: "Module 2: Product & Niche Research",
    headline: "Data Signals, Competitor Forensics & Net Margin Unit Economics",
    learningObjectives: [
      "Identify high-probability winning products using TikTok Creative Center and viral search signals.",
      "Apply the 5-point 'Impulse Feasibility Matrix' to filter out low-margin or oversaturated commodities.",
      "Calculate precise unit economics: COGS, shipping, platform fees, affiliate commissions, and net profit.",
      "Reverse-engineer competitor shops to expose supplier sources and pricing vulnerabilities.",
      "Recognize and avoid hazardous, fragile, or policy-restricted product traps."
    ],
    lessons: [
      {
        subtitle: "1. The 5-Point Winning Product Matrix",
        content: `Over 90% of beginner failures on TikTok Shop stem from choosing the wrong product. You cannot sell ordinary commodities that consumers can easily purchase at their local supermarket or gas station. To succeed on short-form video, a product must satisfy the 5-Point Impulse Matrix:

1. INSTANT VISUAL DEMONSTRATION (The 'Wow' Factor):
The transformation, benefit, or utility must be clearly comprehensible within the first 3 seconds with the smartphone sound completely muted. Examples: A knife that effortlessly slices through shoes and tomatoes; an ultrasonic bath producing visible clouds of grime from dirty rings.

2. EMOTIONAL OR FUNCTIONAL PAIN RELIEF:
The product must solve an uncomfortable, recurring annoyance (e.g. neck tension from desk posture, messy kitchen oil splatters, pet hair on velvet couches). Products that alleviate specific discomfort generate 3x higher conversion rates than passive aesthetic decor.

3. OPTIMAL IMPULSE PRICING ($15 TO $45):
Under $15 leaves insufficient dollar margin after shipping ($3-$5), platform fees ($1-$3), and affiliate commissions ($3-$6). Above $45 triggers cognitive friction: buyers wait, read external Reddit threads, or check Amazon, breaking the in-app impulse loop.

4. FAVORABLE SHIPPING ECONOMICS (Light & Non-Fragile):
Ideal shipping weight is under 400 grams (14 oz), and physical dimensions should fit inside standard padded bubble mailers. Bulky, oversized items incur punitive dimensional weight surcharges and higher return damages.

5. NON-COMMODITIZED VALUE PERCEPTION:
The buyer should not know the exact manufacturing cost off the top of their head. Products like electronic beauty tools, specialized organizers, and unique ergonomic items have high perceived subjective value, allowing 60%+ gross markup.`,
        workedScenario: `Evaluation Comparison:
Product A (Phone Case): Highly saturated, everyone knows it costs $2. Retail $10. After $4 shipping and $1.50 fees, profit is under $2.50. High return rate due to phone model mismatches. Verdict: REJECT.
Product B (Sonic Glasses & Jewelry Cleaner): Strong visual demo (clouds of dust in water), solved pain (dirty grime on glasses/rings), lightweight (240g), retail $27.99, COGS $5.20, shipping $3.80. Net profit per unit: $11.45 (41% net margin). Verdict: ACCEPT & LAUNCH.`,
        proTip: "Use TikTok's search bar as a free market intelligence tool. Type your niche keyword followed by 'TikTok Shop', filter by 'Most Liked' in the past 1 month, and observe which videos have the highest comment velocity asking 'Where did you buy this?'",
        commonPitfall: "Selecting clothing or footwear as your first product. Sizing discrepancies lead to 18% to 30% return rates in apparel, obliterating your cash flow and depressing your Shop Health Score."
      },
      {
        subtitle: "2. Forensic Unit Economics: The True Cost of a Sale",
        content: `Amateur sellers calculate profit as: Retail Price - Supplier Cost. This elementary mistake leads directly to bankruptcy. In professional social commerce, every transaction incurs six discrete cost deductions:

1. Retail Price (Gross Revenue): e.g. $27.99
2. Cost of Goods Sold (COGS - Sourcing): e.g. $5.20
3. Outbound Domestic Shipping & Packaging: e.g. $3.80
4. TikTok Shop Platform Referral Fee: typically 5% to 8% (e.g. 6% = $1.68)
5. Payment Processing Fee: 1.8% to 2.5% + $0.30 (e.g. $0.86)
6. Affiliate Creator Commission: 15% to 20% (e.g. 15% = $4.20)
7. Buffer for Returns/Damages (3% historical baseline): $0.84

TRUE NET PROFIT CALCULATION:
Net Profit = $27.99 - ($5.20 + $3.80 + $1.68 + $0.86 + $4.20 + $0.84)
Net Profit = $27.99 - $16.58 = $11.41 per unit.
Net Profit Margin % = ($11.41 ÷ $27.99) × 100 = 40.8%.

If your calculated net margin is below 30%, do NOT launch the product. Advertising fluctuations, unexpected carrier rate adjustments, and creator commission requests will rapidly consume your remaining cash.`,
        workedScenario: `A seller prices an item at $19.99 with a $7.00 COGS and $4.50 shipping. They pay 15% affiliate commission ($3.00) and $1.60 in platform fees. Total costs = $16.10. Net profit is only $3.89 (19.4% margin). When a single customer initiates a return, the seller loses the $4.50 shipping fee plus a $2.00 restocking fee, wiping out the net profit of two full successful sales!`,
        proTip: "Always negotiate tiered volume discounts with your supplier upfront: ask for the 500-unit price tier once you demonstrate consistent daily orders, which typically reduces COGS by 15% to 25%.",
        commonPitfall: "Neglecting to include affiliate commission in your pricing model. If your product does not offer at least 15% to 20% commission, top-tier TikTok creators will refuse to promote your link."
      },
      {
        subtitle: "3. Competitor Reverse-Engineering & Supplier Forensics",
        content: `You never need to guess what products are trending; the TikTok Shop algorithm openly advertises top performers. By monitoring the 'Product Marketplace' in TikTok Seller Center and cross-referencing TikTok Creative Center, you can identify products with accelerating 7-day velocity.

HOW TO REVERSE-ENGINEER COMPETITOR SHOPS:
1. Identify the Top 3 Sellers in your niche on TikTok Shop.
2. Note their 30-day order counts, current retail price, and customer review scores.
3. Read all 1-star and 2-star customer reviews on their listings. This reveals their operational vulnerabilities:
   • Are customers complaining about fragile plastic gears? (Find a supplier offering reinforced metal components).
   • Are customers complaining about missing power adapters? (Bundle the cable in your main box).
   • Are customers complaining about 8-day slow shipping? (Use domestic 3PL fulfillment to deliver in 3 days).

HOW TO SOURCE HIGH-INTEGRITY SUPPLIERS:
• Platforms: 1688, Alibaba, CJ Dropshipping, or local domestic wholesale distributors (e.g. US/UK based wholesalers).
• Verification Criteria: Minimum 3 years on platform, Trade Assurance active, Supplier Rating >= 4.7 stars, and confirmed sample delivery within 5 to 7 business days.`,
        workedScenario: `A competitor is selling a Neck Massage Pillow for $32.99 with 1,200 orders, but reviews complain that the battery dies in 20 minutes. A researcher finds an upgraded 2,200mAh version for just $1.10 more per unit on Alibaba, launches it with the bold hook 'The only massage pillow with a 3-hour battery life', and captures 40% of the competitor's market share in 3 weeks.`,
        proTip: "Always order 2 sample units from different suppliers to your own address before committing capital. Film unboxing and stress-test durability under intense conditions.",
        commonPitfall: "Choosing unbranded electronics without CE or FCC safety certifications. If a customer reports an overheating battery, TikTok will freeze your shop funds and permanently blacklist your business entity."
      }
    ],
    knowledgeCheck: [
      {
        question: "Why is a product priced at $9.99 generally dangerous to sell on TikTok Shop?",
        options: [
          "Customers refuse to buy products that are under $10.",
          "TikTok Shop does not allow any products below $10.",
          "Shipping ($3-$5) and platform/commission fees leave virtually zero dollar profit margin.",
          "Products under $10 cannot be displayed in video descriptions."
        ],
        correctIndex: 2,
        explanation: "Fixed logistics costs and percentage fees eat almost the entire price of low-ticket items, making profitable customer acquisition mathematically impossible."
      },
      {
        question: "What minimum Net Profit Margin should you target when auditing a candidate product?",
        options: [
          "At least 5%",
          "At least 15%",
          "At least 35%",
          "At least 90%"
        ],
        correctIndex: 2,
        explanation: "A minimum 35% net margin buffer is vital in social e-commerce to absorb returns, affiliate commissions, carrier surcharges, and testing expenses."
      },
      {
        question: "What is the most effective way to find a competitive advantage over existing top sellers?",
        options: [
          "Copy their exact video word for word.",
          "Read their 1-star and 2-star reviews to identify product flaws or shipping complaints, then solve them.",
          "Lower your price by 80% and operate at a heavy loss.",
          "File false copyright complaints against their store."
        ],
        correctIndex: 1,
        explanation: "Competitor review forensics reveal exact customer pain points (e.g. weak batteries, bad packaging, missing parts) that you can resolve to win market share."
      }
    ],
    assignment: {
      title: "Assignment 2: Product Comparison & Scoring Worksheet",
      purpose: "Populate the official Product Research Workbook with 3 candidate products and execute full unit economics forensic calculations.",
      instructions: [
        "Open the provided Excel file 'Product-Research-Workbook.xlsx'.",
        "Select 3 distinct candidate products from your research.",
        "Input verified supplier COGS, estimated domestic shipping, and target retail price.",
        "Verify that built-in formulas calculate TikTok platform fees (6%), affiliate commissions (15%), and net margin.",
        "Document competitor benchmarking for each product on Sheet 3.",
        "Deliver a final Go / No-Go decision based on the 35% margin threshold."
      ],
      expectedOutput: "A fully populated Excel workbook (or completed simulation data table) scoring 3 products with full mathematical cost breakdowns and a 1-page written rationale.",
      rubric: [
        { criteria: "Mathematical Accuracy", points: "30 pts", standard: "Accurate formulas for fees, commissions, shipping, COGS, and net margin percentage." },
        { criteria: "Research Depth", points: "30 pts", standard: "Realistic supplier quotes and verified competitor pricing benchmarks." },
        { criteria: "Feasibility Assessment", points: "25 pts", standard: "Rigorous application of the 5-Point Impulse Matrix." },
        { criteria: "Decision Logic", points: "15 pts", standard: "Sound Go / No-Go justification prioritizing capital preservation." }
      ],
      alternativeSimulation: "If direct supplier quotes are inaccessible, use Alibaba or AliExpress public list prices as your COGS baseline and standard $4.00 flat domestic shipping to complete your economic model.",
      tasks: [
        "Download and open 'Product-Research-Workbook.xlsx' from the resource center.",
        "Identify 3 candidate products using TikTok search and wholesale directories.",
        "Input the cost variables into the Candidate Evaluator tab.",
        "Confirm that at least one candidate achieves >= 35% net profit margin.",
        "Audit 2 competitor stores per product and document findings in the Competitor Benchmarking tab.",
        "Mark your chosen winning product for your upcoming listing assignment."
      ]
    },
    resource: {
      name: "Product Research & Economics Workbook",
      filename: "Product-Research-Workbook.xlsx",
      type: "spreadsheet",
      description: "Interactive multi-sheet Excel model with built-in formulas for COGS, platform fees, affiliate payouts, net margins, and competitor benchmarking.",
      downloadUrl: "/downloads/tiktok-shop/Product-Research-Workbook.xlsx",
      previewContent: {
        summary: "A battle-tested financial spreadsheet designed specifically for TikTok Shop product forensics, featuring automated fee formulas, quality scoring algorithms, and competitor audit tables.",
        keyPoints: [
          "Automated net margin calculation incorporating platform fees (6%), commissions (15%), and fulfillment.",
          "Pre-configured 1-to-10 Quality Scoring algorithm weighting visual wow-factor, margin, and return risk.",
          "Competitor forensic benchmarking sheet for tracking 30-day orders, hook strategies, and negative review gaps.",
          "Pre-populated with real-world case studies for immediate reference."
        ],
        sampleSnippet: "FORMULA PREVIEW: Net Profit = Retail Price - (COGS + Shipping + (Retail × 0.06) + (Retail × 0.15) + (Retail × 0.02) + (Retail × 0.03))."
      }
    }
  },

  // --------------------------------------------------------------------------
  // MODULE 3: Shop Readiness and Product Listings
  // --------------------------------------------------------------------------
  {
    moduleIndex: 2,
    moduleTitle: "Module 3: Shop Readiness & High-Converting Listings",
    headline: "Store Registration, Mobile SEO Titles & Visual Asset Stack Architecture",
    learningObjectives: [
      "Navigate seller onboarding requirements and account health prerequisites.",
      "Construct mobile-optimized, search-indexed product titles following the 4-part SEO framework.",
      "Assemble the definitive 7-Image Visual Asset Stack that eliminates buyer purchase hesitation.",
      "Write high-converting bullet points that address immediate customer objections.",
      "Conduct a comprehensive compliance audit to prevent account strikes and listing rejections."
    ],
    lessons: [
      {
        subtitle: "1. The 4-Part Mobile SEO Product Title Framework",
        content: `On TikTok Shop, product titles serve a dual purpose: they dictate your search indexing in the TikTok discovery algorithm, and they provide instant clarity on tiny mobile phone screens where only the first 40 to 50 characters are visible before truncation.

THE 4-PART PRODUCT TITLE FORMULA:
[Brand Name] + [Primary Search Keyword] + [Hero Benefit / Problem Solved] + [Key Specification / Color / Size]

EXAMPLE BREAKDOWN:
• Bad Title: "Ultrasonic Cleaner Portable Machine Best Quality 2026 Free Shipping" (Flagged for spam words, zero brand identity, poor search categorization).
• Winning Title: "EarnPure SonicWash - Ultrasonic Jewelry & Eyeglass Cleaner with 45kHz Deep Micro-Vibration (Compact Portable, Arctic White)"

CRITICAL TITLE RULES:
1. Keep the total title between 60 and 90 characters to avoid mobile clutter.
2. Front-load the core keyword within the first 35 characters so mobile users immediately understand the product without tapping 'Read More'.
3. Never include promotional clickbait like "100% Free", "Top Selling", or emojis, which trigger automated listing suppression.`,
        workedScenario: `A listing for an ergonomic lumbar cushion titled 'Seat Pillow Soft' received 140 organic search impressions in 7 days. Changing the title to 'ErgoSpine Orthopedic Memory Foam Lumbar Support Cushion for Office Chairs & Car Driving (Breathable Mesh, Black)' increased organic search impressions to 3,800 in 7 days, resulting in 26 organic sales with zero ad spend.`,
        proTip: "Before finalizing your title, search your main keyword in TikTok's search bar and observe the top 5 suggested auto-complete search queries. Integrate those exact phrase strings into your title and description.",
        commonPitfall: "Keyword stuffing. Repeating the word 'cleaner' 6 times in a single title triggers algorithmic spam filters and leads to automatic listing disapproval."
      },
      {
        subtitle: "2. The 7-Image Visual Asset Stack Architecture",
        content: `In social commerce, mobile shoppers do not read dense blocks of text; they swipe through image cards. Your 7-image carousel must tell a complete psychological story that removes every potential objection:

1. IMAGE 1: PURE WHITE HERO SHOT (1:1 Ratio, 1200×1200px)
Product centered, occupying 85% of the frame, flawless lighting, crisp contrast, transparent or clean white background. This image appears on the search grid and yellow anchor cards.

2. IMAGE 2: THE HERO BENEFIT IN ACTION
Show the product actively transforming an object or state. (e.g. Dirty rings inside bubbling water with visible dirt particles dislodging).

3. IMAGE 3: LIFESTYLE INTEGRATION
Show the product in an aspirational, authentic home or office environment (e.g. placed neatly on a modern Scandinavian bathroom counter next to sleek perfume bottles).

4. IMAGE 4: TECHNICAL INFOGRAPHIC & SPECIFICATIONS
3 to 4 pointer callouts highlighting build materials, battery capacity, waterproof rating (e.g. "45,000Hz Ultrasonic Waves", "USB-C Fast Charging", "Food-Grade 304 Stainless Steel").

5. IMAGE 5: REAL-WORLD SCALE & DIMENSIONS
A graphic showing exact centimeter/inch measurements alongside a recognizable object (like a smartphone or human hand). This single image prevents 70% of "smaller than expected" return disputes.

6. IMAGE 6: PACKAGING & BOX CONTENTS (WHAT IS INCLUDED)
Clean flat-lay photograph showing everything inside the shipping box: device, charging cable, instruction manual, microfiber cloth, warranty slip.

7. IMAGE 7: SOCIAL TRUST & GUARANTEE BADGE
Professional graphics highlighting: 30-Day Money-Back Guarantee, Fast Domestic Dispatch, 24/7 Customer Care, and verified safety certifications.`,
        workedScenario: `An electronics store was suffering from an 11% return rate because customers complained the portable fan was smaller than they imagined from video demos. The seller added Image #5 showing the fan resting in a human palm next to an iPhone. The return rate dropped immediately to 1.8% over the next 400 orders.`,
        proTip: "Ensure all text on infographic images is at least 36pt font size. Over 92% of TikTok Shop traffic is on mobile devices; tiny desktop-sized text is unreadable and ignored.",
        commonPitfall: "Uploading low-resolution 600×600 pixel supplier screenshots containing foreign watermarks or Chinese manufacturer logos. This destroys buyer trust instantly."
      },
      {
        subtitle: "3. Compliance Guardrails & Ban Prevention Protocols",
        content: `TikTok Shop employs automated machine vision and NLP bots to inspect listings. Violating policy triggers 'Violation Points' (ranging from 2 to 24 points). Accumulating 48 points results in a permanent shop ban and forfeiture of pending settlement funds.

THE 4 MAJOR POLICY MINEFIELDS:
1. MEDICAL & HEALTH CLAIMS:
Never use words like "cures", "treats", "heals", "relieves arthritis", or "permanent weight loss". Use lifestyle phrases: "supports comfort", "promotes relaxation", "designed for daily ergonomic wellness".

2. BEFORE-AND-AFTER EXAGGERATION:
Do not use heavily photoshopped or unrealistic before/after split images, particularly in skincare or teeth whitening. Moderation bots flag drastic color shifts as deceptive advertising.

3. INTELLECTUAL PROPERTY & LOGO TRADEMARKS:
Never list designer duplicates, lookalikes, or use protected trademarks (Apple, Nike, Disney, Gucci) in your titles, tags, or imagery. Even using the word "Apple-style" will trigger an immediate counterfeit strike.

4. INACCURATE CATEGORIZATION:
Listing an electronic device under "Home Decor" to bypass electronics certification requirements results in immediate listing takedown and category suspension. Always choose the exact sub-category.`,
        workedScenario: `A seller listed a posture brace with the title 'Cures Scoliosis & Permanent Back Pain'. Within 4 hours, the listing was banned, the shop received a 12-point violation strike, and all affiliate videos were blocked from tagging the product. Rewriting the listing to 'Ergonomic Posture Support Brace for Upper Back Comfort' passed review with zero issues.`,
        proTip: "Always upload high-resolution PDF copies of your supplier's CE, FCC, or RoHS compliance certificates into the Seller Center 'Brand & Qualification' section during product listing.",
        commonPitfall: "Publishing a listing before inventory is physically confirmed in your domestic warehouse. If sales spike and you cannot dispatch within 48 hours, your Late Dispatch Rate will trigger automatic order cancellation and account suspension."
      }
    ],
    knowledgeCheck: [
      {
        question: "Why should the primary keyword be placed within the first 35 characters of your product title?",
        options: [
          "TikTok automatically deletes titles that are longer than 35 characters.",
          "Mobile screens truncate long titles, so front-loading ensures shoppers see the core product keyword immediately.",
          "It lowers the shipping cost charged by carriers.",
          "It prevents creators from requesting free samples."
        ],
        correctIndex: 1,
        explanation: "Mobile viewports truncate long titles with an ellipsis (...); placing the keyword upfront ensures instant buyer comprehension on the feed."
      },
      {
        question: "Which of the following phrases is strictly prohibited under TikTok Shop advertising policy?",
        options: [
          "'Designed for daily ergonomic comfort'",
          "'Compact portable design'",
          "'Guaranteed to permanently cure back pain and arthritis in 3 days'",
          "'Includes USB-C charging cable'"
        ],
        correctIndex: 2,
        explanation: "Unsubstantiated medical and disease cure claims violate platform policy and trigger immediate listing bans and violation points."
      },
      {
        question: "What is the primary purpose of Image #5 (Dimensions & Scale Reference) in the 7-image stack?",
        options: [
          "To show the manufacturer's factory floor.",
          "To visually prove exact product sizing next to everyday objects, drastically reducing return rates.",
          "To display customer reviews from other websites.",
          "To include secret affiliate discount links."
        ],
        correctIndex: 1,
        explanation: "Scale references prevent customer surprise regarding dimensions, which is historically the #1 reason for e-commerce returns."
      }
    ],
    assignment: {
      title: "Assignment 3: Product Listing Draft & Compliance Audit",
      purpose: "Draft a complete, production-ready TikTok Shop product listing including title, bullet points, visual asset map, and compliance checklist.",
      instructions: [
        "Download the official 'Product-Listing-Checklist.pdf' from the resource center.",
        "Write a 4-part mobile SEO title for your winning product.",
        "Draft 5 benefit-driven bullet points (Problem solved, Specs, Dimensions, Box contents, Guarantee).",
        "Map out your 7-image visual asset stack with detailed descriptions for each slide.",
        "Perform the compliance audit: verify zero medical claims, zero trademark infringements, and correct category mapping."
      ],
      expectedOutput: "A structured 2-page Product Listing Document ready to be pasted directly into TikTok Shop Seller Center.",
      rubric: [
        { criteria: "Title SEO Optimization", points: "25 pts", standard: "Proper 4-part structure, keyword front-loaded, mobile-friendly character count." },
        { criteria: "Copywriting Persuasion", points: "25 pts", standard: "Bullet points focus on emotional/practical outcomes rather than sterile technical jargon." },
        { criteria: "Visual Stack Planning", points: "25 pts", standard: "Complete 7-image blueprint covering hero, lifestyle, specs, scale, and trust." },
        { criteria: "Compliance & Safety", points: "25 pts", standard: "100% compliant with advertising policies, zero prohibited medical or trademark terms." }
      ],
      alternativeSimulation: "If you cannot access Seller Center directly, draft your listing in a Google Doc or Word file formatted exactly as a live listing preview.",
      tasks: [
        "Download and review 'Product-Listing-Checklist.pdf' in the resources panel.",
        "Construct your 4-part SEO title (under 80 characters).",
        "Write 5 conversion-focused bullet points addressing customer objections.",
        "Outline specifications and dimensions for your scale infographic graphic.",
        "Confirm your product contains zero prohibited medical claims or brand trademark breaches.",
        "Save your completed listing draft in your coursework folder."
      ]
    },
    resource: {
      name: "TikTok Shop Product Listing Quality Checklist",
      filename: "Product-Listing-Checklist.pdf",
      type: "PDF",
      description: "Pre-publishing compliance audit, mobile SEO title guidelines, 7-image asset specifications, and banned keyword database.",
      downloadUrl: "/downloads/tiktok-shop/Product-Listing-Checklist.pdf",
      previewContent: {
        summary: "A comprehensive operational checklist used by top e-commerce merchants to audit product listings prior to publishing, ensuring high conversion rates and 100% compliance with TikTok Seller regulations.",
        keyPoints: [
          "The 4-Part Title Formula: Brand + Core Keyword + Benefit + Specifications.",
          "The 7-Image Asset Stack: White hero, action demo, lifestyle, infographics, scale proof, unboxing, and trust badges.",
          "Mobile viewport safe zones: Avoiding text overlap with TikTok UI buttons and captions.",
          "Comprehensive banned word swipe list (medical claims, superlative spam, trademark infringements)."
        ],
        sampleSnippet: "TITLE CHECK: Does your title start with the primary search keyword within the first 35 characters? If no, rewrite before publishing."
      }
    }
  },

  // --------------------------------------------------------------------------
  // MODULE 4: Short-Form Content Creation
  // --------------------------------------------------------------------------
  {
    moduleIndex: 3,
    moduleTitle: "Module 4: Viral Short-Form Video Creation",
    headline: "Psychological Scroll-Stoppers, Demonstration Scripts & Retention Architecture",
    learningObjectives: [
      "Master the 3-Second Rule: Engineering visual and auditory disruption that halts mobile scrolling.",
      "Deploy the 3 battle-tested short-form script blueprints (PAS, Skeptical Review, Sensory ASMR).",
      "Structure high-converting In-Video Calls to Action (CTA) that drive clicks to the yellow shopping basket.",
      "Film high-quality smartphone video using zero expensive studio equipment.",
      "Analyze video completion rates, retention graphs, and click-through metrics to iterate winning variations."
    ],
    lessons: [
      {
        subtitle: "1. The Anatomy of a Viral Video: The 3-Second Disruption",
        content: `On TikTok, average viewer attention spans are measured in milliseconds. If your video does not arrest the viewer's psychological focus within the first 3.0 seconds, they swipe to the next video, the algorithm interprets the low watch time as low-quality content, and distribution is immediately throttled.

THE 3 CORE HOOK TRIGGERS:
1. VISUAL ANOMALY HOOK:
Show something physically counter-intuitive or visually startling. Examples: A device blowing liquid smoke through dirt; a knife effortlessly cutting through a shoe; an opaque murky liquid turning crystal clear in 2 seconds.

2. CONTROVERSIAL STATEMENT / BELIEF SHATTERING HOOK:
Directly challenge a common habit: "If you still clean your glasses with your shirt, stop doing this immediately—you are literally scratching micro-grooves into your lenses every single day."

3. CURIOSITY / SKEPTICISM HOOK:
Position yourself on the viewer's side: "I spent $25 on this weird viral TikTok tool so you guys don't waste your hard-earned money."

THE RETENTION CURVE BLUEPRINT:
• 0:00 - 0:03: Hook & Pattern Interrupt (Visual anomaly + Audio statement).
• 0:03 - 0:08: Problem Agitation (Validate the frustration with relatable everyday examples).
• 0:08 - 0:18: Solution Demonstration (Show the product performing its core utility seamlessly).
• 0:18 - 0:24: Value Justification (Contrast the affordable in-app price with expensive professional alternatives).
• 0:24 - 0:30: Urgent Clear Call-to-Action (Direct finger point to the bottom-left yellow basket).`,
        workedScenario: `A video begins with a person sitting at a desk saying: 'Hello guys, today I am reviewing this posture corrector.' -> Average watch time: 1.8 seconds. Video stalls at 250 views with 0 sales.
The same video is re-edited to start with a side-by-side clip of hunched shoulders snapping straight with a crisp sound effect, captioned: 'Stop slouching at your desk like a boiled shrimp!' -> Average watch time: 14.2 seconds. Video achieves 210,000 views and generates 340 sales ($8,500 GMV).`,
        proTip: "Never include generic corporate video intros, animated logo bumpers, or pleasantries ('Hey guys, welcome back'). Dive straight into the dramatic visual action on frame 00:01.",
        commonPitfall: "Using generic copyrighted mainstream music that overpowers your voiceover. Keep background music volume at -18dB to -24dB so your voice remains crisp, clear, and prominent."
      },
      {
        subtitle: "2. The Three Battle-Tested Script Blueprints",
        content: `You do not need to invent new creative formats from scratch. Over 90% of eight-figure TikTok Shop sales are generated by three recurring script blueprints:

BLUEPRINT 1: THE PROBLEM-AGITATE-SOLVE (PAS) MODEL
• Best for: Problem-solving gadgets, cleaning tools, automotive accessories, health items.
• Structure:
  1. Hook (0-3s): Highlight the annoying daily problem.
  2. Agitate (3-7s): Show why existing manual solutions fail miserably.
  3. Solve (7-16s): Introduce the product as the effortless 30-second fix.
  4. Proof (16-22s): Show physical evidence of success (sparkling clean glasses, collected pet hair).
  5. CTA (22-28s): Direct viewer to the yellow basket flash sale.

BLUEPRINT 2: THE SKEPTICAL REVIEWER / EXPERIMENT
• Best for: Trending beauty items, home tech, viral novelties.
• Structure:
  1. Hook (0-3s): "I honestly thought this product was a total gimmick until..."
  2. Test Setup (3-8s): Unbox rapidly and state the manufacturer's bold claim.
  3. The Live Test (8-18s): Put the product through an extreme test on camera without cuts.
  4. The Genuine Reaction (18-24s): Express honest surprise and reveal the price.
  5. CTA (24-30s): "I linked the genuine supplier below before they sell out again."

BLUEPRINT 3: SENSORY ASMR & AESTHETIC DEMO
• Best for: Desk accessories, ambient lighting, stationery, sensory gadgets.
• Structure:
  1. Hook (0-3s): Crisp microphone audio capturing an ultra-satisfying sound (click, snap, peel).
  2. Continuous Flow (3-18s): Satisfying assembly and ambient transformation with minimal talking.
  3. On-Screen Caption CTA (18-25s): Text banner: "Link in yellow basket • 40% Off this week".`,
        workedScenario: `A creator promoting an electric garlic chopper filmed a 22-second PAS script: Frame 1 showed crying eyes from cutting onions with a dull knife. Frame 2 dropped whole cloves into the chopper. Frame 3 pressed the button for 3 seconds: perfectly diced garlic with zero tears. The video converted at 4.2% on 88,000 views, netting $3,200 in creator commissions.`,
        proTip: "Always turn on native auto-captions in TikTok or CapCut. Over 65% of social media users browse videos in public with sound muted; prominent, animated subtitles keep viewers engaged.",
        commonPitfall: "Making videos longer than 45 seconds for a simple product. Short-form videos between 18 and 30 seconds achieve the highest algorithmic completion rates."
      },
      {
        subtitle: "3. Filming Equipment, Lighting & In-App Link Tagging",
        content: `You do not need an expensive $3,000 cinema camera. In fact, overly polished commercial ads convert significantly WORSE on TikTok because users immediately recognize them as sponsored promotions and swipe past them.

ESSENTIAL $50 SMARTPHONE PRODUCTION SETUP:
1. Smartphone Camera: Any modern iPhone (model 11 or newer) or standard Android phone capable of 1080p at 60 frames per second.
2. Natural Lighting or Ring Light: Position your primary light source directly in front of your face/product at a 45-degree angle. Never film with a bright window behind you (backlighting).
3. Audio: A $15 wireless lavalier microphone (plugs into your phone's charging port) ensures crystal-clear voice audio without room echo.
4. Clean Background: Maintain an uncluttered, modern workspace (wood grain desk, clean marble, aesthetic tile).

LINKING THE YELLOW SHOPPING BASKET:
When uploading your video inside TikTok:
1. Tap 'Add Link' on the pre-publishing screen.
2. Select 'Product' -> Choose your verified product from your Showcase or Store inventory.
3. Set the Product Anchor Title (e.g. 'Ultrasonic Jewelry Cleaner (40% Off)').
4. Publish. The yellow shopping basket will appear directly above your username on the bottom left.`,
        workedScenario: `A seller filmed videos with an expensive DSLR with cinematic background blur, achieving 1,200 views. They switched to raw iPhone 1080p 60fps footage filmed in natural morning window light with dynamic zoom cuts. Views surged to 48,000 because the content looked completely native and authentic.`,
        proTip: "Clean your smartphone camera lens with a microfiber cloth before EVERY filming session. Fingerprint oil on mobile lenses causes foggy, blurry footage that immediately degrades video quality.",
        commonPitfall: "Forgetting to add the product anchor link before hitting publish. You CANNOT retroactively add a TikTok Shop product link to an already published video."
      }
    ],
    knowledgeCheck: [
      {
        question: "Why do overly polished, high-budget corporate commercials often fail on TikTok Shop?",
        options: [
          "TikTok automatically blocks 4K video uploads.",
          "Users recognize them as paid advertisements and instantly swipe past them; authentic user-generated content converts higher.",
          "High-budget cameras cannot film in vertical 9:16 orientation.",
          "Corporate companies are banned from selling on TikTok."
        ],
        correctIndex: 1,
        explanation: "TikTok culture values authenticity and relatable peer recommendations; polished studio ads trigger 'ad blindness' and immediate swiping."
      },
      {
        question: "What is the optimal video length for standard impulse product demonstrations?",
        options: [
          "5 to 10 minutes",
          "18 to 30 seconds",
          "Exactly 3 seconds",
          "Over 1 hour"
        ],
        correctIndex: 1,
        explanation: "18 to 30 seconds provides sufficient time to hook, agitate, demonstrate, and call to action while maximizing full completion rate."
      },
      {
        question: "What audio adjustment should be made to background music when including a spoken voiceover?",
        options: [
          "Boost background music to maximum volume (+6dB).",
          "Lower background music to between -18dB and -24dB so the spoken voice remains clear and prominent.",
          "Never include any sound or voice in TikTok videos.",
          "Use three different songs playing simultaneously."
        ],
        correctIndex: 1,
        explanation: "Ducking music volume allows the voiceover to remain intelligible and commanding, preventing viewer auditory fatigue."
      }
    ],
    assignment: {
      title: "Assignment 4: Three Short-Form Video Scripts & Production Plan",
      purpose: "Write 3 complete, production-ready short-form video scripts utilizing the PAS, Skeptical Review, and Sensory Demonstration frameworks.",
      instructions: [
        "Download 'Short-Form-Video-Script-Templates.pdf' from the resources section.",
        "Write Script 1: Problem-Agitate-Solve framework for your winning product (timed for 20-25 seconds).",
        "Write Script 2: Skeptical Reviewer / Experiment framework (timed for 25-30 seconds).",
        "Write Script 3: Sensory ASMR or Aesthetic Demonstration framework (timed for 15-20 seconds).",
        "Include exact timestamp markers (e.g. 0:00-0:03), visual actions, spoken voiceover, on-screen text captions, and CTA placement."
      ],
      expectedOutput: "A complete 3-script production dossier formatted with timestamp tables, visual directions, audio dialogue, and caption overlays.",
      rubric: [
        { criteria: "Hook Disruption (0-3s)", points: "30 pts", standard: "Immediate visual anomaly or provocative statement that forces a scroll pause." },
        { criteria: "Script Structure & Pacing", points: "30 pts", standard: "Flawless adherence to the timestamp checkpoints without unnecessary filler." },
        { criteria: "CTA Clarity", points: "20 pts", standard: "Unambiguous directive pointing viewers to the bottom-left yellow basket." },
        { criteria: "Production Feasibility", points: "20 pts", standard: "Scripts are realistically filmable on a smartphone without Hollywood budgets." }
      ],
      alternativeSimulation: "If you do not have physical product samples, write your scripts based on public demonstration clips available on YouTube or manufacturer portals, treating them as your filming storyboard.",
      tasks: [
        "Download 'Short-Form-Video-Script-Templates.pdf' from the resource panel.",
        "Select your winning product from Module 2.",
        "Draft Script 1: Problem-Agitate-Solve (timed to 22 seconds).",
        "Draft Script 2: Skeptical Reviewer (timed to 28 seconds).",
        "Draft Script 3: Sensory ASMR / Aesthetic Demo (timed to 18 seconds).",
        "Review each script against the 3-second hook checklist.",
        "Save your script collection into your course dossier."
      ]
    },
    resource: {
      name: "Viral Short-Form Video Script Templates",
      filename: "Short-Form-Video-Script-Templates.pdf",
      type: "PDF",
      description: "Battle-tested 20-30 second video script frameworks, timestamp breakdowns, 20 plug-and-play hook openers, and filming checklists.",
      downloadUrl: "/downloads/tiktok-shop/Short-Form-Video-Script-Templates.pdf",
      previewContent: {
        summary: "A practical scriptwriting field guide containing the exact narrative structures used by eight-figure social e-commerce brands to produce high-retention viral videos on TikTok Shop.",
        keyPoints: [
          "The 3-Second Rule: Psychological triggers for instant visual and auditory disruption.",
          "PAS Script Template: Detailed second-by-second breakdown for problem-solving utility gadgets.",
          "Skeptical Reviewer Template: Building authentic credibility through on-camera testing experiments.",
          "20 Proven Plug-and-Play Hook Openers categorized by emotional curiosity, FOMO, and pain relief."
        ],
        sampleSnippet: "TIMESTAMP 0:00-0:03 HOOK: 'If you still clean your glasses with your shirt, stop doing this immediately—you are scratching micro-grooves into your lenses every single day.'"
      }
    }
  },

  // --------------------------------------------------------------------------
  // MODULE 5: Affiliate Marketing and Creator Partnerships
  // --------------------------------------------------------------------------
  {
    moduleIndex: 4,
    moduleTitle: "Module 5: Affiliate Marketing & Creator Partnerships",
    headline: "Recruitment Systems, Commission Architecture & Cold Outreach Masterclass",
    learningObjectives: [
      "Master the TikTok Creator Marketplace to identify high-converting micro-influencers.",
      "Calculate optimal commission splits (10% to 25%) that attract top creators while preserving net margin.",
      "Deploy high-response cold DM and email outreach swipe files that achieve > 30% sample request rates.",
      "Establish binding Creator Sample Agreements to ensure videos are posted within 10 days of delivery.",
      "Scale from 5 to 50 active creator partners to construct an automated organic sales engine."
    ],
    lessons: [
      {
        subtitle: "1. The Power of Organic Affiliate Fleets",
        content: `The single greatest competitive advantage of TikTok Shop over Amazon or Shopify is the native Creator Affiliate Network. 

On Amazon, if you want external traffic, you must pay expensive upfront influencer fees with zero guarantee of sales. On TikTok Shop, over 100,000 creators browse the affiliate marketplace every single day searching for products to promote. 

Instead of producing all video content yourself, your primary growth objective is to build an active 'Affiliate Fleet': recruiting 20 to 50 micro-creators who receive free product samples and post 2 to 3 videos weekly tagged with your store link. 

Even if each creator only generates 10 sales per week, a fleet of 30 creators generates 300 orders weekly (1,200 orders per month) with ZERO upfront advertising expense. You only pay creators a commission AFTER a sale is successfully completed and verified by the platform!`,
        workedScenario: `A merchant recruits 25 micro-creators (each with 15k-40k followers) and sends each a sample unit costing $5.20 + $3.80 shipping ($9.00 total sample investment = $225 total cost). 
Over the next 14 days, 21 creators post videos. 18 videos achieve modest views (1,000-5,000 views) generating 45 sales. 
However, 3 creator videos go viral, amassing 480,000 combined views and generating 820 orders. 
Total GMV: 865 orders × $27.99 = $24,211. 
Total Creator Commissions Paid (15%): $3,631. 
Total Sample Cost: $225. 
Net Profit to Merchant: $6,450 from a $225 initial outreach investment!`,
        proTip: "Target micro-creators with between 10,000 and 75,000 followers. Mega-influencers (> 500k followers) demand thousands in upfront cash fees, whereas micro-creators are eager to receive free products and earn performance commissions.",
        commonPitfall: "Sending free samples to creators without checking their recent video views. Many accounts have 50k followers from a viral video 2 years ago, but their recent videos only get 200 views. Always audit their past 10 video view counts."
      },
      {
        subtitle: "2. Structuring Lucrative Commission Tiers & Sample Rules",
        content: `TikTok Shop allows two primary collaboration mechanisms inside the Affiliate Center:

1. OPEN COLLABORATIONS (Broad Distribution):
You set a global baseline commission rate (e.g. 15%) accessible to any creator in the marketplace who wishes to add your product to their showcase. 
• Use Case: Broad organic discovery. Any creator can promote your link immediately.

2. TARGETED COLLABORATIONS (VIP Strategic Partnerships):
You create custom, private collaboration links for specific vetted creators with enhanced commission rates (e.g. 20% or 25%) and tiered performance bonuses.
• Tiered Bonus Structure Example:
  - Standard Commission: 18% on all sales.
  - Milestone Tier 1: Extra $100 cash bonus upon reaching 50 verified sales.
  - Milestone Tier 2: Extra $300 cash bonus upon reaching 200 verified sales.
  - Spark Ad Privilege: Merchant invests $500 of their own advertising budget to boost the creator's winning organic video, driving thousands of additional orders and swelling the creator's commission payout.

CREATOR SAMPLE DISPATCH PREREQUISITES:
Never send free samples blindly. Require creators to meet these 3 gates:
• Account has posted at least 3 videos with yellow shopping links in the past 30 days.
• Average video views over the past 10 posts exceed 3,000 views.
• Written agreement via DM confirming they will publish at least 1 dedicated video within 10 days of package tracking confirmation.`,
        workedScenario: `A merchant offers 10% commission and contacts 50 creators; only 2 accept because competing stores offer 15%. The merchant increases the commission to 20% and introduces a $100 bonus for 50 sales. Creator response rate surges from 4% to 34%, securing 17 active creator partners in 5 days.`,
        proTip: "In Seller Center, set 'Free Sample Criteria' to auto-approve creators with an e-commerce sales score above 70, saving you hours of manual review.",
        commonPitfall: "Ignoring creator messages after sending the sample. You must track tracking delivery numbers, send a friendly message the day the package arrives, and offer creative hook ideas to help them script a winning video."
      },
      {
        subtitle: "3. Cold Outreach Scripts: In-App DM & Formal Email Swipes",
        content: `High-performing creators receive dozens of automated bot messages daily. Generic messages like "Hey dear check our shop" are instantly deleted. Your outreach must be personalized, concise, and focused on the creator's financial benefit:

RULES FOR 30%+ OUTREACH RESPONSE RATES:
1. Mention a specific detail from their recent content in the first sentence to prove you are a human.
2. State the exact product benefit and in-app conversion rate.
3. Offer an immediate, zero-friction benefit: 100% Free Sample + High Commission.
4. Keep the message under 60 words so it fits in their mobile notification banner.

THE WINNING IN-APP DM TEMPLATE:
"Hey [Creator Name]! Loved your recent video showing [specific detail/gadget]—your lighting and humor were fantastic. 
We have a new [Product Name] that solves [specific pain point] that your audience would love. It is currently converting at over 3.8% on TikTok Shop. 
We would love to send you a 100% FREE sample unit, plus set you up with an exclusive 20% commission on all sales. 
Drop your shipping address if you would like us to dispatch a unit to you today!"`,
        workedScenario: `An outreach manager sends 30 personalized DMs per day using the above template. Over 10 days (300 DMs sent), 98 creators respond, 72 provide shipping addresses, and 54 publish videos within 2 weeks, generating a sustained stream of 40-70 organic orders daily.`,
        proTip: "Follow up once after 72 hours if a creator opens your message but forgets to reply. Over 40% of confirmed partnerships are secured on the polite follow-up message.",
        commonPitfall: "Demanding that creators sign complex 10-page legal contracts for a $25 sample. Keep terms simple and communicated directly inside TikTok DM or email."
      }
    ],
    knowledgeCheck: [
      {
        question: "Why are micro-creators (10k to 75k followers) generally superior to mega-influencers for TikTok Shop affiliate partnerships?",
        options: [
          "Mega-influencers are banned from adding shopping links.",
          "Micro-creators have higher authentic engagement, demand zero upfront fees, and are enthusiastic to work on pure performance commission.",
          "Micro-creators have more money to spend on inventory.",
          "TikTok algorithms penalize accounts with over 100,000 followers."
        ],
        correctIndex: 1,
        explanation: "Micro-creators possess highly engaged, niche-focused audiences and eagerly promote products for free samples and generous commissions."
      },
      {
        question: "What is the recommended baseline affiliate commission percentage to attract motivated creators on TikTok Shop?",
        options: [
          "1% to 3%",
          "15% to 20%",
          "85% to 95%",
          "Exactly 0%"
        ],
        correctIndex: 1,
        explanation: "15% to 20% is the industry sweet spot that motivates creators to produce multiple videos while preserving 35%+ net margins for the seller."
      },
      {
        question: "What should you do within 24 hours of package tracking indicating a sample has been delivered to a creator?",
        options: [
          "Threaten to sue them if they do not post within 2 hours.",
          "Send a friendly congratulations message confirming safe arrival and sharing 2 proven hook ideas for their video.",
          "Block the creator so they cannot message you back.",
          "Immediately cancel their affiliate link."
        ],
        correctIndex: 1,
        explanation: "Warm post-delivery engagement ensures the creator unboxes the product promptly and equips them with high-converting hook concepts."
      }
    ],
    assignment: {
      title: "Assignment 5: Creator Outreach Campaign & Candidate List",
      purpose: "Identify 10 qualified creator candidates, audit their metrics, and customize cold outreach scripts for your chosen product.",
      instructions: [
        "Download 'Affiliate-Outreach-Templates.pdf' from the resources section.",
        "Browse TikTok Creator Marketplace or use the search bar to locate 10 micro-creators (10k-80k followers) in your product niche.",
        "Audit each creator: verify their recent 5 videos average over 2,500 views and check for past shopping basket integrations.",
        "Customize the In-App DM script and Email pitch template for your specific product.",
        "Establish your commission tier: set baseline rate, sample dispatch requirements, and volume milestone bonus."
      ],
      expectedOutput: "A Creator Recruitment Dossier containing a spreadsheet of 10 audited creator handles, engagement metrics, customized pitch templates, and follow-up schedule.",
      rubric: [
        { criteria: "Candidate Vetting Quality", points: "35 pts", standard: "Candidates match niche, active posting history, verified view counts, zero fake engagement." },
        { criteria: "Pitch Customization", points: "35 pts", standard: "Outreach messages are concise, personalized, benefit-driven, and under 60 words." },
        { criteria: "Commission Structure", points: "15 pts", standard: "Financial model maintains healthy unit margins while offering competitive creator incentives." },
        { criteria: "Follow-up Workflow", points: "15 pts", standard: "Clear 72-hour reminder protocol and post-delivery tracking framework." }
      ],
      alternativeSimulation: "If Creator Marketplace is unavailable in your location, conduct creator discovery directly on the public TikTok mobile app or web browser using niche hashtags (#gadgets, #cleantok, #amazonfinds) and compile your 10 target candidate profiles.",
      tasks: [
        "Download 'Affiliate-Outreach-Templates.pdf' from the resource center.",
        "Identify 10 micro-influencers (10k to 75k followers) in your product niche.",
        "Calculate their average view count over their last 6 published videos.",
        "Customize the DM Swipe Template with your product name and specific pain point.",
        "Prepare the 72-hour polite follow-up message.",
        "Archive your outreach dossier in your learning notes."
      ]
    },
    resource: {
      name: "Affiliate & Creator Outreach Swipe Files",
      filename: "Affiliate-Outreach-Templates.pdf",
      type: "PDF",
      description: "High-response cold DM templates, formal email pitches, 72-hour follow-up sequences, sample agreements, and creator vetting scorecards.",
      downloadUrl: "/downloads/tiktok-shop/Affiliate-Outreach-Templates.pdf",
      previewContent: {
        summary: "An outreach playbook designed to recruit high-performing creator affiliates, featuring word-for-word DM swipes, negotiation strategies, and collaboration agreement standards.",
        keyPoints: [
          "The Under-60-Words Rule: Why short mobile-friendly DMs achieve 3x higher response rates.",
          "Creator Vetting Matrix: Auditing engagement rates, recent view consistency, and comment sentiment.",
          "Sample Collaboration Terms: Binding agreement requiring 1-2 videos posted within 10 days of package delivery.",
          "Automated follow-up cadence: Re-engaging non-responders politely without spamming."
        ],
        sampleSnippet: "OUTREACH SWIPE: 'Hey [Name]! Loved your recent video on [Topic]. We would love to send you a 100% FREE [Product] that is currently converting at 3.8% on TikTok Shop + 20% commission on every sale. Drop your address if you'd like a unit shipped today!'"
      }
    }
  },

  // --------------------------------------------------------------------------
  // MODULE 6: Orders and Customer Experience
  // --------------------------------------------------------------------------
  {
    moduleIndex: 5,
    moduleTitle: "Module 6: Order Fulfillment, Customer Care & Logistics",
    headline: "Fulfillment SLAs, 3PL Warehousing & Account Health Protection",
    learningObjectives: [
      "Master TikTok Shop fulfillment standards: strict 2-day dispatch and valid tracking integration.",
      "Evaluate TikTok Shipping vs Seller Shipping (3PL) to determine optimal cost and control.",
      "Deploy customer service response scripts that de-escalate delivery delays and prevent negative reviews.",
      "Manage returns and refunds efficiently to keep dispute rates strictly below 2.5%.",
      "Maintain a 4.5+ star Shop Health Rating to unlock algorithmic visibility boosts and early fund settlement."
    ],
    lessons: [
      {
        subtitle: "1. The 48-Hour Dispatch SLA: Surviving Platform Audits",
        content: `TikTok Shop treats shipping speed as an absolute existential metric. Unlike traditional dropshipping from overseas where 14-day shipping was common, TikTok Shop customers expect Amazon Prime-like speeds.

THE MANDATORY LOGISTICS TIMELINE:
1. ORDER GENERATED: Order appears in Seller Center under 'Awaiting Shipment'.
2. 48-HOUR DISPATCH WINDOW (SLA):
Within 2 business days of order placement, a valid tracking number from an integrated carrier (USPS, UPS, FedEx, Royal Mail, Hermes) must be generated AND scanned by the carrier hub.
3. 4-DAY TRANSIT WINDOW:
The package must reach the customer within 4 to 7 calendar days total.

PENALTIES FOR DELAYED DISPATCH:
• Late Dispatch Rate (LDR) > 4.0%: Listing impressions throttled by 50%.
• LDR > 8.0%: Automatic cancellation of orders with full buyer refunds debited from your account.
• 24-point account penalty strike and temporary suspension of daily order limits.`,
        workedScenario: `A seller experiences a viral video over the weekend generating 600 orders. Their manual packing process can only handle 80 packages per day. By Day 3, 360 orders exceed the 48-hour SLA. TikTok automatically cancels all 360 orders, refunds $10,000 to buyers, and hits the store with 18 violation points, permanently crippling store momentum. 
Prevention: Integrating an automated 3PL (Third-Party Logistics) fulfillment partner capable of processing 1,000+ orders daily on autopilot.`,
        proTip: "If you fulfill orders in-house, print shipping labels in batches every afternoon at 3:00 PM and schedule daily carrier pickups so tracking scans occur within 12 hours of order placement.",
        commonPitfall: "Generating shipping labels in software to mark orders as 'Shipped' without the carrier physically scanning the barcode within 48 hours. TikTok's system monitors first carrier hub scans, not label creation timestamps."
      },
      {
        subtitle: "2. Shipping Models: TikTok Shipping vs Seller Shipping (3PL)",
        content: `When configuring your Seller Center logistics settings, you must choose between two delivery models:

1. TIKTOK SHIPPING (Platform-Managed Shipping):
You pack the orders, print shipping labels provided directly inside TikTok Seller Center, and drop packages at designated carrier hubs.
• Pros: Subsidized shipping rates, TikTok handles all carrier transit lost-package disputes, and customers often receive 'Free Shipping' vouchers paid for by TikTok.
• Cons: You must use TikTok's integrated carriers and warehouse dispatch coordinates.

2. SELLER SHIPPING (Merchant-Managed 3PL / Own Carrier):
You connect your own third-party warehouse or shipping software (e.g. ShipStation, CJ Dropshipping US/UK warehouse, ShipBob).
• Pros: Complete control over custom branded packaging, flyer inserts, bundling, and multi-channel inventory synchronization.
• Cons: You bear 100% liability for carrier lost packages and must manually upload tracking numbers via API within 48 hours.

FOR INTERNATIONAL OPERATORS:
Utilizing a domestic 3PL warehouse located in the target market (e.g. California/Texas for US, Manchester/Northampton for UK) is mandatory. Inventory is bulk-shipped via sea/air freight to the 3PL, which automatically picks, packs, and dispatches individual orders domestically in 2 to 3 days.`,
        workedScenario: `A merchant bulk-ships 500 units of their jewelry cleaner from an overseas manufacturer to a US 3PL warehouse in Dallas, Texas. Total ocean freight cost per unit: $0.85. 3PL pick/pack and domestic USPS Ground postage cost: $3.80. Total shipping cost: $4.65. Average customer delivery time: 3 business days, earning the store a 4.9-star fulfillment rating.`,
        proTip: "Include a physical branded thank-you card inside every package featuring a QR code offering a 15% discount on their next order, siphoning one-time TikTok buyers into your permanent email database.",
        commonPitfall: "Listing products before stock is physically checked into your domestic 3PL warehouse. International freight delays can cause catastrophic stock-outs during viral video spikes."
      },
      {
        subtitle: "3. Customer Experience & Dispute De-Escalation Protocols",
        content: `Customer reviews directly determine your Shop Health Score and search ranking. A single unresolved customer dispute can trigger algorithmic demotion.

THE 3-TIER CUSTOMER CARE BLUEPRINT:
1. RESPONSE SPEED (Within 24 Hours):
TikTok measures your 'Chat Response Rate within 24 Hours'. Maintain this score above 90% by utilizing Seller Center auto-responder rules for standard inquiries (tracking status, return address).

2. DE-ESCALATING SHIPPING INQUIRIES:
When a customer messages asking "Where is my order?":
• Bad Response: "It shipped, check tracking." (Rude, triggers immediate dispute).
• Winning Response: "Hello [Customer Name]! Thank you so much for your order. We verified that your package was dispatched on [Date] via USPS tracking #[Number]. It is currently in transit to your local distribution hub and is scheduled for delivery on [Date]. We are monitoring it closely for you! Let us know if you need anything else."

3. THE 'NO-QUESTIONS-ASKED' REPLACEMENT POLICY:
If a customer claims an item arrived damaged or defective, do not argue over return shipping costs. Immediately dispatch a free replacement unit or issue an instant refund. The $5.00 cost of a replacement unit is far cheaper than a 1-star negative review that deters 50 prospective buyers.`,
        workedScenario: `A customer received a lamp with a cracked plastic shade and left a furious 1-star review. The seller immediately reached out via customer chat, issued a 100% refund, and expedited a brand new unit with a handwritten apology note. The customer updated their review to 5 stars: 'Best customer service ever! Fixed my issue in 10 minutes.'`,
        proTip: "Set up automatic email and SMS delivery notifications through your fulfillment software so customers receive alerts when their package is out for delivery, reducing 'Where is my order?' support tickets by 60%.",
        commonPitfall: "Refusing returns on damaged items. TikTok's buyer protection policy will automatically grant the refund to the buyer anyway and deduct the funds from your balance while hitting your account with a dispute violation."
      }
    ],
    knowledgeCheck: [
      {
        question: "What is the consequence if your shop's Late Dispatch Rate (LDR) exceeds 8.0%?",
        options: [
          "TikTok sends you a free gift box.",
          "TikTok automatically cancels overdue orders, refunds buyers from your account, and applies severe violation points.",
          "Your products are automatically featured on the homepage.",
          "Affiliate commission is permanently doubled."
        ],
        correctIndex: 1,
        explanation: "Exceeding critical dispatch thresholds triggers automated cancellations, revenue loss, and potential account suspension."
      },
      {
        question: "Why should you immediately replace or refund an inexpensive damaged product without arguing?",
        options: [
          "TikTok requires you to pay the customer $1,000 for any complaint.",
          "The cost of a replacement ($5-$10) is negligible compared to a damaging 1-star review that depresses conversions for hundreds of future shoppers.",
          "Damaged products cannot be manufactured again.",
          "Customers always return money to sellers voluntarily."
        ],
        correctIndex: 1,
        explanation: "Protecting your 4.5+ star rating is paramount; negative reviews drag down algorithmic distribution and conversion rates across the entire store."
      },
      {
        question: "How quickly must seller customer support respond to buyer messages to maintain healthy account metrics?",
        options: [
          "Within 30 calendar days",
          "Within 24 hours",
          "Once every quarter",
          "Only when the customer initiates a legal claim"
        ],
        correctIndex: 1,
        explanation: "TikTok measures the percentage of customer inquiries responded to within 24 hours; dropping below 90% harms account standing."
      }
    ],
    assignment: {
      title: "Assignment 6: 30-Day Content Calendar & Fulfillment Readiness Plan",
      purpose: "Establish a complete 30-day publishing schedule and draft operational customer service response scripts.",
      instructions: [
        "Download '30-Day-Content-Calendar.xlsx' from the resource panel.",
        "Populate all 30 days with scheduled video concepts, alternating between PAS, Skeptical Review, and ASMR frameworks.",
        "Draft customer care response templates for 3 scenarios: Tracking Delay, Damaged Delivery, and Sizing/Usage Question.",
        "Document your fulfillment model (TikTok Shipping vs Domestic 3PL) and list your primary carrier.",
        "Establish your daily packing and dispatch SLA checklist."
      ],
      expectedOutput: "A completed 30-Day Content & Operations Calendar in Excel plus a 1-page Customer Care SOP manual.",
      rubric: [
        { criteria: "Calendar Comprehensiveness", points: "35 pts", standard: "30 structured days with varied hook formulas and video frameworks." },
        { criteria: "Fulfillment SLA Plan", points: "25 pts", standard: "Realistic 48-hour dispatch protocol and 3PL integration mapping." },
        { criteria: "Customer Service Quality", points: "25 pts", standard: "Empathetic, brand-protective response scripts for delays and damages." },
        { criteria: "Account Health Strategy", points: "15 pts", standard: "Clear metric thresholds for maintaining 4.5+ star review ratings." }
      ],
      alternativeSimulation: "Simulate a 30-day campaign schedule by planning content themes, hooks, and hypothetical video performance benchmarks in your workbook.",
      tasks: [
        "Download '30-Day-Content-Calendar.xlsx' from the resources section.",
        "Map out daily video topics, scripts, and target publishing times for Month 1.",
        "Establish customer service response templates for shipping delays and damaged packages.",
        "Verify your daily dispatch cutoff time to ensure orders are packed within 24 hours.",
        "Calculate your packaging cost per unit (box, bubble mailer, insert card).",
        "Save your calendar and operational protocol in your records."
      ]
    },
    resource: {
      name: "30-Day TikTok Content & Operations Calendar",
      filename: "30-Day-Content-Calendar.xlsx",
      type: "spreadsheet",
      description: "Comprehensive 30-day master schedule, content pillar distribution matrices, filming status trackers, and weekly performance analytics tabs.",
      downloadUrl: "/downloads/tiktok-shop/30-Day-Content-Calendar.xlsx",
      previewContent: {
        summary: "A production-tested Excel calendar system for managing daily short-form video creation, creator filming deadlines, publishing schedules, and 7-day video view velocity tracking.",
        keyPoints: [
          "30-Day Day-by-Day Roadmap: Pre-populated with alternating script frameworks (PAS, Skeptical Review, ASMR).",
          "Pillar Distribution Model: 40% Problem/Solution, 25% Skeptical Proof, 20% Aesthetic, 15% Urgency/Flash Sale.",
          "Automated GMV Tracking: Linking video views, units sold, and retail price into estimated revenue.",
          "Creator Assignment Log: Tracking which external affiliate accounts are publishing specific product hooks."
        ],
        sampleSnippet: "SCHEDULE PREVIEW: Day 1: PAS Framework ('Stop cleaning glasses with shirt') | Day 2: Skeptical Review ('Tested viral $20 cleaner') | Day 3: ASMR Satisfying Clean."
      }
    }
  },

  // --------------------------------------------------------------------------
  // MODULE 7: Analytics and Optimization
  // --------------------------------------------------------------------------
  {
    moduleIndex: 6,
    moduleTitle: "Module 7: Analytics, Unit Economics & Conversion Optimization",
    headline: "Metrics Dashboards, Algorithmic Diagnosis & Systematic Scaling Rules",
    learningObjectives: [
      "Master the TikTok Shop Analytics Dashboard: GMV, Impressions, CTR, and Conversion Rate (CVR).",
      "Diagnose sales bottlenecks using the 'Traffic-to-Conversion Diagnostic Tree'.",
      "Calculate real-time profitability and Return on Ad Spend (ROAS) using the official financial tracker.",
      "Execute creative A/B testing on video hooks to double viewer retention.",
      "Formulate mathematical scaling rules: when to order more stock and when to cut unprofitable SKUs."
    ],
    lessons: [
      {
        subtitle: "1. The Social Commerce Funnel: Reading the Analytics Dashboard",
        content: `Data is the compass of profitable social commerce. Amateurs stare only at the total revenue number; professional operators dissect the entire conversion funnel to locate exact friction points.

THE 4 FUNNEL BENCHMARKS OF TIKTOK SHOP:
1. VIDEO VIEWS & COMPLETION RATE:
• Target Watch Time: > 45% of viewers watch past the 5-second mark.
• Benchmark: If average watch time is under 3 seconds, your HOOK is broken. The algorithm will refuse to push the video past 250 initial testing views.

2. PRODUCT IMPRESSIONS & CLICK-THROUGH RATE (CTR):
• Formula: (Yellow Basket Taps ÷ Total Video Views) × 100.
• Benchmark: Target CTR is 3.0% to 5.5%.
• Diagnosis: If video views are high (50,000 views) but CTR is low (< 1.0%), your CALL TO ACTION is weak or the product demonstration did not clearly communicate utility.

3. CONVERSION RATE (CVR):
• Formula: (Orders Placed ÷ Total Product Page Visits) × 100.
• Benchmark: Target CVR is 2.5% to 4.5%.
• Diagnosis: If CTR is high (people click the yellow basket) but CVR is low (< 1.5%), your LISTING PAGE is broken: price is too high, customer reviews are bad, shipping cost is unexpected, or product images look untrustworthy.

4. AVERAGE ORDER VALUE (AOV) & BUNDLING:
• Benchmark: Target AOV should exceed $32.00.
• Strategy: Introduce multi-packs (e.g. 'Buy 2 Get 15% Off' or 'Cleaner + 2 Replacement Solutions') to lift AOV and expand profit buffer.`,
        workedScenario: `A seller reviews their weekly dashboard: Video has 120,000 views, 4,800 product page visits (4.0% CTR - excellent). However, only 36 orders were placed (0.75% CVR - terrible!). 
Diagnostic: The video is doing its job, but the product page is bleeding sales. 
Action: The seller investigates and notices shipping was set to $5.99 at checkout. They bundle shipping into the retail price ($27.99 with 'Free Shipping') and add a 30-Day Guarantee badge to Image #1. 
Result: CVR jumps from 0.75% to 3.2%, generating 153 orders from the same traffic volume!`,
        proTip: "Check your analytics every morning at 9:00 AM. If a video posted the previous day exceeds a 15% 5-second retention rate, immediately contact creator affiliates and have them replicate the exact hook formula with their own footage.",
        commonPitfall: "Changing both your product price AND listing images simultaneously. Always test one variable at a time (A/B testing) so you can isolate which adjustment drove the performance change."
      },
      {
        subtitle: "2. The Traffic-to-Conversion Diagnostic Framework",
        content: `When sales drop or stall, do not panic or slash prices blindly. Follow this step-by-step diagnostic decision tree:

SCENARIO A: LOW VIEWS (< 500 Views per video)
• Root Cause: Weak Hook or algorithmic violation.
• Solution: Re-film the first 3 seconds with higher visual contrast or a more provocative statement. Verify account has zero policy strikes.

SCENARIO B: HIGH VIEWS (50k+) BUT LOW CART CLICKS (< 1% CTR)
• Root Cause: Unclear utility, missing in-video call to action, or product anchor title is boring.
• Solution: Add prominent on-screen arrow pointing to yellow basket at timestamp 0:18. Rename product anchor to highlight savings: "40% Off Flash Sale Today".

SCENARIO C: HIGH CLICKS BUT ZERO ORDERS (< 1% CVR)
• Root Cause: Pricing friction, negative reviews, or unexpected shipping fee.
• Solution: Offer Free Shipping, lower retail price by $2 to test elasticity, audit competitor reviews, and add lifestyle customer proof.

SCENARIO D: HIGH SALES BUT ZERO CASH IN BANK
• Root Cause: Flawed unit economics, excessive returns, or inflated creator commissions.
• Solution: Open your Sales & Profit Tracker spreadsheet, recalculate net margins, and negotiate 15% lower supplier COGS.`,
        workedScenario: `A creator posted 5 videos that all stalled at 300 views. They checked the diagnostic tree (Scenario A: Weak Hook). They replaced the verbal intro 'Hi everyone' with an extreme close-up of dirty water bubbling in the ultrasonic cleaner. The very next video hit 38,000 views in 18 hours.`,
        proTip: "Use TikTok Shop's 'Promotion Tools' tab to create limited-time Flash Deals (e.g. 15% off for 4 hours). The countdown timer on the listing creates genuine urgency that boosts CVR by up to 25%.",
        commonPitfall: "Operating without tracking returns and fees daily. Sellers often believe they made $10,000 in profit because GMV was $30,000, only to discover net profit was under $1,200 due to uncalculated shipping fees and returns."
      },
      {
        subtitle: "3. Mathematical Scaling Rules & Cash Flow Reinvestment",
        content: `Scaling social e-commerce requires strict financial discipline. Running out of stock (stock-out) kills your listing's algorithmic momentum, while over-ordering unsellable inventory locks up working capital.

THE 3-PHASE INVENTORY REORDER FORMULA:
1. PHASE 1: TESTING SPRINT (50 to 100 Units)
Order minimal initial sample inventory to validate listing conversion and test creator video hooks. 

2. PHASE 2: VELOCITY VALIDATION (250 to 500 Units)
Once a product generates >= 10 consistent daily orders for 5 consecutive days, immediately place a reorder of 500 units.
• Lead Time Calculation: Days for supplier to manufacture + days for domestic freight arrival.
• Reorder Point Formula: (Average Daily Sales × Total Lead Time Days) + Safety Buffer Stock.
• Example: If you sell 25 units/day and supplier lead time is 14 days with a 5-day safety buffer:
  Reorder Point = (25 × 14) + (25 × 5) = 350 + 125 = 475 Units.
  When your warehouse inventory drops to 475 units, you MUST reorder immediately!

3. PHASE 3: SCALE & CASH REINVESTMENT (1,000+ Units)
Reinvest 80% of net profits back into bulk inventory to achieve 25% lower supplier costs. Allocate the remaining 20% into Creator Free Sample budgets and Spark Ad testing.`,
        workedScenario: `A merchant sells 30 units daily. They waited until inventory dropped to 20 units before reordering from their supplier. The supplier took 12 days to ship. The store was completely out of stock for 11 days. The listing lost its top search ranking, creator affiliates stopped posting, and sales took 6 weeks to recover. Following the Reorder Point formula prevents this costly downtime.`,
        proTip: "Always maintain a working relationship with at least 2 independent suppliers for your winning SKU. If Supplier A suffers factory delays, Supplier B can fulfill emergency stock without interrupting sales.",
        commonPitfall: "Withdrawing all early profits for personal luxury expenses instead of building a 60-day inventory reserve buffer."
      }
    ],
    knowledgeCheck: [
      {
        question: "If a video receives 100,000 views but fewer than 500 viewers tap the yellow shopping basket (CTR < 0.5%), what is the primary diagnosis?",
        options: [
          "The video hook was broken.",
          "The in-video call to action was weak or missing, failing to guide viewers to the product link.",
          "TikTok blocked the internet connection of viewers.",
          "The product price is displayed too prominently in the video."
        ],
        correctIndex: 1,
        explanation: "High views confirm the video was engaging, but low click-through indicates viewers were not instructed or motivated to tap the shopping basket."
      },
      {
        question: "What is the formula to calculate the Inventory Reorder Point?",
        options: [
          "(Average Daily Sales × Total Lead Time Days) + Safety Buffer Stock",
          "Total Bank Account Balance ÷ 2",
          "Number of TikTok Followers × Retail Price",
          "Order exactly 10 units every Monday"
        ],
        correctIndex: 0,
        explanation: "Factoring average daily sales rate, supplier lead time, and safety buffer ensures new inventory arrives before existing stock reaches zero."
      },
      {
        question: "What should you do if an item achieves high product page clicks but conversion rate is under 1.0%?",
        options: [
          "Delete the product listing immediately.",
          "Audit the listing page: check for unexpected shipping fees, poor quality images, bad reviews, or uncompetitive pricing.",
          "Post 50 identical videos in one hour.",
          "Blame the viewers."
        ],
        correctIndex: 1,
        explanation: "High clicks mean traffic is interested; low CVR indicates on-page friction such as hidden shipping fees, bad reviews, or unclear specs."
      }
    ],
    assignment: {
      title: "Assignment 7: Performance Tracking & Profitability Audit",
      purpose: "Populate the official Sales & Profit Tracker spreadsheet with simulated or live sales data to audit net margins, fee deductions, and unit economics.",
      instructions: [
        "Download 'Sales-and-Profit-Tracker.xlsx' from the resources section.",
        "Input 15 daily sales transactions for your winning product (varying units sold from 1 to 4 per order).",
        "Verify that built-in formulas calculate Gross Revenue, COGS, Shipping, TikTok Platform Fees (6%), and Creator Commissions (15%).",
        "Audit the Monthly Summary tab to evaluate Total Net Profit and Overall Net Margin Percentage.",
        "Formulate a 3-point optimization plan to increase net margin by at least 5% (e.g. bulk supplier discount, shipping packaging optimization)."
      ],
      expectedOutput: "A fully populated Sales & Profit Tracker Excel workbook with calculated summary metrics and a 1-page financial audit memo.",
      rubric: [
        { criteria: "Financial Model Integrity", points: "35 pts", standard: "All formulas calculate correctly without reference errors (#REF) or broken logic." },
        { criteria: "Cost Allocation Accuracy", points: "30 pts", standard: "Proper incorporation of all 6 cost layers (COGS, freight, fees, commission, returns)." },
        { criteria: "Diagnostic Quality", points: "20 pts", standard: "Identification of primary cost drivers and realistic margin optimization tactics." },
        { criteria: "Inventory Planning", points: "15 pts", standard: "Application of Reorder Point formula to prevent stock-outs." }
      ],
      alternativeSimulation: "Use the pre-filled transaction data in Sheet 1 of the workbook and modify pricing and cost variables by ±15% to analyze the sensitivity of net profit margins.",
      tasks: [
        "Download 'Sales-and-Profit-Tracker.xlsx' from the resource panel.",
        "Input your product's specific retail price, COGS, and shipping costs into the Daily Orders Log.",
        "Review the automated Net Margin % column to verify it exceeds the 35% threshold.",
        "Inspect the Monthly Summary tab to analyze projected monthly profit at 500 and 1,000 units.",
        "Document 2 ways to reduce unit costs once monthly volume exceeds 500 units.",
        "Save your completed spreadsheet in your learning repository."
      ]
    },
    resource: {
      name: "TikTok Shop Sales & Net Profit Tracker",
      filename: "Sales-and-Profit-Tracker.xlsx",
      type: "spreadsheet",
      description: "Automated multi-sheet Excel model tracking daily orders, net margins, affiliate commission settlements, fee deductions, and monthly P&L summaries.",
      downloadUrl: "/downloads/tiktok-shop/Sales-and-Profit-Tracker.xlsx",
      previewContent: {
        summary: "An enterprise financial tracking workbook built specifically for social commerce operations, tracking transaction-level revenue, fee deductions, creator commission disbursements, and true net profitability.",
        keyPoints: [
          "Daily Orders Log: Pre-configured formulas calculating net dollar profit and net margin % per order.",
          "Cost deductions automated: Platform fee (6%), payment processing (2%), creator commission (15%), shipping, and COGS.",
          "Monthly Financial Audit Summary: Instant roll-up of GMV, Total Expenses, and Net Operating Profit.",
          "Unit Economics Calculator: Instant sensitivity analysis for testing new pricing points."
        ],
        sampleSnippet: "NET PROFIT FORMULA: =E2 - SUM(F2:J2) (Gross Revenue minus COGS, shipping, platform fees, affiliate commissions, and processing)."
      }
    }
  },

  // --------------------------------------------------------------------------
  // MODULE 8: Practical Launch Project
  // --------------------------------------------------------------------------
  {
    moduleIndex: 7,
    moduleTitle: "Module 8: Practical Launch Capstone Project",
    headline: "End-to-End Store Execution, Launch Sprint & Remote Agency Simulation",
    learningObjectives: [
      "Synthesize all 7 previous modules into a comprehensive, production-ready Launch Portfolio.",
      "Execute the structured 14-Day Launch Sprint: from final listing audit to creator sample dispatch.",
      "Deploy the Remote Agency Simulation model if operating from Nigeria or an unsupported region.",
      "Package your strategy into an executive consulting pitch to win foreign high-ticket brand retainers.",
      "Complete the official EarnWise Certification Audit and archive your completed deliverables."
    ],
    lessons: [
      {
        subtitle: "1. The 14-Day Store Launch Sprint Architecture",
        content: `You have mastered the mechanics of marketplace research, product economics, listing SEO, short-form video hooks, creator recruitment, fulfillment logistics, and dashboard analytics. Now you transition from learning to live execution.

THE 14-DAY LAUNCH SPRINT CHECKLIST:

DAYS 1 TO 3: PRODUCT VALIDATION & LISTING SETUP
• Finalize your winning product using the 5-Point Impulse Matrix (verified margin >= 35%).
• Publish your high-converting product listing in Seller Center using the 4-part SEO title and 7-image visual asset stack.
• Configure warehouse logistics settings (TikTok Shipping or Domestic 3PL) with confirmed stock.

DAYS 4 TO 7: CREATOR FLEET OUTREACH SPRINT
• Set up Open Collaboration (15% commission) and Targeted VIP Collaborations (20% + $100 bonus).
• Send 30 personalized DMs and 15 emails daily to micro-creators (10k-75k followers).
• Target: Confirm 10 to 15 creator sample dispatches by Day 7.

DAYS 8 TO 10: IN-HOUSE SEEDING & TEASER CONTENT
• Film and publish 3 in-house video variations using your smartphone (PAS, Skeptical Review, ASMR).
• Tag the yellow shopping cart link on every video.
• Monitor 5-second completion rates and engage with every incoming viewer comment within 15 minutes.

DAYS 11 TO 14: CREATOR CONTENT WAVE & SCALING
• Creator sample packages arrive; send post-delivery assistance messages and winning hook ideas.
• 8 to 12 creator videos go live over a 72-hour period, generating the first algorithmic wave.
• Track GMV, CTR, and CVR in your Sales & Profit Tracker. Double down on top-performing hooks!`,
        workedScenario: `A student followed the 14-Day Sprint: On Day 6, they confirmed 12 creator sample shipments. On Day 12, four creator videos were published. One video caught algorithmic traction in the UK market, amassing 64,000 views over the weekend and generating 87 sales ($2,435 GMV). The student achieved full return on their initial sample investment within 48 hours of video launch.`,
        proTip: "During the first 72 hours of a video going viral, respond to every user comment with a VIDEO REPLY (a new video directly answering their question). Video replies automatically link to the original video and shopping cart, multiplying your viral exposure for free.",
        commonPitfall: "Giving up on Day 5 because the first 2 videos only received 300 views. Algorithmic success in social commerce is an iterative probability game; maintain consistent daily output until the algorithm matches your creative to the right buyer demographic."
      },
      {
        subtitle: "2. The Remote Agency & International Arbitrage Track",
        content: `FOR LEARNERS IN NIGERIA AND UNSUPPORTED NATIVE SELLER REGIONS:
If you do not currently hold a US LLC, UK Ltd, or native domestic bank account, you do NOT need to wait to start generating income. The global demand for skilled TikTok Shop Growth Specialists among existing US and UK brands is unprecedented.

Thousands of small e-commerce merchants in California, Texas, Florida, and London have established TikTok Shop stores but possess ZERO skill in writing viral video scripts, finding winning products, or managing creator outreach. They are desperate to outsource these labor-intensive tasks.

HOW TO OPERATE AS A REMOTE GROWTH CONSULTANT:
1. PACKAGE YOUR CAPSTONE DOSSIER:
Your completed assignments from this course (Product Research Workbook, Listing Audit, 3 Short-Form Video Scripts, and 30-Day Content Calendar) serve as your verifiable, professional client portfolio.

2. TARGETING PROSPECTIVE BRANDS:
• Locate existing US/UK Amazon and Shopify merchants on Instagram, LinkedIn, or TikTok who have an inactive or poorly optimized TikTok Shop.
• Send a video audit or executive pitch showcasing how your script frameworks and creator outreach systems will generate incremental revenue for their store.

3. THE RETAINER + PERFORMANCE OFFER:
• Base Retainer: $500 to $1,500 / month (covers scripting 15 videos and managing outreach to 40 creators monthly).
• Performance Incentive: 5% to 8% cut of all incremental TikTok Shop GMV generated.
• Payout Settlement: Client pays directly via Wise, Payoneer, or direct international wire transfer into your Nigerian account.`,
        workedScenario: `A Nigerian learner compiled their completed TikTok Shop scripts and creator outreach templates into a clean Notion portfolio. They reached out to 20 UK skincare brands on LinkedIn. Two brands hired them on a £600/month retainer ($750 USD). The learner writes scripts and manages creator DMs remotely from Lagos, earning over ₦1,100,000 monthly with zero inventory or shipping liability.`,
        proTip: "When pitching remote clients, record a free 3-minute Loom video walking through their current TikTok account, pointing out 3 specific listing mistakes, and providing 1 free viral hook idea. This establishes undeniable authority.",
        commonPitfall: "Pitching yourself as a generic 'social media manager'. Position yourself specifically as an 'E-Commerce TikTok Shop Revenue Specialist'; specialists command 3x higher fees than generalists."
      },
      {
        subtitle: "3. Final Reflection, Ethics & Long-Term Brand Building",
        content: `Social commerce moves at extreme velocity, but long-term generational wealth is built on durable principles: integrity, exceptional customer value, and operational excellence.

THE 3 GOLDEN PRINCIPLES OF ETHICAL SOCIAL COMMERCE:
1. PROMOTE PRODUCTS YOU ARE PROUD OF:
Never sell hazardous, defective, or fraudulent items for a quick buck. Building a reputation for delivering high-quality goods ensures repeat purchases, glowing customer reviews, and sustainable business longevity.

2. TREAT CREATORS AS VALUED BUSINESS PARTNERS:
Pay affiliate commissions transparently and punctually. Provide creator partners with free samples, positive feedback, and performance bonuses. A loyal network of 20 creator friends will generate steady income for years across multiple product launches.

3. MASTER THE ART OF CONTINUOUS ADAPTATION:
Platform algorithms, viral trends, and consumer tastes evolve continuously. Stay curious, audit TikTok Creative Center weekly, test new creative formats, and reinvest in your skills.

You now possess the complete, end-to-end tactical playbook to dominate social e-commerce on TikTok Shop. Execute with discipline, maintain unyielding consistency, and build your digital empire!`,
        workedScenario: `A seller who began with a single $25 ultrasonic cleaner reinvested profits, expanded into an entire ergonomic home gadget brand with 6 SKUs, built a network of 120 dedicated affiliate creators, and exited the business 18 months later for $140,000 to an e-commerce brand aggregator.`,
        proTip: "Review your completed Capstone Workbook whenever you prepare to launch a new product. Treat it as your standard operating procedure (SOP) for every future e-commerce venture.",
        commonPitfall: "Abandoning execution after completing the course. Education without immediate implementation produces zero revenue. Execute Day 1 of your launch sprint within the next 48 hours!"
      }
    ],
    knowledgeCheck: [
      {
        question: "How can international learners without a native US/UK TikTok Shop account monetize the skills learned in this course immediately?",
        options: [
          "They cannot; the knowledge is completely useless outside Western countries.",
          "By operating as an outsourced Remote Growth Consultant / Agency Specialist for US/UK merchants on monthly foreign currency retainers plus GMV rev-shares.",
          "By attempting to forge passport documents.",
          "By waiting 10 years for platform policies to change."
        ],
        correctIndex: 1,
        explanation: "Offering remote scriptwriting, product research, and creator management to existing Western merchants is an immediate, high-margin, dollar-earning business model."
      },
      {
        question: "What is the recommended action during the first 72 hours of an organic video catching viral traction?",
        options: [
          "Delete the video immediately to preserve bandwidth.",
          "Reply to viewer comments with dedicated video replies that link back to the product shopping basket, multiplying exposure for free.",
          "Increase the product price by 500% to exploit customers.",
          "Turn off all notifications and go on vacation."
        ],
        correctIndex: 1,
        explanation: "Video replies to top comments generate powerful secondary algorithmic loops that direct engaged commenters straight to the checkout basket."
      },
      {
        question: "What should be your primary goal during Days 4 through 7 of the 14-Day Launch Sprint?",
        options: [
          "Order 10,000 units of unverified inventory.",
          "Execute intensive creator outreach to confirm 10 to 15 sample dispatches to vetted micro-influencers.",
          "Redesign the company logo 20 times.",
          "Spend $5,000 on untargeted Facebook ads."
        ],
        correctIndex: 1,
        explanation: "Seeding samples to active micro-creators is the single most critical lever to generate an organic wave of video reviews and initial sales."
      }
    ],
    assignment: {
      title: "Assignment 8: Practical Launch Strategy & Reflection Capstone",
      purpose: "Synthesize your complete store launch plan into the official Capstone Workbook, detailing product selection, economics, listing copy, scripts, and simulation pitch.",
      instructions: [
        "Download 'TikTok-Shop-Final-Project-Workbook.pdf' from the resources section.",
        "Complete Part 1: Product Selection & Economics Validation (COGS, Retail Price, Net Margin).",
        "Complete Part 2: Product Listing Blueprint (SEO Title, Bullet Points, 7-Image Map).",
        "Complete Part 3: Video Campaign Scripts (PAS, Skeptical Reviewer, ASMR).",
        "Complete Part 4: Creator Outreach Strategy (List of 5 target creators, customized DM pitch).",
        "Complete Part 5: Alternative Simulation Pitch (Outlining your service offer for remote brand clients).",
        "Review your final dossier and certify your completion."
      ],
      expectedOutput: "A completed Capstone Project Dossier demonstrating end-to-end mastery of TikTok Shop growth strategy.",
      rubric: [
        { criteria: "Strategic Completeness", points: "30 pts", standard: "All 5 workbook parts thoroughly addressed with specific, high-depth execution details." },
        { criteria: "Financial & Analytical Rigor", points: "25 pts", standard: "Demonstrated mastery of unit economics, net margin buffer, and reorder formulas." },
        { criteria: "Creative & Scriptwriting Mastery", points: "25 pts", standard: "Compelling 3-second hooks and conversion-engineered video scripts." },
        { criteria: "Professional Presentation", points: "20 pts", standard: "Polished, client-ready documentation suitable for high-ticket agency pitching." }
      ],
      alternativeSimulation: "Learners in unsupported native regions should complete Part 5 (Remote Agency Pitch) with full client-facing presentation slides, positioning themselves as outsourced growth strategists.",
      tasks: [
        "Download 'TikTok-Shop-Final-Project-Workbook.pdf' from the resource center.",
        "Complete the Executive Summary and Niche Selection worksheet.",
        "Verify your final unit economics margin calculation (minimum 35% net margin).",
        "Assemble your 3 production-ready short-form video scripts into the dossier.",
        "Finalize your Creator Outreach pitch template and target creator candidate list.",
        "Complete your self-assessment rubric and archive your completed graduation capstone."
      ]
    },
    resource: {
      name: "TikTok Shop Practical Capstone Project Workbook",
      filename: "TikTok-Shop-Final-Project-Workbook.pdf",
      type: "PDF",
      description: "Comprehensive capstone dossier template, portfolio presentation guidelines, remote agency pitch deck frameworks, and self-assessment rubrics.",
      downloadUrl: "/downloads/tiktok-shop/TikTok-Shop-Final-Project-Workbook.pdf",
      previewContent: {
        summary: "The official culminating Capstone Workbook for the EarnWise TikTok Shop Growth Strategy, guiding the learner through full portfolio compilation, client-facing agency pitches, and store launch sprints.",
        keyPoints: [
          "Part 1: Product Selection & Economics Validation Worksheet.",
          "Part 2: Store Listing & Visual Asset Stack Blueprint.",
          "Part 3: Three Short-Form Video Launch Scripts with second-by-second directions.",
          "Part 4: Affiliate & Creator Outreach Campaign Strategy.",
          "Part 5: Dedicated Remote Agency & Cross-Border Client Pitch Framework."
        ],
        sampleSnippet: "CAPSTONE MANDATE: Document your full 14-day execution sprint or client-facing agency proposal. Maintain high-integrity unit economics and strict policy compliance."
      }
    }
  }
];

export function getTikTokShopModule(index: number): TikTokModuleData {
  const safeIndex = Math.max(0, Math.min(index, TIKTOK_SHOP_MODULES.length - 1));
  return TIKTOK_SHOP_MODULES[safeIndex];
}
