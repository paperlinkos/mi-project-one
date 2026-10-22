use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;

use chrono::{DateTime, Utc};
use dashmap::DashMap;
use tokio::sync::{broadcast, oneshot, RwLock};
use tracing::{info, warn};
use uuid::Uuid;
use zeroize::Zeroize;

use crate::models::{
    CreateRoomRequest, CreateRoomResponse, EncryptedEnvelope, ParticipantInfo, PurgeReason,
    RoomStatusResponse, ServerMessage,
};

/// Volatile in-memory War Room.
/// Never written to disk. Zeroized when purged.
pub struct Room {
    pub id: String,
    #[allow(dead_code)]
    pub join_token: String,
    pub codename: String,
    #[allow(dead_code)]
    pub created_at: DateTime<Utc>,
    pub expires_at: DateTime<Utc>,
    pub burn_on_empty: bool,
    pub grace_period_seconds: u64,
    pub participants: HashMap<String, ParticipantInfo>,
    pub tx: broadcast::Sender<Arc<ServerMessage>>,
    pub history: Vec<EncryptedEnvelope>,
    pub is_purged: bool,
    pub disconnect_cancel: Option<oneshot::Sender<()>>,
}

impl Drop for Room {
    fn drop(&mut self) {
        // Explicitly scrub history memory buffers on drop
        for env in self.history.iter_mut() {
            env.zeroize();
        }
        self.history.clear();
        self.participants.clear();
    }
}

#[derive(Clone)]
pub struct RoomManager {
    rooms: Arc<DashMap<String, Arc<RwLock<Room>>>>,
}

impl RoomManager {
    pub fn new() -> Self {
        let manager = Self {
            rooms: Arc::new(DashMap::new()),
        };

        // Start background expiry watchdog
        let m_clone = manager.clone();
        tokio::spawn(async move {
            loop {
                tokio::time::sleep(Duration::from_secs(3)).await;
                let now = Utc::now();
                let expired_ids: Vec<String> = m_clone
                    .rooms
                    .iter()
                    .filter_map(|entry| {
                        let room_lock = entry.value();
                        if let Ok(room) = room_lock.try_read() {
                            if now >= room.expires_at && !room.is_purged {
                                return Some(entry.key().clone());
                            }
                        }
                        None
                    })
                    .collect();

                for room_id in expired_ids {
                    info!("Room {} TTL expired. Executing auto-purge.", &room_id[..8]);
                    m_clone.purge_room(&room_id, PurgeReason::CountdownExpired).await;
                }
            }
        });

        manager
    }

    /// Generates random tactical NATO callsigns if none provided
    fn generate_codename() -> String {
        let prefixes = [
            "BLACK", "SHADOW", "CYPHER", "GHOST", "SPECTRE", "PHANTOM", "VIPER", "TITAN", "NEXUS",
            "VALKYRIE", "RAVEN", "ONYX", "ECHELON", "TALON", "IRON",
        ];
        let suffixes = [
            "DROP", "PROTOCOL", "BRIAR", "SENTINEL", "VECTOR", "GRID", "FORGE", "STRIKE",
            "HORIZON", "PULSE", "ZERO", "AEGIS", "DAGGER",
        ];

        let p_idx = rand::random::<usize>() % prefixes.len();
        let s_idx = rand::random::<usize>() % suffixes.len();
        let num = 10 + (rand::random::<u32>() % 90);

        format!("{}-{}-{}", prefixes[p_idx], suffixes[s_idx], num)
    }

    pub async fn create_room(&self, req: CreateRoomRequest) -> CreateRoomResponse {
        let room_id = Uuid::new_v4().to_string();
        let join_token = Uuid::new_v4().to_string();

        let ttl = req.ttl_seconds.unwrap_or(900); // Default 15 minutes (900s)
        let ttl_clamped = ttl.clamp(60, 86400); // Min 1 min, max 24h
        let burn_on_empty = req.burn_on_empty.unwrap_or(true);
        let grace_period = 60; // 60 seconds grace period as requested by operator

        let now = Utc::now();
        let expires_at = now + chrono::Duration::seconds(ttl_clamped as i64);

        let codename = req
            .codename
            .filter(|s| !s.trim().is_empty())
            .unwrap_or_else(Self::generate_codename);

        let (tx, _) = broadcast::channel(1024);

        let room = Room {
            id: room_id.clone(),
            join_token: join_token.clone(),
            codename: codename.clone(),
            created_at: now,
            expires_at,
            burn_on_empty,
            grace_period_seconds: grace_period,
            participants: HashMap::new(),
            tx,
            history: Vec::with_capacity(256),
            is_purged: false,
            disconnect_cancel: None,
        };

        self.rooms.insert(room_id.clone(), Arc::new(RwLock::new(room)));

        info!(
            "War Room initialized: {} (Codename: {}, TTL: {}s, Burn-on-empty: {})",
            &room_id[..8],
            codename,
            ttl_clamped,
            burn_on_empty
        );

        CreateRoomResponse {
            room_id,
            join_token,
            codename,
            expires_at: expires_at.timestamp_millis(),
            burn_on_empty,
            grace_period_seconds: grace_period,
        }
    }

    pub fn get_room(&self, id: &str) -> Option<Arc<RwLock<Room>>> {
        self.rooms.get(id).map(|r| r.value().clone())
    }

    pub async fn get_room_status(&self, id: &str) -> Option<RoomStatusResponse> {
        let room_arc = self.get_room(id)?;
        let room = room_arc.read().await;

        if room.is_purged {
            return None;
        }

        let now = Utc::now();
        let remaining = (room.expires_at - now).num_seconds().max(0);

        Some(RoomStatusResponse {
            room_id: room.id.clone(),
            codename: room.codename.clone(),
            active_participants: room.participants.len(),
            expires_at: room.expires_at.timestamp_millis(),
            remaining_seconds: remaining,
            burn_on_empty: room.burn_on_empty,
            is_alive: remaining > 0 && !room.is_purged,
        })
    }

    /// Irreversible room purge routine. Zeroes memory buffers and broadcasts termination.
    pub async fn purge_room(&self, id: &str, reason: PurgeReason) {
        if let Some((_, room_arc)) = self.rooms.remove(id) {
            let mut room = room_arc.write().await;
            room.is_purged = true;

            // 1. Cancel any pending disconnect countdown
            if let Some(cancel) = room.disconnect_cancel.take() {
                let _ = cancel.send(());
            }

            let reason_str = reason.to_string();
            info!(
                "PURGE EXECUTION: Room {} wiped from volatile RAM. Reason: {}",
                &id[..8],
                reason_str
            );

            // 2. Broadcast kill switch frame to all connected WebSocket clients
            let termination = Arc::new(ServerMessage::KillSwitchEngaged {
                reason: reason_str,
                purged_at: Utc::now().timestamp_millis(),
                code: 4000,
            });
            let _ = room.tx.send(termination);

            // 3. Zero out history buffer in RAM
            for envelope in room.history.iter_mut() {
                envelope.zeroize();
            }
            room.history.clear();
            room.participants.clear();

            // 4. Dropping `room` triggers explicit memory deallocation
            drop(room);
        }
    }

    /// Handle participant disconnection. If 0 participants remain, start 60s burn countdown.
    pub async fn on_participant_disconnect(&self, room_id: &str, participant_id: &str) {
        if let Some(room_arc) = self.get_room(room_id) {
            let mut room = room_arc.write().await;
            if room.is_purged {
                return;
            }

            room.participants.remove(participant_id);
            let active_count = room.participants.len();

            info!(
                "Operator {} disconnected from room {}. Active operators: {}",
                &participant_id[..8.min(participant_id.len())],
                &room_id[..8],
                active_count
            );

            // Broadcast updated state
            let participants_vec: Vec<ParticipantInfo> = room.participants.values().cloned().collect();
            let sync = Arc::new(ServerMessage::RoomStateSync {
                room_id: room.id.clone(),
                codename: room.codename.clone(),
                participants: participants_vec,
                expires_at: room.expires_at.timestamp_millis(),
                server_time: Utc::now().timestamp_millis(),
                burn_on_empty: room.burn_on_empty,
            });
            let _ = room.tx.send(sync);

            // If empty and burn_on_empty enabled, trigger grace period timer
            if active_count == 0 && room.burn_on_empty {
                warn!(
                    "Room {} is now empty. Initiating {}s Burn-on-Disconnect timer.",
                    &room_id[..8],
                    room.grace_period_seconds
                );

                let (tx, rx) = oneshot::channel();
                room.disconnect_cancel = Some(tx);

                let m_clone = self.clone();
                let r_id = room_id.to_string();
                let grace = room.grace_period_seconds;

                tokio::spawn(async move {
                    tokio::select! {
                        _ = tokio::time::sleep(Duration::from_secs(grace)) => {
                            info!("Grace period elapsed for empty room {}. Purging.", &r_id[..8]);
                            m_clone.purge_room(&r_id, PurgeReason::AllParticipantsDisconnected).await;
                        }
                        _ = rx => {
                            info!("Burn-on-Disconnect timer aborted for room {} (operator reconnected).", &r_id[..8]);
                        }
                    }
                });
            }
        }
    }

    /// Handle participant joining. Cancels any pending disconnect burn timer.
    pub async fn on_participant_join(&self, room_id: &str, participant: ParticipantInfo) -> Option<broadcast::Receiver<Arc<ServerMessage>>> {
        let room_arc = self.get_room(room_id)?;
        let mut room = room_arc.write().await;
        if room.is_purged {
            return None;
        }

        // Cancel pending burn timer if any
        if let Some(cancel) = room.disconnect_cancel.take() {
            let _ = cancel.send(());
            info!("Cancelled Burn-on-Disconnect countdown for room {}", &room_id[..8]);
        }

        let rx = room.tx.subscribe();
        room.participants.insert(participant.id.clone(), participant);

        // Broadcast updated presence to all clients
        let participants_vec: Vec<ParticipantInfo> = room.participants.values().cloned().collect();
        let sync = Arc::new(ServerMessage::RoomStateSync {
            room_id: room.id.clone(),
            codename: room.codename.clone(),
            participants: participants_vec,
            expires_at: room.expires_at.timestamp_millis(),
            server_time: Utc::now().timestamp_millis(),
            burn_on_empty: room.burn_on_empty,
        });
        let _ = room.tx.send(sync);

        Some(rx)
    }
}
