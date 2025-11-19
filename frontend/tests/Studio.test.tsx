import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Studio from '../src/pages/Studio';
import * as api from '../src/services/api';
import * as authService from '../src/services/auth';

vi.mock('../src/services/api');
vi.mock('../src/services/auth');

// Mock the dark mode hook
vi.mock('../src/hooks/useDarkMode', () => ({
    useDarkMode: () => ({
        isDark: false,
        toggle: vi.fn(),
    }),
}));

describe('Studio Component', () => {
    const mockUser = { id: 1, email: 'test@example.com' };
    const mockHistory = [
        {
            id: 1,
            prompt: 'Test prompt',
            style: 'Classic',
            imageUrl: '/uploads/1/image1.png',
            createdAt: '2024-01-15T10:00:00Z',
            status: 'succeeded',
        },
        {
            id: 2,
            prompt: 'Another prompt',
            style: 'Editorial',
            imageUrl: '/uploads/1/image2.png',
            createdAt: '2024-01-15T11:00:00Z',
            status: 'succeeded',
        },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(api.getCurrentUser).mockResolvedValue(mockUser);
        vi.mocked(api.api).mockImplementation((endpoint: string) => {
            if (endpoint === '/auth/me') {
                return Promise.resolve(mockUser);
            }
            if (endpoint === '/generations?limit=5') {
                return Promise.resolve(mockHistory);
            }
            return Promise.resolve({});
        });
        delete (window as any).location;
        window.location = { href: '' } as any;
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Rendering', () => {
        it('should render upload component', async () => {
            render(<Studio />);
            await waitFor(() => {
                expect(screen.getByText(/click to upload/i)).toBeInTheDocument();
            });
        });

        it('should render upload area with drag and drop text', async () => {
            render(<Studio />);
            await waitFor(() => {
                expect(screen.getByText(/click to upload/i)).toBeInTheDocument();
                expect(screen.getByText(/or drag and drop/i)).toBeInTheDocument();
                expect(screen.getByText(/PNG, JPG, WEBP/i)).toBeInTheDocument();
            });
        });

        it('should render prompt input', async () => {
            render(<Studio />);
            await waitFor(() => {
                expect(screen.getByPlaceholderText('Describe your vision...')).toBeInTheDocument();
            });
        });

        it('should render style select with all options', async () => {
            render(<Studio />);
            await waitFor(() => {
                const styleSelect = screen.getByRole('combobox');
                expect(styleSelect).toBeInTheDocument();
                const options = screen.getAllByRole('option');
                const optionTexts = options.map((opt) => opt.textContent);
                expect(optionTexts).toEqual(['Classic', 'Editorial', 'Avant-garde', 'Casual']);
            });
        });

        it('should render generate button', async () => {
            render(<Studio />);
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /^generate$/i })).toBeInTheDocument();
            });
        });

        it('should render abort button', async () => {
            render(<Studio />);
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /abort/i })).toBeInTheDocument();
            });
        });

        it('should display user email', async () => {
            render(<Studio />);
            await waitFor(() => {
                expect(screen.getByText('test@example.com')).toBeInTheDocument();
            });
        });

        it('should render logout button', async () => {
            render(<Studio />);
            await waitFor(() => {
                expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
            });
        });

        it('should render page title', async () => {
            render(<Studio />);
            await waitFor(() => {
                expect(screen.getByText('Modelia AI Studio')).toBeInTheDocument();
            });
        });

        it('should render dark mode toggle', async () => {
            render(<Studio />);
            await waitFor(() => {
                expect(screen.getByLabelText(/toggle dark mode/i)).toBeInTheDocument();
            });
        });
    });

    describe('Upload Component Interaction', () => {
        it('should show preview after file upload', async () => {
            const user = userEvent.setup();
            render(<Studio />);

            await waitFor(() => {
                expect(screen.getByText(/click to upload/i)).toBeInTheDocument();
            });

            const fileInput = screen.getByLabelText(/click to upload/i, {
                selector: 'input[type="file"]',
            });
            const file = new File(['dummy content'], 'test.png', { type: 'image/png' });

            await user.upload(fileInput, file);

            await waitFor(() => {
                const preview = screen.getByAltText('Upload preview');
                expect(preview).toBeInTheDocument();
            });
        });

        it('should show clear button after upload', async () => {
            const user = userEvent.setup();
            render(<Studio />);

            await waitFor(() => {
                expect(screen.getByText(/click to upload/i)).toBeInTheDocument();
            });

            const fileInput = screen.getByLabelText(/click to upload/i, {
                selector: 'input[type="file"]',
            });
            const file = new File(['dummy content'], 'test.png', { type: 'image/png' });

            await user.upload(fileInput, file);

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument();
            });
        });

        it('should clear preview when clear button is clicked', async () => {
            const user = userEvent.setup();
            render(<Studio />);

            await waitFor(() => {
                expect(screen.getByText(/click to upload/i)).toBeInTheDocument();
            });

            const fileInput = screen.getByLabelText(/click to upload/i, {
                selector: 'input[type="file"]',
            });
            const file = new File(['dummy content'], 'test.png', { type: 'image/png' });

            await user.upload(fileInput, file);

            await waitFor(() => {
                expect(screen.getByAltText('Upload preview')).toBeInTheDocument();
            });

            const clearButton = screen.getByRole('button', { name: /clear/i });
            await user.click(clearButton);

            await waitFor(() => {
                expect(screen.getByText(/click to upload/i)).toBeInTheDocument();
                expect(screen.queryByAltText('Upload preview')).not.toBeInTheDocument();
            });
        });
    });

    describe('Generate Flow', () => {
        it('should show loading state when generating', async () => {
            const user = userEvent.setup();

            let resolveGenerate: any;
            const generatePromise = new Promise((resolve) => {
                resolveGenerate = resolve;
            });

            vi.mocked(api.api).mockImplementation((endpoint: string, options?: any) => {
                if (endpoint === '/auth/me') return Promise.resolve(mockUser);
                if (endpoint === '/generations?limit=5') return Promise.resolve(mockHistory);
                if (endpoint === '/generations' && options?.method === 'POST') {
                    return generatePromise;
                }
                return Promise.resolve({});
            });

            render(<Studio />);

            await waitFor(() => {
                expect(screen.getByPlaceholderText('Describe your vision...')).toBeInTheDocument();
            });

            const fileInput = screen.getByLabelText(/click to upload/i, {
                selector: 'input[type="file"]',
            });
            const file = new File(['dummy'], 'test.png', { type: 'image/png' });
            await user.upload(fileInput, file);

            const promptInput = screen.getByPlaceholderText('Describe your vision...');
            await user.type(promptInput, 'A beautiful landscape');

            const generateButton = screen.getByRole('button', { name: /^generate$/i });
            await user.click(generateButton);

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /generating/i })).toBeInTheDocument();
                expect(screen.getByRole('button', { name: /generating/i })).toBeDisabled();
            });

            resolveGenerate({
                id: 3,
                prompt: 'A beautiful landscape',
                style: 'Classic',
                imageUrl: '/uploads/1/image3.png',
                createdAt: new Date().toISOString(),
                status: 'succeeded',
            });
        });

        it('should update history on successful generation', async () => {
            const user = userEvent.setup();

            const newGeneration = {
                id: 3,
                prompt: 'A beautiful landscape',
                style: 'Classic',
                imageUrl: '/uploads/1/image3.png',
                createdAt: new Date().toISOString(),
                status: 'succeeded',
            };

            let callCount = 0;
            vi.mocked(api.api).mockImplementation((endpoint: string, options?: any) => {
                if (endpoint === '/auth/me') return Promise.resolve(mockUser);
                if (endpoint === '/generations?limit=5') {
                    callCount++;
                    if (callCount === 1) return Promise.resolve(mockHistory);
                    return Promise.resolve([newGeneration, ...mockHistory]);
                }
                if (endpoint === '/generations' && options?.method === 'POST') {
                    return Promise.resolve(newGeneration);
                }
                return Promise.resolve({});
            });

            render(<Studio />);

            await waitFor(() => {
                expect(screen.getByPlaceholderText('Describe your vision...')).toBeInTheDocument();
            });

            const fileInput = screen.getByLabelText(/click to upload/i, {
                selector: 'input[type="file"]',
            });
            const file = new File(['dummy'], 'test.png', { type: 'image/png' });
            await user.upload(fileInput, file);

            const promptInput = screen.getByPlaceholderText('Describe your vision...');
            await user.type(promptInput, 'A beautiful landscape');

            const generateButton = screen.getByRole('button', { name: /^generate$/i });
            await user.click(generateButton);

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /^generate$/i })).not.toBeDisabled();
            });

            expect(api.api).toHaveBeenCalledWith(
                '/generations',
                expect.objectContaining({
                    method: 'POST',
                    body: expect.stringContaining('A beautiful landscape'),
                })
            );
        });

        it('should alert if no image is uploaded', async () => {
            const user = userEvent.setup();
            render(<Studio />);

            await waitFor(() => {
                expect(screen.getByPlaceholderText('Describe your vision...')).toBeInTheDocument();
            });

            const promptInput = screen.getByPlaceholderText('Describe your vision...');
            await user.type(promptInput, 'Test prompt');

            const generateButton = screen.getByRole('button', { name: /^generate$/i });
            await user.click(generateButton);

            expect(window.alert).toHaveBeenCalledWith('Please upload an image first');
        });

        it('should alert if prompt is empty', async () => {
            const user = userEvent.setup();
            render(<Studio />);

            await waitFor(() => {
                expect(screen.getByText(/click to upload/i)).toBeInTheDocument();
            });

            const fileInput = screen.getByLabelText(/click to upload/i, {
                selector: 'input[type="file"]',
            });
            const file = new File(['dummy'], 'test.png', { type: 'image/png' });
            await user.upload(fileInput, file);

            const generateButton = screen.getByRole('button', { name: /^generate$/i });
            await user.click(generateButton);

            expect(window.alert).toHaveBeenCalledWith('Please enter a prompt');
        });

        it('should allow selecting different styles', async () => {
            const user = userEvent.setup();
            render(<Studio />);

            await waitFor(() => {
                expect(screen.getByRole('combobox')).toBeInTheDocument();
            });

            const styleSelect = screen.getByRole('combobox') as HTMLSelectElement;

            await user.selectOptions(styleSelect, 'Editorial');
            expect(styleSelect.value).toBe('Editorial');

            await user.selectOptions(styleSelect, 'Avant-garde');
            expect(styleSelect.value).toBe('Avant-garde');

            await user.selectOptions(styleSelect, 'Casual');
            expect(styleSelect.value).toBe('Casual');
        });
    });

    describe('Error and Retry Handling', () => {
        it('should retry up to 3 times on server error', async () => {
            const user = userEvent.setup();

            let attemptCount = 0;
            vi.mocked(api.api).mockImplementation((endpoint: string, options?: any) => {
                if (endpoint === '/auth/me') return Promise.resolve(mockUser);
                if (endpoint === '/generations?limit=5') return Promise.resolve(mockHistory);
                if (endpoint === '/generations' && options?.method === 'POST') {
                    attemptCount++;
                    if (attemptCount < 3) {
                        const error: any = new Error('Server error');
                        error.status = 500;
                        return Promise.reject(error);
                    }
                    return Promise.resolve({
                        id: 3,
                        prompt: 'Test',
                        style: 'Classic',
                        imageUrl: '/uploads/1/image3.png',
                        createdAt: new Date().toISOString(),
                        status: 'succeeded',
                    });
                }
                return Promise.resolve({});
            });

            render(<Studio />);

            await waitFor(() => {
                expect(screen.getByPlaceholderText('Describe your vision...')).toBeInTheDocument();
            });

            const fileInput = screen.getByLabelText(/click to upload/i, {
                selector: 'input[type="file"]',
            });
            const file = new File(['dummy'], 'test.png', { type: 'image/png' });
            await user.upload(fileInput, file);

            const promptInput = screen.getByPlaceholderText('Describe your vision...');
            await user.type(promptInput, 'Test');

            const generateButton = screen.getByRole('button', { name: /^generate$/i });
            await user.click(generateButton);

            await waitFor(
                () => {
                    expect(attemptCount).toBe(3);
                },
                { timeout: 5000 }
            );
        });

        it('should show error alert after 3 failed attempts', async () => {
            const user = userEvent.setup();

            vi.mocked(api.api).mockImplementation((endpoint: string, options?: any) => {
                if (endpoint === '/auth/me') return Promise.resolve(mockUser);
                if (endpoint === '/generations?limit=5') return Promise.resolve(mockHistory);
                if (endpoint === '/generations' && options?.method === 'POST') {
                    const error: any = new Error('Server error');
                    error.status = 500;
                    return Promise.reject(error);
                }
                return Promise.resolve({});
            });

            render(<Studio />);

            await waitFor(() => {
                expect(screen.getByPlaceholderText('Describe your vision...')).toBeInTheDocument();
            });

            const fileInput = screen.getByLabelText(/click to upload/i, {
                selector: 'input[type="file"]',
            });
            const file = new File(['dummy'], 'test.png', { type: 'image/png' });
            await user.upload(fileInput, file);

            const promptInput = screen.getByPlaceholderText('Describe your vision...');
            await user.type(promptInput, 'Test');

            const generateButton = screen.getByRole('button', { name: /^generate$/i });
            await user.click(generateButton);

            await waitFor(
                () => {
                    expect(window.alert).toHaveBeenCalledWith('Server error');
                },
                { timeout: 5000 }
            );
        });

        it('should show specific error for model overload (503)', async () => {
            const user = userEvent.setup();

            vi.mocked(api.api).mockImplementation((endpoint: string, options?: any) => {
                if (endpoint === '/auth/me') return Promise.resolve(mockUser);
                if (endpoint === '/generations?limit=5') return Promise.resolve(mockHistory);
                if (endpoint === '/generations' && options?.method === 'POST') {
                    const error: any = new Error('Model overloaded');
                    error.status = 503;
                    return Promise.reject(error);
                }
                return Promise.resolve({});
            });

            render(<Studio />);

            await waitFor(() => {
                expect(screen.getByPlaceholderText('Describe your vision...')).toBeInTheDocument();
            });

            const fileInput = screen.getByLabelText(/click to upload/i, {
                selector: 'input[type="file"]',
            });
            const file = new File(['dummy'], 'test.png', { type: 'image/png' });
            await user.upload(fileInput, file);

            const promptInput = screen.getByPlaceholderText('Describe your vision...');
            await user.type(promptInput, 'Test');

            const generateButton = screen.getByRole('button', { name: /^generate$/i });
            await user.click(generateButton);

            await waitFor(
                () => {
                    expect(window.alert).toHaveBeenCalledWith(
                        'Model overloaded. We tried a few times — please try again later.'
                    );
                },
                { timeout: 5000 }
            );
        });

        it('should not retry on client errors (400)', async () => {
            const user = userEvent.setup();

            let attemptCount = 0;
            vi.mocked(api.api).mockImplementation((endpoint: string, options?: any) => {
                if (endpoint === '/auth/me') return Promise.resolve(mockUser);
                if (endpoint === '/generations?limit=5') return Promise.resolve(mockHistory);
                if (endpoint === '/generations' && options?.method === 'POST') {
                    attemptCount++;
                    const error: any = new Error('Bad request');
                    error.status = 400;
                    return Promise.reject(error);
                }
                return Promise.resolve({});
            });

            render(<Studio />);

            await waitFor(() => {
                expect(screen.getByPlaceholderText('Describe your vision...')).toBeInTheDocument();
            });

            const fileInput = screen.getByLabelText(/click to upload/i, {
                selector: 'input[type="file"]',
            });
            const file = new File(['dummy'], 'test.png', { type: 'image/png' });
            await user.upload(fileInput, file);

            const promptInput = screen.getByPlaceholderText('Describe your vision...');
            await user.type(promptInput, 'Test');

            const generateButton = screen.getByRole('button', { name: /^generate$/i });
            await user.click(generateButton);

            await waitFor(() => {
                expect(attemptCount).toBe(1);
                expect(window.alert).toHaveBeenCalledWith('Bad request');
            });
        });
    });

    describe('Abort Functionality', () => {
        it('should cancel in-flight request when abort is clicked', async () => {
            const user = userEvent.setup();

            vi.mocked(api.api).mockImplementation((endpoint: string, options?: any) => {
                if (endpoint === '/auth/me') return Promise.resolve(mockUser);
                if (endpoint === '/generations?limit=5') return Promise.resolve(mockHistory);
                if (endpoint === '/generations' && options?.method === 'POST') {
                    return new Promise((_, reject) => {
                        options.signal?.addEventListener('abort', () => {
                            const error: any = new Error('aborted');
                            error.name = 'AbortError';
                            reject(error);
                        });
                    });
                }
                return Promise.resolve({});
            });

            render(<Studio />);

            await waitFor(() => {
                expect(screen.getByPlaceholderText('Describe your vision...')).toBeInTheDocument();
            });

            const fileInput = screen.getByLabelText(/click to upload/i, {
                selector: 'input[type="file"]',
            });
            const file = new File(['dummy'], 'test.png', { type: 'image/png' });
            await user.upload(fileInput, file);

            const promptInput = screen.getByPlaceholderText('Describe your vision...');
            await user.type(promptInput, 'Test');

            const generateButton = screen.getByRole('button', { name: /^generate$/i });
            await user.click(generateButton);

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /generating/i })).toBeInTheDocument();
            });

            const abortButton = screen.getByRole('button', { name: /abort/i });
            await user.click(abortButton);

            await waitFor(() => {
                expect(window.alert).toHaveBeenCalledWith('Generation aborted');
            });

            expect(screen.getByRole('button', { name: /^generate$/i })).toBeInTheDocument();
        });

        it('should disable abort button when not generating', async () => {
            render(<Studio />);

            await waitFor(() => {
                const abortButton = screen.getByRole('button', { name: /abort/i });
                expect(abortButton).toBeDisabled();
            });
        });

        it('should enable abort button when generating', async () => {
            const user = userEvent.setup();

            vi.mocked(api.api).mockImplementation((endpoint: string, options?: any) => {
                if (endpoint === '/auth/me') return Promise.resolve(mockUser);
                if (endpoint === '/generations?limit=5') return Promise.resolve(mockHistory);
                if (endpoint === '/generations' && options?.method === 'POST') {
                    return new Promise(() => { });
                }
                return Promise.resolve({});
            });

            render(<Studio />);

            await waitFor(() => {
                expect(screen.getByPlaceholderText('Describe your vision...')).toBeInTheDocument();
            });

            const fileInput = screen.getByLabelText(/click to upload/i, {
                selector: 'input[type="file"]',
            });
            const file = new File(['dummy'], 'test.png', { type: 'image/png' });
            await user.upload(fileInput, file);

            const promptInput = screen.getByPlaceholderText('Describe your vision...');
            await user.type(promptInput, 'Test');

            const generateButton = screen.getByRole('button', { name: /^generate$/i });
            await user.click(generateButton);

            await waitFor(() => {
                const abortButton = screen.getByRole('button', { name: /abort/i });
                expect(abortButton).not.toBeDisabled();
            });
        });

        it('should not retry after abort', async () => {
            const user = userEvent.setup();

            let attemptCount = 0;
            vi.mocked(api.api).mockImplementation((endpoint: string, options?: any) => {
                if (endpoint === '/auth/me') return Promise.resolve(mockUser);
                if (endpoint === '/generations?limit=5') return Promise.resolve(mockHistory);
                if (endpoint === '/generations' && options?.method === 'POST') {
                    attemptCount++;
                    return new Promise((_, reject) => {
                        options.signal?.addEventListener('abort', () => {
                            const error: any = new Error('aborted');
                            error.name = 'AbortError';
                            reject(error);
                        });
                    });
                }
                return Promise.resolve({});
            });

            render(<Studio />);

            await waitFor(() => {
                expect(screen.getByPlaceholderText('Describe your vision...')).toBeInTheDocument();
            });

            const fileInput = screen.getByLabelText(/click to upload/i, {
                selector: 'input[type="file"]',
            });
            const file = new File(['dummy'], 'test.png', { type: 'image/png' });
            await user.upload(fileInput, file);

            const promptInput = screen.getByPlaceholderText('Describe your vision...');
            await user.type(promptInput, 'Test');

            const generateButton = screen.getByRole('button', { name: /^generate$/i });
            await user.click(generateButton);

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /generating/i })).toBeInTheDocument();
            });

            const abortButton = screen.getByRole('button', { name: /abort/i });
            await user.click(abortButton);

            await waitFor(() => {
                expect(window.alert).toHaveBeenCalledWith('Generation aborted');
            });

            expect(attemptCount).toBe(1);
        });
    });

    describe('History and Restore', () => {
        it('should display history items', async () => {
            render(<Studio />);

            await waitFor(() => {
                expect(screen.getByText('Test prompt')).toBeInTheDocument();
                expect(screen.getByText('Another prompt')).toBeInTheDocument();
            });
        });

        it('should display history images', async () => {
            render(<Studio />);

            await waitFor(() => {
                const images = screen.getAllByRole('img');
                const historyImages = images.filter((img) =>
                    img.getAttribute('src')?.includes('/api/uploads')
                );
                expect(historyImages.length).toBeGreaterThan(0);
            });
        });

        it('should restore prompt, style, and image when history item is clicked', async () => {
            const user = userEvent.setup();
            render(<Studio />);

            await waitFor(() => {
                expect(screen.getByText('Test prompt')).toBeInTheDocument();
            });

            const historyButtons = screen.getAllByRole('button');
            const historyItem = historyButtons.find((btn) => btn.textContent?.includes('Classic'));
            expect(historyItem).toBeInTheDocument();

            await user.click(historyItem!);

            const promptInput = screen.getByPlaceholderText(
                'Describe your vision...'
            ) as HTMLInputElement;
            expect(promptInput.value).toBe('Test prompt');

            const styleSelect = screen.getByRole('combobox') as HTMLSelectElement;
            expect(styleSelect.value).toBe('Classic');

            expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });

            await waitFor(() => {
                expect(screen.getByAltText('Upload preview')).toBeInTheDocument();
            });
        });

        it('should show empty state when no history', async () => {
            vi.mocked(api.api).mockImplementation((endpoint: string) => {
                if (endpoint === '/auth/me') return Promise.resolve(mockUser);
                if (endpoint === '/generations?limit=5') return Promise.resolve([]);
                return Promise.resolve({});
            });

            render(<Studio />);

            await waitFor(() => {
                expect(screen.getByText('No generations yet.')).toBeInTheDocument();
                expect(screen.getByText('Your creations will appear here')).toBeInTheDocument();
            });
        });

        it('should format creation date correctly', async () => {
            render(<Studio />);

            await waitFor(() => {
                const dateElements = screen.getAllByText(/\d{1,2}\/\d{1,2}\/\d{4}/);
                expect(dateElements.length).toBeGreaterThan(0);
            });
        });
    });

    describe('Logout', () => {
        it('should call logout and redirect when logout button is clicked', async () => {
            const user = userEvent.setup();
            render(<Studio />);

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
            });

            const logoutButton = screen.getByRole('button', { name: /logout/i });
            await user.click(logoutButton);

            expect(authService.logout).toHaveBeenCalled();
            expect(window.location.href).toBe('/login');
        });
    });
});