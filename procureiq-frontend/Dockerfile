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

# Install envsubst (part of gettext) for $PORT substitution
RUN apk add --no-cache gettext

# Copy built assets from stage 1
COPY --from=builder /app/dist /usr/share/nginx/html

# Write Nginx config template — uses PORT env var injected by Railway at runtime
RUN printf 'server {\n\
    listen ${PORT};\n\
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
}\n' > /etc/nginx/conf.d/default.conf.template

# Startup: substitute $PORT into nginx config, then start nginx
CMD sh -c "envsubst '\$PORT' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"
