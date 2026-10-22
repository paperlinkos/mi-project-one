export type Severity = 'P0_CRITICAL' | 'P1_HIGH' | 'P2_MEDIUM' | 'INFO';

export type EventType = 'action_log' | 'metric_spike' | 'checklist_update' | 'chat' | 'system_alert';

export interface IncidentEvent {
  id: string;
  timestamp: number;
  sender_callsign: string;
  type: EventType;
  severity: Severity;
  title: string;
  details?: string;
  metadata?: Record<string, any>;
}

export interface ChecklistItem {
  id: string;
  title: string;
  completed: boolean;
  completedBy?: string;
  completedAt?: number;
  addedBy: string;
}

export interface MetricSpike {
  metric: 'cpu' | 'memory' | 'network' | 'auth_failures';
  value: number; // e.g., 99.4% or 14500 req/s
  unit: string;
  node: string;
  anomaly_score: number;
}

export interface ParticipantInfo {
  id: string;
  callsign: string;
  joined_at: number;
  last_ping: number;
}

export interface RoomStatus {
  room_id: string;
  codename: string;
  active_participants: number;
  expires_at: number;
  remaining_seconds: number;
  burn_on_empty: boolean;
  is_alive: boolean;
}

export interface EncryptedEnvelope {
  envelope_id: string;
  iv: string;
  ciphertext: string;
  sender_callsign: string;
  timestamp: number;
  msg_type: string;
}

export type ServerMessage =
  | { type: 'RELAY_ENVELOPE'; payload: EncryptedEnvelope }
  | {
      type: 'ROOM_STATE_SYNC';
      payload: {
        room_id: string;
        codename: string;
        participants: ParticipantInfo[];
        expires_at: number;
        server_time: number;
        burn_on_empty: boolean;
      };
    }
  | { type: 'HISTORY_SYNC'; payload: { envelopes: EncryptedEnvelope[] } }
  | {
      type: 'KILL_SWITCH_ENGAGED';
      payload: { reason: string; purged_at: number; code: number };
    }
  | { type: 'PONG'; payload: { client_time: number; server_time: number } }
  | {
      type: 'SYSTEM_ALERT';
      payload: { level: string; message: string; timestamp: number };
    };

export type ClientMessage =
  | { type: 'ENCRYPTED_ENVELOPE'; payload: EncryptedEnvelope }
  | { type: 'PRESENCE_PING'; payload: { callsign: string } }
  | { type: 'KILL_SWITCH'; payload: { reason: string } }
  | { type: 'PING'; payload: { client_time: number } };
