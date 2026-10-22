import React, { useState } from 'react';
import { Shield, Volume2, Mic, Sliders, Sparkles, Headphones, Wand2, RefreshCw } from 'lucide-react';
import { CloakingSettings, NoiseType, DisguiseMode } from '../types';

interface CloakingPanelProps {
  settings: CloakingSettings;
  onUpdateSettings: (newSettings: Partial<CloakingSettings>) => void;
  onAutoCalibrate: () => Promise<{ calibratedGain: number; baselineDb: number }>;
}

export const CloakingPanel: React.FC<CloakingPanelProps> = ({
  settings,
  onUpdateSettings,
  onAutoCalibrate,
}) => {
  const [calibrating, setCalibrating] = useState(false);
  const [calibratedResult, setCalibratedResult] = useState<{ gain: number; db: number } | null>(null);

  const handleCalibrate = async () => {
    setCalibrating(true);
    setCalibratedResult(null);
    try {
      const res = await onAutoCalibrate();
      setCalibratedResult({ gain: res.calibratedGain, db: res.baselineDb });
    } catch (err) {
      console.error('Calibration error:', err);
    } finally {
      setCalibrating(false);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Shield size={18} color="var(--accent-cyan)" />
          <h2 style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '0.04em' }}>
            ACOUSTIC CLOAKING ENGINE
          </h2>
        </div>
        <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>
          ZERO-LATENCY WORKLET DSP
        </span>
      </div>

      {/* SECTION 1: SYNTHETIC NOISE SHIELD */}
      <div style={{ background: 'rgba(0, 0, 0, 0.35)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-amber)', letterSpacing: '0.04em' }}>
            1. SYNTHETIC AMBIENT NOISE SHIELD
          </span>
          <span className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            MASKING: {Math.round(settings.noiseGain * 100)}%
          </span>
        </div>

        {/* Noise Type Selectors */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '14px' }}>
          {[
            { id: 'off', label: 'OFF', desc: 'No Noise' },
            { id: 'brown', label: 'BROWN', desc: 'Deep Acoustic' },
            { id: 'pink', label: 'PINK', desc: 'Room Chatter' },
            { id: 'white', label: 'WHITE', desc: 'Full Mask' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => onUpdateSettings({ noiseType: item.id as NoiseType })}
              className={`btn ${settings.noiseType === item.id ? 'btn-primary' : 'btn-secondary'}`}
              style={{
                padding: '8px 4px',
                flexDirection: 'column',
                gap: '2px',
                fontSize: '0.75rem',
              }}
            >
              <span>{item.label}</span>
              <span style={{ fontSize: '0.6rem', opacity: 0.7 }}>{item.desc}</span>
            </button>
          ))}
        </div>

        {/* Noise Gain Slider */}
        <div style={{ marginBottom: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
            <span>Shield Injection Level</span>
            <span className="font-mono">{(settings.noiseGain * 100).toFixed(1)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="0.3"
            step="0.005"
            value={settings.noiseGain}
            onChange={(e) => onUpdateSettings({ noiseGain: parseFloat(e.target.value) })}
          />
        </div>

        {/* Auto-Calibration Button */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
          <button
            onClick={handleCalibrate}
            disabled={calibrating}
            className="btn btn-secondary"
            style={{ flex: 1, padding: '8px 12px', fontSize: '0.75rem', gap: '6px' }}
          >
            <RefreshCw size={14} className={calibrating ? 'glitch-active' : ''} />
            <span>{calibrating ? 'SAMPLING ROOM ACOUSTICS (1.5s)...' : 'AUTO-CALIBRATE TO ROOM'}</span>
          </button>

          {calibratedResult && (
            <span className="font-mono" style={{ fontSize: '0.7rem', color: 'var(--accent-green)' }}>
              ✓ Ambient: {calibratedResult.db}dB | Calibrated
            </span>
          )}
        </div>
      </div>

      {/* SECTION 2: VOICE DISGUISE DSP */}
      <div style={{ background: 'rgba(0, 0, 0, 0.35)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-cyan)', letterSpacing: '0.04em' }}>
            2. REAL-TIME VOICE DISGUISE FILTER
          </span>
          <span className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            INTENSITY: {Math.round(settings.disguiseIntensity * 100)}%
          </span>
        </div>

        {/* Disguise Modes */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px', marginBottom: '14px' }}>
          {[
            { id: 'off', label: 'BYPASS', desc: 'Raw Mic' },
            { id: 'deep_operative', label: 'DEEP AGENT', desc: 'Pitch Shift' },
            { id: 'vocoder', label: 'ROBOT VOCODER', desc: 'Ring Mod' },
            { id: 'whisper', label: 'WHISPER', desc: 'Formant Mask' },
          ].map((mode) => (
            <button
              key={mode.id}
              onClick={() => onUpdateSettings({ disguiseMode: mode.id as DisguiseMode })}
              className={`btn ${settings.disguiseMode === mode.id ? 'btn-primary' : 'btn-secondary'}`}
              style={{
                padding: '8px 6px',
                flexDirection: 'column',
                gap: '2px',
                fontSize: '0.75rem',
              }}
            >
              <span>{mode.label}</span>
              <span style={{ fontSize: '0.6rem', opacity: 0.7 }}>{mode.desc}</span>
            </button>
          ))}
        </div>

        {/* Disguise Intensity Slider */}
        <div style={{ marginBottom: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
            <span>DSP Modulation Depth</span>
            <span className="font-mono">{Math.round(settings.disguiseIntensity * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.1"
            max="1.0"
            step="0.05"
            value={settings.disguiseIntensity}
            onChange={(e) => onUpdateSettings({ disguiseIntensity: parseFloat(e.target.value) })}
          />
        </div>

        {/* Local Audition / Monitor Toggle */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 12px',
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '6px',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Headphones size={16} color={settings.localMonitor ? 'var(--accent-green)' : 'var(--text-muted)'} />
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#fff' }}>AUDITION CLOAKED AUDIO</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                Listen to your masked voice locally (use headphones to prevent mic feedback loop)
              </div>
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={settings.localMonitor}
              onChange={(e) => onUpdateSettings({ localMonitor: e.target.checked })}
              style={{ width: '18px', height: '18px', accentColor: 'var(--accent-cyan)' }}
            />
          </label>
        </div>
      </div>
    </div>
  );
};
