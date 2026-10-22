export type NoiseType = 'off' | 'brown' | 'pink' | 'white';

export type DisguiseMode = 'off' | 'deep_operative' | 'vocoder' | 'whisper';

export interface CloakingSettings {
  noiseType: NoiseType;
  noiseGain: number; // 0.0 to 0.4
  disguiseMode: DisguiseMode;
  disguiseIntensity: number; // 0.0 to 1.0
  tripwireThresholdDb: number; // -60 to -10 dB
  tripwireEnabled: boolean;
  localMonitor: boolean; // listen to own masked audio (muted by default)
}

export interface AudioTelemetry {
  inputRmsDb: number;
  outputRmsDb: number;
  peakFreqHz: number;
  isBreach: boolean;
  snrEstimateDb: number;
}

export type P2PState =
  | 'STANDBY'
  | 'CONNECTING_SIGNAL'
  | 'WAITING_PEER'
  | 'NEGOTIATING_SDP'
  | 'ICE_GATHERING'
  | 'P2P_DIRECT_LIVE'
  | 'TERMINATED'
  | 'ROOM_FULL';

export interface SignalMessage {
  type: 'join' | 'peer_joined' | 'peer_left' | 'offer' | 'answer' | 'candidate' | 'room_full' | 'ping' | 'pong';
  room: string;
  sender: string;
  target?: string;
  payload?: any;
}
