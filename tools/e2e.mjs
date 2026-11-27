// End-to-end 2-peer WebRTC SFU verification, Jitsi UI workflow check, live E2EE, & 2x retina screenshot capture.
// Run: BASE=http://127.0.0.1:3000 node tools/e2e.mjs
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const playwrightPath =
  process.env.PLAYWRIGHT_PATH ||
  path.resolve(
    path.dirname(process.execPath),
    "../lib/node_modules/@playwright/mcp/node_modules/playwright"
  );
const { chromium } = require(playwrightPath);

const BASE = process.env.BASE || "http://127.0.0.1:3000";
const SHOT_DIR = path.resolve("docs/screenshots");

async function seedDemoRoom(payload) {
  const res = await fetch(`${BASE}/api/rooms`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  assert.equal(res.ok, true, `failed to seed demo room ${payload.name}: HTTP ${res.status}`);
}

async function ensureChromiumExecutable() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  const home = process.env.HOME || "";
  const candidates = [
    `${home}/Library/Caches/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-mac-arm64/chrome-headless-shell`,
    `${home}/Library/Caches/ms-playwright/chromium-1255/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
  ];
  for (const p of candidates) {
    try {
      await fs.access(p);
      return p;
    } catch {
      // try next
    }
  }
  return undefined;
}

await fs.mkdir(SHOT_DIR, { recursive: true });
const executablePath = await ensureChromiumExecutable();
const browser = await chromium.launch({
  headless: true,
  args: [
    "--use-fake-ui-for-media-stream",
    "--use-fake-device-for-media-stream",
    "--autoplay-policy=no-user-gesture-required",
  ],
  ...(executablePath ? { executablePath } : {}),
});

const consoleErrors = [];
const pageErrors = [];
const failedRequests = [];

function attachListeners(page, label) {
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(`[${label}] ${msg.text()}`);
  });
  page.on("pageerror", (err) => pageErrors.push(`[${label}] ${err.message}`));
  page.on("response", (res) => {
    if (res.status() >= 400) {
      failedRequests.push(`[${label}] ${res.status()} ${res.url()}`);
    }
  });
}

try {
  // Seed clean rooms first so home.png displays realistic rooms without smoke-test noise.
  await seedDemoRoom({ name: "product-standup", subject: "Product Standup" });
  await seedDemoRoom({ name: "design-review", subject: "Design Review", password: "nova-demo" });

  const room = process.env.E2E_ROOM || "weekly-standup";
  const ctxA = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    permissions: ["camera", "microphone"],
  });
  const ctxB = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    permissions: ["camera", "microphone"],
  });

  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();
  attachListeners(pageA, "Alice");
  attachListeners(pageB, "Bob");

  // 1. Capture Login page & Jitsi-style Welcome Home page
  await pageA.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await pageA.waitForTimeout(250);
  await pageA.screenshot({ path: path.join(SHOT_DIR, "login.png") });
  console.log("Captured login.png");

  await pageA.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await pageA.getByText(/2 rooms/).waitFor({ timeout: 5000 });
  await pageA.waitForTimeout(250);
  await pageA.screenshot({ path: path.join(SHOT_DIR, "home.png") });
  console.log("Captured home.png");

  // 2. Navigate to Jitsi-style Prejoin split-screen & capture
  await pageA.getByRole("textbox", { name: "Room name" }).fill(room);
  await pageA.getByRole("button", { name: "Start meeting" }).click();
  await pageA.waitForURL(`**/room/${room}`);
  await pageA.waitForFunction(() => {
    const v = document.querySelector("video");
    return Boolean(v && v.readyState >= 2 && v.videoWidth > 0);
  }, undefined, { timeout: 10000 });
  await pageA.screenshot({ path: path.join(SHOT_DIR, "prejoin.png") });
  console.log("Captured prejoin.png");

  // 3. Join both Alice & Bob -> verify str0m SFU ICE + decoded remote video + conference timer
  await pageA.getByRole("textbox", { name: "Your display name" }).fill("Alice Chen");
  await pageA.getByRole("button", { name: "Join meeting", exact: true }).click();

  await pageB.goto(`${BASE}/room/${room}`, { waitUntil: "networkidle" });
  await pageB.waitForFunction(() => {
    const v = document.querySelector("video");
    return Boolean(v && v.readyState >= 2 && v.videoWidth > 0);
  }, undefined, { timeout: 10000 });
  await pageB.getByRole("textbox", { name: "Your display name" }).fill("Bob Pratama");
  await pageB.getByRole("button", { name: "Join meeting", exact: true }).click();

  await pageA.getByTestId("ice-status").getByText(/ICE: (connected|completed)/).waitFor({ timeout: 15000 });
  await pageB.getByTestId("ice-status").getByText(/ICE: (connected|completed)/).waitFor({ timeout: 15000 });

  await pageA.waitForFunction(() => {
    const vids = Array.from(document.querySelectorAll("video"));
    return vids.length >= 2 && vids.every((v) => v.readyState >= 2 && v.videoWidth > 0);
  }, undefined, { timeout: 20000 });
  await pageB.waitForFunction(() => {
    const vids = Array.from(document.querySelectorAll("video"));
    return vids.length >= 2 && vids.every((v) => v.readyState >= 2 && v.videoWidth > 0);
  }, undefined, { timeout: 20000 });

  // Allow join toast to clear naturally so meeting-grid.png showcases the clean Jitsi stage + ConferenceInfo timer.
  await pageA.waitForTimeout(3200);
  await pageA.screenshot({ path: path.join(SHOT_DIR, "meeting-grid.png") });
  console.log("Captured meeting-grid.png (2-peer SFU connected with decoded remote video)");

  // 4. Test Chat drawer (Chat + Reply + Polls + File sharing) & Raise Hand across peers
  await pageA.getByRole("button", { name: "Chat", exact: true }).click();
  await pageA.getByPlaceholder("Type a message...").fill("SFU media looks crisp!");
  await pageA.getByRole("button", { name: "Send message" }).click();
  await pageB.getByRole("button", { name: "Chat", exact: true }).click();
  await pageB.getByText("SFU media looks crisp!").waitFor({ timeout: 8000 });

  // Open Participants right drawer briefly to confirm Jitsi dual-drawer + Breakout UI
  await pageA.getByRole("button", { name: "Participants", exact: true }).click();
  await pageA.getByRole("button", { name: "Invite Someone" }).waitFor({ timeout: 5000 });

  await pageA.getByRole("button", { name: "Polls", exact: true }).click();
  await pageA.getByPlaceholder("Ask a question...").fill("Ready for mobile UniFFI demo?");
  await pageA.getByRole("button", { name: "Create poll" }).click();
  await pageB.getByRole("button", { name: "Polls", exact: true }).click();
  await pageB.getByText("Ready for mobile UniFFI demo?").waitFor({ timeout: 8000 });
  await pageB.getByRole("button", { name: /Yes/ }).click();
  await pageA.getByText("1 (100%)").waitFor({ timeout: 8000 });

  await pageA.getByRole("button", { name: "Raise hand", exact: true }).click();
  await pageB.getByText("Hand").first().waitFor({ timeout: 8000 });

  await pageA.waitForTimeout(250);
  await pageA.screenshot({ path: path.join(SHOT_DIR, "meeting-chat-polls.png") });
  console.log("Captured meeting-chat-polls.png");
  await pageA.getByRole("button", { name: "Close participants pane" }).click();
  await pageA.getByRole("button", { name: "Close chat panel" }).click();

  // 5. File sharing API + real-time WS delivery into Files tab
  const upRes = await fetch(`${BASE}/api/rooms/${room}/files`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      filename: "sprint-notes.txt",
      mime_type: "text/plain",
      data_base64: Buffer.from("Nova sprint notes\n").toString("base64"),
      sender_name: "Alice Chen",
    }),
  });
  assert.equal(upRes.ok, true, "file upload failed");
  await pageB.getByRole("button", { name: "Files", exact: true }).click();
  await pageB.getByText("sprint-notes.txt").waitFor({ timeout: 5000 });
  console.log("Verified room file upload & WS broadcast");

  // 6. More Actions Overflow Menu -> Jitsi Tabbed Settings Modal
  await pageA.getByRole("button", { name: "More actions", exact: true }).click();
  await pageA.getByRole("button", { name: "Settings", exact: true }).click();
  await pageA.waitForTimeout(200);
  await pageA.screenshot({ path: path.join(SHOT_DIR, "meeting-settings.png") });
  console.log("Captured meeting-settings.png");
  await pageA.getByRole("button", { name: "Close settings modal" }).click();

  // 7. Collaborative Whiteboard via More Actions menu
  await pageA.getByRole("button", { name: "More actions", exact: true }).click();
  await pageA.getByRole("button", { name: "Whiteboard", exact: true }).click();
  const canvas = pageA.locator("canvas").last();
  const box = await canvas.boundingBox();
  assert.ok(box, "whiteboard canvas missing");
  await pageA.mouse.move(box.x + 120, box.y + 120);
  await pageA.mouse.down();
  await pageA.mouse.move(box.x + 320, box.y + 220, { steps: 6 });
  await pageA.mouse.move(box.x + 480, box.y + 140, { steps: 6 });
  await pageA.mouse.up();
  await pageA.waitForTimeout(300);
  await pageA.screenshot({ path: path.join(SHOT_DIR, "meeting-whiteboard.png") });
  console.log("Captured meeting-whiteboard.png");
  await pageA.getByRole("button", { name: "Close whiteboard" }).click();

  // 8. Live E2EE passphrase & WebRTC encoded transform verification (Alice & Bob)
  await pageA.getByRole("button", { name: "More actions", exact: true }).click();
  await pageA.getByRole("button", { name: "Security options", exact: true }).click();
  await pageA.getByPlaceholder("Shared E2EE key passphrase...").fill("nova-e2ee-secret");
  await pageA.getByRole("button", { name: "Apply" }).click();
  await pageA.getByRole("button", { name: "Close security modal" }).click();

  await pageB.getByRole("button", { name: "More actions", exact: true }).click();
  await pageB.getByRole("button", { name: "Security options", exact: true }).click();
  assert.equal(await pageB.getByText("Enable waiting lobby").count(), 0, "non-moderator should not see lobby toggle");
  await pageB.getByPlaceholder("Shared E2EE key passphrase...").fill("nova-e2ee-secret");
  await pageB.getByRole("button", { name: "Apply" }).click();
  await pageB.getByRole("button", { name: "Close security modal" }).click();

  await pageA.getByText("E2EE", { exact: true }).waitFor({ timeout: 8000 });
  await pageB.getByText("E2EE", { exact: true }).waitFor({ timeout: 8000 });
  await pageA.waitForTimeout(600);
  await pageA.waitForFunction(() => {
    const vids = Array.from(document.querySelectorAll("video"));
    return vids.length >= 2 && vids.every((v) => v.readyState >= 2 && v.videoWidth > 0);
  }, undefined, { timeout: 10000 });
  await pageB.waitForFunction(() => {
    const vids = Array.from(document.querySelectorAll("video"));
    return vids.length >= 2 && vids.every((v) => v.readyState >= 2 && v.videoWidth > 0);
  }, undefined, { timeout: 10000 });
  console.log("Verified live E2EE key derivation & continuous 2-peer video decode");

  // 8b. Favicon check & Visitor JoinMeetingDialog + PiP persistence check
  const favRes = await fetch(`${BASE}/favicon.ico`);
  assert.equal(favRes.status, 200, "favicon.ico returned non-200");
  assert.ok(
    (favRes.headers.get("content-type") || "").includes("image/x-icon"),
    "favicon.ico missing image/x-icon content-type"
  );

  const ctxV = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    permissions: ["camera", "microphone"],
  });
  const pageV = await ctxV.newPage();
  attachListeners(pageV, "Visitor");
  await pageV.goto(`${BASE}/room/${room}?visitor=true`, { waitUntil: "networkidle" });
  await pageV.getByRole("textbox", { name: "Your display name" }).waitFor({ timeout: 10000 });
  await pageV.getByRole("textbox", { name: "Your display name" }).fill("Clara Viewer");
  await pageV.getByRole("button", { name: "Join meeting", exact: true }).click();
  await pageV.getByRole("dialog", { name: "Joining meeting" }).waitFor({ timeout: 10000 });
  await pageV.getByText("You're currently a viewer in this conference.").waitFor({ timeout: 5000 });
  await pageV.waitForTimeout(800);
  await pageV.screenshot({ path: path.join(SHOT_DIR, "meeting-visitor-dialog.png") });
  console.log("Captured meeting-visitor-dialog.png");
  await pageV.getByRole("button", { name: "OK", exact: true }).click();
  assert.equal(await pageV.getByRole("dialog", { name: "Joining meeting" }).count(), 0);
  await pageV.evaluate(() => {
    document.dispatchEvent(new Event("enterpictureinpicture", { bubbles: true }));
    document.dispatchEvent(new Event("leavepictureinpicture", { bubbles: true }));
  });
  await pageV.waitForTimeout(200);
  assert.equal(
    await pageV.getByRole("dialog", { name: "Joining meeting" }).count(),
    0,
    "JoinMeetingDialog reappeared after PiP transition"
  );
  await ctxV.close();

  // 9. Drop-in Jitsi External API embed test
  const embedPage = await ctxA.newPage();
  attachListeners(embedPage, "Embed");
  await embedPage.setContent(`<!doctype html><html><head><link rel="icon" href="data:,"></head><body style="margin:0;height:100vh">
    <div id="mount" style="height:100vh"></div>
    <script src="${BASE}/external_api.js"></script>
    <script>
      window.api = new JitsiMeetExternalAPI("${BASE}", {
        roomName: "${room}",
        parentNode: document.getElementById("mount"),
        userInfo: { displayName: "EmbedBot" }
      });
    </script>
  </body></html>`);
  await embedPage.waitForFunction(() => document.querySelector("iframe") !== null, undefined, { timeout: 8000 });
  const iframeCount = await embedPage.locator("iframe").count();
  assert.equal(iframeCount, 1, "external_api.js did not mount iframe");
  await embedPage.waitForTimeout(500);
  await embedPage.evaluate(() => window.api.dispose());
  await embedPage.close();

  // 10. Mobile viewport responsive check (zero horizontal overflow)
  const mobilePage = await ctxA.newPage();
  attachListeners(mobilePage, "Mobile");
  await mobilePage.setViewportSize({ width: 375, height: 812 });
  await mobilePage.goto(`${BASE}/`, { waitUntil: "networkidle" });
  const fits = await mobilePage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  assert.equal(fits, true, "horizontal overflow on mobile home viewport");
  await mobilePage.close();

  assert.deepEqual(consoleErrors, [], `console errors: ${consoleErrors.join("; ")}`);
  assert.deepEqual(pageErrors, [], `page errors: ${pageErrors.join("; ")}`);
  assert.deepEqual(failedRequests, [], `failed requests: ${failedRequests.join("; ")}`);

  console.log("PASS: 2-peer WebRTC str0m SFU, Jitsi UI, Visitor dialog, Settings, Files, Chat/Polls, Whiteboard, E2EE, external_api.js, 8 screenshots, 0 errors");
  await ctxA.close();
  await ctxB.close();
} finally {
  await browser.close();
}
