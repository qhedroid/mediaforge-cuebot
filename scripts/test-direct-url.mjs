import process from "node:process";

const timeoutMs = 15_000;

function parseHttpUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    return url;
  } catch {
    return null;
  }
}

function extensionFromUrl(url) {
  const pathname = url.pathname.toLowerCase();
  const match = pathname.match(/\.[a-z0-9]+$/);
  return match?.[0] ?? "none";
}

async function fetchWithTimeout(url, method) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      method,
      redirect: "follow",
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

const rawUrl = process.argv[2];

if (!rawUrl) {
  console.error('Usage: node scripts/test-direct-url.mjs "https://example.com/file.mp3"');
  process.exit(1);
}

const url = parseHttpUrl(rawUrl);

if (!url) {
  console.error("Invalid URL. Provide a valid http or https URL.");
  process.exit(1);
}

console.log("Direct URL test");
console.log(`Hostname: ${url.hostname}`);
console.log(`Extension: ${extensionFromUrl(url)}`);

try {
  let response = await fetchWithTimeout(url, "HEAD");

  if (response.status === 405 || response.status === 403) {
    console.log(`HEAD status: ${response.status}; trying GET headers instead.`);
    response = await fetchWithTimeout(url, "GET");
  }

  console.log(`Status: ${response.status}`);
  console.log(`Content-Type: ${response.headers.get("content-type") ?? "unknown"}`);
  console.log(`Content-Length: ${response.headers.get("content-length") ?? "unknown"}`);

  if (!response.ok) {
    console.error("URL test failed: host did not return a successful response.");
    process.exit(1);
  }

  console.log("URL test passed: host responded. CueBot may still reject non-media content types.");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`URL test failed: ${message}`);
  process.exit(1);
}
