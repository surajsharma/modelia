FROM mcr.microsoft.com/playwright:v1.48.0-jammy

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@8.15.0

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install

# Copy test files
COPY playwright.config.ts ./
COPY tests ./tests

# Generate test fixture
RUN node tests/fixtures/create-image.mjs

CMD ["pnpm", "test:e2e"]