import { useRef, useState, useCallback } from "react";

export function useGenerate() {
    const [loading, setLoading] = useState(false);
    const controllerRef = useRef<AbortController | null>(null);

    const generate = useCallback(async (payload: { prompt: string; style: string; imageUpload: string }) => {
        setLoading(true);
        controllerRef.current = new AbortController();
        try {
            const token = localStorage.getItem("ai_token");
            const res = await fetch("/api/generations", {
                method: "POST",
                body: JSON.stringify(payload),
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                signal: controllerRef.current.signal
            });
            const text = await res.text();
            const data = text ? JSON.parse(text) : null;
            setLoading(false);
            if (!res.ok) {
                const err: any = new Error(data?.message || res.statusText);
                err.status = res.status;
                err.body = data;
                throw err;
            }
            return data;
        } catch (err: any) {
            setLoading(false);
            if (err?.name === "AbortError") return { aborted: true };
            throw err;
        } finally {
            controllerRef.current = null;
        }
    }, []);

    const abort = useCallback(() => {
        controllerRef.current?.abort();
        controllerRef.current = null;
    }, []);

    return { loading, generate, abort };
}
