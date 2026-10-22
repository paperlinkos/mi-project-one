import React, { useState, useEffect } from 'react';
import { ShieldAlert, Users, Clock, Flame, Volume2, VolumeX } from 'lucide-react';
import type { ParticipantInfo } from '../types';
import { playTacticalClick, playUrgentPulse, toggleSound, isSoundEnabled } from '../crypto/audio';

interface HeaderProps {
  codename: string;
  roomId: string;
  expiresAt: number;
  participants: ParticipantInfo[];
  currentCallsign: string;
  onOpenKillSwitch: () => void;
  latencyMs: number;
}

export const Header: React.FC<HeaderProps> = ({
  codename,
  roomId,
  expiresAt,
  participants,
  currentCallsign,
  onOpenKillSwitch,
  latencyMs,
}) => {
  const [remainingSeconds, setRemainingSeconds] = useState<number>(() =>
    Math.max(0, Math.floor((expiresAt - Date.now()) / 1000))
  );
  const [soundOn, setSoundOn] = useState<boolean>(isSoundEnabled());

  useEffect(() => {
    const interval = setInterval(() => {
      const sec = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setRemainingSeconds(sec);

      // Warning beep when less than 60s remaining
      if (sec <= 60 && sec > 0 && sec % 10 === 0) {
        playUrgentPulse();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  const formatCountdown = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isUrgent = remainingSeconds <= 120;
  const isCritical = remainingSeconds <= 60;

  const handleSoundToggle = () => {
    const next = toggleSound();
    setSoundOn(next);
    if (next) playTacticalClick();
  };

  return (
    <header className="glass-panel" style={{ margin: '16px 24px 0 24px', padding: '14px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        {/* Left: Mission Brand & Codename */}
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
            <ShieldAlert size={22} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 800, letterSpacing: '0.06em', color: '#fff' }}>
                OPERATION DEAD DROP
              </span>
              <span className="badge badge-cyan" style={{ fontSize: '0.7rem' }}>
                ZERO-KNOWLEDGE WAR ROOM
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
              <span className="font-mono" style={{ fontSize: '0.8rem', color: 'var(--accent-amber)', fontWeight: 600 }}>
                CODENAME: {codename}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>•</span>
              <span className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                ID: {roomId.slice(0, 8)}...
              </span>
            </div>
          </div>
        </div>

        {/* Center: Ephemeral Countdown Clock */}
        <div
          className={`glass-panel ${isCritical ? 'glass-panel-glow-crimson' : isUrgent ? 'glass-panel-glow-amber' : ''}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '8px 18px',
            border: isCritical ? '1px solid #ff1744' : isUrgent ? '1px solid #ffb000' : '1px solid var(--border-subtle)',
          }}
        >
          <Clock
            size={18}
            color={isCritical ? '#ff1744' : isUrgent ? '#ffb000' : '#00f0ff'}
            className={isCritical ? 'glitch-active' : ''}
          />
          <div>
            <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
              Auto-Burn Countdown
            </div>
            <div
              className="font-mono"
              style={{
                fontSize: '1.35rem',
                fontWeight: 700,
                color: isCritical ? '#ff1744' : isUrgent ? '#ffb000' : '#f0f4fc',
                letterSpacing: '0.04em',
              }}
            >
              {formatCountdown(remainingSeconds)}
            </div>
          </div>
        </div>

        {/* Right: Presence & Tactical Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          {/* Operator Presence */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '6px 12px',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div className="pulse-dot pulse-dot-green" />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Users size={14} color="var(--accent-green)" />
                <span className="font-mono" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {participants.length} {participants.length === 1 ? 'OPERATOR' : 'OPERATORS'}
                </span>
              </div>
              <span className="font-mono" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                CALLSIGN: <span style={{ color: 'var(--accent-cyan)' }}>{currentCallsign}</span> ({latencyMs}ms)
              </span>
            </div>
          </div>

          {/* Audio toggle */}
          <button
            onClick={handleSoundToggle}
            className="btn btn-secondary"
            title={soundOn ? 'Mute tactical synthesizer' : 'Enable tactical synthesizer'}
            style={{ padding: '8px 12px' }}
          >
            {soundOn ? <Volume2 size={16} color="var(--accent-cyan)" /> : <VolumeX size={16} color="var(--text-muted)" />}
          </button>

          {/* Nuclear Kill Switch */}
          <button
            onClick={() => {
              playTacticalClick();
              onOpenKillSwitch();
            }}
            className="btn btn-danger"
            style={{ padding: '8px 14px' }}
          >
            <Flame size={16} />
            <span>KILL SWITCH</span>
          </button>
        </div>
      </div>
    </header>
  );
};
