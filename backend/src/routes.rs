use axum::extract::{Path, Query, State, WebSocketUpgrade};
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde::Deserialize;
use serde_json::json;

use crate::models::{CreateRoomRequest, PurgeReason};
use crate::state::RoomManager;
use crate::ws;

#[derive(Deserialize)]
pub struct WsQuery {
    pub callsign: Option<String>,
}

#[derive(Deserialize)]
pub struct KillRequest {
    pub reason: Option<String>,
}

/// Handler to initialize a new war room.
pub async fn create_room_handler(
    State(manager): State<RoomManager>,
    Json(payload): Json<CreateRoomRequest>,
) -> impl IntoResponse {
    let response = manager.create_room(payload).await;
    (StatusCode::CREATED, Json(response))
}

/// Handler to inspect war room status (non-sensitive metadata).
pub async fn get_room_status_handler(
    State(manager): State<RoomManager>,
    Path(room_id): Path<String>,
) -> Response {
    match manager.get_room_status(&room_id).await {
        Some(status) => (StatusCode::OK, Json(status)).into_response(),
        None => (
            StatusCode::GONE,
            Json(json!({
                "error": "ROOM_PURGED_OR_EXPIRED",
                "message": "This war room does not exist or has been permanently scrubbed from memory."
            })),
        )
            .into_response(),
    }
}

/// Handler for manual Kill Switch via REST endpoint.
pub async fn kill_room_handler(
    State(manager): State<RoomManager>,
    Path(room_id): Path<String>,
    Json(payload): Json<KillRequest>,
) -> Response {
    let reason = payload.reason.unwrap_or_else(|| "REST_API_KILL_SWITCH".to_string());
    manager.purge_room(&room_id, PurgeReason::ManualKillSwitch(reason.clone())).await;

    (
        StatusCode::OK,
        Json(json!({
            "status": "PURGED",
            "room_id": room_id,
            "reason": reason,
            "message": "All room memory has been scrubbed. Digital trail destroyed."
        })),
    )
        .into_response()
}

/// WebSocket upgrade handler.
pub async fn ws_handler(
    ws: WebSocketUpgrade,
    Path(room_id): Path<String>,
    Query(query): Query<WsQuery>,
    State(manager): State<RoomManager>,
) -> Response {
    // Check if room exists and is not purged before upgrading
    if manager.get_room(&room_id).is_none() {
        return (
            StatusCode::GONE,
            Json(json!({
                "error": "ROOM_UNAVAILABLE",
                "message": "Room does not exist or was destroyed."
            })),
        )
            .into_response();
    }

    ws.on_upgrade(move |socket| {
        ws::handle_socket(socket, room_id, query.callsign, manager)
    })
}

/// Health check endpoint (for server pingbacks and container readiness).
pub async fn health_check() -> impl IntoResponse {
    (
        StatusCode::OK,
        Json(json!({
            "status": "ONLINE",
            "service": "Operation Dead Drop Relay",
            "security": "Zero-Knowledge In-Memory Relay",
            "version": "1.0.0"
        })),
    )
}
