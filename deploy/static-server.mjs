import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";

const root = resolve(process.env.STATIC_DIR ?? "dist");
const port = Number(process.env.STATIC_PORT ?? 3000);
const sites = parseSites(process.env.STATIC_SITES);

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

async function findFile(urlPath) {
  return findFileInRoot(root, urlPath);
}

async function findFileInRoot(siteRoot, urlPath) {
  const decodedPath = decodeURIComponent(urlPath.split("?")[0] ?? "/");
  const cleanPath = normalize(decodedPath).replace(/^(\.\.[/\\])+/, "");
  const requested = resolve(join(siteRoot, cleanPath));

  if (!requested.startsWith(siteRoot)) {
    return null;
  }

  try {
    const info = await stat(requested);
    if (info.isFile()) return requested;
  } catch {
    // Fall through to SPA fallback.
  }

  return join(siteRoot, "index.html");
}

function parseSites(value) {
  if (!value) return [];
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [sitePort, siteRoot] = entry.split(":");
      return { port: Number(sitePort), root: resolve(siteRoot) };
    });
}

function createStaticServer(siteRoot, sitePort) {
  createServer(async (req, res) => {
    const file = await findFileInRoot(siteRoot, req.url ?? "/");

    if (!file) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    try {
      const contentType = mimeTypes[extname(file)] ?? "application/octet-stream";
      res.writeHead(200, {
        "Cache-Control": file.endsWith("index.html")
          ? "no-cache"
          : "public, max-age=31536000, immutable",
        "Content-Type": contentType,
      });
      createReadStream(file).pipe(res);
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  }).listen(sitePort, "0.0.0.0", () => {
    console.log(`Static server listening on http://0.0.0.0:${sitePort}`);
  });
}

if (sites.length > 0) {
  for (const site of sites) {
    createStaticServer(site.root, site.port);
  }
} else {
  createStaticServer(root, port);
}
