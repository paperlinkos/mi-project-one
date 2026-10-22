import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { Oscilloscope } from './components/Oscilloscope';
import { CloakingPanel } from './components/CloakingPanel';
import { TripwireHUD } from './components/TripwireHUD';
import { RoomModal } from './components/RoomModal';
import { CloakingEngine } from './audio/cloakingEngine';
import { PeerMesh } from './webrtc/peerMesh';
import type { CloakingSettings, AudioTelemetry, P2PState } from './types';
import { Terminal, Shield, Radio, Volume2 } from 'lucide-react';

export const App: React.FC = () => {
  // Session State
  const [room, setRoom] = useState<string>('WHISPER-OMEGA-99');
  const [peerId, setPeerId] = useState<string>('AGENT-01');
  const [isJoined, setIsJoined] = useState<boolean>(false);
  const [p2pState, setP2PState] = useState<P2PState>('STANDBY');
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Audio Telemetry & Settings
  const [cloakingSettings, setCloakingSettings] = useState<CloakingSettings>({
    noiseType: 'brown',
    noiseGain: 0.08,
    disguiseMode: 'deep_operative',
    disguiseIntensity: 0.7,
    tripwireThresholdDb: -32,
    tripwireEnabled: true,
    localMonitor: false,
  });

  const [telemetry, setTelemetry] = useState<AudioTelemetry>({
    inputRmsDb: -60,
    outputRmsDb: -60,
    peakFreqHz: 0,
    isBreach: false,
    snrEstimateDb: 0,
  });

  const [logs, setLogs] = useState<string[]>([]);

  // Engine Refs
  const cloakingEngineRef = useRef<CloakingEngine | null>(null);
  const peerMeshRef = useRef<PeerMesh | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const cloakedStreamRef = useRef<MediaStream | null>(null);

  // Parse room from URL hash if provided
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('room=')) {
      const parsedRoom = new URLSearchParams(hash.slice(1)).get('room');
      if (parsedRoom) setRoom(parsedRoom.toUpperCase());
    }
  }, []);

  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev.slice(-30), `[${timestamp}] ${msg}`]);
  };

  const handleJoin = async (selectedRoom: string, selectedCallsign: string) => {
    setRoom(selectedRoom);
    setPeerId(selectedCallsign);
    setIsJoined(true);
    window.location.hash = `room=${selectedRoom}`;

    addLog(`Initializing Operation Whisper Wire for channel ${selectedRoom}...`);

    try {
      // 1. Initialize Audio Worklet Cloaking Engine
      const engine = new CloakingEngine();
      cloakingEngineRef.current = engine;

      const cloakedOutboundStream = await engine.init((t) => {
        setTelemetry(t);
      });
      cloakedStreamRef.current = cloakedOutboundStream;

      addLog('✓ Off-main-thread AudioWorkletProcessor mounted successfully.');
      addLog('✓ Synthetic noise cloaker & voice disguise DSP active.');

      // 2. Initialize WebRTC P2P Mesh
      const mesh = new PeerMesh(selectedRoom, selectedCallsign, {
        onStateChange: (state) => setP2PState(state),
        onRemoteStream: (stream) => {
          if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = stream;
            addLog('✓ Remote operative audio wired to playback sink.');
          }
        },
        onLog: (msg) => addLog(msg),
      });
      peerMeshRef.current = mesh;

      // Connect to Go signaling server
      mesh.connect(cloakedOutboundStream);
    } catch (err: any) {
      console.error('Initialization failed:', err);
      addLog(`❌ Audio Worklet / Mic error: ${err.message}`);
    }
  };

  const handleUpdateSettings = (newSettings: Partial<CloakingSettings>) => {
    const updated = { ...cloakingSettings, ...newSettings };
    setCloakingSettings(updated);
    if (cloakingEngineRef.current) {
      cloakingEngineRef.current.applySettings(newSettings);
    }
  };

  const handleAutoCalibrate = async () => {
    if (!cloakingEngineRef.current) {
      throw new Error('Engine not ready');
    }
    addLog('Measuring room ambient acoustics for 1.5 seconds...');
    const result = await cloakingEngineRef.current.autoCalibrateRoom();
    addLog(`✓ Room baseline measured at ${result.baselineDb} dB. Noise shield adjusted to ${(result.calibratedGain * 100).toFixed(1)}%.`);
    setCloakingSettings((prev) => ({
      ...prev,
      noiseGain: result.calibratedGain,
      tripwireThresholdDb: Math.min(-12, result.baselineDb + 14),
    }));
    return result;
  };

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    if (cloakedStreamRef.current) {
      cloakedStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !next;
      });
    }
    addLog(next ? 'Microphone transmission MUTED.' : 'Microphone transmission UNMUTED.');
  };

  const handleDisconnect = () => {
    addLog('Severing P2P connection and stopping audio DSP...');
    if (peerMeshRef.current) {
      peerMeshRef.current.disconnect();
    }
    if (cloakingEngineRef.current) {
      cloakingEngineRef.current.stop();
    }
    setIsJoined(false);
    setP2PState('STANDBY');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', paddingBottom: '32px' }}>
      {/* Hidden audio element for receiving remote peer audio */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* Onboarding Modal if not joined */}
      {!isJoined && <RoomModal initialRoom={room} onJoin={handleJoin} />}

      {/* War Room Header */}
      <Header
        room={room}
        peerId={peerId}
        p2pState={p2pState}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        onDisconnect={handleDisconnect}
      />

      {/* Main Tactical Dashboard */}
      <main style={{ maxWidth: '1440px', width: '100%', margin: '20px auto 0 auto', padding: '0 24px', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Dual Oscilloscope */}
        <Oscilloscope
          rawAnalyser={cloakingEngineRef.current ? cloakingEngineRef.current.getRawAnalyser() : null}
          cloakedAnalyser={cloakingEngineRef.current ? cloakingEngineRef.current.getCloakedAnalyser() : null}
          tripwireDb={cloakingSettings.tripwireThresholdDb}
          currentDb={telemetry.inputRmsDb}
          isBreach={telemetry.isBreach && cloakingSettings.tripwireEnabled}
        />

        {/* Lower Grid: Cloaking Engine vs Decibel Tripwire & Terminal Log */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '20px' }}>
          {/* Left Column: Audio DSP Controls */}
          <div>
            <CloakingPanel
              settings={cloakingSettings}
              onUpdateSettings={handleUpdateSettings}
              onAutoCalibrate={handleAutoCalibrate}
            />
          </div>

          {/* Right Column: Decibel Tripwire HUD + Live Terminal */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <TripwireHUD
              telemetry={telemetry}
              thresholdDb={cloakingSettings.tripwireThresholdDb}
              enabled={cloakingSettings.tripwireEnabled}
              onUpdateThreshold={(newDb) => handleUpdateSettings({ tripwireThresholdDb: newDb })}
              onToggleEnabled={(enabled) => handleUpdateSettings({ tripwireEnabled: enabled })}
            />

            {/* Live Operational Terminal */}
            <div className="glass-panel" style={{ padding: '16px 20px', flex: 1, minHeight: '200px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <Terminal size={16} color="var(--accent-green)" />
                <span className="font-mono" style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  OPERATIONAL LOG / SIGNALING RELAY
                </span>
              </div>

              <div
                className="font-mono"
                style={{
                  background: 'rgba(0, 0, 0, 0.6)',
                  borderRadius: '6px',
                  padding: '12px',
                  fontSize: '0.72rem',
                  color: 'var(--accent-cyan)',
                  flex: 1,
                  maxHeight: '180px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                {logs.length === 0 ? (
                  <span style={{ color: 'var(--text-muted)' }}>Standby...</span>
                ) : (
                  logs.map((log, idx) => <div key={idx}>{log}</div>)
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
