# syntax=docker/dockerfile:1

FROM node:26-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci
COPY . .
RUN npm run build

# nginx's own image that runs entirely as an unprivileged user, on port 8080.
FROM nginxinc/nginx-unprivileged:1.30-alpine
# Turned into conf.d/default.conf at start, with the variables below filled in.
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
# Where the API is: the backend service of Docker Compose, unless told otherwise.
ENV BACKEND_URL=http://backend:8080
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --retries=6 \
    CMD wget -q --spider http://127.0.0.1:8080/ || exit 1
