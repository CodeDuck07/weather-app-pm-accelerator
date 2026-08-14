import { spawnSync } from "node:child_process";

/**
 * Server-side HTTP GET that prefers native fetch, then falls back to curl.
 * Curl fallback helps in environments where Node DNS/proxy is broken but curl works.
 */
export async function httpGetJson<T = unknown>(url: string): Promise<T> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return (await res.json()) as T;
  } catch (err) {
    const viaCurl = curlJson(url);
    if (viaCurl.ok) {
      return viaCurl.data as T;
    }
    throw err instanceof Error ? err : new Error("HTTP request failed");
  }
}

export async function httpGetJsonSoft<T = unknown>(
  url: string,
  init?: { headers?: Record<string, string> }
): Promise<{ ok: true; data: T } | { ok: false; status: number }> {
  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: init?.headers,
    });
    if (!res.ok) return { ok: false, status: res.status };
    return { ok: true, data: (await res.json()) as T };
  } catch {
    const viaCurl = curlJson(url, init?.headers);
    if (viaCurl.ok) return { ok: true, data: viaCurl.data as T };
    return { ok: false, status: viaCurl.status || 502 };
  }
}

function curlJson(
  url: string,
  headers?: Record<string, string>
): { ok: true; data: unknown } | { ok: false; status: number } {
  const args = ["-fsSL", "--max-time", "30", "--noproxy", "*", url];
  if (headers) {
    for (const [k, v] of Object.entries(headers)) {
      args.unshift("-H", `${k}: ${v}`);
    }
  }
  const env = { ...process.env };
  delete env.HTTP_PROXY;
  delete env.HTTPS_PROXY;
  delete env.http_proxy;
  delete env.https_proxy;
  delete env.ALL_PROXY;
  delete env.all_proxy;

  const result = spawnSync("curl", args, {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
    env,
  });
  if (result.status !== 0) {
    return { ok: false, status: 502 };
  }
  try {
    return { ok: true, data: JSON.parse(result.stdout) };
  } catch {
    return { ok: false, status: 502 };
  }
}
