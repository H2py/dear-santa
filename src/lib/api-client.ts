const resolveUrl = (input: RequestInfo | URL) => {
  if (typeof input === "string") {
    if (input.startsWith("http")) return input;
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
    return new URL(input, base).toString();
  }
  return input;
};

export async function apiFetch<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const url = resolveUrl(input);
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error?.error ?? `Request failed (${res.status})`);
  }
  return res.json();
}
