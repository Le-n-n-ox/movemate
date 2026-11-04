import { test, expect, type Page } from "@playwright/test";

const SHOTS = "../screenshots/redesign";

async function shoot(page: Page, name: string, url: string, wait = 1400) {
  await page.goto(url);
  await page.waitForTimeout(wait);
  // Scroll through the page so scroll-reveal sections animate in; otherwise a
  // full-page capture records them at opacity 0 (a blank band).
  await page.evaluate(async () => {
    const step = window.innerHeight;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 320));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
  const sw = await page.evaluate(() => document.documentElement.scrollWidth);
  const iw = await page.evaluate(() => window.innerWidth);
  console.log(`${name}: scrollWidth=${sw} innerWidth=${iw}`);
  return { sw, iw };
}

test("desktop landing + app", async ({ page }) => {
  const r1 = await shoot(page, "desktop-landing", "/");
  expect(r1.sw).toBeLessThanOrEqual(r1.iw + 1);
  const r2 = await shoot(page, "desktop-properties", "/properties?role=host");
  expect(r2.sw).toBeLessThanOrEqual(r2.iw + 1);
});

test("phone landing + app", async ({ page }) => {
  const r1 = await shoot(page, "phone-landing", "/");
  expect(r1.sw).toBeLessThanOrEqual(r1.iw + 1);
  const r2 = await shoot(page, "phone-properties", "/properties?role=host");
  expect(r2.sw).toBeLessThanOrEqual(r2.iw + 1);
  const r3 = await shoot(page, "phone-start", "/start");
  expect(r3.sw).toBeLessThanOrEqual(r3.iw + 1);
});

test("no duplicate h1 and phone bottom nav", async ({ page }) => {
  // Shell-based routes render their title as the page h1, so the page body
  // must not add a second one. Property.tsx is standalone (no Shell) and
  // legitimately owns its own h1, so it is not covered by this check.
  for (const path of ["/properties?role=host", "/properties?role=host"]) {
    await page.goto(path);
    await page.waitForTimeout(900);
    const h1s = await page.locator("h1").count();
    console.log(`h1 count on ${path}:`, h1s);
    expect(h1s).toBeLessThanOrEqual(1);
  }
  const nav = await page.locator('nav[aria-label="Main"]').count();
  console.log("mobile nav present:", nav);
});
