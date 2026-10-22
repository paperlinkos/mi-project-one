use std::time::Duration;

use axum::extract::ws::{Message, WebSocket};
use chrono::Utc;
use futures::{SinkExt, StreamExt};
use tokio::sync::mpsc;
use tracing::{error, info, warn};
use uuid::Uuid;

use crate::models::{
    ClientMessage, ParticipantInfo, PurgeReason, ServerMessage,
};
use crate::state::RoomManager;

pub async fn handle_socket(
    socket: WebSocket,
    room_id: String,
    callsign: Option<String>,
    manager: RoomManager,
) {
    let participant_id = Uuid::new_v4().to_string();
    let initial_callsign = callsign
        .filter(|s| !s.trim().is_empty())
        .unwrap_or_else(|| {
            let num = 10 + (rand::random::<u32>() % 90);
            format!("OPERATOR-{}", num)
        });

    let now_ms = Utc::now().timestamp_millis();
    let participant = ParticipantInfo {
        id: participant_id.clone(),
        callsign: initial_callsign.clone(),
        joined_at: now_ms,
        last_ping: now_ms,
    };

    // Attempt to register participant and obtain broadcast receiver
    let mut rx = match manager
        .on_participant_join(&room_id, participant.clone())
        .await
    {
        Some(receiver) => receiver,
        None => {
            warn!(
                "Rejected connection to dead or non-existent room: {}",
                &room_id[..8.min(room_id.len())]
            );
            return;
        }
    };

    info!(
        "Operator '{}' connected to room {}",
        initial_callsign,
        &room_id[..8.min(room_id.len())]
    );

    let (mut ws_sender, mut ws_receiver) = socket.split();

    // Channel for sending serialized messages to client
    let (tx_out, mut rx_out) = mpsc::channel::<Message>(256);

    // Spawn writer task
    let writer_task = tokio::spawn(async move {
        while let Some(msg) = rx_out.recv().await {
            if ws_sender.send(msg).await.is_err() {
                break;
            }
        }
    });

    // Send initial history backlog so this participant can decrypt all past incident logs
    if let Some(room_arc) = manager.get_room(&room_id) {
        let history_snapshot = {
            let room = room_arc.read().await;
            room.history.clone()
        };

        let history_msg = ServerMessage::HistorySync {
            envelopes: history_snapshot,
        };
        if let Ok(json) = serde_json::to_string(&history_msg) {
            let _ = tx_out.send(Message::Text(json.into())).await;
        }
    }

    // Task for forwarding broadcast messages from room to client
    let tx_out_clone = tx_out.clone();
    let broadcast_task = tokio::spawn(async move {
        while let Ok(server_msg) = rx.recv().await {
            if let Ok(json) = serde_json::to_string(&*server_msg) {
                if tx_out_clone.send(Message::Text(json.into())).await.is_err() {
                    break;
                }
            }
            // If room was killed, break the loop
            if matches!(*server_msg, ServerMessage::KillSwitchEngaged { .. }) {
                break;
            }
        }
    });

    // Heartbeat ping interval
    let tx_out_ping = tx_out.clone();
    let ping_task = tokio::spawn(async move {
        loop {
            tokio::time::sleep(Duration::from_secs(20)).await;
            if tx_out_ping.send(Message::Ping(vec![].into())).await.is_err() {
                break;
            }
        }
    });

    // Reader task: process client messages
    let m_clone = manager.clone();
    let r_id = room_id.clone();
    let p_id = participant_id.clone();

    while let Some(result) = ws_receiver.next().await {
        match result {
            Ok(Message::Text(text)) => {
                match serde_json::from_str::<ClientMessage>(&text) {
                    Ok(ClientMessage::EncryptedEnvelope(mut env)) => {
                        // Bind accurate server timestamp if missing
                        if env.timestamp == 0 {
                            env.timestamp = Utc::now().timestamp_millis();
                        }

                        if let Some(room_arc) = m_clone.get_room(&r_id) {
                            let mut room = room_arc.write().await;
                            if !room.is_purged {
                                // Store in volatile history buffer (limit to 500 items)
                                if room.history.len() >= 500 {
                                    room.history.remove(0);
                                }
                                room.history.push(env.clone());

                                // Blindly relay to all connected room participants
                                let relay = std::sync::Arc::new(ServerMessage::RelayEnvelope(env));
                                let _ = room.tx.send(relay);
                            }
                        }
                    }
                    Ok(ClientMessage::KillSwitch { reason }) => {
                        warn!(
                            "OPERATOR TRIGGERED KILL SWITCH: Room {}, Reason: {}",
                            &r_id[..8.min(r_id.len())],
                            reason
                        );
                        m_clone
                            .purge_room(&r_id, PurgeReason::ManualKillSwitch(reason))
                            .await;
                        break;
                    }
                    Ok(ClientMessage::Ping { client_time }) => {
                        let pong = ServerMessage::Pong {
                            client_time,
                            server_time: Utc::now().timestamp_millis(),
                        };
                        if let Ok(json) = serde_json::to_string(&pong) {
                            let _ = tx_out.send(Message::Text(json.into())).await;
                        }
                    }
                    Ok(ClientMessage::PresencePing { callsign }) => {
                        if let Some(room_arc) = m_clone.get_room(&r_id) {
                            let mut room = room_arc.write().await;
                            if let Some(p) = room.participants.get_mut(&p_id) {
                                p.callsign = callsign;
                                p.last_ping = Utc::now().timestamp_millis();
                            }
                        }
                    }
                    Err(err) => {
                        warn!("Malformed WebSocket client frame: {}", err);
                    }
                }
            }
            Ok(Message::Ping(payload)) => {
                let _ = tx_out.send(Message::Pong(payload)).await;
            }
            Ok(Message::Pong(_)) => {}
            Ok(Message::Close(_)) => {
                break;
            }
            Err(e) => {
                error!("WebSocket transport error: {}", e);
                break;
            }
            _ => {}
        }
    }

    // Clean up tasks
    broadcast_task.abort();
    ping_task.abort();
    writer_task.abort();

    // Signal disconnect to manager
    manager.on_participant_disconnect(&room_id, &participant_id).await;
}
