import React, { useState, useEffect } from 'react';
import { AlertTriangle, ShieldAlert, Radio, Gauge, BellRing, BellOff } from 'lucide-react';
import { AudioTelemetry } from '../types';

interface TripwireHUDProps {
  telemetry: AudioTelemetry;
  thresholdDb: number;
  enabled: boolean;
  onUpdateThreshold: (newDb: number) => void;
  onToggleEnabled: (enabled: boolean) => void;
}

export const TripwireHUD: React.FC<TripwireHUDProps> = ({
  telemetry,
  thresholdDb,
  enabled,
  onUpdateThreshold,
  onToggleEnabled,
}) => {
  const [breachCount, setBreachCount] = useState<number>(0);
  const [lastBreachTime, setLastBreachTime] = useState<string | null>(null);

  useEffect(() => {
    if (telemetry.isBreach && enabled) {
      setBreachCount((prev) => prev + 1);
      setLastBreachTime(new Date().toLocaleTimeString());
    }
  }, [telemetry.isBreach, enabled]);

  // Map dB (-60 to 0) to 0-100%
  const dbPercent = Math.max(0, Math.min(100, ((telemetry.inputRmsDb + 60) / 60) * 100));
  const thresholdPercent = Math.max(0, Math.min(100, ((thresholdDb + 60) / 60) * 100));

  return (
    <div
      className={`glass-panel ${telemetry.isBreach && enabled ? 'glass-panel-glow-crimson breach-alert-active' : ''}`}
      style={{
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        transition: 'all 0.2s ease',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Gauge size={18} color={telemetry.isBreach && enabled ? '#ff1744' : 'var(--accent-amber)'} />
          <h2 style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '0.04em' }}>
            DECIBEL TRIPWIRE & BUG DETECTOR
          </h2>
        </div>

        <button
          onClick={() => onToggleEnabled(!enabled)}
          className="badge"
          style={{
            cursor: 'pointer',
            background: enabled ? 'rgba(0, 255, 163, 0.15)' : 'rgba(255, 255, 255, 0.05)',
            color: enabled ? 'var(--accent-green)' : 'var(--text-muted)',
            border: enabled ? '1px solid var(--accent-green)' : '1px solid var(--border-subtle)',
          }}
        >
          {enabled ? <BellRing size={12} /> : <BellOff size={12} />}
          <span>{enabled ? 'TRIPWIRE ARMED' : 'DISARMED'}</span>
        </button>
      </div>

      {/* Acoustic Breach Flash Banner */}
      {telemetry.isBreach && enabled && (
        <div
          style={{
            padding: '12px 16px',
            background: 'rgba(255, 23, 68, 0.2)',
            border: '1px solid #ff1744',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: '#fff',
          }}
        >
          <div className="pulse-beacon pulse-beacon-crimson" />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, letterSpacing: '0.06em', color: '#ff5277' }}>
              ACOUSTIC BREACH ALERT! ANOMALOUS ROOM SPIKE
            </div>
            <div className="font-mono" style={{ fontSize: '0.72rem', color: '#fca5a5' }}>
              Level: {telemetry.inputRmsDb} dB | Dominant Frequency: {telemetry.peakFreqHz} Hz | Exceeded Threshold ({thresholdDb} dB)
            </div>
          </div>
        </div>
      )}

      {/* Real-time Decibel Bar Meter */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            CURRENT ROOM RMS ENERGY
          </span>
          <span
            className="font-mono"
            style={{
              fontSize: '0.9rem',
              fontWeight: 700,
              color: telemetry.isBreach ? '#ff1744' : telemetry.inputRmsDb > -30 ? 'var(--accent-amber)' : 'var(--accent-green)',
            }}
          >
            {telemetry.inputRmsDb} dB
          </span>
        </div>

        {/* Meter Bar Container */}
        <div
          style={{
            width: '100%',
            height: '14px',
            background: 'rgba(0, 0, 0, 0.6)',
            borderRadius: '4px',
            border: '1px solid var(--border-subtle)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Fill Bar */}
          <div
            style={{
              width: `${dbPercent}%`,
              height: '100%',
              background: telemetry.isBreach
                ? '#ff1744'
                : 'linear-gradient(to right, #00ffa3 0%, #ffb000 70%, #ff1744 100%)',
              transition: 'width 0.08s ease',
            }}
          />

          {/* Threshold Marker Needle */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: `${thresholdPercent}%`,
              width: '2px',
              height: '100%',
              background: '#fff',
              boxShadow: '0 0 6px #fff',
            }}
          />
        </div>
      </div>

      {/* Sensitivity Threshold Slider */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
          <span>Tripwire Threshold (Detection Ceiling)</span>
          <span className="font-mono" style={{ color: 'var(--accent-amber)' }}>{thresholdDb} dB</span>
        </div>
        <input
          type="range"
          min="-55"
          max="-12"
          step="1"
          value={thresholdDb}
          onChange={(e) => onUpdateThreshold(parseInt(e.target.value))}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '4px' }}>
          <span>Ultra-Sensitive (-55 dB)</span>
          <span>Permissive (-12 dB)</span>
        </div>
      </div>

      {/* Breach Telemetry Summary */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '8px',
          padding: '10px',
          background: 'rgba(0, 0, 0, 0.3)',
          borderRadius: '6px',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>SPIKES DETECTED</div>
          <div className="font-mono" style={{ fontSize: '0.9rem', fontWeight: 700, color: breachCount > 0 ? '#ff1744' : '#fff' }}>
            {breachCount}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>DOMINANT PEAK</div>
          <div className="font-mono" style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
            {telemetry.peakFreqHz} Hz
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>MASKING DELTA</div>
          <div className="font-mono" style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent-green)' }}>
            {telemetry.snrEstimateDb} dB
          </div>
        </div>
      </div>
    </div>
  );
};
