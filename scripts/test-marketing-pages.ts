import { runTest } from "./auth";

runTest("Marketing Pages Navigation", async (helper) => {
  const { page } = helper;

  // Test Home Page
  await helper.goto("/");
  await page.waitForTimeout(2000);

  // Check hero content
  const heroHeading = await page.locator("h1").first().textContent();
  if (!heroHeading?.includes("Manual Scheduling")) {
    throw new Error(`Expected hero to mention 'Manual Scheduling', got: ${heroHeading}`);
  }

  // Check nav links exist
  for (const link of ["Features", "Pricing", "About", "Blog", "Contact"]) {
    const navLink = page.locator(`header a:has-text("${link}")`).first();
    const isVisible = await navLink.isVisible();
    if (!isVisible) {
      throw new Error(`Nav link '${link}' not visible`);
    }
  }

  // Check footer exists
  const footer = await page.locator("footer").first().isVisible();
  if (!footer) {
    throw new Error("Footer not visible on home page");
  }

  await helper.screenshot("home-test.png");

  // Test Features Page
  await helper.goto("/features");
  await page.waitForTimeout(2000);
  const featuresH1 = await page.locator("h1").first().textContent();
  if (!featuresH1?.includes("Everything")) {
    throw new Error(`Expected features heading, got: ${featuresH1}`);
  }

  // Check feature sections exist
  const featureSections = await page.locator("#ai-scheduling, #multi-property, #analytics, #mobile, #payroll, #amenity-booking, #hoa-management").count();
  if (featureSections < 7) {
    throw new Error(`Expected 7 feature sections, found ${featureSections}`);
  }

  await helper.screenshot("features-test.png");

  // Test Pricing Page
  await helper.goto("/pricing");
  await page.waitForTimeout(2000);
  const pricingH1 = await page.locator("h1").first().textContent();
  if (!pricingH1?.includes("Pricing")) {
    throw new Error(`Expected pricing heading, got: ${pricingH1}`);
  }

  // Check all 3 tiers are visible
  const starterVisible = await page.locator("text=Starter").first().isVisible();
  const proVisible = await page.locator("text=Professional").first().isVisible();
  const enterpriseVisible = await page.locator("text=Enterprise").first().isVisible();
  if (!starterVisible || !proVisible || !enterpriseVisible) {
    throw new Error("Not all pricing tiers visible");
  }

  await helper.screenshot("pricing-test.png");

  // Test About Page
  await helper.goto("/about");
  await page.waitForTimeout(2000);
  const aboutH1 = await page.locator("h1").first().textContent();
  if (!aboutH1?.includes("Property Operations")) {
    throw new Error(`Expected about heading, got: ${aboutH1}`);
  }

  // Check founder section
  const founderVisible = await page.locator("text=Ernest Owusu").first().isVisible();
  if (!founderVisible) {
    throw new Error("Founder name not visible on about page");
  }

  await helper.screenshot("about-test.png");

  // Test Contact Page
  await helper.goto("/contact");
  await page.waitForTimeout(2000);
  const contactH1 = await page.locator("h1").first().textContent();
  if (!contactH1?.includes("Talk")) {
    throw new Error(`Expected contact heading, got: ${contactH1}`);
  }

  // Check form fields exist
  const nameInput = await page.locator("#name").isVisible();
  const emailInput = await page.locator("#email").isVisible();
  if (!nameInput || !emailInput) {
    throw new Error("Contact form fields not visible");
  }

  // Test form submission
  await page.fill("#name", "Test User");
  await page.fill("#email", "test@example.com");
  await page.fill("#company", "Test Company");
  await page.fill("#message", "I want to learn more about QonsApp");
  await page.click("button[type='submit']");
  await page.waitForTimeout(1500);

  // Check success state
  const thankYou = await page.locator("text=Thank You").first().isVisible();
  if (!thankYou) {
    throw new Error("Form submission success message not shown");
  }

  await helper.screenshot("contact-test.png");

  // Test Blog Page
  await helper.goto("/blog");
  await page.waitForTimeout(2000);
  const blogH1 = await page.locator("h1").first().textContent();
  if (!blogH1?.includes("Insights")) {
    throw new Error(`Expected blog heading, got: ${blogH1}`);
  }

  // Check blog posts exist
  const blogPosts = await page.locator("article").count();
  if (blogPosts < 2) {
    throw new Error(`Expected at least 2 blog posts, found ${blogPosts}`);
  }

  await helper.screenshot("blog-test.png");

  console.log("✅ All 6 marketing pages tested successfully!");
}).catch(() => process.exit(1));
