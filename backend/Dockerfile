FROM node:20-slim

WORKDIR /app

# Install curl for healthcheck
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Install pnpm
RUN npm install -g pnpm@8.15.0

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install

# Copy source
COPY . .

# Create directories with write permissions
RUN mkdir -p /app/data /app/uploads && \
    chmod -R 777 /app/data /app/uploads

EXPOSE 4000

CMD ["pnpm", "run", "dev"]