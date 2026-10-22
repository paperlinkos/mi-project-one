import React from 'react';
import { Skull, RefreshCw, CheckCircle } from 'lucide-react';
import { playTacticalClick } from '../crypto/audio';

interface PurgedScreenProps {
  reason: string;
  onReset: () => void;
}

export const PurgedScreen: React.FC<PurgedScreenProps> = ({ reason, onReset }) => {
  return (
    <div
      style={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        className="glass-panel glass-panel-glow-crimson"
        style={{
          maxWidth: '680px',
          width: '100%',
          padding: '40px',
          textAlign: 'center',
          background: 'rgba(12, 6, 9, 0.95)',
          position: 'relative',
        }}
      >
        {/* Skull Icon */}
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(255, 23, 68, 0.15)',
            border: '2px solid #ff1744',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto',
            color: '#ff1744',
          }}
        >
          <Skull size={34} />
        </div>

        <div style={{ display: 'inline-block', marginBottom: '8px' }}>
          <span className="badge badge-crimson" style={{ padding: '6px 14px' }}>
            OPERATION TERMINATED // 410 GONE
          </span>
        </div>

        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', marginBottom: '12px', letterSpacing: '0.02em' }}>
          WAR ROOM DISAVOWED & EXPUNGED
        </h1>

        <p style={{ color: '#ff8a9e', fontSize: '0.95rem', marginBottom: '24px', lineHeight: '1.6' }}>
          All in-memory buffers have been zeroized by the backend engine. All cryptographic keys have been scrubbed from local memory.
          No forensic or digital trails remain.
        </p>

        {/* Terminal Log Box */}
        <div
          className="font-mono"
          style={{
            background: 'rgba(0, 0, 0, 0.7)',
            border: '1px solid rgba(255, 23, 68, 0.3)',
            borderRadius: '8px',
            padding: '16px',
            textAlign: 'left',
            fontSize: '0.75rem',
            color: 'var(--text-secondary)',
            marginBottom: '28px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <div style={{ color: '#ff1744' }}>
            &gt; PURGE_REASON: {reason}
          </div>
          <div>&gt; ZEROIZE_ROUTINE: [OK] Volatile RAM overwritten with zeroes (0x00)</div>
          <div>&gt; WEBSOCKET_CHANNELS: [SEVERED] All peer subscriptions terminated</div>
          <div>&gt; BROWSER_KEY_STORE: [REVOKED] CryptoKey handles expunged</div>
          <div>&gt; AUDIT_RECORD: [NULL] Zero persistent storage verified</div>
          <div style={{ color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
            <CheckCircle size={14} /> FORENSIC FOOTPRINT: ZERO BYTES REMAINING
          </div>
        </div>

        <button
          onClick={() => {
            playTacticalClick();
            onReset();
          }}
          className="btn btn-primary"
          style={{ padding: '14px 28px', fontSize: '0.9rem' }}
        >
          <RefreshCw size={16} />
          <span>START NEW OPERATION</span>
        </button>
      </div>
    </div>
  );
};
