import { test, expect } from "@playwright/test";
test("no horizontal overflow on property page", async ({ page }) => {
  await page.goto("/properties/bc8aca9b-5a79-40b7-a887-06af028c54a0?role=host");
  await page.waitForTimeout(2000);
  const sw = await page.evaluate(() => document.documentElement.scrollWidth);
  const iw = await page.evaluate(() => window.innerWidth);
  console.log("scrollWidth", sw, "innerWidth", iw);
  expect(sw).toBe(iw);
});
