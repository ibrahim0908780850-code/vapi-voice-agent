import assert from "node:assert/strict";
import test from "node:test";
import { assertPublicDestination, fetchSafeWebsite, parsePublicHttpUrl, SafeUrlError } from "../server/lib/safeWebsiteFetch.js";

const publicLookup = async (hostname) => {
  if (hostname === "public.example") return [{ address: "93.184.216.34", family: 4 }];
  if (hostname === "private-redirect.example") return [{ address: "10.0.0.4", family: 4 }];
  return [];
};

for (const blockedUrl of [
  "http://localhost",
  "http://127.0.0.1",
  "http://0.0.0.0",
  "http://169.254.169.254/latest/meta-data",
  "http://10.0.0.5",
  "http://192.168.1.5",
  "http://[::1]",
  "http://[fe80::1]"
]) {
  test(`rejects SSRF target ${blockedUrl}`, () => {
    assert.throws(() => parsePublicHttpUrl(blockedUrl), (error) => error instanceof SafeUrlError && error.code === "UNSAFE_URL");
  });
}

test("accepts a public HTTP destination only after safe DNS validation", async () => {
  const destination = await assertPublicDestination("https://public.example/path", publicLookup);
  assert.equal(destination.hostname, "public.example");
});

test("rejects a redirect whose next target resolves to a private address", async () => {
  const request = async (url) => {
    assert.equal(url, "https://public.example/start");
    return { status: 302, headers: { location: "http://private-redirect.example/internal" }, data: "" };
  };
  await assert.rejects(
    fetchSafeWebsite("https://public.example/start", { lookup: publicLookup, request }),
    (error) => error instanceof SafeUrlError && error.code === "UNSAFE_URL"
  );
});

test("returns a bounded successful public HTML response", async () => {
  const request = async () => ({
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
    data: "<html><body>Safe content</body></html>"
  });
  const result = await fetchSafeWebsite("https://public.example", { lookup: publicLookup, request });
  assert.equal(result.finalUrl, "https://public.example/");
  assert.match(result.html, /Safe content/);
});
