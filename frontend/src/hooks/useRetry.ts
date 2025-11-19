import { useState } from "react";

export function useRetry(maxAttempts: number = 3, delayMs: number = 400) {
    const [attempt, setAttempt] = useState(0);

    async function run<T>(
        fn: () => Promise<T>,
        onRetry?: (attempt: number) => void
    ): Promise<T> {
        setAttempt(0);
        let lastError: any;

        for (let i = 0; i < maxAttempts; i++) {
            try {
                setAttempt(i + 1);
                const result = await fn();
                setAttempt(0);
                return result;
            } catch (err: any) {
                lastError = err;

                // Don't retry if request was aborted
                if (err.message === 'aborted' || err.name === 'AbortError') {
                    setAttempt(0);
                    throw err;
                }

                // Don't retry on client errors (4xx except 503)
                if (err.status && err.status >= 400 && err.status < 500 && err.status !== 503) {
                    setAttempt(0);
                    throw err;
                }

                // If this was the last attempt, throw the error
                if (i === maxAttempts - 1) {
                    setAttempt(0);
                    throw err;
                }

                // Wait before retrying
                if (onRetry) onRetry(i + 1);
                await new Promise((resolve) => setTimeout(resolve, delayMs * (i + 1)));
            }
        }

        setAttempt(0);
        throw lastError;
    }

    return { run, attempt };
}