import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { test, expect, type APIRequestContext, type Page } from "@playwright/test";

const API = process.env.MM_API_URL || "http://localhost:8000";
const WIDTHS = [320, 375, 414, 768, 1024, 1280, 1440, 1920];
const LONG_PROPERTY =
  "Demonstration Property Name That Is Intentionally Extremely Long to Exercise Responsive Layouts and Wrapping Across the Entire Application";
const LONG_ROOM =
  "Extremely Long Room Name for Responsive Layout, With Multiple Words and Additional Descriptive Information";
const HEIGHT = 900;

type Box = { x: number; y: number; width: number; height: number };
type Finding = {
  category: string;
  message: string;
  first: { selector: string; rect: Box } | null;
  second: { selector: string; rect: Box } | null;
};
type PageFailure = {
  route: string;
  width: number;
  theme: string;
  scenario: string;
  findings: Finding[];
};

async function postJson<T>(
  request: APIRequestContext,
  route: string,
  body?: unknown,
): Promise<T> {
  const response = await request.post(`${API}/api${route}`, {
    data: body,
    failOnStatusCode: false,
  });
  expect(response.ok(), `${route} returned ${response.status()}: ${await response.text()}`).toBeTruthy();
  return (await response.json()) as T;
}

async function patchJson<T>(
  request: APIRequestContext,
  route: string,
  body: unknown,
): Promise<T> {
  const response = await request.patch(`${API}/api${route}`, {
    data: body,
    failOnStatusCode: false,
  });
  expect(response.ok(), `${route} returned ${response.status()}: ${await response.text()}`).toBeTruthy();
  return (await response.json()) as T;
}

async function getJson<T>(request: APIRequestContext, route: string): Promise<T> {
  const response = await request.get(`${API}/api${route}`, { failOnStatusCode: false });
  expect(response.ok(), `${route} returned ${response.status()}: ${await response.text()}`).toBeTruthy();
  return (await response.json()) as T;
}

async function makeShortWebm(page: Page): Promise<Buffer> {
  const base64 = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 240;
    const context = canvas.getContext("2d");
    if (!context || !("MediaRecorder" in window)) {
      throw new Error("This browser cannot create a test video.");
    }

    const stream = canvas.captureStream(12);
    const recorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp8" });
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data);
    };
    const stopped = new Promise<Blob>((resolve, reject) => {
      recorder.onerror = () => reject(new Error("Could not encode the layout audit video."));
      recorder.onstop = () => resolve(new Blob(chunks, { type: "video/webm" }));
    });

    recorder.start();
    const started = performance.now();
    await new Promise<void>((resolve) => {
      const paint = () => {
        const elapsed = performance.now() - started;
        context.fillStyle = "#eaf3f1";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = "#0f766e";
        context.fillRect((elapsed / 5) % 260, 70, 60, 80);
        if (elapsed < 1400) requestAnimationFrame(paint);
        else resolve();
      };
      requestAnimationFrame(paint);
    });
    recorder.stop();
    const blob = await stopped;
    for (const track of stream.getTracks()) track.stop();
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
  });
  return Buffer.from(base64, "base64");
}

async function prepareRoutes(page: Page, request: APIRequestContext) {
  const seed = await postJson<{
    property_id: string;
    room_ids: string[];
    guest_token: string;
  }>(request, "/dev/seed");
  const propertyId = seed.property_id;
  const roomId = seed.room_ids[0];
  expect(propertyId).toBeTruthy();
  expect(roomId).toBeTruthy();
  expect(seed.guest_token).toBeTruthy();

  const inspection = await postJson<{ id: string }>(
    request,
    `/properties/${propertyId}/inspections`,
    { kind: "after_checkout", inspector: "Layout audit" },
  );
  const detail = await getJson<{
    rooms: Array<{ items: Array<{ id: string }> }>;
  }>(request, `/inspections/${inspection.id}`);
  const inspectionItemId = detail.rooms.flatMap((room) => room.items)[0]?.id;
  expect(inspectionItemId, "Seeded inspection should contain an item").toBeTruthy();
  const marked = await patchJson<{ discrepancy_id: string | null }>(
    request,
    `/inspection-items/${inspectionItemId}`,
    { result: "not_seen", actor: "Layout audit", role: "host" },
  );
  expect(marked.discrepancy_id, "Marking an item not seen should create a case").toBeTruthy();

  const audit = await postJson<{ id: string }>(request, `/properties/${propertyId}/audits`);
  const video = await makeShortWebm(page);
  const upload = await request.post(
    `${API}/api/audits/${audit.id}/rooms/${roomId}/video`,
    {
      multipart: {
        file: { name: "layout-audit.webm", mimeType: "video/webm", buffer: video },
      },
    },
  );
  expect(upload.ok(), `Video upload returned ${upload.status()}: ${await upload.text()}`).toBeTruthy();
  await postJson(request, `/audits/${audit.id}/run`);

  return {
    propertyId,
    roomId,
    inspectionId: inspection.id,
    caseId: marked.discrepancy_id,
    auditId: audit.id,
    guestToken: seed.guest_token,
  };
}

function routesFor(ids: Awaited<ReturnType<typeof prepareRoutes>>) {
  const withRoles = (route: string) => [
    `${route}?role=host`,
    `${route}?role=cleaner`,
  ];
  return [
    "/",
    "/start?role=host",
    "/start?role=cleaner",
    "/properties?role=host",
    "/properties?role=cleaner",
    ...withRoles(`/properties/${ids.propertyId}`),
    ...withRoles(`/properties/${ids.propertyId}/rooms/${ids.roomId}`),
    ...withRoles(`/properties/${ids.propertyId}/cases`),
    ...withRoles(`/cases/${ids.caseId}`),
    ...withRoles(`/inspection/${ids.inspectionId}`),
    ...withRoles(`/inspection/${ids.inspectionId}/readiness`),
    ...withRoles(`/audit/${ids.auditId}`),
    "/cleaner?role=host",
    "/cleaner?role=cleaner",
    `/g/${ids.guestToken}`,
  ];
}

async function inspectPage(
  page: Page,
  route: string,
  width: number,
  theme: string,
  scenario: string,
): Promise<Finding[]> {
  await page.setViewportSize({ width, height: HEIGHT });
  const targetUrl = new URL(route, process.env.MM_BASE_URL || "http://localhost:3000");
  const currentUrl = new URL(page.url() === "about:blank" ? targetUrl.href : page.url());
  if (currentUrl.origin !== targetUrl.origin ||
    currentUrl.pathname !== targetUrl.pathname || currentUrl.search !== targetUrl.search) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(300);
  }
  await page.evaluate(({ mode, textScenario }) => {
    document.documentElement.classList.toggle("dark", mode === "dark");
    document.documentElement.style.colorScheme = mode;
    document.documentElement.style.fontSize = textScenario === "200%-text" ? "200%" : "";
  }, { mode: theme, textScenario: scenario });

  return page.evaluate(async ({ routePath }) => {
    type Entry = {
      selector: string;
      rect: { x: number; y: number; width: number; height: number };
      element: Element;
    };
    type Result = {
      category: string;
      message: string;
      first: { selector: string; rect: Entry["rect"] } | null;
      second: { selector: string; rect: Entry["rect"] } | null;
    };
    const failures: Result[] = [];
    const seen = new Set<string>();
    const selectorPath = (element: Element | null): string => {
      if (!element) return "<none>";
      const parts: string[] = [];
      let node: Element | null = element;
      while (node && parts.length < 6) {
        let part = node.tagName.toLowerCase();
        if (node.id) {
          part += `#${CSS.escape(node.id)}`;
          parts.unshift(part);
          break;
        }
        const classes = [...node.classList].slice(0, 2);
        if (classes.length) part += `.${classes.map(CSS.escape).join(".")}`;
        const parent: Element | null = node.parentElement;
        if (parent) {
          const siblings = [...parent.children].filter((child) => child.tagName === node?.tagName);
          if (siblings.length > 1) part += `:nth-of-type(${siblings.indexOf(node) + 1})`;
        }
        parts.unshift(part);
        node = parent;
      }
      return parts.join(" > ");
    };
    const box = (rect: DOMRect) => ({
      x: Math.round(rect.x * 10) / 10,
      y: Math.round(rect.y * 10) / 10,
      width: Math.round(rect.width * 10) / 10,
      height: Math.round(rect.height * 10) / 10,
    });
    const add = (
      category: string,
      message: string,
      first: Entry | null,
      second: Entry | null,
    ) => {
      const key = `${category}|${message}|${first?.selector}|${second?.selector}`;
      if (seen.has(key)) return;
      seen.add(key);
      failures.push({
        category,
        message,
        first: first ? { selector: first.selector, rect: first.rect } : null,
        second: second ? { selector: second.selector, rect: second.rect } : null,
      });
    };
    const isAllowed = (element: Element | null, attribute: string) =>
      Boolean(element?.closest(`[${attribute}]`));
    const visible = (element: Element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" &&
        Number(style.opacity) > 0 && rect.width > 1 && rect.height > 1;
    };
    const entryFor = (element: Element, rect: DOMRect): Entry => ({
      selector: selectorPath(element),
      rect: box(rect),
      element,
    });
    const clippedTextRect = (rect: DOMRect, element: Element) => {
      let left = Math.max(0, rect.left);
      let top = Math.max(0, rect.top);
      let right = Math.min(window.innerWidth, rect.right);
      let bottom = Math.min(window.innerHeight, rect.bottom);
      let ancestor: Element | null = element;
      while (ancestor && ancestor !== document.body) {
        const style = getComputedStyle(ancestor);
        const bounds = ancestor.getBoundingClientRect();
        const htmlElement = ancestor as HTMLElement;
        const clipLeft = bounds.left + htmlElement.clientLeft;
        const clipTop = bounds.top + htmlElement.clientTop;
        if (["hidden", "clip", "auto", "scroll"].includes(style.overflowX)) {
          left = Math.max(left, clipLeft);
          right = Math.min(right, clipLeft + htmlElement.clientWidth);
        }
        if (["hidden", "clip", "auto", "scroll"].includes(style.overflowY)) {
          top = Math.max(top, clipTop);
          bottom = Math.min(bottom, clipTop + htmlElement.clientHeight);
        }
        ancestor = ancestor.parentElement;
      }
      return { x: left, y: top, width: Math.max(0, right - left), height: Math.max(0, bottom - top) };
    };
    const scrollHeight = Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight,
    );
    const scrollWidth = document.documentElement.scrollWidth;
    const clientWidth = document.documentElement.clientWidth;
    if (scrollWidth > clientWidth) {
      const offenders = [...document.querySelectorAll("body *")]
        .map((element) => ({ element, rect: element.getBoundingClientRect() }))
        .filter(({ rect }) => rect.right > clientWidth + 1)
        .sort((a, b) => b.rect.right - a.rect.right);
      const offender = offenders[0];
      add(
        "horizontal-overflow",
        `documentElement.scrollWidth ${scrollWidth} > clientWidth ${clientWidth}`,
        entryFor(document.documentElement, document.documentElement.getBoundingClientRect()),
        offender ? entryFor(offender.element, offender.rect) : null,
      );
    }

    for (const element of document.querySelectorAll<HTMLElement>("body *")) {
      if (!visible(element) || isAllowed(element, "data-allow-clip") ||
        element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement ||
        element instanceof HTMLSelectElement) continue;
      const style = getComputedStyle(element);
      const clipping = ["hidden", "clip"].includes(style.overflowX) ||
        style.textOverflow === "ellipsis";
      if (clipping && element.scrollWidth > element.clientWidth + 1) {
        const rect = element.getBoundingClientRect();
        add(
          "clipped-content",
          `scrollWidth ${element.scrollWidth} > clientWidth ${element.clientWidth}`,
          entryFor(element, rect),
          null,
        );
      }
    }

    const maxScroll = Math.max(0, scrollHeight - window.innerHeight);
    const scrollPositions = Array.from(
      new Set([0, ...Array.from(
        { length: Math.ceil(maxScroll / (window.innerHeight * 0.75)) },
        (_, index) => Math.min(maxScroll, Math.round((index + 1) * window.innerHeight * 0.75)),
      ), maxScroll]),
    );
    for (const y of scrollPositions) {
      window.scrollTo({ top: y, behavior: "instant" });
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

      const regions: Entry[] = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const text = walker.currentNode as Text;
        if (!text.data.trim() || !text.parentElement ||
          text.parentElement.closest("[aria-hidden='true']") ||
          !visible(text.parentElement)) continue;
        const range = document.createRange();
        range.selectNodeContents(text);
        for (const rect of range.getClientRects()) {
          const clipped = clippedTextRect(rect, text.parentElement);
          if (clipped.width > 0 && clipped.height > 0) {
            regions.push({
              selector: selectorPath(text.parentElement),
              rect: {
                x: Math.round(clipped.x * 10) / 10,
                y: Math.round(clipped.y * 10) / 10,
                width: Math.round(clipped.width * 10) / 10,
                height: Math.round(clipped.height * 10) / 10,
              },
              element: text.parentElement,
            });
          }
        }
      }

      const controls = [...document.querySelectorAll("button, a[href], input, select, textarea, [role=button]")]
        .filter(visible)
        .flatMap((element) => [...element.getClientRects()]
          .filter((rect) => rect.width > 0 && rect.height > 0)
          .map((rect) => entryFor(element, rect)));
      const coveredTargets = [...regions, ...controls];
      for (const target of coveredTargets) {
        const rect = target.rect;
        const insetX = Math.min(3, rect.width / 4);
        const insetY = Math.min(3, rect.height / 4);
        const points = [
          [rect.x + rect.width / 2, rect.y + rect.height / 2],
          [rect.x + rect.width / 2, rect.y + insetY],
          [rect.x + rect.width / 2, rect.y + rect.height - insetY],
          [rect.x + insetX, rect.y + rect.height / 2],
          [rect.x + rect.width - insetX, rect.y + rect.height / 2],
        ];
        for (const [x, y] of points) {
          if (x < 0 || y < 0 || x >= window.innerWidth || y >= window.innerHeight) continue;
          const top = document.elementFromPoint(x, y);
          if (top && !target.element.contains(top) && !top.contains(target.element) &&
            !isAllowed(top, "data-allow-overlap")) {
            add(
              "covered-content",
              `elementFromPoint(${Math.round(x)}, ${Math.round(y)}) is ${selectorPath(top)}`,
              target,
              entryFor(top, top.getBoundingClientRect()),
            );
            break;
          }
        }
      }

      const sortedRegions = [...regions].sort((a, b) => a.rect.x - b.rect.x);
      for (let i = 0; i < sortedRegions.length; i++) {
        const a = sortedRegions[i];
        for (let j = i + 1; j < sortedRegions.length; j++) {
          const b = sortedRegions[j];
          if (b.rect.x >= a.rect.x + a.rect.width) break;
          if (a.element.contains(b.element) || b.element.contains(a.element)) continue;
          if (isAllowed(a.element, "data-allow-overlap") ||
            isAllowed(b.element, "data-allow-overlap")) continue;
          const width = Math.max(0, Math.min(a.rect.x + a.rect.width, b.rect.x + b.rect.width) -
            Math.max(a.rect.x, b.rect.x));
          const height = Math.max(0, Math.min(a.rect.y + a.rect.height, b.rect.y + b.rect.height) -
            Math.max(a.rect.y, b.rect.y));
          if (width * height > 2) {
            add(
              "intersecting-text",
              `text regions intersect by ${Math.round(width * height * 10) / 10}px²`,
              a,
              b,
            );
          }
        }
      }

      if (window.innerWidth < 768) {
        const tapTargets = [...document.querySelectorAll("button, a[href], [role=button], input[type=button], input[type=submit], input[type=reset]")]
          .filter(visible)
          .flatMap((element) => [...element.getClientRects()]
            .filter((rect) => rect.width > 0 && rect.height > 0)
            .map((rect) => entryFor(element, rect)));
        for (const target of tapTargets) {
          if (target.rect.width < 44 || target.rect.height < 44) {
            add(
              "small-tap-target",
              `target is ${target.rect.width}×${target.rect.height}px (minimum 44×44px)`,
              target,
              null,
            );
          }
        }
      }

      if (y === maxScroll) {
        const bars = [...document.querySelectorAll<HTMLElement>("body *")].filter((element) => {
          if (!visible(element)) return false;
          const position = getComputedStyle(element).position;
          return position === "fixed" || position === "sticky";
        });
        for (const bar of bars) {
          if (isAllowed(bar, "data-allow-overlap")) continue;
          const barRect = bar.getBoundingClientRect();
          for (const target of coveredTargets) {
            if (bar === target.element || bar.contains(target.element)) continue;
            const targetRect = target.rect;
            const atDocumentEnd = targetRect.y + y + targetRect.height > scrollHeight - 24;
            const overlaps = targetRect.x < barRect.right && targetRect.x + targetRect.width > barRect.left &&
              targetRect.y < barRect.bottom && targetRect.y + targetRect.height > barRect.top;
            if (atDocumentEnd && overlaps && !isAllowed(bar, "data-allow-overlap")) {
              add(
                "fixed-bar-covers-end",
                "A fixed or sticky bar covers content in the final 24px of the document.",
                target,
                entryFor(bar, barRect),
              );
            }
          }
        }
      }
    }

    window.scrollTo({ top: 0, behavior: "instant" });
    return failures.map(({ category, message, first, second }) => ({
      category,
      message: `${routePath}: ${message}`,
      first,
      second,
    }));
  }, { routePath: route.split("?")[0] });
}

test("audits layout across routes, viewports, themes, and stress data", async ({ page, request }) => {
  test.setTimeout(30 * 60 * 1000);
  const ids = await prepareRoutes(page, request);
  const routes = routesFor(ids);
  const scenarios = ["default", "200%-text", "long-names"];
  const failures: PageFailure[] = [];
  const failureDirectory = path.resolve("e2e/failures");
  if (existsSync(failureDirectory)) {
    for (const file of readdirSync(failureDirectory)) {
      if (file.endsWith(".png") || file === "layout-report.json") {
        rmSync(path.join(failureDirectory, file), { force: true });
      }
    }
  }
  mkdirSync(failureDirectory, { recursive: true });

  for (const scenario of scenarios) {
    if (scenario === "long-names") {
      await patchJson(request, `/properties/${ids.propertyId}`, { name: LONG_PROPERTY });
      await patchJson(request, `/rooms/${ids.roomId}`, { name: LONG_ROOM });
    }
    for (const route of routes) {
      for (const width of WIDTHS) {
        for (const theme of ["light", "dark"]) {
          const found = await inspectPage(page, route, width, theme, scenario);
          if (found.length) {
            failures.push({ route, width, theme, scenario, findings: found });
            const basename = [
              route.replace(/[^\w-]+/g, "_").slice(1) || "home",
              width,
              theme,
              scenario,
            ].join("-");
            await page.screenshot({
              path: path.join(failureDirectory, `${basename}.png`),
              fullPage: true,
            });
          }
        }
      }
    }
  }

  const grouped = failures.reduce<Record<string, PageFailure[]>>((groups, failure) => {
    (groups[failure.route] ??= []).push(failure);
    return groups;
  }, {});
  const report = JSON.stringify(grouped, null, 2);
  writeFileSync(path.join(failureDirectory, "layout-report.json"), report);
  console.log(`LAYOUT_AUDIT_FAILURES=${failures.reduce((count, item) => count + item.findings.length, 0)}`);
  console.log(`LAYOUT_AUDIT_REPORT_BY_ROUTE=${report}`);
  if (failures.length === 0) {
    await patchJson(request, `/properties/${ids.propertyId}`, { name: "Demo loft (seeded)" });
    await patchJson(request, `/rooms/${ids.roomId}`, { name: "Living room" });
    const screenshotsDirectory = path.resolve("e2e/screenshots/final");
    mkdirSync(screenshotsDirectory, { recursive: true });
    const screenshotRoutes = [
      { name: "landing", route: "/" },
      { name: "property", route: `/properties/${ids.propertyId}?role=host` },
      { name: "inspection", route: `/inspection/${ids.inspectionId}?role=host` },
      { name: "guest", route: `/g/${ids.guestToken}` },
    ];
    for (const screen of screenshotRoutes) {
      for (const width of [375, 1440]) {
        await page.setViewportSize({ width, height: HEIGHT });
        for (const theme of ["light", "dark"]) {
          await page.goto(screen.route, { waitUntil: "domcontentloaded" });
          await page.waitForTimeout(500);
          await page.evaluate((mode) => {
            document.documentElement.classList.toggle("dark", mode === "dark");
            document.documentElement.style.colorScheme = mode;
          }, theme);
          await page.screenshot({
            path: path.join(screenshotsDirectory, `${screen.name}-${width}-${theme}.png`),
            fullPage: true,
          });
        }
      }
    }
  }
  expect(failures, "Layout audit must report zero failures").toEqual([]);
});
