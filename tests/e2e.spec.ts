import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const testUser = {
    email: `test-${Date.now()}@example.com`,
    password: 'TestPass123!',
};

test.describe('E2E: Complete User Journey', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
    });

    test('Full flow: signup → login → upload → generate → view history → restore', async ({ page }) => {

        await test.step('Sign up new user', async () => {
            await page.goto('/signup');
            await expect(page.locator('h1:has-text("Create Account")')).toBeVisible();

            await page.locator('input[type="email"]').fill(testUser.email);
            await page.locator('input[type="password"]').fill(testUser.password);
            await page.locator('button:has-text("Create account")').click();

            await expect(page).toHaveURL('/', { timeout: 10000 });
            await expect(page.locator('h1:has-text("Modelia AI Studio")')).toBeVisible();
            await expect(page.locator(`text=${testUser.email}`)).toBeVisible();
        });

        await test.step('Logout user', async () => {
            await page.locator('button:has-text("Logout")').click();
            await expect(page).toHaveURL('/login');
        });

        await test.step('Login with created user', async () => {
            await expect(page.locator('h1:has-text("Welcome Back")')).toBeVisible();

            await page.locator('input[type="email"]').fill(testUser.email);
            await page.locator('input[type="password"]').fill(testUser.password);
            await page.locator('button:has-text("Login")').click();

            await expect(page).toHaveURL('/');
            await expect(page.locator('h1:has-text("Modelia AI Studio")')).toBeVisible();
        });

        await test.step('Upload an image', async () => {
            const fileInput = page.locator('input[type="file"]');
            const testImagePath = path.join(__dirname, 'fixtures', 'test-image.jpg');

            await fileInput.setInputFiles(testImagePath);

            // Wait for preview with correct alt text
            await expect(page.locator('img[alt="Upload preview"]')).toBeVisible({ timeout: 5000 });
        });

        const testPrompt = 'A stunning fashion model in elegant attire';
        const testStyle = 'Editorial';

        await test.step('Generate AI content', async () => {
            await page.locator('input[aria-label="Prompt"]').fill(testPrompt);
            await page.locator('select').selectOption(testStyle);
            await page.locator('button:has-text("Generate")').click();

            await expect(page.locator('button:has-text("Generating")')).toBeVisible();

            await page.waitForTimeout(2000);

            await page.waitForFunction(
                () => {
                    const historySection = document.querySelector('aside');
                    return historySection && !historySection.textContent?.includes('No generations yet');
                },
                { timeout: 40000 }
            );

            await expect(page.locator('button:has-text("Generate")')).toBeEnabled();
        });

        await test.step('View generation history', async () => {
            const historySection = page.locator('aside:has(h2:has-text("Recent Generations"))');
            const historyItems = historySection.locator('button:has(img)');

            await expect(historyItems).toHaveCount(1);

            const firstItem = historyItems.first();
            await expect(firstItem.locator('img')).toBeVisible();
            await expect(firstItem.locator(`text=${testStyle}`)).toBeVisible();
            await expect(firstItem).toContainText(testPrompt);

            const imgSrc = await firstItem.locator('img').getAttribute('src');
            expect(imgSrc).toMatch(/\/api\/uploads\/\d+\/.+\.(jpg|png)/);
        });

        await test.step('Restore generation from history', async () => {
            await page.locator('input[aria-label="Prompt"]').clear();
            await page.locator('select').selectOption('Classic');

            await expect(page.locator('input[aria-label="Prompt"]')).toHaveValue('');

            const firstHistoryItem = page.locator('aside button:has(img)').first();
            await firstHistoryItem.click();

            await expect(page.locator('input[aria-label="Prompt"]')).toHaveValue(testPrompt);
            await expect(page.locator('select')).toHaveValue(testStyle);

            // Image should be restored
            await expect(page.locator('img[alt="Upload preview"]')).toBeVisible();
        });
    });

    test('Authentication: Invalid credentials', async ({ page }) => {
        await page.goto('/login');

        await page.locator('input[type="email"]').fill('wrong@example.com');
        await page.locator('input[type="password"]').fill('wrongpassword');

        page.once('dialog', async (dialog) => {
            expect(dialog.message()).toContain('Invalid credentials');
            await dialog.accept();
        });

        await page.locator('button:has-text("Login")').click();

        // Wait for dialog to be handled
        await page.waitForTimeout(1000);

        await expect(page).toHaveURL('/login');
    });

    test('Protected route: Redirect to login when not authenticated', async ({ page }) => {
        await page.goto('/');
        await expect(page).toHaveURL('/login');
        await expect(page.locator('h1:has-text("Welcome Back")')).toBeVisible();
    });

    test('Generation: Requires image upload', async ({ page }) => {
        await page.goto('/signup');
        await page.locator('input[type="email"]').fill(`test-${Date.now()}@example.com`);
        await page.locator('input[type="password"]').fill('TestPass123!');
        await page.locator('button:has-text("Create account")').click();
        await expect(page).toHaveURL('/');

        await page.locator('input[aria-label="Prompt"]').fill('Test prompt');

        page.once('dialog', async (dialog) => {
            expect(dialog.message()).toContain('upload an image');
            await dialog.accept();
        });

        await page.locator('button:has-text("Generate")').click();
        await page.waitForTimeout(500);
    });

    test('Generation: Requires prompt', async ({ page }) => {
        await page.goto('/signup');
        await page.locator('input[type="email"]').fill(`test-${Date.now()}@example.com`);
        await page.locator('input[type="password"]').fill('TestPass123!');
        await page.locator('button:has-text("Create account")').click();
        await expect(page).toHaveURL('/');

        const fileInput = page.locator('input[type="file"]');
        const testImagePath = path.join(__dirname, 'fixtures', 'test-image.jpg');
        await fileInput.setInputFiles(testImagePath);

        // Wait for preview to appear
        await expect(page.locator('img[alt="Upload preview"]')).toBeVisible({ timeout: 5000 });

        page.once('dialog', async (dialog) => {
            expect(dialog.message()).toContain('enter a prompt');
            await dialog.accept();
        });

        await page.locator('button:has-text("Generate")').click();
        await page.waitForTimeout(500);
    });
});