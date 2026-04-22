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
    title: "Pressure Washer Nozzle Size Calculator | PressureCal",
    description:
      "Calculate the correct pressure washer nozzle size using PSI and GPM. Get accurate tip sizing for optimal performance, cleaning power, and equipment protection.",
    schema: {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "Pressure Washer Nozzle Size Calculator",
      url: `${SITE_URL}/nozzle-size-calculator`,
      applicationCategory: "Calculator",
      operatingSystem: "Web",
      isAccessibleForFree: true,
      description:
        "Calculate the correct pressure washer nozzle size using PSI and GPM. Get accurate tip sizing for optimal performance, cleaning power, and equipment protection.",
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
    path: "/lpm-gpm-calculator",
    title: "LPM to GPM Calculator | PressureCal",
    description:
      "Convert LPM to GPM and GPM to LPM instantly. Accurate flow rate calculator for pressure washers, pumps, and equipment sizing.",
    schema: {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "LPM to GPM Calculator",
      url: `${SITE_URL}/lpm-gpm-calculator`,
      applicationCategory: "Calculator",
      operatingSystem: "Web",
      isAccessibleForFree: true,
      description:
        "Convert LPM to GPM and GPM to LPM instantly. Accurate flow rate calculator for pressure washers, pumps, and equipment sizing.",
    },
  },
  {
    path: "/nozzle-size-chart",
    title: "Pressure Washer Nozzle Size Chart (PSI & LPM) | PressureCal",
    description:
      "View a complete pressure washer nozzle size chart based on PSI and LPM. Quickly find the correct nozzle size for your setup.",
    schema: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "Pressure Washer Nozzle Size Chart",
      url: `${SITE_URL}/nozzle-size-chart`,
      description:
        "Pressure washer nozzle size chart for matching machine pressure and flow to the correct tip code.",
    },
  },
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