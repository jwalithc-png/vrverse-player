FROM node:20-slim

# Install FFmpeg and required media libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy root & workspace package files first for optimized Docker caching
COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/

# Install dependencies for all workspaces
RUN npm run install:all

# Copy full application source code
COPY . .

# Build client static assets and compile server TypeScript
RUN npm run build --workspace=client
RUN npm run build --workspace=server

# Set production environment variables
ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

# Start the unified backend server
CMD ["npm", "run", "start", "--workspace=server"]
