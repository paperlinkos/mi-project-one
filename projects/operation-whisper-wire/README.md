# 🎙️ Operation Whisper Wire
### Distributed Peer-to-Peer Audio Obfuscator & Synthetic Acoustic Cloaking Relay

> **Classification:** TOP SECRET // ASSIGNMENT 002  
> **Directive:** Direct WebRTC P2P audio transmission, zero-latency AudioWorklet DSP cloaking, synthetic brown/pink noise shielding, and real-time RMS decibel tripwire bug detection.

---

## 🎯 Architectural Overview

Operation Whisper Wire protects operatives against corporate espionage, acoustic surveillance, and centralized conference wiretaps:

1. **Direct P2P Audio Mesh (WebRTC):**
   - End-to-end encrypted direct peer audio connection (`RTCPeerConnection`).
   - The Go signaling server only facilitates initial SDP offer/answer exchange and ICE candidate routing, then completely steps out of the audio transmission path.
   - Channel ceiling: Exactly 2 operatives per secure frequency wire to prevent eavesdropping and third-party intrusion.

2. **Acoustic Cloaking Engine (AudioWorklet DSP):**
   - Executes off the main UI thread in an `AudioWorkletProcessor` (`cloaker-processor.js`) for zero audio latency.
   - **Synthetic Noise Shield:** Generates calibrated Brown noise (deep acoustic masking), Pink noise (Kellet algorithm for room chatter masking), or White noise.
   - **One-Click Room Auto-Calibration:** Samples ambient room noise for 1.5 seconds and auto-matches the synthetic shield and tripwire ceiling to the operator's physical environment.
   - **Voice Disguise DSP:** Real-time granular cross-fade pitch shifting (Deep Operative pitch down ~5 semitones, Cyber Whisper pitch up) and a sinusoidal Ring-Modulator Robotic Vocoder.

3. **Decibel Tripwire (Bug Detection):**
   - Computes real-time RMS energy and dominant frequency peaks via Web Audio `AnalyserNode`.
   - Visual flashing HUD warning ("ACOUSTIC BREACH ALERT") when anomalous ambient noise spikes exceed the calibrated ceiling.

4. **Dual-Spectrum Oscilloscope:**
   - Real-time HTML5 Canvas visualizer rendering raw microphone input alongside the cloaked outbound audio wire.

---

## 🚀 How to Run

### 1. Launch Go Signaling Relay (Port 8088)
```bash
cd projects/operation-whisper-wire/signaling
export PATH="$HOME/tools/go/bin:$PATH"
go run main.go
```
*Signaling relay & production web dashboard live at:* `http://localhost:8088`

### 2. Launch Frontend in Development Mode (Port 5176)
```bash
cd projects/operation-whisper-wire/frontend
npm run dev
```
*Frontend dev server live at:* `http://localhost:5176`

### 3. Run Automated Signaling Verification
```bash
cd projects/operation-whisper-wire
node test_signaling.js
```
Runs an automated 5-step WebRTC handshake and 3rd-party rejection test.
