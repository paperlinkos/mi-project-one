use serde::{Deserialize, Serialize};
use zeroize::{Zeroize, ZeroizeOnDrop};

/// Request payload to create a new burn-on-read war room.
#[derive(Debug, Clone, Deserialize)]
pub struct CreateRoomRequest {
    /// Room Time-To-Live in seconds (e.g., 300, 900, 1800, 3600).
    pub ttl_seconds: Option<u64>,
    /// Whether the room should automatically burn after participants disconnect.
    pub burn_on_empty: Option<bool>,
    /// Optional classified codename (e.g., "BLACK-BRIAR-9").
    pub codename: Option<String>,
}

/// Response returned when a war room is successfully initialized in volatile RAM.
#[derive(Debug, Clone, Serialize)]
pub struct CreateRoomResponse {
    pub room_id: String,
    pub join_token: String,
    pub codename: String,
    pub expires_at: i64,
    pub burn_on_empty: bool,
    pub grace_period_seconds: u64,
}

/// Public status response for an existing room.
#[derive(Debug, Clone, Serialize)]
pub struct RoomStatusResponse {
    pub room_id: String,
    pub codename: String,
    pub active_participants: usize,
    pub expires_at: i64,
    pub remaining_seconds: i64,
    pub burn_on_empty: bool,
    pub is_alive: bool,
}

/// An encrypted envelope containing blind client-side ciphertext.
/// The server cannot read the payload, but scrubs this memory upon purge.
#[derive(Debug, Clone, Serialize, Deserialize, Zeroize, ZeroizeOnDrop)]
pub struct EncryptedEnvelope {
    pub envelope_id: String,
    pub iv: String,
    pub ciphertext: String,
    pub sender_callsign: String,
    pub timestamp: i64,
    pub msg_type: String, // "chat" | "metric_spike" | "checklist_update" | "pingback" | "action_log"
}

/// Participant info exposed to other operators in the war room.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParticipantInfo {
    pub id: String,
    pub callsign: String,
    pub joined_at: i64,
    pub last_ping: i64,
}

/// Incoming frames sent over WebSocket from the operator client.
#[derive(Debug, Clone, Deserialize)]
#[serde(tag = "type", content = "payload")]
pub enum ClientMessage {
    /// Encrypted data envelope to be blindly broadcast to all room peers.
    #[serde(rename = "ENCRYPTED_ENVELOPE")]
    EncryptedEnvelope(EncryptedEnvelope),

    /// Update participant callsign or presence.
    #[serde(rename = "PRESENCE_PING")]
    PresencePing {
        callsign: String,
    },

    /// Nuclear Kill Switch trigger initiated by an operator.
    #[serde(rename = "KILL_SWITCH")]
    KillSwitch {
        reason: String,
    },

    /// Ping for latency telemetry.
    #[serde(rename = "PING")]
    Ping {
        client_time: i64,
    },
}

/// Outgoing frames sent over WebSocket to operator clients.
#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type", content = "payload")]
pub enum ServerMessage {
    /// Broadcast of an encrypted envelope from another participant.
    #[serde(rename = "RELAY_ENVELOPE")]
    RelayEnvelope(EncryptedEnvelope),

    /// War room state synchronization (operator count, remaining time).
    #[serde(rename = "ROOM_STATE_SYNC")]
    RoomStateSync {
        room_id: String,
        codename: String,
        participants: Vec<ParticipantInfo>,
        expires_at: i64,
        server_time: i64,
        burn_on_empty: bool,
    },

    /// Historical backlog of encrypted envelopes sent upon initial connection.
    #[serde(rename = "HISTORY_SYNC")]
    HistorySync {
        envelopes: Vec<EncryptedEnvelope>,
    },

    /// Urgent notification: room has been permanently killed/purged.
    #[serde(rename = "KILL_SWITCH_ENGAGED")]
    KillSwitchEngaged {
        reason: String,
        purged_at: i64,
        code: u16,
    },

    /// Pong response for latency calculation.
    #[serde(rename = "PONG")]
    Pong {
        client_time: i64,
        server_time: i64,
    },

    /// Server warning notification (e.g. 60 seconds remaining countdown).
    #[allow(dead_code)]
    #[serde(rename = "SYSTEM_ALERT")]
    SystemAlert {
        level: String, // "warning" | "critical" | "info"
        message: String,
        timestamp: i64,
    },
}

/// Reasons why a room is purged and wiped from memory.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum PurgeReason {
    CountdownExpired,
    AllParticipantsDisconnected,
    ManualKillSwitch(String),
}

impl std::fmt::Display for PurgeReason {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            PurgeReason::CountdownExpired => write!(f, "EXPIRED_TTL_PURGED"),
            PurgeReason::AllParticipantsDisconnected => write!(f, "BURN_ON_DISCONNECT_ZERO_OPERATORS"),
            PurgeReason::ManualKillSwitch(r) => write!(f, "KILL_SWITCH_EXECUTED: {}", r),
        }
    }
}
