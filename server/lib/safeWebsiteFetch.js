import dns from "dns/promises";
import http from "http";
import https from "https";
import net from "net";
import axios from "axios";

const MAX_RESPONSE_BYTES = 512 * 1024;
const MAX_REDIRECTS = 3;
const FETCH_TIMEOUT_MS = 10_000;

export class SafeUrlError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

function isPrivateIpv4(address) {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true;
  const [a, b] = parts;
  return a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19));
}

export function isPrivateOrReservedIp(address) {
  const family = net.isIP(address);
  if (family === 4) return isPrivateIpv4(address);
  if (family !== 6) return true;

  const normalized = address.toLowerCase();
  if (normalized === "::" || normalized === "::1" || normalized.startsWith("fe80:") || normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
  const mappedIpv4 = normalized.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  return Boolean(mappedIpv4 && isPrivateIpv4(mappedIpv4[1]));
}

export function parsePublicHttpUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new SafeUrlError("INVALID_URL");
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || !url.hostname) {
    throw new SafeUrlError("UNSAFE_URL");
  }
  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (hostname === "localhost" || hostname.endsWith(".localhost")) throw new SafeUrlError("UNSAFE_URL");
  if (net.isIP(hostname) && isPrivateOrReservedIp(hostname)) throw new SafeUrlError("UNSAFE_URL");
  return url;
}

export async function assertPublicDestination(value, lookup = dns.lookup) {
  const url = parsePublicHttpUrl(value);
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = net.isIP(hostname)
    ? [{ address: hostname, family: net.isIP(hostname) }]
    : await lookup(hostname, { all: true, verbatim: true });
  if (!addresses?.length || addresses.some(({ address }) => isPrivateOrReservedIp(address))) {
    throw new SafeUrlError("UNSAFE_URL");
  }
  return url;
}

function createSafeLookup(lookup) {
  return (hostname, _options, callback) => {
    lookup(hostname, { all: true, verbatim: true })
      .then((addresses) => {
        if (!addresses?.length || addresses.some(({ address }) => isPrivateOrReservedIp(address))) {
          return callback(new SafeUrlError("UNSAFE_URL"));
        }
        const destination = addresses[0];
        return callback(null, destination.address, destination.family);
      })
      .catch(() => callback(new SafeUrlError("DESTINATION_UNAVAILABLE")));
  };
}

export async function fetchSafeWebsite(urlValue, { lookup = dns.lookup, request = axios.get } = {}) {
  let currentUrl = (await assertPublicDestination(urlValue, lookup)).href;
  const safeLookup = createSafeLookup(lookup);
  const requestOptions = {
    timeout: FETCH_TIMEOUT_MS,
    maxContentLength: MAX_RESPONSE_BYTES,
    maxBodyLength: MAX_RESPONSE_BYTES,
    maxRedirects: 0,
    responseType: "text",
    proxy: false,
    validateStatus: () => true,
    headers: { "User-Agent": "SALIH-AI-Crawler/1.1" },
    httpAgent: new http.Agent({ lookup: safeLookup }),
    httpsAgent: new https.Agent({ lookup: safeLookup })
  };

  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    await assertPublicDestination(currentUrl, lookup);
    let response;
    try {
      response = await request(currentUrl, requestOptions);
    } catch (error) {
      if (error instanceof SafeUrlError) throw error;
      if (error?.code === "ERR_FR_MAX_BODY_LENGTH_EXCEEDED" || error?.code === "ERR_BAD_RESPONSE") throw new SafeUrlError("RESPONSE_TOO_LARGE");
      throw new SafeUrlError("DESTINATION_UNAVAILABLE");
    }

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers?.location;
      if (!location || redirects === MAX_REDIRECTS) throw new SafeUrlError("UNSAFE_REDIRECT");
      currentUrl = new URL(location, currentUrl).href;
      continue;
    }
    if (response.status < 200 || response.status >= 300) throw new SafeUrlError("DESTINATION_UNAVAILABLE");
    const contentType = String(response.headers?.["content-type"] || "").toLowerCase();
    if (contentType && !contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
      throw new SafeUrlError("UNSUPPORTED_CONTENT_TYPE");
    }
    if (typeof response.data !== "string" || Buffer.byteLength(response.data, "utf8") > MAX_RESPONSE_BYTES) {
      throw new SafeUrlError("RESPONSE_TOO_LARGE");
    }
    return { finalUrl: currentUrl, html: response.data };
  }
  throw new SafeUrlError("UNSAFE_REDIRECT");
}
