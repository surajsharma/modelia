FROM mcr.microsoft.com/playwright:v1.48.0-jammy

WORKDIR /app

# Install pnpm (match version - 10.18.2)
RUN npm install -g pnpm@10.18.2

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install

# Copy test files
COPY playwright.config.ts ./
COPY tests ./tests

# Generate test fixture (ensure it exists)
RUN mkdir -p tests/fixtures && \
    node tests/fixtures/create-image.mjs || echo "✅ Test fixture already exists"

CMD ["pnpm", "test:e2e"]