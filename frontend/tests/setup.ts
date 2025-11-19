import { expect, afterEach, vi, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

afterEach(() => {
    cleanup();
});

// Global test setup
beforeEach(() => {
    // Mock window.scrollTo
    Object.defineProperty(window, 'scrollTo', {
        writable: true,
        value: vi.fn(),
    });

    // Mock window.alert
    Object.defineProperty(window, 'alert', {
        writable: true,
        value: vi.fn(),
    });
});