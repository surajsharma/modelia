export async function api<T>(path: string, opts: RequestInit = {}): Promise<T> {
    const token = localStorage.getItem("ai_token");
    const headers: Record<string, string> = { ...(opts.headers as any || {}), "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const resp = await fetch(`/api${path}`, { ...opts, headers });
    const text = await resp.text();
    const data = text ? JSON.parse(text) : null;
    if (!resp.ok) {
        const err = new Error(data?.message || resp.statusText || "API error");
        (err as any).status = resp.status;
        (err as any).body = data;
        throw err;
    }
    return data as T;
}
