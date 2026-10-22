import React, { useState } from 'react';
import { Shield, Radio, Mic, MicOff, PhoneOff, Copy, Check, Lock, Cpu } from 'lucide-react';
import { P2PState } from '../types';

interface HeaderProps {
  room: string;
  peerId: string;
  p2pState: P2PState;
  isMuted: boolean;
  onToggleMute: () => void;
  onDisconnect: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  room,
  peerId,
  p2pState,
  isMuted,
  onToggleMute,
  onDisconnect,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    const url = `${window.location.origin}/#room=${room}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getP2PBadge = () => {
    switch (p2pState) {
      case 'P2P_DIRECT_LIVE':
        return (
          <div className="badge badge-green">
            <span className="pulse-beacon pulse-beacon-green" />
            <span>P2P DIRECT WIRE LIVE</span>
          </div>
        );
      case 'NEGOTIATING_SDP':
      case 'ICE_GATHERING':
        return (
          <div className="badge badge-cyan">
            <Cpu size={12} className="glitch-active" />
            <span>EXCHANGING SDP / ICE</span>
          </div>
        );
      case 'WAITING_PEER':
        return (
          <div className="badge badge-amber">
            <Radio size={12} />
            <span>WAITING FOR REMOTE OPERATIVE</span>
          </div>
        );
      case 'CONNECTING_SIGNAL':
        return (
          <div className="badge badge-cyan">
            <Radio size={12} />
            <span>CONNECTING SIGNALING</span>
          </div>
        );
      case 'ROOM_FULL':
        return (
          <div className="badge badge-crimson">
            <span>FREQUENCY OCCUPIED (2/2)</span>
          </div>
        );
      default:
        return (
          <div className="badge badge-crimson">
            <span>WIRE STANDBY</span>
          </div>
        );
    }
  };

  return (
    <header className="glass-panel" style={{ margin: '16px 24px 0 24px', padding: '14px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        {/* Brand & Room Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.2) 0%, rgba(0, 132, 255, 0.4) 100%)',
              border: '1px solid rgba(0, 240, 255, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#00f0ff',
            }}
          >
            <Radio size={20} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 800, letterSpacing: '0.06em', color: '#fff' }}>
                OPERATION WHISPER WIRE
              </span>
              <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>
                P2P AUDIO OBFUSCATOR
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '2px' }}>
              <span className="font-mono" style={{ fontSize: '0.78rem', color: 'var(--accent-amber)', fontWeight: 600 }}>
                FREQ: {room}
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>•</span>
              <span className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                CALLSIGN: <span style={{ color: 'var(--accent-cyan)' }}>{peerId}</span>
              </span>

              <button
                onClick={handleCopyLink}
                className="btn btn-secondary"
                style={{ padding: '2px 8px', fontSize: '0.65rem', gap: '4px', height: '22px' }}
                title="Copy frequency link to clipboard"
              >
                {copied ? <Check size={10} color="var(--accent-green)" /> : <Copy size={10} />}
                <span>{copied ? 'COPIED' : 'COPY FREQ'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Center: P2P State Badge */}
        <div>{getP2PBadge()}</div>

        {/* Right: Tactical Mic & Disconnect Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={onToggleMute}
            className={`btn ${isMuted ? 'btn-danger' : 'btn-secondary'}`}
            style={{ padding: '8px 14px', fontSize: '0.8rem' }}
          >
            {isMuted ? <MicOff size={16} /> : <Mic size={16} color="var(--accent-green)" />}
            <span>{isMuted ? 'MIC MUTED' : 'MIC ACTIVE'}</span>
          </button>

          <button
            onClick={onDisconnect}
            className="btn btn-danger"
            style={{ padding: '8px 14px', fontSize: '0.8rem' }}
          >
            <PhoneOff size={16} />
            <span>SEVER WIRE</span>
          </button>
        </div>
      </div>
    </header>
  );
};
