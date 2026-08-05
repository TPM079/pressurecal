import fs from "node:fs/promises";
import path from "node:path";

const DIST_DIR = path.resolve(process.cwd(), "dist");
const SITE_URL = "https://www.pressurecal.com";
const OG_IMAGE = `${SITE_URL}/social-preview.png`;

const ORGANIZATION_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;
const HOMEPAGE_WEBPAGE_ID = `${SITE_URL}/#webpage`;
const HOMEPAGE_WEBAPP_ID = `${SITE_URL}/#webapplication`;

const HOMEPAGE_SCHEMA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": ORGANIZATION_ID,
      name: "PressureCal",
      url: `${SITE_URL}/`,
      description:
        "PressureCal is a pressure washer calculator and setup modelling tool for nozzle sizing, hose loss, at-gun pressure, flow, and full setup checks.",
    },
    {
      "@type": "WebSite",
      "@id": WEBSITE_ID,
      url: `${SITE_URL}/`,
      name: "PressureCal",
      description:
        "PressureCal is a pressure washer calculator and setup modelling tool for nozzle sizing, hose loss, at-gun pressure, flow, and full setup checks.",
      publisher: {
        "@id": ORGANIZATION_ID,
      },
    },
    {
      "@type": "WebPage",
      "@id": HOMEPAGE_WEBPAGE_ID,
      url: `${SITE_URL}/`,
      name: "Pressure Washer Calculator | Nozzle Size, Hose Loss & At-Gun Pressure | PressureCal",
      description:
        "Check what your pressure washer setup is really doing at the gun with nozzle sizing, hose loss, at-gun pressure, flow, and full setup checks.",
      isPartOf: {
        "@id": WEBSITE_ID,
      },
      about: {
        "@id": ORGANIZATION_ID,
      },
      mainEntity: {
        "@id": HOMEPAGE_WEBAPP_ID,
      },
    },
    {
      "@type": "WebApplication",
      "@id": HOMEPAGE_WEBAPP_ID,
      name: "PressureCal",
      url: `${SITE_URL}/`,
      applicationCategory: "EngineeringApplication",
      operatingSystem: "Web",
      isAccessibleForFree: true,
      description:
        "PressureCal is a pressure washer calculator for nozzle sizing, hose pressure loss, PSI and LPM conversions, at-gun pressure, flow, and bypass behaviour.",
      publisher: {
        "@id": ORGANIZATION_ID,
      },
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "AUD",
        availability: "https://schema.org/InStock",
      },
    },
  ],
};

const LPM_GPM_PATH = "/lpm-gpm-calculator";
const LPM_GPM_URL = `${SITE_URL}${LPM_GPM_PATH}`;
const LPM_GPM_TITLE =
  "LPM to GPM Converter for Pressure Washers | PressureCal";
const LPM_GPM_DESCRIPTION =
  "Convert LPM to GPM and GPM to LPM for pressure washer flow rates. Includes common pressure washer examples like 15 LPM, 21 LPM, 4 GPM and 5.5 GPM.";

const LPM_GPM_FAQS = [
  {
    question: "How many GPM is 15 LPM?",
    answer:
      "15 LPM is approximately 3.96 GPM. PressureCal uses US gallons per minute for GPM.",
  },
  {
    question: "How many GPM is 21 LPM?",
    answer:
      "21 LPM is approximately 5.55 GPM using US gallons per minute.",
  },
  {
    question: "How many LPM is 5.5 GPM?",
    answer: "5.5 US GPM is approximately 20.82 LPM.",
  },
  {
    question: "Is pressure washer GPM US or imperial?",
    answer:
      "Pressure washer GPM normally means US gallons per minute, especially on US pump specifications, machine ratings and nozzle charts. PressureCal uses US GPM, not imperial gallons per minute.",
  },
  {
    question: "Why does flow rate matter for pressure washers?",
    answer:
      "Flow rate affects how much water reaches the cleaning surface and therefore influences rinsing ability and cleaning speed. It also needs to be matched with the correct nozzle size, hose and working pressure at the gun.",
  },
  {
    question: "Do I need LPM or GPM for nozzle sizing?",
    answer:
      "Either LPM or GPM can be used for nozzle sizing as long as the calculator or nozzle chart uses the same unit. Australian pump specifications commonly use LPM, while many pressure washer nozzle charts use US GPM.",
  },
  {
    question: "How does flow rate affect hose pressure loss?",
    answer:
      "Higher flow through the same hose length and internal diameter creates more hose pressure loss. When LPM or GPM increases, check the hose size and length so the setup can still deliver the required working pressure at the gun.",
  },
];

const LPM_GPM_SCHEMA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": `${LPM_GPM_URL}#webpage`,
      url: LPM_GPM_URL,
      name: LPM_GPM_TITLE,
      description: LPM_GPM_DESCRIPTION,
      isPartOf: {
        "@type": "WebSite",
        name: "PressureCal",
        url: SITE_URL,
      },
      about: [
        "LPM to GPM conversion",
        "GPM to LPM conversion",
        "litres per minute to gallons per minute",
        "pressure washer flow rates",
        "pressure washer nozzle sizing",
        "hose pressure loss",
      ],
    },
    {
      "@type": "WebApplication",
      "@id": `${LPM_GPM_URL}#app`,
      name: "LPM to GPM Converter for Pressure Washers",
      url: LPM_GPM_URL,
      applicationCategory: "UtilitiesApplication",
      operatingSystem: "Web",
      isAccessibleForFree: true,
      description: LPM_GPM_DESCRIPTION,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "AUD",
      },
    },
    {
      "@type": "FAQPage",
      "@id": `${LPM_GPM_URL}#faq`,
      mainEntity: LPM_GPM_FAQS.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${LPM_GPM_URL}#breadcrumbs`,
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "PressureCal",
          item: SITE_URL,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "LPM to GPM Converter",
          item: LPM_GPM_URL,
        },
      ],
    },
  ],
};

const PRESSURE_CLEANING_TASK_GUIDE_PATH = "/pressure-cleaning-task-guide";
const PRESSURE_CLEANING_TASK_GUIDE_TITLE =
  "Pressure Cleaning Task Guide | Nozzle and Pressure Recommendations | PressureCal";
const PRESSURE_CLEANING_TASK_GUIDE_DESCRIPTION =
  "Choose a pressure cleaning task, enter machine, attachment, nozzle and hose details, then calculate task-backed nozzle and pressure recommendations.";
const PRESSURE_CLEANING_TASKS = [
  {
    slug: "painted-acrylic-hard-tennis-court",
    title: "Painted acrylic hard tennis court",
    description:
      "Pressure cleaning task guide for painted acrylic hard tennis courts, including surface-cleaner nozzle sizing and validated pressure overlap checks.",
  },
  {
    slug: "trex-composite-decking",
    title: "Trex composite decking",
    description:
      "Pressure cleaning task guide for Trex composite decking with low-pressure nozzle recommendations and compatibility checks.",
  },
  {
    slug: "generic-timber-deck",
    title: "Generic timber deck",
    description:
      "Pressure cleaning task guide for timber decks with conservative pressure limits, nozzle sizing and machine checks.",
  },
  {
    slug: "sound-uncoated-concrete",
    title: "Sound uncoated concrete",
    description:
      "Pressure cleaning task guide for sound uncoated concrete with surface-cleaner nozzle sizing, hose loss and machine rating checks.",
  },
  {
    slug: "painted-or-coated-surface",
    title: "Painted or coated surface",
    description:
      "Pressure cleaning task guide for painted or coated surfaces with exclusive maximum pressure handling and source-backed recommendations.",
  },
  {
    slug: "travertine-pavers",
    title: "Travertine pavers",
    description:
      "Pressure cleaning task guide for travertine pavers with finish, filler, sealer, joint-condition and advisory-ceiling checks.",
  },
  {
    slug: "suspected-or-confirmed-asbestos",
    title: "Suspected or confirmed asbestos",
    description:
      "Pressure cleaning blocker for suspected or confirmed asbestos-containing material with SafeWork guidance.",
  },
];

function pressureCleaningTaskSchema(pathname, name, description) {
  const url = `${SITE_URL}${pathname}`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${url}#webpage`,
        url,
        name,
        description,
        isPartOf: {
          "@type": "WebSite",
          name: "PressureCal",
          url: SITE_URL,
        },
      },
      {
        "@type": "WebApplication",
        "@id": `${url}#app`,
        name: "Pressure Cleaning Task Guide",
        url,
        applicationCategory: "Calculator",
        operatingSystem: "Web",
        isAccessibleForFree: true,
        description,
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "AUD",
        },
      },
    ],
  };
}

const ROUTES = [
  {
    path: "/",
    title:
      "Pressure Washer Calculator | Nozzle Size, Hose Loss & At-Gun Pressure | PressureCal",
    description:
      "Check what your pressure washer setup is really doing at the gun with nozzle sizing, hose loss, at-gun pressure, flow, and full setup checks.",
    schema: HOMEPAGE_SCHEMA,
  },
  {
    path: "/calculator",
    title: "Full Rig Pressure Washer Calculator | PressureCal",
    description:
      "Full rig pressure washer calculator for hose loss, nozzle calibration, at-gun pressure, flow, and power requirement.",
    schema: {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "PressureCal Full Rig Calculator",
      url: `${SITE_URL}/calculator`,
      applicationCategory: "Calculator",
      operatingSystem: "Web",
      isAccessibleForFree: true,
      description:
        "Full rig pressure washer calculator for hose loss, nozzle calibration, at-gun pressure, flow, and power requirement.",
    },
  },
  {
    path: "/nozzle-size-calculator",
    title: "Pressure Washer Nozzle Size Calculator | PSI, LPM & GPM | PressureCal",
    description:
      "Calculate the correct pressure washer nozzle / tip code from pump flow and working pressure. Supports PSI, BAR, LPM and US GPM for real pressure washer setups.",
    schema: {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "Pressure Washer Nozzle Size Calculator",
      url: `${SITE_URL}/nozzle-size-calculator`,
      applicationCategory: "Calculator",
      operatingSystem: "Web",
      isAccessibleForFree: true,
      description:
        "Calculate the correct pressure washer nozzle / tip code from pump flow and working pressure. Supports PSI, BAR, LPM and US GPM for real pressure washer setups.",
    },
  },
  {
    path: "/hose-pressure-loss-calculator",
    title: "Hose Pressure Loss Calculator | PressureCal",
    description:
      "Calculate pressure loss in hoses based on length, internal diameter, and flow rate. Essential tool for accurate pressure washer system setup.",
    schema: {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "Pressure Washer Hose Pressure Loss Calculator",
      url: `${SITE_URL}/hose-pressure-loss-calculator`,
      applicationCategory: "Calculator",
      operatingSystem: "Web",
      isAccessibleForFree: true,
      description:
        "Calculate pressure loss in hoses based on length, internal diameter, and flow rate. Essential tool for accurate pressure washer system setup.",
    },
  },
  {
    path: "/psi-bar-calculator",
    title: "PSI to BAR Calculator | PressureCal",
    description:
      "Convert PSI to BAR and BAR to PSI instantly. Accurate pressure conversion calculator for pressure washing equipment, pumps, and system setup.",
    schema: {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "PSI to BAR Calculator",
      url: `${SITE_URL}/psi-bar-calculator`,
      applicationCategory: "Calculator",
      operatingSystem: "Web",
      isAccessibleForFree: true,
      description:
        "Convert PSI to BAR and BAR to PSI instantly. Accurate pressure conversion calculator for pressure washing equipment, pumps, and system setup.",
    },
  },
  {
    path: LPM_GPM_PATH,
    title: LPM_GPM_TITLE,
    description: LPM_GPM_DESCRIPTION,
    schema: LPM_GPM_SCHEMA,
  },
  {
    path: "/nozzle-size-chart",
    title: "Pressure Washer Nozzle Size Chart | PSI, GPM & Tip Sizes | PressureCal",
    description:
      "Use this pressure washer nozzle size chart to compare nozzle / tip codes by PSI and flow rate. Includes practical sizing guidance and links to nozzle calculators.",
    schema: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "Pressure Washer Nozzle Size Chart",
      url: `${SITE_URL}/nozzle-size-chart`,
      description:
        "Pressure washer nozzle size chart for matching machine pressure and flow to the correct nozzle / tip code.",
    },
  },
  {
    path: PRESSURE_CLEANING_TASK_GUIDE_PATH,
    title: PRESSURE_CLEANING_TASK_GUIDE_TITLE,
    description: PRESSURE_CLEANING_TASK_GUIDE_DESCRIPTION,
    schema: pressureCleaningTaskSchema(
      PRESSURE_CLEANING_TASK_GUIDE_PATH,
      PRESSURE_CLEANING_TASK_GUIDE_TITLE,
      PRESSURE_CLEANING_TASK_GUIDE_DESCRIPTION
    ),
  },
  ...PRESSURE_CLEANING_TASKS.map((task) => {
    const path = `${PRESSURE_CLEANING_TASK_GUIDE_PATH}/${task.slug}`;
    const title = `${task.title} Pressure Cleaning Task Guide | PressureCal`;

    return {
      path,
      title,
      description: task.description,
      schema: pressureCleaningTaskSchema(path, title, task.description),
    };
  }),
];

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function stripManagedHeadTags(html) {
  return html
    .replace(/<title\b[^>]*>[\s\S]*?<\/title>\s*/gi, "")
    .replace(/<meta\s+name=["']description["'][^>]*>\s*/gi, "")
    .replace(/<link\s+rel=["']canonical["'][^>]*>\s*/gi, "")
    .replace(/<meta\s+property=["']og:[^"']+["'][^>]*>\s*/gi, "")
    .replace(/<meta\s+name=["']twitter:[^"']+["'][^>]*>\s*/gi, "")
    .replace(/<script\s+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>\s*/gi, "");
}

function routeHead(route) {
  const canonical = route.path === "/" ? `${SITE_URL}/` : `${SITE_URL}${route.path}`;

  return [
    `    <title data-rh="true">${escapeHtml(route.title)}</title>`,
    `    <meta data-rh="true" name="description" content="${escapeHtml(route.description)}" />`,
    `    <link data-rh="true" rel="canonical" href="${canonical}" />`,
    `    <meta data-rh="true" property="og:title" content="${escapeHtml(route.title)}" />`,
    `    <meta data-rh="true" property="og:description" content="${escapeHtml(route.description)}" />`,
    `    <meta data-rh="true" property="og:type" content="website" />`,
    `    <meta data-rh="true" property="og:url" content="${canonical}" />`,
    `    <meta data-rh="true" property="og:image" content="${OG_IMAGE}" />`,
    `    <meta data-rh="true" name="twitter:card" content="summary_large_image" />`,
    `    <meta data-rh="true" name="twitter:title" content="${escapeHtml(route.title)}" />`,
    `    <meta data-rh="true" name="twitter:description" content="${escapeHtml(route.description)}" />`,
    `    <meta data-rh="true" name="twitter:image" content="${OG_IMAGE}" />`,
    `    <script data-rh="true" type="application/ld+json">${JSON.stringify(route.schema)}</script>`,
  ].join("\n");
}

async function writeRouteHtml(route, template) {
  const withCleanHead = stripManagedHeadTags(template);
  const withInjectedHead = withCleanHead.replace(
    "</head>",
    `${routeHead(route)}\n  </head>`
  );

  if (route.path === "/") {
    await fs.writeFile(path.join(DIST_DIR, "index.html"), withInjectedHead, "utf8");
    return;
  }

  const routeDir = path.join(DIST_DIR, route.path.replace(/^\//, ""));
  await fs.mkdir(routeDir, { recursive: true });
  await fs.writeFile(path.join(routeDir, "index.html"), withInjectedHead, "utf8");
}

async function main() {
  const indexPath = path.join(DIST_DIR, "index.html");
  const template = await fs.readFile(indexPath, "utf8");

  for (const route of ROUTES) {
    await writeRouteHtml(route, template);
  }

  console.log(`Pre-rendered SEO HTML for ${ROUTES.length} public routes.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
