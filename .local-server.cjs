const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const port = Number(process.env.PORT || 8000);

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".mp4": "video/mp4",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".eot": "application/vnd.ms-fontobject",
};

function send(res, status, body, contentType = "text/plain; charset=utf-8") {
  res.writeHead(status, {
    "Content-Type": contentType,
    "Cache-Control": "no-store",
  });
  res.end(body);
}

function resolvePath(urlPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath.split("?")[0]);
  } catch {
    decoded = "/";
  }
  let filePath = path.join(root, decoded);
  if (!filePath.startsWith(root)) return null;
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, "index.html");
  }
  return filePath;
}

const server = http.createServer((req, res) => {
  const filePath = resolvePath(req.url || "/");
  if (!filePath) return send(res, 403, "Forbidden");
  fs.readFile(filePath, (err, data) => {
    if (err) {
      const fallback = path.join(root, "404.html");
      if (fs.existsSync(fallback)) {
        return send(res, 404, fs.readFileSync(fallback), "text/html; charset=utf-8");
      }
      return send(res, 404, "Not found");
    }
    send(res, 200, data, types[path.extname(filePath).toLowerCase()] || "application/octet-stream");
  });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`TradeWorks AI local server running at http://127.0.0.1:${port}/`);
});
