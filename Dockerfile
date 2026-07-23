FROM node:20-slim

# Install FFmpeg and build tools for native modules (better-sqlite3)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    ca-certificates \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy all source code
COPY . .

# Install all dependencies (npm workspaces auto-installs client + server)
RUN npm install --include=dev

# Build client static assets
RUN npm run build --workspace=client

# Build server TypeScript
RUN npm run build --workspace=server

# Create required directories
RUN mkdir -p uploads output thumbnails temp data

# Production settings
ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

# Start server (serves both API + client static files)
CMD ["npm", "run", "start", "--workspace=server"]
