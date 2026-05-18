import { chromium } from "playwright";

const url = "http://localhost:3000/channel-desk?tab=upcoming";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

console.log("Navigating to", url);
await page.goto(url, { waitUntil: "networkidle", timeout: 120_000 });

// Wait for idea grid or empty state
await page.waitForTimeout(5000);

const thumbImgs = await page.locator('img[src*="/api/studio/thumbnails/"]').count();
const fauxOverlays = await page
  .locator("text=Preview — not generated art")
  .count()
  .catch(() => 0);

const failedThumbRequests = [];
page.on("response", (res) => {
  const u = res.url();
  if (u.includes("/api/studio/thumbnails/") && res.status() >= 400) {
    failedThumbRequests.push({ url: u, status: res.status() });
  }
});

await page.reload({ waitUntil: "networkidle", timeout: 120_000 });
await page.waitForTimeout(8000);

const thumbImgsAfter = await page.locator('img[src*="/api/studio/thumbnails/"]').count();

await page.screenshot({
  path: "/tmp/channel-desk-upcoming.png",
  fullPage: true,
});

console.log("thumbnail img tags:", thumbImgsAfter, "(before reload:", thumbImgs, ")");
console.log("failed thumb API responses:", failedThumbRequests.slice(0, 5));
console.log("screenshot: /tmp/channel-desk-upcoming.png");

await browser.close();
