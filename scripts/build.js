import fs from "fs";
import path from "path";
import ejs from "ejs";
import http from "http";

const root = process.cwd();
const srcDir = path.join(root, "src");
const distDir = path.join(root, "dist");
const publicDir = path.join(root, "public");
const args = new Set(process.argv.slice(2));
const enableServe = args.has("--serve");
const enableWatch = args.has("--watch") || enableServe;

const dataFiles = [
  path.join(srcDir, "data", "site.json"),
  path.join(srcDir, "data", "projects.json")
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function copyDir(from, to) {
  ensureDir(to);
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const srcPath = path.join(from, entry.name);
    const destPath = path.join(to, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function render() {
  const data = {
    site: readJson(dataFiles[0]),
    projects: readJson(dataFiles[1]),
    dev: enableServe
  };

  const templates = [
    {
      templatePath: path.join(srcDir, "index.ejs"),
      outputPath: path.join(distDir, "index.html")
    },
    {
      templatePath: path.join(srcDir, "privacy.ejs"),
      outputPath: path.join(distDir, "privacy.html")
    }
  ];

  ensureDir(distDir);
  templates.forEach(({ templatePath, outputPath }) => {
    const template = fs.readFileSync(templatePath, "utf8");
    const html = ejs.render(template, data, {
      filename: templatePath
    });
    ensureDir(path.dirname(outputPath));
    fs.writeFileSync(outputPath, html);
  });
  if (fs.existsSync(publicDir)) {
    copyDir(publicDir, distDir);
  }
}

const reloadClients = new Set();
function notifyReload() {
  for (const res of reloadClients) {
    res.write("data: reload\n\n");
  }
}

function serve() {
  const server = http.createServer((req, res) => {
    if (!req.url) {
      res.writeHead(404);
      res.end();
      return;
    }
    const requestUrl = new URL(req.url, "http://localhost");
    if (requestUrl.pathname === "/__reload") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive"
      });
      res.write("\n");
      reloadClients.add(res);
      req.on("close", () => reloadClients.delete(res));
      return;
    }

    const requestedPath = requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname;
    let filePath = path.join(distDir, requestedPath);
    if (!filePath.startsWith(distDir)) {
      res.writeHead(403);
      res.end();
      return;
    }
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      const indexPath = path.join(filePath, "index.html");
      if (fs.existsSync(indexPath)) {
        filePath = indexPath;
      }
    }
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      ".html": "text/html; charset=utf-8",
      ".js": "text/javascript; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".json": "application/json; charset=utf-8",
      ".map": "application/json; charset=utf-8",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".svg": "image/svg+xml",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".ico": "image/x-icon",
      ".txt": "text/plain; charset=utf-8"
    };
    const contentType = mimeTypes[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": contentType });
    fs.createReadStream(filePath).pipe(res);
  });

  const port = 3000;
  server.listen(port, () => {
    console.log(`Dev server: http://localhost:${port}`);
  });
}

function watch() {
  const watchTargets = [srcDir, publicDir].filter((dir) => fs.existsSync(dir));
  const debounceMs = 100;
  let timer;
  for (const dir of watchTargets) {
    fs.watch(dir, { recursive: true }, () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        render();
        if (enableServe) notifyReload();
        console.log("Rebuilt.");
      }, debounceMs);
    });
  }
  console.log("Watching for changes...");
}

render();

if (enableServe) {
  serve();
}

if (enableWatch) {
  watch();
}
