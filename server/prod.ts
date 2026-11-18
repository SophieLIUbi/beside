import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, sep } from "node:path";
import { handleChat } from "./chat";

const port = Number(process.env.PORT || 4173);
const publicDir = join(process.cwd(), "dist");

const types: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

function fileFor(urlPath: string): string | null {
  let decoded = urlPath;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return null;
  }
  const cleaned = normalize(decoded).replace(/^([/\\])+/, "");
  const file = join(publicDir, cleaned);
  const root = publicDir.endsWith(sep) ? publicDir : publicDir + sep;
  if (file !== publicDir && !file.startsWith(root)) return null;
  return file;
}

const server = createServer(async (req, res) => {
  const path = (req.url || "/").split("?")[0] || "/";
  if (path === "/api/health") {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ ok: true }));
    return;
  }
  if (path === "/api/chat") {
    if (req.method !== "POST") {
      res.statusCode = 405;
      res.end("Method not allowed");
      return;
    }
    try {
      await handleChat(req, res);
    } catch (err) {
      console.error(err);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify({ error: "Something went wrong on the app side." }));
      } else {
        res.end();
      }
    }
    return;
  }
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.statusCode = 405;
    res.end("Method not allowed");
    return;
  }

  const requested = path === "/" ? "/index.html" : path;
  let file = fileFor(requested);
  if (!file || !existsSync(file) || !statSync(file).isFile()) file = join(publicDir, "index.html");
  if (!existsSync(file)) {
    res.statusCode = 404;
    res.end("Not found");
    return;
  }
  res.setHeader("Content-Type", types[extname(file)] || "application/octet-stream");
  res.setHeader("Cache-Control", extname(file) === ".html" ? "no-cache" : "public, max-age=3600");
  if (req.method === "HEAD") {
    res.end();
    return;
  }
  createReadStream(file).pipe(res);
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Beside listening on ${port}`);
});
