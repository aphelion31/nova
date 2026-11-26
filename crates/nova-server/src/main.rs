mod api;
mod auth;
mod compat;
mod db;
mod rooms;
mod sfu;
mod web;
mod ws;

use anyhow::{Context, Result};
use auth::AuthConfig;
use axum::Router;
use nova_core::protocol::IceServerConfig;
use rooms::RoomRegistry;
use sfu::SfuHandle;
use std::env;
use std::net::{IpAddr, SocketAddr};
use std::path::PathBuf;
use std::sync::Arc;
use tokio::net::TcpListener;
use tracing::info;
use tracing_subscriber::EnvFilter;
use uuid::Uuid;

#[tokio::main]
async fn main() -> Result<()> {
    let filter =
        EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info,str0m=warn,tower_http=warn"));
    tracing_subscriber::fmt().with_env_filter(filter).init();

    let args: Vec<String> = env::args().collect();
    let database_url = env::var("DATABASE_URL").unwrap_or_else(|_| "sqlite://nova.db?mode=rwc".to_string());
    let frontend_url = env::var("FRONTEND_URL").unwrap_or_else(|_| "http://localhost:3000".to_string());
    let auth_cfg = Arc::new(AuthConfig {
        session_secret: env::var("SECRET_KEY_BASE")
            .unwrap_or_else(|_| "nova-dev-secret-change-me-in-production-64-bytes-minimum".to_string()),
        jwt_app_id: env::var("JWT_APP_ID").unwrap_or_else(|_| "nova-meet".to_string()),
        jwt_app_secret: env::var("JWT_APP_SECRET").unwrap_or_else(|_| "nova-jwt-dev-secret-change-me".to_string()),
        secure_cookies: frontend_url.starts_with("https://"),
    });

    match args.get(1).map(String::as_str) {
        Some("hash-password") => {
            let pw = args.get(2).context("usage: nova hash-password <password>")?;
            let hash = auth::hash_password(pw)?;
            println!("{hash}");
            return Ok(());
        }
        Some("seed") => {
            let email = args
                .get(2)
                .context("usage: nova seed <email> <password> [display_name]")?;
            let password = args
                .get(3)
                .context("usage: nova seed <email> <password> [display_name]")?;
            let display_name = args.get(4).map(String::as_str).unwrap_or("Nova Host");
            let pool = db::connect_and_migrate(&database_url).await?;
            if let Some(existing) = db::find_user_by_email(&pool, email).await? {
                println!("User {} already exists ({})", existing.email, existing.id);
                return Ok(());
            }
            let hash = auth::hash_password(password)?;
            let id = Uuid::new_v4().to_string();
            let user = db::create_user(&pool, &id, email, display_name, &hash, "host").await?;
            println!("Seeded host user {} ({})", user.email, user.id);
            return Ok(());
        }
        Some("token") => {
            let room = args
                .get(2)
                .context("usage: nova token <room> [--moderator] [--name <name>]")?;
            let moderator = args.iter().any(|a| a == "--moderator");
            let name = args
                .windows(2)
                .find(|w| w[0] == "--name")
                .map(|w| w[1].as_str())
                .unwrap_or("Host");
            let tok = auth::mint_room_jwt(&auth_cfg, room, name, None, moderator, 3600)?;
            println!("{tok}");
            return Ok(());
        }
        Some("serve") | None => {}
        Some(other) => {
            anyhow::bail!("unknown subcommand '{other}' (expected serve | seed | hash-password | token)");
        }
    }

    let pool = db::connect_and_migrate(&database_url).await?;
    let bind_str = env::var("BIND").unwrap_or_else(|_| "0.0.0.0:3000".to_string());
    let bind_addr: SocketAddr = bind_str
        .parse()
        .with_context(|| format!("invalid BIND address: {bind_str}"))?;
    let udp_bind = env::var("SFU_UDP_BIND").unwrap_or_else(|_| "0.0.0.0:10000".to_string());
    let public_ip = env::var("SFU_PUBLIC_IP")
        .ok()
        .and_then(|s| s.trim().parse::<IpAddr>().ok());
    let web_dir = PathBuf::from(env::var("WEB_DIR").unwrap_or_else(|_| "web/build/client".to_string()));
    let stun_url = env::var("STUN_URL")
        .ok()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty());

    let ice_servers = stun_url
        .clone()
        .map(|u| vec![IceServerConfig { urls: vec![u] }])
        .unwrap_or_default();

    let sfu = SfuHandle::spawn(&udp_bind, public_ip)?;
    let registry = RoomRegistry::new(pool.clone(), Arc::clone(&auth_cfg), sfu.clone(), ice_servers.clone());

    let app = Router::new()
        .merge(auth::routes(pool.clone(), Arc::clone(&auth_cfg)))
        .merge(api::routes(
            pool.clone(),
            Arc::clone(&auth_cfg),
            registry.clone(),
            sfu.clone(),
            ice_servers,
        ))
        .merge(ws::routes(registry, pool.clone(), Arc::clone(&auth_cfg)))
        .merge(compat::routes(frontend_url, stun_url))
        .merge(web::routes(pool.clone(), web_dir));

    let listener = TcpListener::bind(bind_addr)
        .await
        .with_context(|| format!("failed to bind HTTP listener on {bind_addr}"))?;
    let local_addr = listener.local_addr()?;
    info!("nova listening on http://{local_addr} (SFU UDP {})", sfu.udp_addr);

    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await
        .context("axum server error")?;

    sfu.shutdown();
    pool.close().await;
    Ok(())
}

async fn shutdown_signal() {
    let ctrl_c = async {
        let _ = tokio::signal::ctrl_c().await;
    };
    #[cfg(unix)]
    let terminate = async {
        if let Ok(mut sig) = tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate()) {
            sig.recv().await;
        }
    };
    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {}
        _ = terminate => {}
    }
    info!("shutting down nova gracefully");
}
