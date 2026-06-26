import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const distDir = path.join(root, "dist");
const sharedDirs = ["icons", "popup", "src"];
const targets = new Set(["firefox", "chrome"]);

function assertTarget(target) {
  if (!targets.has(target)) throw new Error(`Unknown target "${target}". Use firefox or chrome.`);
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, "utf8"));
}

async function pathExists(file) {
  try {
    await fs.access(file);
    return true;
  } catch (_error) {
    return false;
  }
}

async function copySharedFiles(outputDir) {
  await fs.rm(outputDir, { recursive: true, force: true });
  await fs.mkdir(outputDir, { recursive: true });
  for (const dir of sharedDirs) {
    await fs.cp(path.join(root, dir), path.join(outputDir, dir), { recursive: true });
  }
}

function chromeManifest(source) {
  const manifest = structuredClone(source);
  delete manifest.browser_specific_settings;
  manifest.background = { service_worker: "src/background-worker.js" };
  manifest.action.default_icon = {
    16: "icons/icon16.png",
    32: "icons/icon32.png"
  };
  return manifest;
}

async function writeChromeWorker(outputDir) {
  const worker = [
    'importScripts("api.js");',
    'importScripts("messages.js");',
    'importScripts("key-combo.js");',
    'importScripts("targeting.js");',
    'importScripts("storage.js");',
    'importScripts("background.js");',
    ""
  ].join("\n");
  await fs.writeFile(path.join(outputDir, "src", "background-worker.js"), worker);
}

async function build(target) {
  assertTarget(target);
  const outputDir = path.join(distDir, target);
  const sourceManifest = await readJson(path.join(root, "manifest.json"));
  const manifest = target === "chrome" ? chromeManifest(sourceManifest) : sourceManifest;
  await copySharedFiles(outputDir);
  if (target === "chrome") await writeChromeWorker(outputDir);
  await fs.writeFile(path.join(outputDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  await validateDirectory(outputDir);
}

function collectManifestFiles(manifest) {
  const files = new Set();
  const add = (value) => {
    if (!value) return;
    if (typeof value === "string") files.add(value);
    else if (Array.isArray(value)) value.forEach(add);
    else if (typeof value === "object") Object.values(value).forEach(add);
  };
  add(manifest.action?.default_popup);
  add(manifest.action?.default_icon);
  add(manifest.background?.scripts);
  add(manifest.background?.service_worker);
  for (const contentScript of manifest.content_scripts || []) {
    add(contentScript.js);
    add(contentScript.css);
  }
  return [...files].sort();
}

async function validateDirectory(directory) {
  const manifest = await readJson(path.join(directory, "manifest.json"));
  const files = collectManifestFiles(manifest);
  const missing = [];
  for (const file of files) {
    if (!(await pathExists(path.join(directory, file)))) missing.push(file);
  }
  if (missing.length) throw new Error(`Missing manifest files in ${directory}: ${missing.join(", ")}`);
}

async function validate(target) {
  if (target === "source") {
    await validateDirectory(root);
    return;
  }
  assertTarget(target);
  const outputDir = path.join(distDir, target);
  if (!(await pathExists(outputDir))) await build(target);
  else await validateDirectory(outputDir);
}

async function listFiles(directory, base = directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listFiles(absolute, base));
    } else if (entry.isFile()) {
      files.push(path.relative(base, absolute).split(path.sep).join("/"));
    }
  }
  return files.sort();
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let index = 0; index < 8; index += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function u16(value) {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(value);
  return buffer;
}

function u32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(value >>> 0);
  return buffer;
}

async function zipDirectory(sourceDir, zipPath) {
  const files = await listFiles(sourceDir);
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const file of files) {
    const name = Buffer.from(file);
    const data = await fs.readFile(path.join(sourceDir, file));
    const crc = crc32(data);
    const localHeader = Buffer.concat([
      u32(0x04034b50),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(33),
      u32(crc),
      u32(data.length),
      u32(data.length),
      u16(name.length),
      u16(0),
      name
    ]);
    localParts.push(localHeader, data);

    const centralHeader = Buffer.concat([
      u32(0x02014b50),
      u16(20),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(33),
      u32(crc),
      u32(data.length),
      u32(data.length),
      u16(name.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(offset),
      name
    ]);
    centralParts.push(centralHeader);
    offset += localHeader.length + data.length;
  }

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = Buffer.concat([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(files.length),
    u16(files.length),
    u32(centralSize),
    u32(offset),
    u16(0)
  ]);
  await fs.mkdir(path.dirname(zipPath), { recursive: true });
  await fs.writeFile(zipPath, Buffer.concat([...localParts, ...centralParts, end]));
}

async function packageTarget(target) {
  assertTarget(target);
  await build(target);
  const manifest = await readJson(path.join(distDir, target, "manifest.json"));
  const zipPath = path.join(distDir, `firebinds-${target}-${manifest.version}.zip`);
  await zipDirectory(path.join(distDir, target), zipPath);
  console.log(zipPath);
}

async function main() {
  const [command, target] = process.argv.slice(2);
  if (command === "build") await build(target);
  else if (command === "package") await packageTarget(target);
  else if (command === "validate") await validate(target);
  else throw new Error("Use: node scripts/build.mjs build|package|validate <source|firefox|chrome>");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
