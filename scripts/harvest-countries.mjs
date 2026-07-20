/**
 * Pre-fill the professor email cache for the priority countries by repeatedly
 * calling the /api/admin/harvest endpoint until each country is exhausted.
 *
 *   BASE_URL=https://scholar-bridge-ai.vercel.app \
 *   HARVEST_SECRET=your_secret \
 *   node scripts/harvest-countries.mjs
 *
 * Set HARVEST_SECRET as an env var on the deployment too (must match).
 * Optional: PAGES=200 to cap pages per country; COUNTRIES="cn,jp,kr,tw,sg".
 */
const BASE = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const SECRET = process.env.HARVEST_SECRET || "";
const PAGES = Number(process.env.PAGES) || 400;
const COUNTRIES = (process.env.COUNTRIES || "cn,jp,kr,tw,sg").split(",").map((c) => c.trim()).filter(Boolean);

if (!SECRET) { console.error("Set HARVEST_SECRET (must match the deployment)."); process.exit(1); }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function crawl(country) {
  let cursor = "*";
  let page = 0;
  let stored = 0;
  let processed = 0;
  while (cursor && page < PAGES) {
    let res;
    try {
      res = await fetch(`${BASE}/api/admin/harvest`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-harvest-secret": SECRET },
        body: JSON.stringify({ country, cursor }),
      });
    } catch (e) {
      console.error(`  network error, retrying in 5s: ${e.message}`);
      await sleep(5000);
      continue;
    }
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      console.error(`  ${country} page ${page}: HTTP ${res.status} ${t.slice(0, 120)}`);
      await sleep(3000);
      continue;
    }
    const j = await res.json();
    stored += j.stored || 0;
    processed += j.processed || 0;
    page += 1;
    cursor = j.next;
    process.stdout.write(`\r  ${country}: page ${page} · ${processed} papers · ${stored} emails cached   `);
    if (!j.processed) break;
    await sleep(300); // be polite to OpenAlex + the server
  }
  console.log(`\n  ${country} done: ${stored} emails from ${processed} papers.`);
}

(async () => {
  for (const c of COUNTRIES) {
    console.log(`\n=== Crawling ${c.toUpperCase()} ===`);
    await crawl(c);
  }
  console.log("\nAll priority countries processed.");
})();
