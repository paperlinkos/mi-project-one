import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { Lobby } from './components/Lobby';
import { EventLogStream } from './components/EventLogStream';
import { ContainmentChecklist } from './components/ContainmentChecklist';
import { MetricTelemetry } from './components/MetricTelemetry';
import { KillSwitchModal } from './components/KillSwitchModal';
import { PurgedScreen } from './components/PurgedScreen';
import type {
  IncidentEvent,
  ChecklistItem,
  ParticipantInfo,
  ServerMessage,
  ClientMessage,
  EncryptedEnvelope,
} from './types';
import { importRoomKey, encryptData, decryptData } from './crypto/aes';
import { playPacketChirp, playKillSwitchGlitch } from './crypto/audio';
import './App.css';

const INITIAL_CHECKLIST: ChecklistItem[] = [
  {
    id: 'chk-1',
    title: 'Isolate compromised node network interfaces & egress BGP tunnels',
    completed: false,
    addedBy: 'SYSTEM_RUNBOOK',
  },
  {
    id: 'chk-2',
    title: 'Revoke active OAuth tokens, IAM access keys & root JWT sessions',
    completed: false,
    addedBy: 'SYSTEM_RUNBOOK',
  },
  {
    id: 'chk-3',
    title: 'Take forensic RAM memory dump of infected worker nodes',
    completed: false,
    addedBy: 'SYSTEM_RUNBOOK',
  },
  {
    id: 'chk-4',
    title: 'Verify immutable cold backups & rotate root KMS master keys',
    completed: false,
    addedBy: 'SYSTEM_RUNBOOK',
  },
  {
    id: 'chk-5',
    title: 'Deploy sanitized hotfix rollback container image v2.4.1',
    completed: false,
    addedBy: 'SYSTEM_RUNBOOK',
  },
];

export const App: React.FC = () => {
  // Session State
  const [roomId, setRoomId] = useState<string | null>(null);
  const [cryptoKey, setCryptoKey] = useState<CryptoKey | null>(null);
  const [callsign, setCallsign] = useState<string>('OPERATOR-01');

  // Room Status State
  const [codename, setCodename] = useState<string>('CLASSIFIED');
  const [expiresAt, setExpiresAt] = useState<number>(Date.now() + 900000);
  const [participants, setParticipants] = useState<ParticipantInfo[]>([]);
  const [latencyMs, setLatencyMs] = useState<number>(12);

  // War Room Data
  const [events, setEvents] = useState<IncidentEvent[]>([]);
  const [rawEnvelopes, setRawEnvelopes] = useState<EncryptedEnvelope[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>(INITIAL_CHECKLIST);

  // Purge / Kill Switch State
  const [isPurged, setIsPurged] = useState<boolean>(false);
  const [purgeReason, setPurgeReason] = useState<string>('');
  const [killModalOpen, setKillModalOpen] = useState<boolean>(false);

  // WebSocket Ref
  const wsRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<any>(null);

  // 1. Parse Hash Fragment on Load or Change
  const parseUrlHash = useCallback(async () => {
    const hash = window.location.hash.startsWith('#')
      ? window.location.hash.slice(1)
      : window.location.hash;

    if (!hash) {
      setRoomId(null);
      setCryptoKey(null);
      return;
    }

    const params = new URLSearchParams(hash);
    const rId = params.get('room');
    const key = params.get('key');

    if (rId && key) {
      try {
        const imported = await importRoomKey(key);
        setRoomId(rId);
        setCryptoKey(imported);
      } catch (err) {
        console.error('Failed to import cryptographic key from URL fragment:', err);
      }
    }
  }, []);

  useEffect(() => {
    parseUrlHash();
    window.addEventListener('hashchange', parseUrlHash);
    return () => window.removeEventListener('hashchange', parseUrlHash);
  }, [parseUrlHash]);

  // 2. Establish WebSocket Blind Relay Connection
  useEffect(() => {
    if (!roomId || !cryptoKey) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/${roomId}?callsign=${encodeURIComponent(callsign)}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      // Start ping loop
      pingIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          const pingMsg: ClientMessage = {
            type: 'PING',
            payload: { client_time: Date.now() },
          };
          ws.send(JSON.stringify(pingMsg));
        }
      }, 5000);
    };

    ws.onmessage = async (evt) => {
      try {
        const msg: ServerMessage = JSON.parse(evt.data);

        switch (msg.type) {
          case 'ROOM_STATE_SYNC': {
            setCodename(msg.payload.codename);
            setParticipants(msg.payload.participants);
            setExpiresAt(msg.payload.expires_at);
            break;
          }
          case 'RELAY_ENVELOPE': {
            const envelope = msg.payload;
            setRawEnvelopes((prev) => [...prev, envelope]);

            try {
              const decrypted = await decryptData<any>(
                cryptoKey,
                envelope.iv,
                envelope.ciphertext,
                roomId
              );

              if (envelope.msg_type === 'checklist_update') {
                setChecklist(decrypted.checklist);
              } else {
                setEvents((prev) => [
                  ...prev,
                  {
                    id: envelope.envelope_id,
                    timestamp: envelope.timestamp,
                    sender_callsign: envelope.sender_callsign,
                    type: envelope.msg_type as any,
                    severity: decrypted.severity || 'INFO',
                    title: decrypted.title,
                    details: decrypted.details,
                    metadata: decrypted.metadata,
                  },
                ]);
                playPacketChirp();
              }
            } catch (decErr) {
              console.warn('Failed to decrypt incoming envelope (bad key or corrupted):', decErr);
            }
            break;
          }
          case 'HISTORY_SYNC': {
            const envelopes = msg.payload.envelopes;
            setRawEnvelopes(envelopes);

            const decryptedEvents: IncidentEvent[] = [];
            let latestChecklist = INITIAL_CHECKLIST;

            for (const env of envelopes) {
              try {
                const dec = await decryptData<any>(cryptoKey, env.iv, env.ciphertext, roomId);
                if (env.msg_type === 'checklist_update') {
                  latestChecklist = dec.checklist;
                } else {
                  decryptedEvents.push({
                    id: env.envelope_id,
                    timestamp: env.timestamp,
                    sender_callsign: env.sender_callsign,
                    type: env.msg_type as any,
                    severity: dec.severity || 'INFO',
                    title: dec.title,
                    details: dec.details,
                    metadata: dec.metadata,
                  });
                }
              } catch (e) {
                console.warn('Historical envelope decryption failed:', e);
              }
            }

            setEvents(decryptedEvents);
            setChecklist(latestChecklist);
            break;
          }
          case 'KILL_SWITCH_ENGAGED': {
            playKillSwitchGlitch();
            setIsPurged(true);
            setPurgeReason(msg.payload.reason);
            ws.close(4000, 'PURGED');
            break;
          }
          case 'PONG': {
            const roundTrip = Math.max(1, Date.now() - msg.payload.client_time);
            setLatencyMs(roundTrip);
            break;
          }
        }
      } catch (err) {
        console.error('Error processing WebSocket message:', err);
      }
    };

    ws.onclose = (e) => {
      clearInterval(pingIntervalRef.current);
      if (e.code === 4000 || isPurged) {
        setIsPurged(true);
      }
    };

    return () => {
      clearInterval(pingIntervalRef.current);
      ws.close();
    };
  }, [roomId, cryptoKey, callsign, isPurged]);

  // 3. Dispatch Encrypted Event Envelope
  const dispatchEvent = async (eventData: Omit<IncidentEvent, 'id' | 'timestamp'>) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !cryptoKey || !roomId) {
      return;
    }

    try {
      const envelopeId = crypto.randomUUID();
      const timestamp = Date.now();

      // Client-side AES-256-GCM encryption
      const { iv, ciphertext } = await encryptData(
        cryptoKey,
        {
          title: eventData.title,
          details: eventData.details,
          severity: eventData.severity,
          metadata: eventData.metadata,
        },
        roomId // Bind room ID as AAD to prevent replay across war rooms
      );

      const envelope: EncryptedEnvelope = {
        envelope_id: envelopeId,
        iv,
        ciphertext,
        sender_callsign: eventData.sender_callsign,
        timestamp,
        msg_type: eventData.type,
      };

      const msg: ClientMessage = {
        type: 'ENCRYPTED_ENVELOPE',
        payload: envelope,
      };

      wsRef.current.send(JSON.stringify(msg));
    } catch (err) {
      console.error('Failed to encrypt event payload:', err);
    }
  };

  // 4. Dispatch Encrypted Checklist Update
  const syncChecklist = async (updatedChecklist: ChecklistItem[]) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !cryptoKey || !roomId) {
      return;
    }

    try {
      const { iv, ciphertext } = await encryptData(
        cryptoKey,
        { checklist: updatedChecklist },
        roomId
      );

      const envelope: EncryptedEnvelope = {
        envelope_id: crypto.randomUUID(),
        iv,
        ciphertext,
        sender_callsign: callsign,
        timestamp: Date.now(),
        msg_type: 'checklist_update',
      };

      const msg: ClientMessage = {
        type: 'ENCRYPTED_ENVELOPE',
        payload: envelope,
      };

      wsRef.current.send(JSON.stringify(msg));
    } catch (err) {
      console.error('Failed to encrypt checklist payload:', err);
    }
  };

  const handleToggleChecklist = (id: string) => {
    const updated = checklist.map((item) => {
      if (item.id === id) {
        const nextState = !item.completed;
        return {
          ...item,
          completed: nextState,
          completedBy: nextState ? callsign : undefined,
          completedAt: nextState ? Date.now() : undefined,
        };
      }
      return item;
    });
    setChecklist(updated);
    syncChecklist(updated);
  };

  const handleAddChecklistItem = (title: string) => {
    const newItem: ChecklistItem = {
      id: `chk-${Date.now()}`,
      title,
      completed: false,
      addedBy: callsign,
    };
    const updated = [...checklist, newItem];
    setChecklist(updated);
    syncChecklist(updated);
  };

  const handleDeleteChecklistItem = (id: string) => {
    const updated = checklist.filter((item) => item.id !== id);
    setChecklist(updated);
    syncChecklist(updated);
  };

  // 5. Execute Kill Switch
  const handleExecuteKill = async (reason: string) => {
    setKillModalOpen(false);
    if (!roomId) return;

    try {
      // 1. Broadcast via WebSocket if open
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        const killMsg: ClientMessage = {
          type: 'KILL_SWITCH',
          payload: { reason },
        };
        wsRef.current.send(JSON.stringify(killMsg));
      }

      // 2. Call REST endpoint fallback
      await fetch(`/api/rooms/${roomId}/kill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
    } catch (e) {
      console.error('Kill switch network error:', e);
    } finally {
      setIsPurged(true);
      setPurgeReason(reason);
    }
  };

  const handleJoinFromLobby = (newRoomId: string, newKey: string, newCallsign: string) => {
    setCallsign(newCallsign);
    window.location.hash = `#room=${newRoomId}&key=${newKey}`;
  };

  const handleResetSession = () => {
    window.location.hash = '';
    setRoomId(null);
    setCryptoKey(null);
    setIsPurged(false);
    setEvents([]);
    setRawEnvelopes([]);
    setChecklist(INITIAL_CHECKLIST);
  };

  // Render Purged Screen if room was terminated
  if (isPurged) {
    return <PurgedScreen reason={purgeReason || 'ALL PARTICIPANTS DISCONNECTED'} onReset={handleResetSession} />;
  }

  // Render Lobby if no active room in URL hash
  if (!roomId || !cryptoKey) {
    return <Lobby onJoinRoom={handleJoinFromLobby} />;
  }

  return (
    <div className="app-shell" style={{ display: 'flex', flexDirection: 'column' }}>
      {/* HUD Header */}
      <Header
        codename={codename}
        roomId={roomId}
        expiresAt={expiresAt}
        participants={participants}
        currentCallsign={callsign}
        onOpenKillSwitch={() => setKillModalOpen(true)}
        latencyMs={latencyMs}
      />

      {/* Main War Room Dashboard Layout */}
      <main className="app-main">
        {/* Metric Telemetry Row */}
        <div style={{ marginBottom: '20px' }}>
          <MetricTelemetry />
        </div>

        {/* Two-Column Grid: Event Log Stream vs Containment Checklist */}
        <div className="terminal-grid">
          {/* Left Column: Live Encrypted Event Log */}
          <div>
            <EventLogStream
              events={events}
              rawEnvelopes={rawEnvelopes}
              onDispatchEvent={dispatchEvent}
              currentCallsign={callsign}
            />
          </div>

          {/* Right Column: Collaborative Containment Runbook */}
          <div>
            <ContainmentChecklist
              items={checklist}
              onToggleItem={handleToggleChecklist}
              onAddItem={handleAddChecklistItem}
              onDeleteItem={handleDeleteChecklistItem}
            />
          </div>
        </div>
      </main>

      {/* Kill Switch Modal */}
      <KillSwitchModal
        isOpen={killModalOpen}
        onClose={() => setKillModalOpen(false)}
        onExecuteKill={handleExecuteKill}
      />
    </div>
  );
};

export default App;
