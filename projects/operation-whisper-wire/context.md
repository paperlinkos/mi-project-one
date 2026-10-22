# Operation Whisper Wire: Project Context & Architecture

## 1. Mission Specification
Operation Whisper Wire neutralizes acoustic surveillance and centralized switchboard wiretapping. High-value operatives can establish a direct browser-to-browser voice link with synthetic noise cloaking, vocal disguise DSP, and an acoustic spike tripwire.

---

## 2. Technical Component Breakdown

### 2.1 Go Signaling Server (`signaling/main.go`)
- **Language/Framework:** Go 1.23, Gorilla WebSockets.
- **Role:** Pure ephemeral signaling broker. Exclusively handles initial peer rendezvous, SDP offer/answer exchange, and ICE candidates.
- **Zero-Log Enforcement:** Does not persist, write to disk, or log connection IP addresses.
- **Security Cap:** Enforces a hard ceiling of 2 operatives per frequency channel. Any 3rd party attempting to join receives `room_full` rejection, preventing wiretapping.

### 2.2 Acoustic Cloaking Engine (`frontend/public/worklets/cloaker-processor.js`)
- Runs in an isolated `AudioWorkletProcessor` on the Web Audio rendering thread.
- **Synthetic Noise Generation:**
  - Brown Noise: Leaky integrator filter ($b_{n} = (b_{n-1} + 0.02w_n) / 1.02$) with 6dB/octave roll-off.
  - Pink Noise: Paul Kellet 7-pole IIR filter approximation with 3dB/octave roll-off for human speech chatter masking.
- **Voice Disguise DSP:**
  - Granular circular buffer (4096 samples) with dual overlapping triangular-windowed read pointers.
  - Deep Operative Mode: Pitch down ~4-7 semitones.
  - Robot Vocoder Mode: 65Hz tactical sinusoidal ring modulation.
  - Cyber Whisper Mode: Formant bandpass & high-register modulation.

### 2.3 Decibel Tripwire (`frontend/src/components/TripwireHUD.tsx` & `cloakingEngine.ts`)
- Computes real-time RMS amplitude: $\text{RMS} = \sqrt{\frac{1}{N}\sum x_i^2}$.
- Maps amplitude to Decibels: $\text{dB} = 20 \log_{10}(\text{RMS})$.
- Samples room acoustic baseline and sets breach trigger ceiling ($+14\text{dB}$ above ambient floor).
- Triggers visual strobe alert and frequency peak extraction upon sudden noise anomalies.

---

## 3. Directory Layout

```
projects/operation-whisper-wire/
├── README.md                           # Quickstart & architecture overview
├── context.md                          # In-depth technical context
├── test_signaling.js                   # 5-step automated E2E relay test
│
├── signaling/                          # Lightweight Go WebRTC Signaling Relay
│   ├── go.mod
│   ├── go.sum
│   └── main.go                         # Ephemeral hub, zero-log router, static frontend host
│
└── frontend/                           # React + TypeScript + Web Audio Worklet HUD
    ├── package.json
    ├── vite.config.ts                  # Reverse proxy (/ws to :8088)
    ├── index.html
    ├── public/
    │   └── worklets/
    │       └── cloaker-processor.js    # Off-main-thread AudioWorklet DSP
    └── src/
        ├── App.tsx                     # Main dashboard coordinator
        ├── types.ts                    # Cloaking & WebRTC interfaces
        ├── index.css                   # Obsidian glassmorphic cyber theme
        ├── audio/
        │   └── cloakingEngine.ts       # AudioContext & tripwire manager
        ├── webrtc/
        │   └── peerMesh.ts             # WebRTC RTCPeerConnection manager
        └── components/
            ├── Header.tsx              # Frequency link, callsign, P2P status
            ├── Oscilloscope.tsx        # Dual canvas waveform & spectrum visualizer
            ├── CloakingPanel.tsx       # Noise shield & voice disguise sliders
            ├── TripwireHUD.tsx         # Decibel meter & breach alert
            └── RoomModal.tsx           # Frequency setup & NATO callsign picker
```
