export function playerUrl(playerId: string, params?: Record<string, string | number | boolean | string[]>) {
  const id = encodeURIComponent(String(playerId));
  const qs = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined || v === null) return;
      if (Array.isArray(v)) v.forEach((x) => qs.append(k, String(x)));
      else qs.set(k, String(v));
    });
  }
  const q = qs.toString();
  return `/players/${id}${q ? `?${q}` : ""}`;
}

export function playerMatchesUrl(playerId: string, extra?: Record<string, string | number | boolean | string[]>) {
  return playerUrl(playerId, { tab: "matches", ...(extra || {}) });
}

export function playerTournamentsUrl(playerId: string, extra?: Record<string, string | number | boolean | string[]>) {
  return playerUrl(playerId, { tab: "tournaments", ...(extra || {}) });
}
