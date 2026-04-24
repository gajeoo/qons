import { chromium } from "playwright";

async function takeScreenshots() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  const baseUrl = "http://localhost:4173";

  // 1. Landing page
  await page.goto(baseUrl);
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: "/work/temp/ss-landing.png", fullPage: false });
  console.log("✓ Landing page");

  // 2. Pricing page
  await page.goto(`${baseUrl}/pricing`);
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: "/work/temp/ss-pricing.png", fullPage: false });
  console.log("✓ Pricing page");

  // 3. Contact page
  await page.goto(`${baseUrl}/contact`);
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: "/work/temp/ss-contact.png", fullPage: false });
  console.log("✓ Contact page");

  // 4. Login page
  await page.goto(`${baseUrl}/login`);
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: "/work/temp/ss-login.png", fullPage: false });
  console.log("✓ Login page");

  await browser.close();
  console.log("\n✅ All screenshots saved to /work/temp/");
}

takeScreenshots().catch(console.error);
