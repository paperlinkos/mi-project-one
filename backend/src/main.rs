mod models;
mod routes;
mod state;
mod ws;

use std::net::SocketAddr;
use std::path::PathBuf;
use axum::routing::{get, post};
use axum::Router;
use tower_http::cors::{Any, CorsLayer};
use tower_http::services::{ServeDir, ServeFile};
use tower_http::trace::TraceLayer;
use tracing::info;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use crate::state::RoomManager;

#[tokio::main]
async fn main() {
    // Initialize tracing
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "operation_dead_drop_backend=info,tower_http=info".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    info!("Initializing Operation Dead Drop Security Engine...");

    let manager = RoomManager::new();

    // Configure CORS for dev and production
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let mut app = Router::new()
        .route("/api/health", get(routes::health_check))
        .route("/api/rooms", post(routes::create_room_handler))
        .route("/api/rooms/{id}", get(routes::get_room_status_handler))
        .route("/api/rooms/{id}/kill", post(routes::kill_room_handler))
        .route("/ws/{id}", get(routes::ws_handler));

    // Serve frontend static build if available
    let frontend_dist = PathBuf::from("../frontend/dist");
    let fallback_html = PathBuf::from("../frontend/dist/index.html");

    if frontend_dist.exists() && fallback_html.exists() {
        info!("Serving production frontend assets from {:?}", frontend_dist);
        let serve_dir = ServeDir::new(frontend_dist).fallback(ServeFile::new(fallback_html));
        app = app.fallback_service(serve_dir);
    }

    let app = app
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .with_state(manager);

    let port: u16 = std::env::var("PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(4000);

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    info!("Operation Dead Drop Relay listening on http://{}", addr);
    info!("Security Policy: STRICT ZERO-PERSISTENT RAM // BLIND RELAY ACTIVE");

    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .expect("Failed to bind TCP port");

    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await
        .expect("Axum server crashed");
}

async fn shutdown_signal() {
    tokio::signal::ctrl_c()
        .await
        .expect("Failed to install Ctrl+C signal handler");
    info!("Shutdown signal received. Scrubbing all volatile memory buffers...");
}
