# Multi-stage production Dockerfile for the React frontend.
# Stage 1: builds the Vite app.
# Stage 2: serves it with Nginx (static files only — no Node.js in production).

# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Accept build-time API base URL (defaults to relative /api/v1 — proxied by Nginx)
ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY package*.json ./
RUN npm ci --prefer-offline

COPY . .
RUN npm run build

# ── Stage 2: serve static files ───────────────────────────────────────────────
FROM nginx:1.25-alpine AS runtime

# Copy built assets from stage 1
COPY --from=builder /app/dist /usr/share/nginx/html

# Minimal nginx config for SPA (React Router) — index.html fallback
RUN printf 'server {\n\
    listen 80;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
    gzip on;\n\
    gzip_types text/plain text/css application/json application/javascript font/woff2;\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
    location ~* \\.(js|css|woff2?|svg|png|jpg|ico)$ {\n\
        expires 1y;\n\
        add_header Cache-Control "public, immutable";\n\
    }\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80
