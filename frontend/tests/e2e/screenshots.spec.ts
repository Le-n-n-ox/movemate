import { test, expect } from "@playwright/test";

const API = "http://localhost:8000";

async function seed({ request }) {
  const res = await request.post(`${API}/dev/seed`);
  expect(res.ok()).toBeTruthy();
  return (await res.json()) as { property_id: string };
}

async function json<T>(request, path: string): Promise<T> {
  const res = await request.get(`${API}${path}`);
  expect(res.ok()).toBeTruthy();
  return (await res.json()) as T;
}

test("screenshot every screen at 375 px", async ({ request, page }) => {
  const { property_id } = await seed(request);

  const property: any = await json(request, `/properties/${property_id}`);
  const room_id = property.rooms?.[0]?.id;
  const audit_id = property.latest_audit_id;
  const inspection_id = property.latest_inspection_id;

  const inspections: any = await json(request, `/properties/${property_id}/inspections`);
  const inspection_for_readiness = inspections[0]?.id ?? inspection_id;

  const cases: any = await json(request, `/properties/${property_id}/discrepancies`);
  const case_id = cases[0]?.id;

  const screens: Array<{ name: string; path: string }> = [
    { name: "01-properties", path: "/properties" },
    { name: "02-property", path: `/properties/${property_id}` },
    ...(room_id ? [{ name: "03-room", path: `/properties/${property_id}/rooms/${room_id}` }] : []),
    ...(inspection_id ? [{ name: "04-inspection", path: `/inspection/${inspection_id}` }] : []),
    ...(inspection_for_readiness ? [{ name: "05-readiness", path: `/inspection/${inspection_for_readiness}/readiness` }] : []),
    ...(case_id ? [{ name: "06-cases", path: `/properties/${property_id}/cases` }] : []),
    ...(case_id ? [{ name: "07-case-detail", path: `/cases/${case_id}` }] : []),
    { name: "08-guest", path: "/g/demo-guest" },
    { name: "00-landing", path: "/" },
  ];

  for (const screen of screens) {
    await page.goto(screen.path);
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: `tests/e2e/screenshots/${screen.name}.png`, fullPage: true });
  }
});
