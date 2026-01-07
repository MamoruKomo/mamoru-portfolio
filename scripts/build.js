import fs from "fs";
import path from "path";
import ejs from "ejs";

const root = process.cwd();
const srcDir = path.join(root, "src");
const distDir = path.join(root, "dist");
const publicDir = path.join(root, "public");

const dataFiles = [
  path.join(srcDir, "data", "site.json"),
  path.join(srcDir, "data", "projects.json"),
  path.join(srcDir, "data", "timeline.json")
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
    timeline: readJson(dataFiles[2])
  };

  const templatePath = path.join(srcDir, "index.ejs");
  const template = fs.readFileSync(templatePath, "utf8");
  const html = ejs.render(template, data, {
    filename: templatePath
  });

  ensureDir(distDir);
  fs.writeFileSync(path.join(distDir, "index.html"), html);
  if (fs.existsSync(publicDir)) {
    copyDir(publicDir, distDir);
  }
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
        console.log("Rebuilt.");
      }, debounceMs);
    });
  }
  console.log("Watching for changes...");
}

render();

if (process.argv.includes("--watch")) {
  watch();
}
