const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

type ApiOptions = {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
};

export async function api<T>(
    endpoint: string,
    options: ApiOptions = {}
): Promise<T> {
    const token = localStorage.getItem("ai_token"); // Changed from "token" to "ai_token"

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...options.headers,
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
        method: options.method || "GET",
        headers,
        body: options.body,
        signal: options.signal,
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error: any = new Error(errorData.message || "Request failed");
        error.status = response.status;
        error.data = errorData;
        throw error;
    }

    return response.json();
}

export async function getCurrentUser() {
    return api<{ id: number; email: string }>("/auth/me");
}

export async function signup(email: string, password: string) {
    const { token } = await api<{ token: string }>("/auth/signup", {
        method: "POST",
        body: JSON.stringify({ email, password }),
    });
    localStorage.setItem("ai_token", token);
    return { token };
}

export async function login(email: string, password: string) {
    const { token } = await api<{ token: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
    });
    localStorage.setItem("ai_token", token);
    return { token };
}

export function logout() {
    localStorage.removeItem("ai_token");
}

export function getToken() {
    return localStorage.getItem("ai_token");
}