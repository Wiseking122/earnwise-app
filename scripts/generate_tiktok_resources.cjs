const { jsPDF } = require('jspdf');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const outputDir = path.resolve(__dirname, '../public/downloads/tiktok-shop');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// -------------------------------------------------------------
// PDF HELPER UTILITIES
// -------------------------------------------------------------
function createStyledDoc(title, subtitle) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let pageNumber = 1;
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;
  let cursorY = margin;

  function addHeader(headerTitle) {
    doc.setFillColor(15, 23, 42); // Slate 900
    doc.rect(0, 0, pageWidth, 18, 'F');
    doc.setFillColor(245, 158, 11); // Amber 500
    doc.rect(0, 18, pageWidth, 1.5, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('EARNWISE ACADEMIC • TIKTOK SHOP GROWTH STRATEGY', margin, 11);

    doc.setTextColor(245, 158, 11);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(headerTitle || 'PRACTICAL EXECUTION RESOURCE', pageWidth - margin, 11, { align: 'right' });
  }

  function addFooter() {
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('EarnWise Prestige Arbitrage Core Ltd • Confidential Learner Material', margin, pageHeight - 7);
    doc.text(`Page ${pageNumber}`, pageWidth - margin, pageHeight - 7, { align: 'right' });
  }

  function checkPageBreak(neededSpace = 20) {
    if (cursorY + neededSpace > pageHeight - 20) {
      addFooter();
      doc.addPage();
      pageNumber++;
      addHeader(title);
      cursorY = 28;
    }
  }

  // Cover / Header banner on first page
  addHeader(title);
  cursorY = 28;

  // Title block
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, cursorY, contentWidth, 26, 3, 3, 'FD');

  doc.setFillColor(245, 158, 11);
  doc.roundedRect(margin + 4, cursorY + 4, 3, 18, 1, 1, 'F');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(title, margin + 12, cursorY + 11);

  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(subtitle || 'Official Field Guide & Implementation Blueprint', margin + 12, cursorY + 19);

  cursorY += 32;

  return {
    doc,
    margin,
    pageWidth,
    pageHeight,
    contentWidth,
    getCursorY: () => cursorY,
    setCursorY: (val) => { cursorY = val; },
    checkPageBreak,
    finish: (filename) => {
      addFooter();
      const filePath = path.join(outputDir, filename);
      fs.writeFileSync(filePath, Buffer.from(doc.output('arraybuffer')));
      console.log(`Generated PDF: ${filename} (${fs.statSync(filePath).size} bytes)`);
    },
    addSectionHeading: (text) => {
      checkPageBreak(18);
      cursorY += 4;
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(margin, cursorY, contentWidth, 8, 2, 2, 'F');
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(text.toUpperCase(), margin + 4, cursorY + 5.5);
      cursorY += 12;
    },
    addParagraph: (text, isBold = false) => {
      doc.setFont('helvetica', isBold ? 'bold' : 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(51, 65, 85);
      const lines = doc.splitTextToSize(text, contentWidth);
      checkPageBreak(lines.length * 4.5 + 4);
      doc.text(lines, margin, cursorY);
      cursorY += lines.length * 4.5 + 3;
    },
    addBullet: (boldPrefix, text) => {
      checkPageBreak(10);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(217, 119, 6); // amber 600
      doc.text('•', margin + 2, cursorY);

      doc.setTextColor(15, 23, 42);
      doc.text(boldPrefix + ': ', margin + 7, cursorY);
      const prefixWidth = doc.getTextWidth(boldPrefix + ': ');

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      const restLines = doc.splitTextToSize(text, contentWidth - 7 - prefixWidth);
      if (restLines.length > 0) {
        doc.text(restLines[0], margin + 7 + prefixWidth, cursorY);
        cursorY += 4.5;
        if (restLines.length > 1) {
          const subsequent = restLines.slice(1);
          const fullLines = doc.splitTextToSize(subsequent.join(' '), contentWidth - 7);
          checkPageBreak(fullLines.length * 4.5);
          doc.text(fullLines, margin + 7, cursorY);
          cursorY += fullLines.length * 4.5;
        }
      } else {
        cursorY += 4.5;
      }
      cursorY += 1.5;
    },
    addCallout: (title, text, type = 'info') => {
      const isWarn = type === 'warn';
      const bgColor = isWarn ? [254, 242, 242] : [238, 242, 255];
      const borderColor = isWarn ? [239, 68, 68] : [99, 102, 241];
      const titleColor = isWarn ? [185, 28, 28] : [67, 56, 202];

      const lines = doc.splitTextToSize(text, contentWidth - 12);
      const boxHeight = lines.length * 4.5 + 14;
      checkPageBreak(boxHeight + 5);

      doc.setFillColor(...bgColor);
      doc.setDrawColor(...borderColor);
      doc.roundedRect(margin, cursorY, contentWidth, boxHeight, 2, 2, 'FD');

      doc.setFillColor(...borderColor);
      doc.rect(margin, cursorY, 2.5, boxHeight, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...titleColor);
      doc.text(title.toUpperCase(), margin + 6, cursorY + 6);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);
      doc.text(lines, margin + 6, cursorY + 11);

      cursorY += boxHeight + 4;
    }
  };
}

// -------------------------------------------------------------
// RESOURCE 1: TikTok-Shop-Complete-Study-Guide.pdf
// -------------------------------------------------------------
function generateCompleteStudyGuide() {
  const p = createStyledDoc(
    'TikTok Shop Complete Master Study Guide',
    'Comprehensive 8-Module Curriculum Companion & Practical Roadmap'
  );

  p.addSectionHeading('Executive Overview & Foundational Architecture');
  p.addParagraph(
    'TikTok Shop represents the fastest growing social commerce ecosystem in history, merging algorithmic video discovery with instantaneous frictionless checkout. Unlike legacy e-commerce platforms like Amazon or Shopify where buyer intent is active search, TikTok Shop operates on passive algorithmic stimulation—capturing high-intent impulse purchases directly within 15-to-30-second short-form entertainment videos.'
  );

  p.addBullet('The Seller Model', 'Direct merchant operations where you source physical inventory, manage shop registration, handle fulfillment within strict platform SLAs (Dispatch within 2 business days), and maintain a Shop Health Rating above 4.2 stars.');
  p.addBullet('The Affiliate Model', 'Content creators and marketing specialists promote merchant products without holding inventory, earning automated 10% to 25% commissions on every sale tracked via the in-video yellow product anchor.');
  p.addBullet('The Agency Arbitrage Model', 'Managing seller stores, negotiating creator partnerships, and scripting high-converting video formats for offshore or domestic brands on retainers plus GMV rev-shares.');

  p.addCallout(
    'INTERNATIONAL ELIGIBILITY & REGIONAL POLICY NOTICE',
    'TikTok Shop availability and seller registration protocols vary strictly by country. Currently, native Seller Centers operate in the United States, United Kingdom, Indonesia, Malaysia, Philippines, Singapore, Thailand, and Vietnam. If you are operating from Nigeria or an unsupported region, direct individual Nigerian seller accounts cannot be opened natively without an eligible registered corporate entity (such as a US LLC / UK Ltd) or partner agency. Throughout this guide, dedicated Global Alternative & Simulation exercises are provided so you can operate profitably via remote affiliate management, international client services, or agency arbitrage.',
    'warn'
  );

  p.addSectionHeading('The 8-Module Master Curriculum Roadmap');
  p.addBullet('Module 1: Marketplace Fundamentals', 'Core ecosystem mechanics, transaction lifecycle, fees (typically 5% to 8% platform fee), and operating compliance standards.');
  p.addBullet('Module 2: Product & Niche Research', 'Identifying high-velocity impulse products ($15 to $45 sweet spot), 3-second visual demonstration criteria, supplier vetting, and net margin forensic calculations.');
  p.addBullet('Module 3: Shop Readiness & Listing Optimization', 'Category approvals, high-converting product title SEO (Brand + Niche + Hero Benefit + Attribute), 7-image asset stack, and compliance audit.');
  p.addBullet('Module 4: Short-Form Video Creation & Hooks', 'The 3-second hook framework, Problem-Agitate-Solve (PAS) scripts, visual contrast, text overlays, and sound design.');
  p.addBullet('Module 5: Creator Partnerships & Outreach', 'Creator Marketplace navigation, micro-influencer outreach scripts (10k-100k followers), free sample agreements, and commission structures.');
  p.addBullet('Module 6: Order Logistics & Customer Satisfaction', '2-day SLA fulfillment, tracking integration, customer service dispute avoidance, and return rate management below 3%.');
  p.addBullet('Module 7: Analytics & Data-Driven Scaling', 'Interpreting GMV, CTR (target > 3%), CVR (target > 2.5%), Average Order Value (AOV), and scaling winning creative variations.');
  p.addBullet('Module 8: Practical Launch Capstone', 'End-to-end 14-day sprint from initial niche validation to live product campaigns or complete simulated agency pitch.');

  p.addSectionHeading('Key Financial Terminology & Mathematical Formulas');
  p.addBullet('GMV (Gross Merchandise Value)', 'Total sales volume before refunds, shipping deductions, and platform fees: GMV = Total Units Sold × Retail Price.');
  p.addBullet('Net Profit Margin', 'Net Profit = GMV - Cost of Goods Sold (COGS) - Shipping - Platform Fees (5-8%) - Creator Commissions - Packaging.');
  p.addBullet('Target Margin Baseline', 'Never sell a product on TikTok Shop with less than 35% net margin buffer. Recommended formula: Retail Price = (COGS + Shipping) × 3.5.');
  p.addBullet('Breakeven ROAS', 'Breakeven ROAS = 1 ÷ Gross Margin. E.g., if gross margin is 50%, Breakeven ROAS is 2.0x.');

  p.addCallout(
    'PROVEN SCALING HEURISTIC',
    'Do not rely on a single video. In social commerce, 80% of revenue is generated by the top 5% of video creatives. The professional strategy is systematic volume: 2 to 3 organic video variations daily across multiple creator accounts until the algorithm isolates a viral winner.',
    'info'
  );

  p.finish('TikTok-Shop-Complete-Study-Guide.pdf');
}

// -------------------------------------------------------------
// RESOURCE 2: Product-Research-Workbook.xlsx
// -------------------------------------------------------------
function generateProductResearchWorkbook() {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Instructions & Scoring Model
  const instructionsData = [
    ['TIKTOK SHOP PRODUCT RESEARCH WORKBOOK & SCORING MODEL'],
    ['EarnWise Academic • High-Velocity Social E-Commerce Framework'],
    [''],
    ['HOW TO USE THIS WORKBOOK:'],
    ['1. Input your candidate products in Sheet 2 ("Product Candidate Evaluator").'],
    ['2. The built-in formulas will automatically compute Estimated Net Profit, Net Margin %, and Quality Score.'],
    ['3. A viable TikTok Shop product MUST meet the following 5 Golden Rules:'],
    ['   Rule 1: Retail Price between $15 and $45 (impulse buy sweet spot).'],
    ['   Rule 2: Solves an immediate, visually demonstrable pain point within the first 3 seconds of video.'],
    ['   Rule 3: Net Profit Margin of at least 35% after all COGS, shipping, and TikTok platform fees.'],
    ['   Rule 4: Lightweight and non-fragile (shipping weight under 500g to avoid excessive logistics deductions).'],
    ['   Rule 5: Broad addressable audience with over 100,000 monthly search/hashtag views on TikTok Creative Center.'],
    [''],
    ['SCORING CRITERIA (1 to 10 Scale):'],
    ['• Visual Demonstration Factor (Weight 25%): Can the benefit be seen instantly without sound?'],
    ['• Margin Health (Weight 25%): Is the margin >= 40%?'],
    ['• Sourcing Reliability (Weight 20%): Does the supplier have >= 95% on-time delivery and stock?'],
    ['• Competition/Saturation Level (Weight 15%): Are there under 20 active stores dominating the niche?'],
    ['• Return Risk (Weight 15%): Low sizing/breakage risk (beauty, home gadgets, desk tools = low risk; apparel = higher risk).']
  ];
  const wsInstructions = XLSX.utils.aoa_to_sheet(instructionsData);
  wsInstructions['!cols'] = [{ wch: 80 }];
  XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');

  // Sheet 2: Candidate Evaluator
  const candidatesData = [
    [
      'Product Name',
      'Niche Category',
      'Supplier COGS ($)',
      'Estimated Shipping ($)',
      'Target Retail Price ($)',
      'TikTok Platform Fee (6%) ($)',
      'Creator Commission (15%) ($)',
      'Total Unit Cost ($)',
      'Net Profit Per Unit ($)',
      'Net Margin %',
      'Visual Demo Score (1-10)',
      'Overall Quality Score',
      'Viability Decision'
    ],
    // Sample Row 1
    [
      'Ultrasonic Jewelry & Glasses Cleaner',
      'Home Gadgets',
      5.20,
      3.80,
      27.99,
      '=ROUND(E2*0.06, 2)',
      '=ROUND(E2*0.15, 2)',
      '=C2+D2+F2+G2',
      '=E2-H2',
      '=ROUND(I2/E2*100, 1)',
      9,
      8.8,
      'HIGH PRIORITY - LAUNCH'
    ],
    // Sample Row 2
    [
      'Sunset Ambient Projection Lamp',
      'Home Decor & Lighting',
      3.50,
      3.20,
      19.99,
      '=ROUND(E3*0.06, 2)',
      '=ROUND(E3*0.15, 2)',
      '=C3+D3+F3+G3',
      '=E3-H3',
      '=ROUND(I3/E3*100, 1)',
      8,
      7.9,
      'VIABLE - TEST RUN'
    ],
    // Sample Row 3
    [
      'Adjustable Posture Corrector Brace',
      'Health & Wellness',
      4.10,
      2.90,
      24.50,
      '=ROUND(E4*0.06, 2)',
      '=ROUND(E4*0.15, 2)',
      '=C4+D4+F4+G4',
      '=E4-H4',
      '=ROUND(I4/E4*100, 1)',
      8,
      8.1,
      'HIGH PRIORITY - LAUNCH'
    ],
    // Blank Rows for Learner Input
    ['[Candidate Product 1]', '', 0, 0, 0, '=ROUND(E5*0.06, 2)', '=ROUND(E5*0.15, 2)', '=C5+D5+F5+G5', '=E5-H5', '=IF(E5>0, ROUND(I5/E5*100, 1), 0)', 0, 0, 'PENDING AUDIT'],
    ['[Candidate Product 2]', '', 0, 0, 0, '=ROUND(E6*0.06, 2)', '=ROUND(E6*0.15, 2)', '=C6+D6+F6+G6', '=E6-H6', '=IF(E6>0, ROUND(I6/E6*100, 1), 0)', 0, 0, 'PENDING AUDIT'],
    ['[Candidate Product 3]', '', 0, 0, 0, '=ROUND(E7*0.06, 2)', '=ROUND(E7*0.15, 2)', '=C7+D7+F7+G7', '=E7-H7', '=IF(E7>0, ROUND(I7/E7*100, 1), 0)', 0, 0, 'PENDING AUDIT'],
    ['[Candidate Product 4]', '', 0, 0, 0, '=ROUND(E8*0.06, 2)', '=ROUND(E8*0.15, 2)', '=C8+D8+F8+G8', '=E8-H8', '=IF(E8>0, ROUND(I8/E8*100, 1), 0)', 0, 0, 'PENDING AUDIT'],
    ['[Candidate Product 5]', '', 0, 0, 0, '=ROUND(E9*0.06, 2)', '=ROUND(E9*0.15, 2)', '=C9+D9+F9+G9', '=E9-H9', '=IF(E9>0, ROUND(I9/E9*100, 1), 0)', 0, 0, 'PENDING AUDIT']
  ];
  const wsCandidates = XLSX.utils.aoa_to_sheet(candidatesData);
  wsCandidates['!cols'] = [
    { wch: 32 }, { wch: 20 }, { wch: 16 }, { wch: 18 }, { wch: 20 },
    { wch: 22 }, { wch: 24 }, { wch: 18 }, { wch: 20 }, { wch: 14 },
    { wch: 22 }, { wch: 20 }, { wch: 24 }
  ];
  XLSX.utils.book_append_sheet(wb, wsCandidates, 'Product Evaluator');

  // Sheet 3: Competitor Forensics
  const compData = [
    ['Competitor Shop Name', 'Top Selling SKU', 'Estimated 30-Day Orders', 'Price Point ($)', 'Core Hook Strategy', 'Main Weakness / Opportunity Gap'],
    ['GlowNest Store', 'Crystal Hair Eraser', 3400, 18.99, 'Before/After leg hair removal side-by-side', 'Customer reviews complain about slow shipping (7+ days). Fast 3-day US dispatch beats them.'],
    ['KitchenHacks Direct', 'Electric Garlic Chopper', 5100, 14.99, 'Messy knife vs 3-second button chop', 'Weak product packaging and no multi-blade upsell.'],
    ['DeskAesthetics', 'LED Digital Word Clock', 1900, 32.50, 'Aesthetic bedroom night-routine showcase', 'High price; opportunity to bundle with charging cable.'],
    ['[Competitor 1]', '', '', '', '', ''],
    ['[Competitor 2]', '', '', '', '', ''],
    ['[Competitor 3]', '', '', '', '', '']
  ];
  const wsComp = XLSX.utils.aoa_to_sheet(compData);
  wsComp['!cols'] = [{ wch: 22 }, { wch: 25 }, { wch: 24 }, { wch: 16 }, { wch: 35 }, { wch: 45 }];
  XLSX.utils.book_append_sheet(wb, wsComp, 'Competitor Benchmarking');

  const filePath = path.join(outputDir, 'Product-Research-Workbook.xlsx');
  XLSX.writeFile(wb, filePath);
  console.log(`Generated XLSX: Product-Research-Workbook.xlsx (${fs.statSync(filePath).size} bytes)`);
}

// -------------------------------------------------------------
// RESOURCE 3: Product-Listing-Checklist.pdf
// -------------------------------------------------------------
function generateProductListingChecklist() {
  const p = createStyledDoc(
    'TikTok Shop Product Listing Quality Checklist',
    'Pre-Publishing Compliance & High-Conversion Optimization Audit'
  );

  p.addSectionHeading('1. Product Title SEO & Architecture');
  p.addParagraph(
    'TikTok Shop search indexing prioritizes clean, keyword-dense titles formatted specifically for mobile screens. Maximum length is 255 characters, but the first 45 characters dictate mobile conversions.'
  );
  p.addBullet('Standard SEO Formula', '[Brand Name] + [Primary Search Keyword] + [Key Benefit / Problem Solved] + [Key Attribute / Color / Size]');
  p.addBullet('Example High-Converting Title', 'EarnPure Sonic Cleaner - Ultrasonic Jewelry & Glasses Washer with 45kHz High-Frequency Vibration (Portable, White)');
  p.addBullet('Title Ban List', 'Never include clickbait phrases like "Best Product Ever", "100% Free Shipping", or unsubstantiated medical claims ("Cures Acne").');

  p.addSectionHeading('2. Visual Asset Stack Standards (7-Image Blueprint)');
  p.addBullet('Image 1: Pure White Hero Shot', '1:1 ratio (1080×1080px or 1200×1200px), perfectly lit, centered product occupying 85% of canvas, no distracting background clutter.');
  p.addBullet('Image 2: Hero Benefit in Action', 'Demonstrate the immediate outcome or transformation (e.g. dirty ring becoming sparkling clean in bubbling water).');
  p.addBullet('Image 3: Lifestyle Context', 'Product placed in realistic aesthetic setting (modern bathroom vanity, minimalist desk, clean kitchen).');
  p.addBullet('Image 4: Infographic & Feature Callouts', '3 to 4 clear pointer lines highlighting core specs (e.g. "USB Rechargeable", "Waterproof IPX7", "Food-Grade Steel").');
  p.addBullet('Image 5: Dimensions & Scale Reference', 'Clear measurement graphic next to everyday object (phone, hand) to prevent "smaller than expected" customer disputes.');
  p.addBullet('Image 6: What Is Inside The Box', 'Neatly organized flat-lay of all package contents (device, cables, instruction booklet, accessories).');
  p.addBullet('Image 7: Trust, Warranty & Guarantee', 'Clean badge displaying 30-Day Money-Back Guarantee, Fast Dispatch, and 24/7 Customer Support.');

  p.addSectionHeading('3. Product Video Anchor Asset (Mandatory)');
  p.addBullet('Video Dimensions', '9:16 vertical orientation (1080×1920px), minimum 15 seconds, maximum 60 seconds.');
  p.addBullet('In-Video Product Tag Anchor', 'Ensure product is clearly shown and mentioned within the first 5 seconds to pass automated moderation.');

  p.addSectionHeading('4. Compliance, Category & Policy Audit');
  p.addCallout(
    'ACCOUNT HEALTH & BAN PREVENTION RULES',
    'TikTok Shop policy strictly penalizes misleading descriptions. Verify all certificates (CE, FCC, RoHS) for electronics. Never sell replicas, branded duplicates, ingestible weight-loss supplements, or hazardous batteries without pre-approval. Violations result in instant 24-point penalty strikes and shop suspension.',
    'warn'
  );

  p.finish('Product-Listing-Checklist.pdf');
}

// -------------------------------------------------------------
// RESOURCE 4: Short-Form-Video-Script-Templates.pdf
// -------------------------------------------------------------
function generateVideoScriptTemplates() {
  const p = createStyledDoc(
    'Viral Short-Form Video Script Templates',
    'High-Retention Hooks, Visual Demonstrations & Conversion Frameworks'
  );

  p.addSectionHeading('Script Framework 1: The Problem-Agitate-Solve (PAS) Model');
  p.addParagraph(
    'Ideal for functional problem-solving gadgets and daily pain points. Runtime: 20-30 seconds.'
  );
  p.addBullet('0:00 - 0:03 [The Disruptive Hook]', 'Visual: Extreme close-up of dirty eyeglasses or foggy jewelry. Voiceover: "If you still clean your glasses with your shirt, stop doing this immediately—you are literally scratching the lenses."');
  p.addBullet('0:03 - 0:08 [The Agitation]', 'Visual: Microscope-style zoom showing smudged dirt and micro-scratches. Voiceover: "Cloth only smears the grease around and traps bacteria."');
  p.addBullet('0:08 - 0:18 [The Solution Demonstration]', 'Visual: Drop glasses into the ultrasonic cleaner. Turn it on. Visible smoke-like dust instantly clouds the water. Voiceover: "This device uses 45,000 soundwaves per second to pull all grease out from behind the nose pads in literally 60 seconds."');
  p.addBullet('0:18 - 0:25 [Social Proof / Value Reveal]', 'Visual: Pull out sparkling clean glasses, hold up to bright light. Voiceover: "Optometrists charge $30 for this service, but this entire machine is under $25 right now."');
  p.addBullet('0:25 - 0:30 [Frictionless CTA]', 'Visual: Finger points down toward bottom-left yellow shop basket. Voiceover: "I linked the official store in the yellow basket below before the flash sale ends."');

  p.addSectionHeading('Script Framework 2: The Skeptical Reviewer / Before & After');
  p.addParagraph(
    'Ideal for trending viral products where viewers have natural skepticism. Runtime: 25-35 seconds.'
  );
  p.addBullet('0:00 - 0:03 [Curiosity Hook]', 'Visual: Holding product package looking doubtful. Voiceover: "I bought this weird TikTok product so you guys don\'t waste your money."');
  p.addBullet('0:03 - 0:12 [The Experiment]', 'Visual: Unbox rapidly, test on a challenging item. Voiceover: "Everyone on my feed claims this $18 gadget fixes your posture without feeling like a torture device. Let\'s put it to the test."');
  p.addBullet('0:12 - 0:22 [The Genuine Reaction & Proof]', 'Visual: Slip on brace under jacket. Camera pans to posture upright. Voiceover: "Wait... it actually pulls your shoulders back completely, and you can\'t even see it under a basic t-shirt."');
  p.addBullet('0:22 - 0:30 [Honest CTA]', 'Visual: Show in-app price tag. Voiceover: "Honestly 10/10 for the price. Tap the yellow basket below to grab one while they still have stock."');

  p.addSectionHeading('Script Framework 3: Sensory ASMR & Aesthetic Unboxing');
  p.addParagraph(
    'Ideal for desk accessories, lighting, beauty, and premium stationery. Runtime: 15-25 seconds.'
  );
  p.addBullet('0:00 - 0:03 [Audio Hook]', 'Visual: Crisp microphone audio. Tapping acrylic surface, box tape peel sound.');
  p.addBullet('0:03 - 0:15 [Satisfying Assembly]', 'Visual: Smooth magnetic clicks, button press, instant ambient lighting transformation.');
  p.addBullet('0:15 - 0:25 [On-Screen Text CTA]', 'Visual: Beautiful desk layout at night. On-screen text: "Link in yellow basket • 40% Off this week".');

  p.addSectionHeading('20 Proven Plug-and-Play Hook Openers');
  p.addBullet('Hook 1', '"TikTok made me buy this, and for once it actually works..."');
  p.addBullet('Hook 2', '"Do not buy this product unless you want your friends asking where you got it every 5 minutes."');
  p.addBullet('Hook 3', '"If you work an 8-hour desk job, this $20 hack will save your back."');
  p.addBullet('Hook 4', '"Why is nobody talking about this hidden feature on TikTok Shop?"');
  p.addBullet('Hook 5', '"I tested the cheapest vs most expensive version so you don\'t have to."');

  p.finish('Short-Form-Video-Script-Templates.pdf');
}

// -------------------------------------------------------------
// RESOURCE 5: 30-Day-Content-Calendar.xlsx
// -------------------------------------------------------------
function generateContentCalendar() {
  const wb = XLSX.utils.book_new();

  // Sheet 1: 30-Day Schedule
  const scheduleHeaders = [
    'Day #', 'Publish Date', 'Content Pillar', 'Script Framework',
    'Product Highlighted', 'Primary Hook Copy', 'Creator / Actor',
    'Filming Status', 'Editing Status', 'Published Video Link',
    '24-Hour Views', '7-Day Views', 'Units Sold', 'Estimated GMV ($)'
  ];

  const scheduleRows = [scheduleHeaders];
  const pillars = ['Problem-Agitate-Solve', 'Before/After Demo', 'Skeptical Review', 'Sensory ASMR', 'Competitor Comparison'];
  const hooks = [
    'Stop cleaning your glasses with your shirt...',
    'I bought this weird TikTok tool so you don\'t have to...',
    'If you sit at a desk all day, watch this...',
    'Testing if this viral $15 cleaner actually works...',
    'Don\'t buy this until you see what happened on day 3...'
  ];

  for (let i = 1; i <= 30; i++) {
    const pillar = pillars[(i - 1) % pillars.length];
    const hook = hooks[(i - 1) % hooks.length];
    const status = i <= 3 ? 'Completed' : (i <= 5 ? 'In Progress' : 'Planned');
    const views = i === 1 ? 14200 : (i === 2 ? 8900 : (i === 3 ? 45300 : ''));
    const units = i === 1 ? 38 : (i === 2 ? 19 : (i === 3 ? 142 : ''));
    const gmv = i === 1 ? '=M2*27.99' : (i === 2 ? '=M3*27.99' : (i === 3 ? '=M4*27.99' : ''));

    scheduleRows.push([
      `Day ${i}`,
      `2026-11-${i.toString().padStart(2, '0')}`,
      pillar,
      `Framework ${(i % 3) + 1}`,
      'Ultrasonic Cleaner SKU-01',
      hook,
      'In-House Creator',
      status,
      status,
      i <= 3 ? `https://tiktok.com/@example/video/${1000 + i}` : '',
      views,
      views ? views * 1.8 : '',
      units,
      gmv
    ]);
  }

  const wsSchedule = XLSX.utils.aoa_to_sheet(scheduleRows);
  wsSchedule['!cols'] = [
    { wch: 10 }, { wch: 14 }, { wch: 25 }, { wch: 16 },
    { wch: 26 }, { wch: 40 }, { wch: 18 },
    { wch: 15 }, { wch: 15 }, { wch: 32 },
    { wch: 15 }, { wch: 15 }, { wch: 14 }, { wch: 18 }
  ];
  XLSX.utils.book_append_sheet(wb, wsSchedule, '30-Day Master Calendar');

  // Sheet 2: Content Distribution Pillars
  const pillarsData = [
    ['CONTENT PILLAR DISTRIBUTION MODEL'],
    ['Pillar Name', 'Target Share %', 'Objective', 'Key Metric Target'],
    ['Problem / Solution Demos', '40%', 'Drive direct impulse purchases from target problem-sufferers', 'Conversion Rate > 3%'],
    ['Skeptical Proof & Experiments', '25%', 'Break buyer hesitation and establish authentic credibility', 'Watch Time > 60%'],
    ['Lifestyle & Aesthetic ASMR', '20%', 'Generate broad viral reach and organic aesthetic shares', 'Shares & Saves > 500'],
    ['Flash Sale & Urgency Reminders', '15%', 'Close fence-sitters with limited-time price countdowns', 'Click-Through Rate > 5%']
  ];
  const wsPillars = XLSX.utils.aoa_to_sheet(pillarsData);
  wsPillars['!cols'] = [{ wch: 30 }, { wch: 16 }, { wch: 50 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(wb, wsPillars, 'Pillar Strategy');

  const filePath = path.join(outputDir, '30-Day-Content-Calendar.xlsx');
  XLSX.writeFile(wb, filePath);
  console.log(`Generated XLSX: 30-Day-Content-Calendar.xlsx (${fs.statSync(filePath).size} bytes)`);
}

// -------------------------------------------------------------
// RESOURCE 6: Affiliate-Outreach-Templates.pdf
// -------------------------------------------------------------
function generateAffiliateOutreachTemplates() {
  const p = createStyledDoc(
    'TikTok Shop Affiliate & Creator Outreach Mastery',
    'Cold Pitch Swipe Files, Sample Agreements & Commission Negotiation'
  );

  p.addSectionHeading('The 3 Pillars of High-Converting Creator Recruitment');
  p.addParagraph(
    'Recruiting affiliate creators is the highest-leverage growth engine on TikTok Shop. Unlike traditional paid sponsorships that cost thousands upfront with zero sales guarantee, TikTok Shop affiliates work on performance: you provide a free sample and 15% to 20% commission on every order they generate.'
  );

  p.addBullet('Ideal Creator Profile (The Sweet Spot)', 'Followers: 15k to 150k. Engagement Rate: > 4.5%. Frequency: Posts 4+ times weekly. Creator has previous videos with the yellow shopping cart icon.');
  p.addBullet('Red Flags to Avoid', 'Mismatched niche, low comment-to-view ratios (< 0.2%), erratic posting schedule, or past promotion of low-quality scam products.');

  p.addSectionHeading('Template 1: Direct In-App DM Script (High Response Rate)');
  p.addParagraph('Character count: Under 450 characters (fits mobile notification preview).');
  p.addCallout(
    'DIRECT DM SCRIPT (COPY-PASTE READY)',
    'Hey [Creator Name]! Loved your recent video on [specific topic/video detail]—the lighting and humor were fantastic.\n\nWe have a new [Product Name] that solves [key pain point] that your audience would love. It\'s currently converting at over 3.8% on TikTok Shop.\n\nWe\'d love to send you a 100% FREE sample unit with no strings attached, plus set you up with an exclusive 20% commission on all sales through your link.\n\nDrop your shipping address if you\'d like us to dispatch a unit to you today!',
    'info'
  );

  p.addSectionHeading('Template 2: Creator Collaboration Email Pitch');
  p.addParagraph('Subject: Free Sample & Exclusive Partnership for [Creator Name]');
  p.addCallout(
    'FORMAL EMAIL OUTREACH SCRIPT',
    'Hi [Creator Name],\n\nMy name is [Your Name], Partnerships Lead at [Shop Brand Name]. We\'ve been following your content for a while and noticed how well your audience responds to practical life-hack and gadget recommendations.\n\nWe recently launched our [Product Name] on TikTok Shop, and it has already driven over [X,000] orders this month with a 4.8-star customer rating.\n\nWhat we offer:\n1. 100% Complimentary product shipped immediately to your door.\n2. 20% Baseline Commission on every order generated via your anchor.\n3. $100 Cash Bonus on your first 50 sales.\n4. Free paid spark ad boosting behind your best-performing video to multiply your commission income.\n\nIf you\'re interested, simply reply to this email with your preferred shipping address and phone number, and we\'ll send tracking details within 24 hours.\n\nWarm regards,\n[Your Name] | [Brand Name]',
    'info'
  );

  p.addSectionHeading('Template 3: 72-Hour Polite Follow-Up');
  p.addCallout(
    'FOLLOW-UP SCRIPT',
    'Hey [Creator Name]! Just bubbling this to the top of your inbox before our creator sample batch closes for this week. Would love to send you a free [Product Name] if you\'re still open to it. No pressure at all—keep up the great content!',
    'info'
  );

  p.addSectionHeading('Sample Agreement & Deliverable Checklist');
  p.addBullet('Sample Dispatch Condition', 'Creator agrees to post at least 1 dedicated 9:16 video featuring the product within 10 days of package arrival.');
  p.addBullet('Link Anchoring', 'Creator agrees to tag the official TikTok Shop product link in the video description.');

  p.finish('Affiliate-Outreach-Templates.pdf');
}

// -------------------------------------------------------------
// RESOURCE 7: Sales-and-Profit-Tracker.xlsx
// -------------------------------------------------------------
function generateSalesProfitTracker() {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Daily Transaction Log
  const logHeaders = [
    'Date', 'Order ID', 'Product SKU', 'Units',
    'Gross Revenue ($)', 'Product COGS ($)', 'Shipping Cost ($)',
    'TikTok Platform Fee ($)', 'Affiliate Commission ($)', 'Payment Processing ($)',
    'Total Costs ($)', 'Net Profit ($)', 'Net Margin %', 'Order Source'
  ];

  const logRows = [logHeaders];
  for (let i = 1; i <= 15; i++) {
    const units = (i % 3) + 1;
    const revFormula = `=D${i + 1}*27.99`;
    const cogsFormula = `=D${i + 1}*5.20`;
    const shipFormula = `=D${i + 1}*3.80`;
    const feeFormula = `=ROUND(E${i + 1}*0.06, 2)`;
    const commFormula = `=ROUND(E${i + 1}*0.15, 2)`;
    const procFormula = `=ROUND(E${i + 1}*0.02, 2)`;
    const totalCostFormula = `=SUM(F${i + 1}:J${i + 1})`;
    const netProfitFormula = `=E${i + 1}-K${i + 1}`;
    const marginFormula = `=ROUND(L${i + 1}/E${i + 1}*100, 1)`;

    logRows.push([
      `2026-11-${i.toString().padStart(2, '0')}`,
      `TTS-2026-${1000 + i}`,
      'Sonic Cleaner SKU-01',
      units,
      revFormula,
      cogsFormula,
      shipFormula,
      feeFormula,
      commFormula,
      procFormula,
      totalCostFormula,
      netProfitFormula,
      marginFormula,
      i % 2 === 0 ? 'Affiliate Creator @alex_tech' : 'Organic In-House Video'
    ]);
  }

  const wsLog = XLSX.utils.aoa_to_sheet(logRows);
  wsLog['!cols'] = [
    { wch: 12 }, { wch: 16 }, { wch: 22 }, { wch: 8 },
    { wch: 16 }, { wch: 16 }, { wch: 16 },
    { wch: 20 }, { wch: 22 }, { wch: 22 },
    { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 28 }
  ];
  XLSX.utils.book_append_sheet(wb, wsLog, 'Daily Orders Log');

  // Sheet 2: Monthly Financial Summary
  const monthlyData = [
    ['MONTHLY FINANCIAL AUDIT & UNIT ECONOMICS SUMMARY'],
    ['Metric Description', 'Target Goal', 'Actual M1 Performance', 'Variance / Status'],
    ['Total Units Dispatched', '1,000 Units', '=SUM(\'Daily Orders Log\'!D2:D16)*2', 'ON TRACK'],
    ['Gross Merchandise Value (GMV)', '$25,000.00', '=SUM(\'Daily Orders Log\'!E2:E16)*2', 'HEALTHY'],
    ['Cost of Goods Sold (COGS)', '$5,200.00', '=SUM(\'Daily Orders Log\'!F2:F16)*2', 'NORMAL'],
    ['Outbound Logistics & Shipping', '$3,800.00', '=SUM(\'Daily Orders Log\'!G2:G16)*2', 'OPTIMAL'],
    ['TikTok Shop Platform Fees (6%)', '$1,500.00', '=SUM(\'Daily Orders Log\'!H2:H16)*2', 'NORMAL'],
    ['Affiliate Commissions Paid (15%)', '$3,750.00', '=SUM(\'Daily Orders Log\'!I2:I16)*2', 'HIGH ROI'],
    ['Total Operational Expenses', '$14,750.00', '=SUM(\'Daily Orders Log\'!K2:K16)*2', 'CONTROLLED'],
    ['Net Operating Profit', '$10,250.00', '=SUM(\'Daily Orders Log\'!L2:L16)*2', 'EXCEPTIONAL'],
    ['Overall Net Profit Margin %', '>= 35%', '=ROUND(C9/C4*100, 1)', 'EXCEEDS TARGET']
  ];
  const wsMonthly = XLSX.utils.aoa_to_sheet(monthlyData);
  wsMonthly['!cols'] = [{ wch: 35 }, { wch: 18 }, { wch: 28 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsMonthly, 'Monthly Summary');

  const filePath = path.join(outputDir, 'Sales-and-Profit-Tracker.xlsx');
  XLSX.writeFile(wb, filePath);
  console.log(`Generated XLSX: Sales-and-Profit-Tracker.xlsx (${fs.statSync(filePath).size} bytes)`);
}

// -------------------------------------------------------------
// RESOURCE 8: TikTok-Shop-Final-Project-Workbook.pdf
// -------------------------------------------------------------
function generateFinalProjectWorkbook() {
  const p = createStyledDoc(
    'TikTok Shop Practical Capstone Project Workbook',
    'Official Portfolio Deliverable & Store Launch Implementation Dossier'
  );

  p.addSectionHeading('Capstone Instructions & Learner Deliverable Guidelines');
  p.addParagraph(
    'This Capstone Project represents the culminating practical assessment of the EarnWise TikTok Shop Growth Strategy. To complete your certification and deploy your strategy, you must document and validate every step of your store setup or simulation campaign using the structured modules below.'
  );

  p.addSectionHeading('Part 1: Product Niche Selection & Economics Validation');
  p.addBullet('Niche Category Selected', '[Learner to fill: e.g. Smart Desk Accessories, Kinetic Home Gadgets, Ergonomic Wellness]');
  p.addBullet('Core Hero Product Name', '[Learner to fill]');
  p.addBullet('Supplier Cost & Shipping Quote', 'COGS: $______ | Shipping: $______ | Target Retail Price: $______');
  p.addBullet('Calculated Net Profit & Margin', 'Net Profit Per Unit: $______ | Net Margin Percentage: ______%');

  p.addSectionHeading('Part 2: Store Listing & Visual Asset Stack');
  p.addBullet('Optimized Product Title', '[Fill with Brand + Keyword + Benefit + Specs]');
  p.addBullet('Image Asset Stack Status', 'White Background Hero [ ] | Action Shot [ ] | Infographic Specs [ ] | Scale Photo [ ]');
  p.addBullet('Compliance Audit Confirmation', 'Verified zero prohibited health/medical claims and compliant certifications.');

  p.addSectionHeading('Part 3: 3 Short-Form Video Launch Scripts');
  p.addBullet('Script 1 (Problem-Agitate-Solve)', 'Hook: "____________________________________" | Body Demo: "__________________" | CTA: "__________________"');
  p.addBullet('Script 2 (Curiosity / Review)', 'Hook: "____________________________________" | Body Demo: "__________________" | CTA: "__________________"');
  p.addBullet('Script 3 (Sensory Demonstration)', 'Hook: "____________________________________" | Body Demo: "__________________" | CTA: "__________________"');

  p.addSectionHeading('Part 4: Affiliate & Creator Outreach Campaign');
  p.addBullet('Target List of 5 Vetted Creators', '1. @____________ (______k followers) | 2. @____________ | 3. @____________ | 4. @____________ | 5. @____________');
  p.addBullet('Commission Structure Offered', 'Baseline 20% commission + Free sample unit dispatched upon DM confirmation.');

  p.addSectionHeading('Part 5: Alternative Simulation Track (For International / Offline Learners)');
  p.addParagraph(
    'If you are operating from Nigeria or an area where local TikTok Shop seller onboarding is currently unavailable, execute this Capstone via the Remote Agency Simulation model:'
  );
  p.addBullet('Simulation Objective', 'Pitch your completed Capstone Dossier (listing copy, video scripts, competitor analysis) to an existing US/UK TikTok Shop merchant as an outsourced Growth Consultant.');
  p.addBullet('Agency Pitch Retainer', 'Offer to script 15 videos and recruit 20 affiliates in exchange for a $500 monthly retainer plus 5% of incremental GMV.');

  p.finish('TikTok-Shop-Final-Project-Workbook.pdf');
}

// -------------------------------------------------------------
// EXECUTE ALL GENERATORS
// -------------------------------------------------------------
console.log('Generating all 8 official TikTok Shop resources...');
generateCompleteStudyGuide();
generateProductResearchWorkbook();
generateProductListingChecklist();
generateVideoScriptTemplates();
generateContentCalendar();
generateAffiliateOutreachTemplates();
generateSalesProfitTracker();
generateFinalProjectWorkbook();
console.log('All 8 resources generated successfully!');
