const BASE_URL = import.meta.env.VITE_API_URL || "/api/v1";

export class ApiError extends Error {
  status: number;
  errors: unknown[];

  constructor(status: number, message: string, errors: unknown[] = []) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

// The backend sets httpOnly cookies, but also returns the access token so we
// can send it as a Bearer header in browsers that drop Secure cookies on http.
let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  retry?: boolean;
}

// Unwraps the backend's ApiResponse ({ statusCode, data, message, success })
export async function api<T>(path: string, { method = "GET", body, retry = true }: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  let payload: BodyInit | undefined;
  if (body instanceof FormData) {
    payload = body;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  const res = await fetch(BASE_URL + path, { method, headers, body: payload, credentials: "include" });
  const json = await res.json().catch(() => null);

  // Access token expired: refresh once and replay the request
  if (res.status === 401 && retry && !path.startsWith("/user/login") && !path.startsWith("/user/refresh-token")) {
    if (await refreshSession()) return api<T>(path, { method, body, retry: false });
  }

  if (!res.ok || json?.success === false) {
    throw new ApiError(res.status, json?.message ?? `Request failed (${res.status})`, json?.errors ?? []);
  }
  return json.data as T;
}

let refreshing: Promise<boolean> | null = null;

// Shared between concurrent 401s so we only hit /refresh-token once
function refreshSession(): Promise<boolean> {
  refreshing ??= fetch(`${BASE_URL}/user/refresh-token`, { method: "POST", credentials: "include" })
    .then(async (res) => {
      if (!res.ok) return false;
      const json = await res.json();
      accessToken = json.data?.accessToken ?? null;
      return true;
    })
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Something went wrong";
}
