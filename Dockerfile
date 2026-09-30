FROM node:22-alpine AS frontend
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY index.html vite.config.js ./
COPY src ./src
COPY public ./public
COPY backend/content ./backend/content
RUN npm run build

FROM golang:1.26-alpine AS backend
WORKDIR /app
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend ./
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /zirva .

FROM alpine:3.23
RUN addgroup -S zirva && adduser -S -G zirva zirva && mkdir /data && chown zirva:zirva /data
COPY --from=backend /zirva /usr/local/bin/zirva
COPY --from=frontend /app/dist /site
ENV DATA_DIR=/data SITE_DIR=/site ADDR=:8080
USER zirva
EXPOSE 8080
VOLUME ["/data"]
CMD ["zirva"]
