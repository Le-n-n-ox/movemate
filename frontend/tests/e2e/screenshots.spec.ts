import { test, expect } from "@playwright/test";

const API = "http://localhost:8000";

async function seed(page: any) {
  const res = await page.request.post(`${API}/api/dev/seed`);
  expect(res.ok()).toBeTruthy();
  return (await res.json()) as { property_id: string };
}

async function json<T>(page: any, path: string): Promise<T> {
  const res = await page.request.get(`${API}/api${path}`);
  expect(res.ok()).toBeTruthy();
  return (await res.json()) as T;
}

test("screenshot every screen at 375 px", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("domcontentloaded");

  const { property_id } = await seed(page);

  const property: any = await json(page, `/properties/${property_id}`);
  const room_id = property.rooms?.[0]?.id;
  const audit_id = property.latest_audit_id;
  const inspection_id = property.latest_inspection_id;

  // Create an audit so the audit screen can be screenshot.
  let created_audit_id: string | null = null;
  if (property_id) {
    const ar = await page.request.post(`${API}/api/properties/${property_id}/audits`);
    if (ar.ok()) created_audit_id = (await ar.json()) as { id: string };
  }

  const inspections: any = await json(page, `/properties/${property_id}/inspections`);
  const inspection_for_readiness = inspections[0]?.id ?? inspection_id;

  const cases: any = await json(page, `/properties/${property_id}/discrepancies`);
  const case_id = cases[0]?.id;

  const screens: Array<{ name: string; path: string }> = [
    { name: "00-landing", path: "/" },
    { name: "01-properties", path: "/properties" },
    { name: "02-property", path: `/properties/${property_id}` },
    ...(room_id ? [{ name: "03-room", path: `/properties/${property_id}/rooms/${room_id}` }] : []),
    ...(created_audit_id ? [{ name: "04-audit", path: `/audit/${created_audit_id}` }] : []),
    ...(inspection_id ? [{ name: "05-inspection", path: `/inspection/${inspection_id}` }] : []),
    ...(inspection_for_readiness ? [{ name: "06-readiness", path: `/inspection/${inspection_for_readiness}/readiness` }] : []),
    ...(case_id ? [{ name: "07-cases", path: `/properties/${property_id}/cases` }] : []),
    ...(case_id ? [{ name: "08-case-detail", path: `/cases/${case_id}` }] : []),
    { name: "09-guest", path: "/g/demo-guest" },
  ];

  for (const screen of screens) {
    await page.goto(screen.path);
    // `networkidle` never settles on the Audit route (it polls every 2s), so
    // wait for the document and a short settle instead.
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1200);
    // Scroll the whole page so scroll-reveal sections animate in before the
    // full-page capture, otherwise they are captured at opacity 0.
    await page.evaluate(async () => {
      const step = window.innerHeight;
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 320));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(900);
    await page.screenshot({ path: `tests/e2e/screenshots/${screen.name}.png`, fullPage: true });
  }
});
