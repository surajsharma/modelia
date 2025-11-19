import { useState, useRef } from "react";
import { api } from "../services/api";

type GenerateParams = {
    prompt: string;
    style: string;
    imageUpload: string;
};

type GenerateResult = {
    id: number;
    prompt: string;
    style: string;
    imageUrl: string;
    createdAt: string;
    status: string;
};

export function useGenerate() {
    const [loading, setLoading] = useState(false);
    const abortControllerRef = useRef<AbortController | null>(null);

    const generate = async (params: GenerateParams): Promise<GenerateResult> => {
        abortControllerRef.current = new AbortController();
        setLoading(true);
        try {
            const result = await api<GenerateResult>("/generations", {
                method: "POST",
                body: JSON.stringify(params),
                signal: abortControllerRef.current.signal,
            });
            return result;
        } catch (err: any) {
            if (err.name === "AbortError") {
                throw new Error("aborted");
            }
            throw err;
        } finally {
            setLoading(false);
            abortControllerRef.current = null;
        }
    };

    const abort = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            setLoading(false);
        }
    };

    return { loading, generate, abort };
}