import React, { useState, useEffect } from 'react';
import { Cpu, HardDrive, Wifi, ShieldAlert, Zap } from 'lucide-react';

export const MetricTelemetry: React.FC = () => {
  const [cpuHistory, setCpuHistory] = useState<number[]>([42, 45, 48, 52, 50, 47, 49, 54, 58, 62]);
  const [memHistory] = useState<number[]>([65, 66, 65, 67, 68, 70, 71, 72, 70, 69]);
  const [netHistory, setNetHistory] = useState<number[]>([120, 140, 135, 160, 210, 340, 520, 780, 840, 890]);
  const [authHistory] = useState<number[]>([2, 3, 2, 5, 4, 18, 94, 210, 480, 620]);

  // Dynamic simulation ticker
  useEffect(() => {
    const interval = setInterval(() => {
      setCpuHistory((prev) => {
        const last = prev[prev.length - 1];
        const next = Math.min(99, Math.max(30, last + (Math.random() * 8 - 4)));
        return [...prev.slice(1), Math.round(next)];
      });

      setNetHistory((prev) => {
        const last = prev[prev.length - 1];
        const next = Math.max(50, last + (Math.random() * 60 - 30));
        return [...prev.slice(1), Math.round(next)];
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const renderSparkline = (points: number[], color: string, maxVal: number) => {
    const height = 36;
    const width = 120;
    const step = width / (points.length - 1);
    const coords = points.map((val, idx) => {
      const x = idx * step;
      const y = height - (val / maxVal) * (height - 4);
      return `${x},${y}`;
    });
    return (
      <svg width={width} height={height} style={{ overflow: 'visible' }}>
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          points={coords.join(' ')}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  };

  const currentCpu = cpuHistory[cpuHistory.length - 1];
  const currentMem = memHistory[memHistory.length - 1];
  const currentNet = netHistory[netHistory.length - 1];
  const currentAuth = authHistory[authHistory.length - 1];

  return (
    <div className="glass-panel" style={{ padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Zap size={16} color="var(--accent-amber)" />
          <span style={{ fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.04em' }}>
            LIVE SYSTEM TELEMETRY & SPIKE MONITORS
          </span>
        </div>
        <span className="badge badge-amber" style={{ fontSize: '0.65rem' }}>
          HEARTBEAT PINGBACK ACTIVE
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
        {/* CPU */}
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '8px',
            padding: '12px',
            border: currentCpu > 80 ? '1px solid rgba(255, 23, 68, 0.4)' : '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              <Cpu size={14} color="var(--accent-cyan)" /> CPU SATURATION
            </span>
            <span className="font-mono" style={{ fontSize: '0.85rem', fontWeight: 700, color: currentCpu > 80 ? '#ff1744' : '#fff' }}>
              {currentCpu}%
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            {renderSparkline(cpuHistory, currentCpu > 80 ? '#ff1744' : '#00f0ff', 100)}
          </div>
        </div>

        {/* Memory */}
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '8px',
            padding: '12px',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              <HardDrive size={14} color="var(--accent-green)" /> MEMORY CONSUMPTION
            </span>
            <span className="font-mono" style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>
              {currentMem}%
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            {renderSparkline(memHistory, '#00ffa3', 100)}
          </div>
        </div>

        {/* Network Egress */}
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '8px',
            padding: '12px',
            border: currentNet > 500 ? '1px solid rgba(255, 176, 0, 0.4)' : '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              <Wifi size={14} color="var(--accent-amber)" /> NETWORK EGRESS
            </span>
            <span className="font-mono" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-amber)' }}>
              {currentNet} MB/s
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            {renderSparkline(netHistory, '#ffb000', 1000)}
          </div>
        </div>

        {/* Auth Failures */}
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '8px',
            padding: '12px',
            border: currentAuth > 100 ? '1px solid rgba(255, 23, 68, 0.4)' : '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              <ShieldAlert size={14} color="var(--accent-crimson)" /> AUTH FLOOD / SEC
            </span>
            <span className="font-mono" style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ff1744' }}>
              {currentAuth} req/s
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            {renderSparkline(authHistory, '#ff1744', 800)}
          </div>
        </div>
      </div>
    </div>
  );
};
