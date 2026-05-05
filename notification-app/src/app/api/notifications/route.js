import { NextResponse } from "next/server";

const UPSTREAM_URL = "http://20.207.122.201/evaluation-service/notifications";
const REQUEST_TIMEOUT_MS = 8000;
const MAX_RETRIES = 1;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(target, headers) {
  let lastError = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(target, {
        method: "GET",
        headers,
        cache: "no-store",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status >= 500 && attempt < MAX_RETRIES) {
        await sleep(250 * (attempt + 1));
        continue;
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error;

      if (attempt < MAX_RETRIES) {
        await sleep(250 * (attempt + 1));
        continue;
      }
    }
  }

  throw lastError || new Error("Unknown upstream request failure");
}

export async function GET(request) {
  const token = process.env.EVAL_API_TOKEN;
  const target = `${UPSTREAM_URL}${request.nextUrl.search}`;
  const headers = {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  try {
    const upstreamResponse = await fetchWithRetry(target, headers);

    const bodyText = await upstreamResponse.text();
    let payload = null;

    try {
      payload = JSON.parse(bodyText);
    } catch {
      payload = { message: bodyText };
    }

    return NextResponse.json(payload, { status: upstreamResponse.status });
  } catch (error) {
    const isTimeout = error?.name === "AbortError";

    return NextResponse.json(
      {
        code: isTimeout ? "UPSTREAM_TIMEOUT" : "UPSTREAM_UNAVAILABLE",
        message: isTimeout
          ? "Notification service timed out"
          : error.message || "Failed to fetch upstream notifications",
      },
      { status: isTimeout ? 504 : 502 }
    );
  }
}
