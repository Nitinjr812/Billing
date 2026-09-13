import { useAuth } from "../context/AuthContext";

const BACKEND = "https://billing-backend-tawny.vercel.app";

// ── Simple in-memory cache (lives as long as the browser tab is open) ────
// Key = the API path, Value = { data, timestamp }
const cache = new Map();
const CACHE_TTL_MS = 30 * 1000; // data is considered "fresh" for 30 seconds

export function useApi() {
  const { token, logout } = useAuth();

  return async (path, options = {}) => {
    const method = (options.method || "GET").toUpperCase();
    const isGet = method === "GET";

    // ── Serve from cache instantly if fresh (GET requests only) ──────────
    if (isGet && !options.skipCache) {
      const cached = cache.get(path);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        // Kick off a background refresh so data stays eventually up-to-date,
        // but don't make the caller wait for it.
        refreshInBackground(path, token, logout);
        return cached.data;
      }
    }

    const data = await fetchFromServer(path, options, token, logout);

    // Cache successful GET responses
    if (isGet) {
      cache.set(path, { data, timestamp: Date.now() });
    } else {
      // Any write (POST/PUT/DELETE) likely changes data elsewhere —
      // clear the whole cache so the next GETs fetch fresh data.
      cache.clear();
    }

    return data;
  };
}

async function fetchFromServer(path, options, token, logout) {
  const res = await fetch(`${BACKEND}/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  if (res.status === 401) {
    logout();
    throw new Error("Session expired, please login again");
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

function refreshInBackground(path, token, logout) {
  fetchFromServer(path, {}, token, logout)
    .then((fresh) => cache.set(path, { data: fresh, timestamp: Date.now() }))
    .catch(() => {}); // silent — the cached data is still shown, no need to alarm the user
}

export default useApi;