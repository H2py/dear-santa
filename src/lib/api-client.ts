export async function apiFetch<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  let url: RequestInfo | URL = input;
  if (typeof input === "string" && !input.startsWith("http")) {
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
    url = new URL(input, base).toString();
  }

  let cookieHeader: string | undefined;
  if (typeof window === "undefined") {
    // Server-side fetch: forward request cookies so auth/guest session works
    const { cookies } = await import("next/headers");
    const store = await cookies();
    cookieHeader = store.toString();
  }

  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error?.error ?? `Request failed (${res.status})`);
  }
  return res.json();
}
