import { getTikTokShopModule, TikTokModuleData } from './tiktokShopCourseData';

export interface EnrichedSubSection {
  subtitle: string;
  content: string;
  workedScenario?: string;
  proTip?: string;
  commonPitfall?: string;
}

export interface EnrichedStep {
  moduleTitle: string;
  headline?: string;
  learningObjectives?: string[];
  subsections: EnrichedSubSection[];
  knowledgeCheck?: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  }[];
  assignment: {
    title: string;
    purpose?: string;
    instructions?: string[];
    expectedOutput?: string;
    rubric?: {
      criteria: string;
      points: string;
      standard: string;
    }[];
    alternativeSimulation?: string;
    tasks: string[];
  };
  resources: {
    name: string;
    filename?: string;
    type: 'PDF' | 'spreadsheet' | 'toolkit' | 'checklist' | 'notion';
    description: string;
    downloadUrl?: string;
    previewContent?: {
      summary: string;
      keyPoints: string[];
      sampleSnippet: string;
    };
  }[];
}

export function getEnrichedStep(
  courseTitle: string,
  stepText: string,
  stepIndex: number
): EnrichedStep {
  const titleLower = courseTitle.toLowerCase();

  // If this is the upgraded TikTok Shop course, return the deep 8-module curriculum
  if (titleLower.includes("tiktok")) {
    const tModule = getTikTokShopModule(stepIndex);
    return {
      moduleTitle: tModule.moduleTitle,
      headline: tModule.headline,
      learningObjectives: tModule.learningObjectives,
      subsections: tModule.lessons.map(l => ({
        subtitle: l.subtitle,
        content: l.content,
        workedScenario: l.workedScenario,
        proTip: l.proTip,
        commonPitfall: l.commonPitfall
      })),
      knowledgeCheck: tModule.knowledgeCheck,
      assignment: {
        title: tModule.assignment.title,
        purpose: tModule.assignment.purpose,
        instructions: tModule.assignment.instructions,
        expectedOutput: tModule.assignment.expectedOutput,
        rubric: tModule.assignment.rubric,
        alternativeSimulation: tModule.assignment.alternativeSimulation,
        tasks: tModule.assignment.tasks
      },
      resources: [
        {
          name: tModule.resource.name,
          filename: tModule.resource.filename,
          type: tModule.resource.type,
          description: tModule.resource.description,
          downloadUrl: tModule.resource.downloadUrl,
          previewContent: tModule.resource.previewContent
        },
        {
          name: "TikTok_Shop_Master_Study_Guide.pdf",
          filename: "TikTok-Shop-Complete-Study-Guide.pdf",
          type: "PDF",
          description: "Official 8-Module Companion Field Guide & Cross-Border Framework.",
          downloadUrl: "/downloads/tiktok-shop/TikTok-Shop-Complete-Study-Guide.pdf",
          previewContent: {
            summary: "Comprehensive 8-module curriculum guide with economic formulas, policy guidelines, and cross-border blueprints.",
            keyPoints: ["Unit economics", "SLA dispatch rules", "Remote agency arbitrage"],
            sampleSnippet: "Target Retail Price = (COGS + Shipping) × 3.5"
          }
        },
        {
          name: "TikTok_Shop_Final_Project_Workbook.pdf",
          filename: "TikTok-Shop-Final-Project-Workbook.pdf",
          type: "PDF",
          description: "Official Capstone Project & Portfolio Dossier Template.",
          downloadUrl: "/downloads/tiktok-shop/TikTok-Shop-Final-Project-Workbook.pdf",
          previewContent: {
            summary: "Culminating Capstone Workbook for portfolio presentation and remote agency client pitch.",
            keyPoints: ["Product validation", "Script blueprints", "Agency proposal"],
            sampleSnippet: "CAPSTONE MANDATE: Document your full 14-day execution sprint or client-facing agency proposal."
          }
        }
      ]
    };
  }

  // Standard legacy enrichment for all other courses
  let parsedTitle = `Strategy Block 0${stepIndex + 1}`;
  let cleanBody = stepText;
  
  if (stepText.includes(':')) {
    const parts = stepText.split(':');
    parsedTitle = parts[0].trim();
    cleanBody = parts.slice(1).join(':').trim();
  }

  const has48HourWin = stepIndex === 0;

  let localizedSecret = "";
  let screenBlueprint = "";
  let dfyAsset = "";
  let dfyFilename = "";
  let dfyType: 'PDF' | 'spreadsheet' | 'toolkit' | 'checklist' | 'notion' = 'toolkit';
  let quickWinAction = "";

  if (titleLower.includes("whatsapp") || titleLower.includes("lead")) {
    localizedSecret = "Integrate standard VCF generator web hooks directly. Instead of asking leads to manually save your number—which kills conversions by 65%—redirect them through a standard custom-text link that triggers an automated VCF card download of their contacts instantly.";
    screenBlueprint = "Open the WhatsApp Business Cloud developer dashboard. Choose 'Automations' -> 'Interactive Catalogs'. Click the green '+' icon on the top right, upload your digital inventory, set the price point fields to currency NGN, and bind the transaction webhooks to standard local collection engines.";
    dfyAsset = "The WhatsApp Status Copywriting Swipe-File & Automated VCF Siphon Script.";
    dfyFilename = "WhatsApp_Status_Siphon_Toolkit.zip";
    dfyType = "toolkit";
    quickWinAction = "Download the Swipe-File, post Slide #2 directly to your WhatsApp Status, and place your custom pre-filled contact link. Get your first 15 hot inbound contact acquisitions registered in under 24 hours.";
  } else if (titleLower.includes("video") || titleLower.includes("editing") || titleLower.includes("capcut")) {
    localizedSecret = "When exporting local video outputs, do not render directly to high codecs. Instead, use a custom mobile workflow overlay: set constant bitrate variables to variable VBR-2, add an immediate 10% contrast compensation layer to offset native mobile compression, and store resources in pre-packaged local CapCut assets folders.";
    screenBlueprint = "Boot CapCut Mobile, open 'Settings' on the top right gear icon, ensure video frame-rate is pinned to exactly 60fps, and turn off default ending watermarks. Navigate to 'Audio' -> 'Effects', select 'Transition Sub-folder', and set sound volumes to exactly -3.5dB to prevent compression clipping.";
    dfyAsset = "Premium Cinematic Sound-FX Starter Vault & capcut branding layout configurations.";
    dfyFilename = "Mobile_Video_Director_Asset_Vault.zip";
    dfyType = "toolkit";
    quickWinAction = "Import any 10-second smartphone video, apply the Zoom-Cut overlay from the swipe package, add SFX Pack transition #3, and post as a reel showcasing your styling capability. Target 10 local brands with the resulting video draft.";
  } else if (titleLower.includes("ai-powered") || titleLower.includes("graphic") || titleLower.includes("design") || titleLower.includes("midjourney")) {
    localizedSecret = "Public servers often moderate specific marketing prompts. Bypass this by using custom weighting coefficients: append local style seeds (--seed 402928) and style multipliers (--v 6.0 --style raw) to render clean, professional, non-hallucinated vector icons on your grid feeds instantly.";
    screenBlueprint = "Open Midjourney on your Discord workspace, enter '/settings', choose 'High Variation Mode', and toggle 'Remix Mode' to true. Next, open Canva, select 'Custom Dimensions' set to 1080x1350 (portrait ratio), set grid margins to exactly 8%, and drop your high-resolution Midjourney assets into the pre-configured layout placeholders.";
    dfyAsset = "Midjourney Elite Marketing Prompt Dictionary & High-Converting Typography Combination Library.";
    dfyFilename = "Midjourney_Elite_Prompts_Dictionary.xlsx";
    dfyType = "spreadsheet";
    quickWinAction = "Generate 1 design mockup using the exact prompts in the toolkit, overlay your logo using the alignment rules, and pitch layout improvements directly to 5 local restaurant or gym owners on Instagram.";
  } else {
    localizedSecret = "To secure stable dollar payments from international businesses from Nigeria, completely avoid outdated payment platforms that trigger geolocation reviews. Set up a multi-currency business account through Wise or Payoneer, register it with a custom invoice generator, and structure payments into two discrete 50% milestone payments to protect your design and execution capital from day one.";
    screenBlueprint = "Open your global platform dashboard (e.g. contracting board, Notion, or custom workspace), click the 'Account Settings' tab, navigate to 'Billing Methods', select 'Direct Bank Transfer', and input your multi-currency routing coordinates directly. Build your premium digital catalog, customize the price blocks to USD values only, and set client message automations to on.";
    dfyAsset = "High-Ticket Client Acquisition Outreach swipe-files, legal agreements, and contract templates.";
    dfyFilename = "High_Ticket_Arbitrage_Outreach_Swipe.notion";
    dfyType = "notion";
    quickWinAction = "Download the client-outreach script, identify exactly 5 premium candidates on professional platforms, send customized outbound briefs, and register your first high-integrity digital strategy conversation within 48 hours.";
  }

  const subsections: EnrichedSubSection[] = [
    {
      subtitle: "1. OVER-THE-SHOULDER SCREENBLUEPRINT & DASHBOARD WALK-THROUGH",
      content: `In this module on **${courseTitle}**, you are transitioning from theoretical advice to absolute visual execution. ${screenBlueprint} By strictly mapping physical screen coordinates, button actions, and layout properties, you avoid manual guesswork and configure your workspace for peak performance instantly.`
    },
    {
      subtitle: "2. UNDERGROUND LOCALIZED HACKS & INSIDER SECRETS",
      content: `Standard courses provide generic steps that fail in the real market due to payment barriers and algorithm updates. **Here is the unfiltered workaround for this module**: ${localizedSecret} By implementing these exact insider bypasses, you protect your local earnings, maximize conversion parameters, and out-execute 99% of global freelancers.`
    },
    {
      subtitle: "3. TACTICAL ENTERPRISE DELEGATION & SCALING SCHEMATICS",
      content: `The ultimate key to prestige earnings is escaping active manual labor. Once you successfully execute this step **3 times**, immediately package your operational parameters into a Standard Operating Procedure (SOP). Outsource repetitive workflows to junior digital assistants, establishing an arbitrage loop that allows you to collect multiple retainers simultaneously.`
    }
  ];

  const tasks = has48HourWin
    ? [
        `🔥 [48-HOUR QUICK-WIN CHALLENGE]: ${quickWinAction}`,
        `Configure your profile coordinates, payment settlement gateways, and system assets according to Step 1 guidelines.`,
        `Draft your premium 1-page Client Service Agreement (CSA) featuring a mandatory 50% upfront retainer clause.`,
        `Map exactly 5 target market friction points relative to "${parsedTitle}" and register them inside your dashboard.`
      ]
    : [
        `⚡ [TACTICAL EXECUTION DRILL]: Execute the step-by-step screenblueprint coordinates described in this module.`,
        `Deploy the "${parsedTitle}" asset files directly into your active digital systems and verify responsive link states.`,
        `Apply the underground localized bypasses to safeguard your transactional security and maximize client retention.`,
        `Execute a comprehensive operational audit evaluating your specialist fee splits and gross margin metrics.`
      ];

  const resources = [
    {
      name: dfyFilename,
      type: dfyType,
      description: `[THE DONE-FOR-YOU ASSET VAULT]: Completely editable ready-made assets including: ${dfyAsset}`
    },
    {
      name: `Arbitrage_Margin_Calculator_0${stepIndex + 1}.xlsx`,
      type: 'spreadsheet' as const,
      description: "Interactive forecasting spreadsheet to calculate service arbitrage fee splits, gross margin percentages, and target monthly revenue thresholds."
    },
    {
      name: "Outbound_Acquisition_Scriptbook.pdf",
      type: 'PDF' as const,
      description: "Pre-vetted, high-conversion outreach swipe files, follow-up messages, and objectionhandling formulas."
    }
  ];

  return {
    moduleTitle: parsedTitle,
    subsections,
    assignment: {
      title: has48HourWin ? `🚀 STEP 1 EXECUTION: REGISTER 48-HOUR QUICK-WIN` : `Step ${stepIndex + 1} Interactive Strategy Deployment`,
      tasks
    },
    resources
  };
}
