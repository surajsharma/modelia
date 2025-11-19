FROM node:20-slim

WORKDIR /app

# Install dependencies for Sharp
RUN apt-get update && \
    apt-get install -y \
    curl \
    python3 \
    make \
    g++ \
    libvips-dev \
    && rm -rf /var/lib/apt/lists/*

# Install pnpm
RUN npm install -g pnpm@10.18.2

# Copy package files and npmrc
COPY package.json pnpm-lock.yaml* .npmrc* ./

# Install dependencies with build scripts enabled
RUN pnpm config set enable-pre-post-scripts true && \
    pnpm install --frozen-lockfile

# Copy source
COPY . .

# Create directories
RUN mkdir -p /app/data /app/uploads && \
    chmod -R 777 /app/data /app/uploads

EXPOSE 4000

CMD ["pnpm", "run", "dev"]