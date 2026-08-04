/**
 * Print cv/ali-javed-cv.html → Ali_Javed_CV.pdf at repo root.
 * Usage: node scripts/generate-cv-pdf.mjs
 */
import { createRequire } from "module";
import { pathToFileURL } from "url";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const htmlPath = path.join(root, "cv", "ali-javed-cv.html");
const outPath = path.join(root, "Ali_Javed_CV.pdf");

async function loadPlaywright() {
  try {
    return await import("playwright");
  } catch {
    console.error("playwright not found — installing temporarily…");
    const { execSync } = await import("child_process");
    execSync("npm install --no-save playwright", { cwd: root, stdio: "inherit" });
    return await import("playwright");
  }
}

async function main() {
  if (!fs.existsSync(htmlPath)) throw new Error(`Missing ${htmlPath}`);
  const { chromium } = await loadPlaywright();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "networkidle" });
  await page.pdf({
    path: outPath,
    format: "A4",
    printBackground: true,
    margin: { top: "12mm", bottom: "12mm", left: "14mm", right: "14mm" },
  });
  await browser.close();

  const require = createRequire(import.meta.url);
  const pdfParse = require("pdf-parse");
  const parsed = await pdfParse(fs.readFileSync(outPath));
  const text = parsed.text || "";
  const hasFit = /FIT\s*2026/i.test(text);
  const hasIbcast = /IBCAST/i.test(text);
  console.log(`Wrote ${outPath} (${parsed.numpages} pages, ${text.length} chars)`);
  console.log(`FIT 2026: ${hasFit ? "yes" : "NO"} · IBCAST: ${hasIbcast ? "FOUND (bad)" : "absent (ok)"}`);
  if (!hasFit || hasIbcast) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
