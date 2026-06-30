import { SITE_URL } from "@/lib/seo";
import { env } from "@07nghiep/env/candidate";

type SitemapEntry = {
  loc: string;
  lastmod?: Date | string | null;
  changefreq?: "daily" | "weekly" | "monthly";
  priority?: string;
};

const STATIC_ENTRIES: SitemapEntry[] = [
  { loc: SITE_URL, changefreq: "daily", priority: "1.0" },
  { loc: `${SITE_URL}/jobs`, changefreq: "daily", priority: "0.9" },
  { loc: `${SITE_URL}/organizations`, changefreq: "weekly", priority: "0.8" },
  { loc: `${SITE_URL}/cv-analysis`, changefreq: "monthly", priority: "0.6" },
  { loc: `${SITE_URL}/business-application`, changefreq: "monthly", priority: "0.6" },
];

const SITEMAP_CACHE_TTL_MS = 15 * 60 * 1000;

let cachedSitemap: { expiresAt: number; xml: string } | null = null;

type ServerSitemapEntry = {
  type: "job" | "organization";
  id: string;
  lastmod: string | null;
};

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function formatLastMod(value: Date | string | null | undefined) {
  if (!value) return null;

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toUrl(path: string) {
  return `${SITE_URL}${path}`;
}

function serializeSitemap(entries: SitemapEntry[]) {
  const seen = new Set<string>();
  const urls = entries.filter((entry) => {
    if (seen.has(entry.loc)) return false;
    seen.add(entry.loc);
    return true;
  });

  const body = urls
    .map((entry) => {
      const lastmod = formatLastMod(entry.lastmod);

      return [
        "  <url>",
        `    <loc>${escapeXml(entry.loc)}</loc>`,
        lastmod ? `    <lastmod>${lastmod}</lastmod>` : null,
        entry.changefreq ? `    <changefreq>${entry.changefreq}</changefreq>` : null,
        entry.priority ? `    <priority>${entry.priority}</priority>` : null,
        "  </url>",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    body,
    "</urlset>",
  ].join("\n");
}

function getServerUrl() {
  return process.env.SERVER_INTERNAL_URL || env.VITE_SERVER_URL;
}

async function getDynamicEntries(): Promise<SitemapEntry[]> {
  const response = await fetch(`${getServerUrl()}/api/seo/sitemap-entries`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Failed to load sitemap entries: ${response.status}`);
  }

  const data = (await response.json()) as { entries?: ServerSitemapEntry[] };
  const entries = data.entries ?? [];

  return entries.map((entry) => ({
    loc:
      entry.type === "job"
        ? toUrl(`/jobs/${encodeURIComponent(entry.id)}`)
        : toUrl(`/organizations/${encodeURIComponent(entry.id)}`),
    lastmod: entry.lastmod,
    changefreq: "weekly",
    priority: entry.type === "job" ? "0.8" : "0.7",
  }));
}

export function isSitemapRequest(request: Request) {
  const url = new URL(request.url);
  return url.pathname === "/sitemap.xml";
}

export async function createSitemapResponse() {
  const now = Date.now();

  if (cachedSitemap && cachedSitemap.expiresAt > now) {
    return new Response(cachedSitemap.xml, {
      headers: {
        "Cache-Control": "public, max-age=900",
        "Content-Type": "application/xml; charset=utf-8",
      },
    });
  }

  let dynamicEntries: SitemapEntry[] = [];

  try {
    dynamicEntries = await getDynamicEntries();
  } catch (error) {
    console.error(error);
  }

  const xml = serializeSitemap([...STATIC_ENTRIES, ...dynamicEntries]);
  cachedSitemap = { expiresAt: now + SITEMAP_CACHE_TTL_MS, xml };

  return new Response(xml, {
    headers: {
      "Cache-Control": "public, max-age=900",
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
}
