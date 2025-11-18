export async function signup(email: string, password: string) {
    return fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
    }).then(async r => {
        const t = await r.json();
        if (!r.ok) throw new Error(t.message || "Signup failed");
        localStorage.setItem("ai_token", t.token);
        return t;
    });
}

export async function login(email: string, password: string) {
    return fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
    }).then(async r => {
        const t = await r.json();
        if (!r.ok) throw new Error(t.message || "Login failed");
        localStorage.setItem("ai_token", t.token);
        return t;
    });
}

export function logout() {
    localStorage.removeItem("ai_token");
}
