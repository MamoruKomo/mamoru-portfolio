import fs from "fs";
import path from "path";
import https from "https";
import { execSync } from "child_process";

const repo = process.env.GITHUB_REPOSITORY || "";
const [owner, repoName] = repo.split("/");
const issueNumber = process.env.ISSUE_NUMBER;
const issueUser = process.env.ISSUE_USER;
const issueBody = process.env.ISSUE_BODY || "";
const token = process.env.GITHUB_TOKEN;
const labels = (() => {
  try {
    return JSON.parse(process.env.ISSUE_LABELS || "[]");
  } catch {
    return [];
  }
})();

const repoRoot = process.cwd();
const sitePath = path.join(repoRoot, "src", "data", "site.json");
const projectsPath = path.join(repoRoot, "src", "data", "projects.json");

function requestJson(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const options = {
      method,
      hostname: "api.github.com",
      path: urlPath,
      headers: {
        "User-Agent": "cms-issue-bot",
        Accept: "application/vnd.github+json"
      }
    };
    if (token) {
      options.headers.Authorization = `Bearer ${token}`;
    }
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        const status = res.statusCode || 500;
        if (status >= 200 && status < 300) {
          if (!data) return resolve(null);
          try {
            resolve(JSON.parse(data));
          } catch (err) {
            reject(err);
          }
        } else {
          reject(new Error(`HTTP ${status}: ${data}`));
        }
      });
    });
    req.on("error", reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

function parseValue(raw) {
  if (raw === undefined) return null;
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed === "null") return null;
  if (/^[+-]?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
    return JSON.parse(trimmed);
  }
  if ((trimmed.startsWith("\"") && trimmed.endsWith("\"")) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseYamlBlock(bodyText) {
  const match = bodyText.match(/```yaml\s*([\s\S]*?)```/i);
  if (!match) return null;
  const lines = match[1].split(/\r?\n/);
  const result = {};
  let inChanges = false;
  let current = null;
  for (const line of lines) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    if (!inChanges && /^changes:\s*$/.test(line)) {
      inChanges = true;
      result.changes = [];
      continue;
    }
    if (!inChanges) {
      const matchKey = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
      if (!matchKey) continue;
      result[matchKey[1]] = parseValue(matchKey[2]);
      continue;
    }
    const itemMatch = line.match(/^\s*-\s*(.*)$/);
    if (itemMatch) {
      current = {};
      result.changes.push(current);
      const inline = itemMatch[1];
      if (inline) {
        const inlineMatch = inline.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
        if (inlineMatch) {
          current[inlineMatch[1]] = parseValue(inlineMatch[2]);
        }
      }
      continue;
    }
    const fieldMatch = line.match(/^\s+([A-Za-z_][\w-]*):\s*(.*)$/);
    if (fieldMatch && current) {
      current[fieldMatch[1]] = parseValue(fieldMatch[2]);
    }
  }
  return result;
}

function setByPath(target, pathString, value) {
  const parts = pathString.split(".").filter(Boolean);
  let cursor = target;
  parts.forEach((part, index) => {
    const isLast = index === parts.length - 1;
    const key = /^[0-9]+$/.test(part) ? Number(part) : part;
    if (isLast) {
      cursor[key] = value;
      return;
    }
    if (cursor[key] === undefined) {
      cursor[key] = typeof parts[index + 1] === "number" ? [] : {};
    }
    cursor = cursor[key];
  });
}

async function commentOnIssue(message) {
  if (!owner || !repoName || !issueNumber) return;
  await requestJson("POST", `/repos/${owner}/${repoName}/issues/${issueNumber}/comments`, {
    body: message
  });
}

async function hasWritePermission() {
  if (!owner || !repoName || !issueUser || !token) return false;
  const data = await requestJson(
    "GET",
    `/repos/${owner}/${repoName}/collaborators/${issueUser}/permission`
  );
  const permission = data && data.permission ? data.permission : "none";
  return ["admin", "maintain", "write"].includes(permission);
}

function validatePayload(payload) {
  const errors = [];
  if (!payload || payload.CMS_UPDATE !== true) {
    errors.push("CMS_UPDATE: true が必要です。");
  }
  if (!payload.target || !["site", "project"].includes(payload.target)) {
    errors.push("target は site または project が必要です。");
  }
  if (!Array.isArray(payload.changes)) {
    errors.push("changes は配列である必要があります。");
  }
  (payload.changes || []).forEach((change, index) => {
    if (!change.op) {
      errors.push(`changes[${index}] に op が必要です。`);
      return;
    }
    if (payload.target === "site" && change.op !== "set_site") {
      errors.push(`changes[${index}] target site では set_site のみ許可されます。`);
    }
    if (payload.target === "project" && change.op === "set_site") {
      errors.push(`changes[${index}] target project では set_site は許可されません。`);
    }
    if (change.op === "set_site") {
      if (!change.path) errors.push(`changes[${index}] path が必要です。`);
      if (change.value === undefined) errors.push(`changes[${index}] value が必要です。`);
    }
    if (change.op === "add_project") {
      if (!change.value || typeof change.value !== "object") {
        errors.push(`changes[${index}] value が必要です。`);
      } else if (!change.value.id) {
        errors.push(`changes[${index}] value.id が必要です。`);
      }
    }
    if (change.op === "update_project") {
      if (!change.id) errors.push(`changes[${index}] id が必要です。`);
      if (!change.patch || typeof change.patch !== "object") {
        errors.push(`changes[${index}] patch が必要です。`);
      }
    }
    if (change.op === "delete_project") {
      if (!change.id) errors.push(`changes[${index}] id が必要です。`);
    }
  });
  return errors;
}

function formatLog(logs) {
  return logs.map((line) => `- ${line}`).join("\n");
}

async function main() {
  const payload = parseYamlBlock(issueBody);
  if (!payload) {
    return;
  }

  const hasApproveLabel = labels.some((label) => (label.name || "") === "approve");
  const hasPermission = hasApproveLabel ? true : await hasWritePermission();

  if (!hasPermission) {
    await commentOnIssue("CMS更新: 権限が確認できないため処理をスキップしました。\n\n- 条件: COLLABORATOR(write以上) もしくは approve ラベル");
    return;
  }

  const errors = validatePayload(payload);
  if (errors.length) {
    await commentOnIssue(`CMS更新: バリデーションエラー\n\n${formatLog(errors)}`);
    return;
  }

  const siteData = JSON.parse(fs.readFileSync(sitePath, "utf8"));
  const projectsData = JSON.parse(fs.readFileSync(projectsPath, "utf8"));
  const logs = [];

  for (const change of payload.changes) {
    if (change.op === "set_site") {
      setByPath(siteData, change.path, change.value);
      logs.push(`set_site: ${change.path}`);
    }

    if (change.op === "add_project") {
      projectsData.items = projectsData.items || [];
      projectsData.items.push(change.value);
      logs.push(`add_project: ${change.value.id}`);
    }

    if (change.op === "update_project") {
      const idx = (projectsData.items || []).findIndex((item) => item.id === change.id);
      if (idx === -1) {
        logs.push(`update_project: ${change.id} (not found)`);
      } else {
        projectsData.items[idx] = { ...projectsData.items[idx], ...change.patch };
        logs.push(`update_project: ${change.id}`);
      }
    }

    if (change.op === "delete_project") {
      const before = (projectsData.items || []).length;
      projectsData.items = (projectsData.items || []).filter((item) => item.id !== change.id);
      const after = projectsData.items.length;
      logs.push(`delete_project: ${change.id} (${before - after} removed)`);
    }
  }

  fs.writeFileSync(sitePath, JSON.stringify(siteData, null, 2) + "\n");
  fs.writeFileSync(projectsPath, JSON.stringify(projectsData, null, 2) + "\n");

  execSync("node scripts/build.js", { stdio: "inherit" });

  const status = execSync("git status --porcelain").toString().trim();
  if (!status) {
    await commentOnIssue(`CMS更新: 変更なし\n\n${formatLog(logs)}`);
    return;
  }

  execSync("git config user.name \"github-actions[bot]\"");
  execSync("git config user.email \"41898282+github-actions[bot]@users.noreply.github.com\"");
  execSync("git add src/data/site.json src/data/projects.json dist/index.html dist/assets/styles.css dist/assets/main.js");
  execSync(`git commit -m "cms: update via issue #${issueNumber}"`);
  execSync("git push");

  await commentOnIssue(`CMS更新: 完了\n\n${formatLog(logs)}`);
}

main().catch(async (err) => {
  await commentOnIssue(`CMS更新: 失敗\n\n- ${err.message}`);
  process.exit(1);
});
