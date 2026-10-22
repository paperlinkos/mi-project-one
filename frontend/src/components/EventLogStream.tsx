import React, { useState, useRef, useEffect } from 'react';
import {
  Activity,
  Send,
  Lock,
  Unlock,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import type { IncidentEvent, Severity, EventType, EncryptedEnvelope } from '../types';
import { playTacticalClick } from '../crypto/audio';

interface EventLogStreamProps {
  events: IncidentEvent[];
  rawEnvelopes: EncryptedEnvelope[];
  onDispatchEvent: (event: Omit<IncidentEvent, 'id' | 'timestamp'>) => void;
  currentCallsign: string;
}

export const EventLogStream: React.FC<EventLogStreamProps> = ({
  events,
  rawEnvelopes,
  onDispatchEvent,
  currentCallsign,
}) => {
  const [filter, setFilter] = useState<string>('ALL');
  const [viewCiphertext, setViewCiphertext] = useState<boolean>(false);
  const [inputTitle, setInputTitle] = useState('');
  const [inputDetails, setInputDetails] = useState('');
  const [severity, setSeverity] = useState<Severity>('P1_HIGH');
  const eventType: EventType = 'action_log';
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new event
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events.length, viewCiphertext]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputTitle.trim()) return;

    playTacticalClick();
    onDispatchEvent({
      sender_callsign: currentCallsign,
      type: eventType,
      severity,
      title: inputTitle.trim(),
      details: inputDetails.trim() || undefined,
    });

    setInputTitle('');
    setInputDetails('');
  };

  const handleSimulateBreach = () => {
    playTacticalClick();
    onDispatchEvent({
      sender_callsign: 'SENTINEL-IDS',
      type: 'metric_spike',
      severity: 'P0_CRITICAL',
      title: 'ANOMALY DETECTED: Unauthorized Outbound TLS Tunnel on port 8443',
      details: 'Host: k8s-prod-worker-09 | Destination: 198.51.100.44 | Egress Volume: 840 MB/s',
      metadata: { metric: 'network', anomaly_score: 9.8, egress_rate: '840 MB/s' },
    });
  };

  const handleSimulateMetricSpike = () => {
    playTacticalClick();
    onDispatchEvent({
      sender_callsign: 'TELEMETRY-NODE',
      type: 'metric_spike',
      severity: 'P1_HIGH',
      title: 'DATABASE THREAD EXHAUSTION SPIKE',
      details: 'Primary replica connections saturated: 98.4% capacity. P99 query latency > 4200ms',
      metadata: { metric: 'cpu', anomaly_score: 8.4 },
    });
  };

  const filteredEvents = events.filter((ev) => {
    if (filter === 'P0') return ev.severity === 'P0_CRITICAL';
    if (filter === 'ACTIONS') return ev.type === 'action_log';
    if (filter === 'METRICS') return ev.type === 'metric_spike';
    return true;
  });

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '620px' }}>
      {/* Header & Controls */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Activity size={18} color="var(--accent-cyan)" />
          <h2 style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '0.04em' }}>
            ENCRYPTED EVENT LOG STREAM
          </h2>
          <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>
            AES-256-GCM
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Filter chips */}
          {['ALL', 'P0', 'ACTIONS', 'METRICS'].map((f) => (
            <button
              key={f}
              onClick={() => {
                playTacticalClick();
                setFilter(f);
              }}
              className="badge"
              style={{
                cursor: 'pointer',
                background: filter === f ? 'rgba(0, 240, 255, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                color: filter === f ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                border: filter === f ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
              }}
            >
              {f}
            </button>
          ))}

          {/* Ciphertext inspector toggle */}
          <button
            onClick={() => {
              playTacticalClick();
              setViewCiphertext(!viewCiphertext);
            }}
            className="btn btn-secondary"
            style={{ padding: '6px 10px', fontSize: '0.75rem', gap: '6px' }}
            title="Toggle between decrypted plaintext and raw encrypted payload on wire"
          >
            {viewCiphertext ? <Lock size={14} color="var(--accent-amber)" /> : <Unlock size={14} color="var(--accent-green)" />}
            <span>{viewCiphertext ? 'VIEW PLAINTEXT' : 'INSPECT CIPHERTEXT'}</span>
          </button>
        </div>
      </div>

      {/* Event Stream Body */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        {filteredEvents.length === 0 ? (
          <div
            style={{
              margin: 'auto',
              textAlign: 'center',
              color: 'var(--text-muted)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Lock size={28} opacity={0.4} />
            <span className="font-mono" style={{ fontSize: '0.85rem' }}>
              WAITING FOR ENCRYPTED TELEMETRY...
            </span>
          </div>
        ) : (
          filteredEvents.map((ev, index) => {
            const correspondingEnvelope = rawEnvelopes[index];

            return (
              <div
                key={ev.id}
                style={{
                  background:
                    ev.severity === 'P0_CRITICAL'
                      ? 'rgba(255, 23, 68, 0.08)'
                      : ev.severity === 'P1_HIGH'
                      ? 'rgba(255, 176, 0, 0.06)'
                      : 'rgba(255, 255, 255, 0.02)',
                  border:
                    ev.severity === 'P0_CRITICAL'
                      ? '1px solid rgba(255, 23, 68, 0.35)'
                      : ev.severity === 'P1_HIGH'
                      ? '1px solid rgba(255, 176, 0, 0.25)'
                      : '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  transition: 'all 0.2s ease',
                }}
              >
                {/* Event Metadata Row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', flexWrap: 'wrap', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      className={`badge ${
                        ev.severity === 'P0_CRITICAL'
                          ? 'badge-crimson'
                          : ev.severity === 'P1_HIGH'
                          ? 'badge-amber'
                          : 'badge-cyan'
                      }`}
                      style={{ fontSize: '0.65rem' }}
                    >
                      {ev.severity.replace('_', ' ')}
                    </span>

                    <span className="font-mono" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-cyan)' }}>
                      [{ev.sender_callsign}]
                    </span>

                    <span className="badge badge-muted" style={{ fontSize: '0.65rem' }}>
                      {ev.type.toUpperCase()}
                    </span>
                  </div>

                  <span className="font-mono" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {new Date(ev.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                {/* Content: Either Decrypted Plaintext or Raw Wire Ciphertext */}
                {viewCiphertext && correspondingEnvelope ? (
                  <div
                    className="font-mono"
                    style={{
                      background: 'rgba(0, 0, 0, 0.5)',
                      padding: '10px',
                      borderRadius: '6px',
                      fontSize: '0.7rem',
                      color: 'var(--accent-amber)',
                      overflowX: 'auto',
                    }}
                  >
                    <div><strong>IV (96-bit):</strong> {correspondingEnvelope.iv}</div>
                    <div style={{ marginTop: '4px', wordBreak: 'break-all' }}>
                      <strong>CIPHERTEXT + TAG:</strong> {correspondingEnvelope.ciphertext}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f0f4fc', marginBottom: ev.details ? '4px' : '0' }}>
                      {ev.title}
                    </div>
                    {ev.details && (
                      <div className="font-mono" style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                        {ev.details}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Quick Action Simulation Bar */}
      <div
        style={{
          padding: '8px 20px',
          background: 'rgba(0, 0, 0, 0.25)',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
        }}
      >
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
          SIMULATE:
        </span>
        <button
          type="button"
          onClick={handleSimulateBreach}
          className="btn btn-danger"
          style={{ padding: '4px 10px', fontSize: '0.7rem' }}
        >
          <AlertTriangle size={12} />
          P0 TUNNEL BREACH
        </button>
        <button
          type="button"
          onClick={handleSimulateMetricSpike}
          className="btn btn-secondary"
          style={{ padding: '4px 10px', fontSize: '0.7rem' }}
        >
          <Zap size={12} color="var(--accent-amber)" />
          DB SPIKE
        </button>
      </div>

      {/* Input Form */}
      <form
        onSubmit={handleSubmit}
        style={{
          padding: '14px 20px',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          gap: '10px',
          background: 'rgba(0, 0, 0, 0.4)',
        }}
      >
        <select
          value={severity}
          onChange={(e) => setSeverity(e.target.value as Severity)}
          className="font-mono"
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            color: severity === 'P0_CRITICAL' ? '#ff1744' : severity === 'P1_HIGH' ? '#ffb000' : '#00f0ff',
            border: '1px solid var(--border-subtle)',
            borderRadius: '6px',
            padding: '8px 10px',
            fontSize: '0.75rem',
            outline: 'none',
          }}
        >
          <option value="P0_CRITICAL">P0 CRITICAL</option>
          <option value="P1_HIGH">P1 HIGH</option>
          <option value="P2_MEDIUM">P2 MEDIUM</option>
          <option value="INFO">INFO LOG</option>
        </select>

        <input
          type="text"
          value={inputTitle}
          onChange={(e) => setInputTitle(e.target.value)}
          placeholder="Encrypt & broadcast operational action or finding..."
          className="font-mono"
          style={{
            flex: 1,
            background: 'rgba(0, 0, 0, 0.5)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '6px',
            padding: '8px 14px',
            color: '#fff',
            fontSize: '0.85rem',
            outline: 'none',
          }}
        />

        <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px' }}>
          <Send size={15} />
          <span>TRANSMIT</span>
        </button>
      </form>
    </div>
  );
};
