import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("service worker applies updates only after an explicit request", () => {
  const source = readFileSync("public/sw.js", "utf8");
  const installHandler = source.slice(
    source.indexOf('self.addEventListener("install"'),
    source.indexOf('self.addEventListener("message"'),
  );

  assert.doesNotMatch(installHandler, /skipWaiting/);
  assert.match(source, /event\.data\?\.type === "SKIP_WAITING"/);
  assert.match(source, /self\.skipWaiting\(\)/);
});

test("Vercel always revalidates the service worker", () => {
  const config = JSON.parse(readFileSync("vercel.json", "utf8"));
  const serviceWorkerHeaders = config.headers.find((entry: { source: string }) => entry.source === "/sw.js");

  assert.ok(serviceWorkerHeaders);
  assert.ok(serviceWorkerHeaders.headers.some((header: { key: string; value: string }) =>
    header.key === "Cache-Control" && header.value.includes("must-revalidate"),
  ));
});

test("service worker never caches authenticated API responses", () => {
  const source = readFileSync("public/sw.js", "utf8");
  const apiBypass = source.indexOf('url.pathname.startsWith("/api/")');
  const cacheLookup = source.indexOf("caches.match(event.request)");

  assert.ok(apiBypass > -1, "API bypass must exist");
  assert.ok(cacheLookup > apiBypass, "API bypass must run before Cache Storage lookup");
});

test("manifest references the generated install icons", () => {
  const manifest = JSON.parse(readFileSync("public/manifest.webmanifest", "utf8"));
  const sources = manifest.icons.map((icon: { src: string }) => icon.src);

  assert.ok(sources.includes("/icons/icon-192.png"));
  assert.ok(sources.includes("/icons/icon-512.png"));
});
