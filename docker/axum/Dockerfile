FROM oven/bun:1.4.4-slim AS web-builder
WORKDIR /app/web
COPY web/package.json web/bun.lock* ./
RUN bun install
COPY web ./
RUN bun run typecheck && bun run build

FROM rust:1.98-bookworm AS builder
RUN apt-get update && apt-get install -y --no-install-recommends cmake make g++ pkg-config \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY Cargo.toml Cargo.lock ./
COPY crates/nova-core/Cargo.toml ./crates/nova-core/Cargo.toml
COPY crates/nova-server/Cargo.toml ./crates/nova-server/Cargo.toml
RUN mkdir -p crates/nova-core/src crates/nova-server/src && \
    echo 'pub fn _stub() {}' > crates/nova-core/src/lib.rs && \
    echo 'fn main() {}' > crates/nova-server/src/main.rs && \
    cargo build --release --locked -p nova-server && \
    rm -rf crates/nova-core/src crates/nova-server/src
COPY crates ./crates
RUN touch crates/nova-core/src/lib.rs crates/nova-server/src/main.rs && \
    cargo build --release --locked -p nova-server

FROM debian:bookworm-slim
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --gid 1001 nova && useradd --uid 1001 --gid nova --create-home nova \
    && install -d -o nova -g nova -m 750 /srv/nova/data
WORKDIR /srv/nova
COPY --from=builder /app/target/release/nova /usr/local/bin/nova
COPY --from=web-builder --chown=nova:nova /app/web/build/client /srv/nova/web/build/client
ENV BIND=0.0.0.0:3000 SFU_UDP_BIND=0.0.0.0:10000 WEB_DIR=/srv/nova/web/build/client DATABASE_URL=sqlite:///srv/nova/data/nova.db?mode=rwc HOME=/home/nova
USER nova
EXPOSE 3000/tcp
EXPOSE 10000/udp
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -fsS http://127.0.0.1:3000/health >/dev/null || exit 1
ENTRYPOINT ["/usr/local/bin/nova", "serve"]
