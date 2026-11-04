import { test, expect } from "@playwright/test";

test("bbox overlay aligns to displayed image at 375px and 1440px", async ({ page }) => {
  for (const width of [375, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/bbox-test");
    const imgEl = page.locator('[data-testid="bbox-image"]').first();
    await expect(imgEl).toBeVisible();
    const imgBox = await imgEl.boundingBox();
    expect(imgBox).toBeTruthy();
    const boxEl = page.locator('[data-testid="bbox-box"]').first();
    await expect(boxEl).toBeVisible();
    const box = await boxEl.boundingBox();
    expect(box).toBeTruthy();
    expect(Math.abs(box!.x - (imgBox!.x + imgBox!.width * 0.1))).toBeLessThan(2);
    expect(Math.abs(box!.y - (imgBox!.y + imgBox!.height * 0.1))).toBeLessThan(2);
    expect(Math.abs(box!.width - imgBox!.width * 0.2)).toBeLessThan(2);
    expect(Math.abs(box!.height - imgBox!.height * 0.2)).toBeLessThan(2);
    const badge = boxEl.locator("button");
    const badgeBox = await badge.boundingBox();
    expect(badgeBox!.width).toBe(22);
    expect(badgeBox!.height).toBe(22);
    expect(Math.abs(badgeBox!.x - (box!.x + 4))).toBeLessThan(3);
  }
});
