import React, { useState } from 'react';
import { Radio, ShieldCheck, Zap, Lock, Volume2, Mic, KeyRound } from 'lucide-react';

interface RoomModalProps {
  initialRoom: string;
  onJoin: (room: string, callsign: string) => void;
}

export const RoomModal: React.FC<RoomModalProps> = ({ initialRoom, onJoin }) => {
  const [room, setRoom] = useState(initialRoom || 'WHISPER-OMEGA-99');
  const [callsign, setCallsign] = useState('');

  const generateTacticalCall = () => {
    const prefixes = ['VIPER', 'SHADOW', 'GHOST', 'ECHO', 'SPECTRE', 'NEXUS', 'TITAN', 'RAVEN'];
    const p = prefixes[Math.floor(Math.random() * prefixes.length)];
    const num = Math.floor(10 + Math.random() * 90);
    setCallsign(`${p}-${num}`);
  };

  const generateTacticalFreq = () => {
    const channels = ['ALPHA', 'BRAVO', 'DELTA', 'OMEGA', 'SIGMA', 'PHANTOM', 'VECTOR', 'VALKYRIE'];
    const c = channels[Math.floor(Math.random() * channels.length)];
    const num = Math.floor(100 + Math.random() * 900);
    setRoom(`WHISPER-${c}-${num}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!room.trim()) return;
    onJoin(room.trim().toUpperCase(), callsign.trim().toUpperCase() || 'AGENT-ZERO');
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(3, 4, 7, 0.92)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: '20px',
      }}
    >
      <div
        className="glass-panel glass-panel-glow-cyan"
        style={{
          maxWidth: '560px',
          width: '100%',
          padding: '32px',
          position: 'relative',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '12px',
              background: 'rgba(0, 240, 255, 0.12)',
              border: '1px solid var(--accent-cyan)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px auto',
              color: 'var(--accent-cyan)',
            }}
          >
            <Radio size={28} />
          </div>

          <span className="badge badge-crimson" style={{ marginBottom: '8px' }}>
            TOP SECRET // ASSIGNMENT 002
          </span>

          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', letterSpacing: '0.02em', marginTop: '6px' }}>
            OPERATION WHISPER WIRE
          </h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: '1.5' }}>
            Serverless P2P Audio Obfuscator & Synthetic Acoustic Cloaking Relay.
            Direct browser-to-browser voice wire with off-main-thread AudioWorklet DSP.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Frequency Channel */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              SECURE FREQUENCY CHANNEL
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={room}
                onChange={(e) => setRoom(e.target.value.toUpperCase())}
                placeholder="E.G. WHISPER-ALPHA-404"
                className="font-mono"
                style={{
                  flex: 1,
                  background: 'rgba(0, 0, 0, 0.5)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '6px',
                  padding: '10px 12px',
                  color: '#fff',
                  fontSize: '0.85rem',
                  outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={generateTacticalFreq}
                className="btn btn-secondary"
                style={{ padding: '8px 12px', fontSize: '0.75rem' }}
              >
                RANDOM
              </button>
            </div>
          </div>

          {/* Call Sign */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              OPERATIVE CALL SIGN
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={callsign}
                onChange={(e) => setCallsign(e.target.value.toUpperCase())}
                placeholder="E.G. VIPER-01"
                className="font-mono"
                style={{
                  flex: 1,
                  background: 'rgba(0, 0, 0, 0.5)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '6px',
                  padding: '10px 12px',
                  color: '#fff',
                  fontSize: '0.85rem',
                  outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={generateTacticalCall}
                className="btn btn-secondary"
                style={{ padding: '8px 12px', fontSize: '0.75rem' }}
              >
                GENERATE
              </button>
            </div>
          </div>

          {/* Security Features Breakdown */}
          <div
            style={{
              padding: '12px 14px',
              background: 'rgba(0, 255, 163, 0.04)',
              border: '1px solid rgba(0, 255, 163, 0.2)',
              borderRadius: '6px',
              fontSize: '0.72rem',
              color: 'var(--text-secondary)',
              lineHeight: '1.5',
            }}
          >
            <div style={{ color: 'var(--accent-green)', fontWeight: 700, marginBottom: '4px' }}>
              ✓ Direct P2P Audio Mesh (No Centralized Wiretap):
            </div>
            Audio streams directly between operatives via WebRTC. Go signaling server logs zero connection IPs and immediately steps out once SDP/ICE negotiation is complete.
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ padding: '14px', fontSize: '0.9rem', marginTop: '6px' }}
          >
            <Mic size={18} />
            <span>TUNE IN TO FREQUENCY & INITIALIZE DSP</span>
          </button>
        </form>
      </div>
    </div>
  );
};
