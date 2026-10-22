import React, { useRef, useEffect } from 'react';
import { Activity, Radio, Waves } from 'lucide-react';

interface OscilloscopeProps {
  rawAnalyser: AnalyserNode | null;
  cloakedAnalyser: AnalyserNode | null;
  tripwireDb: number;
  currentDb: number;
  isBreach: boolean;
}

export const Oscilloscope: React.FC<OscilloscopeProps> = ({
  rawAnalyser,
  cloakedAnalyser,
  tripwireDb,
  currentDb,
  isBreach,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let animId: number;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rawBuffer = new Float32Array(rawAnalyser ? rawAnalyser.fftSize : 512);
    const cloakedBuffer = new Float32Array(cloakedAnalyser ? cloakedAnalyser.fftSize : 512);
    const freqBuffer = new Uint8Array(rawAnalyser ? rawAnalyser.frequencyBinCount : 256);

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      // Dark radar background
      ctx.fillStyle = '#030406';
      ctx.fillRect(0, 0, width, height);

      // Draw Tactical Grid
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.05)';
      ctx.lineWidth = 1;
      const step = 32;
      for (let x = 0; x < width; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Middle divider
      const midY = height / 2;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.beginPath();
      ctx.moveTo(0, midY);
      ctx.lineTo(width, midY);
      ctx.stroke();

      // Channel 1: Raw Microphone Waveform (Top Half)
      if (rawAnalyser) {
        rawAnalyser.getFloatTimeDomainData(rawBuffer);

        ctx.strokeStyle = isBreach ? '#ff1744' : '#00ffa3';
        ctx.lineWidth = 2;
        ctx.shadowColor = isBreach ? 'rgba(255, 23, 68, 0.6)' : 'rgba(0, 255, 163, 0.5)';
        ctx.shadowBlur = 8;

        ctx.beginPath();
        const sliceWidth = width / rawBuffer.length;
        let x = 0;

        for (let i = 0; i < rawBuffer.length; i++) {
          const v = rawBuffer[i];
          const y = midY / 2 + v * (midY / 2.2);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
          x += sliceWidth;
        }
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Channel Label
        ctx.fillStyle = isBreach ? '#ff1744' : '#00ffa3';
        ctx.font = '10px JetBrains Mono, monospace';
        ctx.fillText(isBreach ? 'CH-1: RAW MIC [ACOUSTIC BREACH DETECTED]' : 'CH-1: RAW OPERATOR MIC INPUT', 16, 22);
      } else {
        ctx.fillStyle = '#4e5a73';
        ctx.font = '11px JetBrains Mono, monospace';
        ctx.fillText('CH-1: MIC STANDBY / WAITING FOR PERMISSION', 16, 22);
      }

      // Channel 2: Acoustically Cloaked Outbound Stream (Bottom Half)
      if (cloakedAnalyser) {
        cloakedAnalyser.getFloatTimeDomainData(cloakedBuffer);

        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 2;
        ctx.shadowColor = 'rgba(0, 240, 255, 0.6)';
        ctx.shadowBlur = 8;

        ctx.beginPath();
        const sliceWidth = width / cloakedBuffer.length;
        let x = 0;

        for (let i = 0; i < cloakedBuffer.length; i++) {
          const v = cloakedBuffer[i];
          const y = midY + midY / 2 + v * (midY / 2.2);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
          x += sliceWidth;
        }
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Channel Label
        ctx.fillStyle = '#00f0ff';
        ctx.font = '10px JetBrains Mono, monospace';
        ctx.fillText('CH-2: CLOAKED OUTBOUND AUDIO WIRE (DSP + NOISE SHIELD)', 16, midY + 22);
      } else {
        ctx.fillStyle = '#4e5a73';
        ctx.font = '11px JetBrains Mono, monospace';
        ctx.fillText('CH-2: CLOAKING ENGINE INACTIVE', 16, midY + 22);
      }

      // Frequency Spectrum Bar Overlay in Background of Top Half
      if (rawAnalyser) {
        rawAnalyser.getByteFrequencyData(freqBuffer);
        const barWidth = (width / freqBuffer.length) * 2;
        ctx.fillStyle = isBreach ? 'rgba(255, 23, 68, 0.12)' : 'rgba(0, 255, 163, 0.08)';

        for (let i = 0; i < freqBuffer.length / 2; i++) {
          const barHeight = (freqBuffer[i] / 255) * (midY - 30);
          ctx.fillRect(i * barWidth, midY - barHeight, barWidth - 1, barHeight);
        }
      }

      // Tripwire Threshold Horizontal Marker Line
      // Map dB (-60 to 0) to Y coordinate
      const normalizedTripwire = Math.max(0, Math.min(1, (tripwireDb + 60) / 60));
      const tripwireY = midY - normalizedTripwire * (midY - 30);

      ctx.strokeStyle = 'rgba(255, 176, 0, 0.7)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, tripwireY);
      ctx.lineTo(width, tripwireY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = 'var(--accent-amber)';
      ctx.font = '9px JetBrains Mono, monospace';
      ctx.fillText(`TRIPWIRE: ${tripwireDb} dB`, width - 110, tripwireY - 4);

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [rawAnalyser, cloakedAnalyser, tripwireDb, currentDb, isBreach]);

  return (
    <div className={`glass-panel scope-container ${isBreach ? 'breach-alert-active' : ''}`} style={{ padding: '0' }}>
      <div
        style={{
          padding: '10px 16px',
          background: 'rgba(0, 0, 0, 0.6)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Waves size={16} color="var(--accent-cyan)" />
          <span className="font-mono" style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.04em' }}>
            DUAL-SPECTRUM AUDIO OSCILLOSCOPE
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00ffa3' }} />
            <span className="font-mono" style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>RAW MIC</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00f0ff' }} />
            <span className="font-mono" style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>CLOAKED WIRE</span>
          </div>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={920}
        height={320}
        style={{ width: '100%', height: '320px', display: 'block' }}
      />
    </div>
  );
};
