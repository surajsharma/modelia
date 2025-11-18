import { useRef } from "react";

export function useRetry(maxAttempts = 3, baseDelay = 400) {
    const attemptsRef = useRef(0);

    async function run<T>(fn: () => Promise<T>, onRetry?: (attempt: number) => void): Promise<T> {
        attemptsRef.current = 0;
        while (true) {
            try {
                return await fn();
            } catch (err: any) {
                attemptsRef.current++;
                if (attemptsRef.current >= maxAttempts) throw err;
                onRetry?.(attemptsRef.current);
                const delay = baseDelay * 2 ** (attemptsRef.current - 1);
                await new Promise(r => setTimeout(r, delay));
            }
        }
    }

    return { run, attemptsRef };
}
