import React, { useState } from 'react';
import { Flame, AlertOctagon, X } from 'lucide-react';
import { playKillSwitchGlitch, playTacticalClick } from '../crypto/audio';

interface KillSwitchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExecuteKill: (reason: string) => void;
}

export const KillSwitchModal: React.FC<KillSwitchModalProps> = ({
  isOpen,
  onClose,
  onExecuteKill,
}) => {
  const [armed, setArmed] = useState(false);
  const [reason, setReason] = useState('INCIDENT_CONTAINED_NORMAL_SHUTDOWN');
  const [customReason, setCustomReason] = useState('');

  if (!isOpen) return null;

  const handleExecute = () => {
    if (!armed) return;
    playKillSwitchGlitch();
    const finalReason = reason === 'OTHER' ? customReason.trim() || 'MANUAL_OVERRIDE' : reason;
    onExecuteKill(finalReason);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(4, 5, 8, 0.9)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
        padding: '20px',
      }}
    >
      <div
        className="glass-panel glass-panel-glow-crimson"
        style={{
          maxWidth: '560px',
          width: '100%',
          padding: '28px',
          position: 'relative',
          background: 'rgba(20, 10, 15, 0.95)',
        }}
      >
        <button
          onClick={() => {
            playTacticalClick();
            onClose();
          }}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
          }}
        >
          <X size={20} />
        </button>

        {/* Warning Icon */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(255, 23, 68, 0.15)',
              border: '2px solid #ff1744',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px auto',
              color: '#ff1744',
            }}
          >
            <Flame size={32} />
          </div>

          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', letterSpacing: '0.04em' }}>
            ENGAGE NUCLEAR KILL SWITCH
          </h2>
          <p style={{ fontSize: '0.82rem', color: '#ff8a9e', marginTop: '4px' }}>
            IRREVERSIBLE VOLATILE MEMORY PURGE
          </p>
        </div>

        {/* Danger Warning Box */}
        <div
          style={{
            padding: '12px 16px',
            background: 'rgba(255, 23, 68, 0.1)',
            border: '1px solid rgba(255, 23, 68, 0.4)',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '0.8rem',
            color: '#f0f4fc',
            lineHeight: '1.5',
          }}
        >
          <strong>Immediate Consequences:</strong>
          <ul style={{ paddingLeft: '18px', marginTop: '6px', fontSize: '0.75rem', color: '#fca5a5' }}>
            <li>Rust backend instantly zeroes all RAM buffers using <code className="font-mono">zeroize()</code></li>
            <li>Broadcasts irreversible termination packet to all connected operators</li>
            <li>Closes all WebSockets and expunges room registry</li>
            <li>Subsequent requests will receive HTTP 410 GONE</li>
          </ul>
        </div>

        {/* Reason selector */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
            PURGE RATIONALE:
          </label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="font-mono"
            style={{
              width: '100%',
              background: 'rgba(0, 0, 0, 0.5)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '6px',
              padding: '10px 12px',
              color: '#fff',
              fontSize: '0.8rem',
              outline: 'none',
              marginBottom: reason === 'OTHER' ? '10px' : '0',
            }}
          >
            <option value="INCIDENT_CONTAINED_NORMAL_SHUTDOWN">Incident Contained - Normal Mission Burn</option>
            <option value="SUSPECTED_CHANNEL_COMPROMISE">Emergency: Suspected Channel Compromise</option>
            <option value="EXECUTIVE_ORDER_ABORT">Executive Order - Operation Disavowed</option>
            <option value="OTHER">Custom Reason...</option>
          </select>

          {reason === 'OTHER' && (
            <input
              type="text"
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="Specify burn reason..."
              className="font-mono"
              style={{
                width: '100%',
                background: 'rgba(0, 0, 0, 0.5)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                padding: '10px 12px',
                color: '#fff',
                fontSize: '0.8rem',
                outline: 'none',
              }}
            />
          )}
        </div>

        {/* Stage 1: Safety Interlock */}
        <div
          style={{
            padding: '12px 16px',
            background: 'rgba(0, 0, 0, 0.4)',
            borderRadius: '8px',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertOctagon size={18} color={armed ? '#ff1744' : 'var(--text-muted)'} />
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: armed ? '#ff1744' : 'var(--text-secondary)' }}>
              SAFETY INTERLOCK: {armed ? 'ARMED FOR DETONATION' : 'DISARMED'}
            </span>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ARM KEY</span>
            <input
              type="checkbox"
              checked={armed}
              onChange={(e) => {
                playTacticalClick();
                setArmed(e.target.checked);
              }}
              style={{ width: '20px', height: '20px', accentColor: '#ff1744' }}
            />
          </label>
        </div>

        {/* Stage 2: Purge Execution Button */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            type="button"
            onClick={() => {
              playTacticalClick();
              onClose();
            }}
            className="btn btn-secondary"
            style={{ flex: 1, padding: '12px' }}
          >
            ABORT
          </button>

          <button
            type="button"
            disabled={!armed}
            onClick={handleExecute}
            className={`btn ${armed ? 'btn-danger-solid' : 'btn-secondary'}`}
            style={{
              flex: 1.5,
              padding: '12px',
              opacity: armed ? 1 : 0.4,
              cursor: armed ? 'pointer' : 'not-allowed',
            }}
          >
            <Flame size={18} />
            <span>PURGE MEMORY NOW</span>
          </button>
        </div>
      </div>
    </div>
  );
};
