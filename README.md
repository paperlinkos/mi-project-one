# 🕵️ IMF Secret Operations Hub: `mi-project-one`

This repository houses multiple independent mission projects organized across specialized git branches and project folders.

---

## 🌿 Mission Directory & Branch Matrix

| Assignment | Codename | Branch | Primary Stack | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **001** | **Operation Dead Drop** | `main` | Rust (Axum/Tokio) + TypeScript (React) | Zero-knowledge ephemeral incident war room with volatile memory auto-purge |
| **002** | **Operation Whisper Wire** | `operation-whisper-wire` | Go (Signaling Relay) + WebRTC + AudioWorklet DSP | P2P direct audio wire with synthetic noise cloaking and voice disguise |
| **003+** | **Project Two / Sandbox** | `project-two` | Multi-project workspace | Staging branch for future mission assignments |

---

## 🔄 Switching Between Mission Operations

```bash
# Switch to Assignment 001: Operation Dead Drop
git checkout main

# Switch to Assignment 002: Operation Whisper Wire
git checkout operation-whisper-wire

# Switch to Sandbox Project Two
git checkout project-two
```

---

## ⚡ Active Operation: Operation Whisper Wire
Located in [`projects/operation-whisper-wire/`](./projects/operation-whisper-wire):
- **Signaling Server:** Go 1.23 WebSocket relay on port `8088`.
- **Tactical Frontend:** Vite React app on port `5176` (or bundled on port `8088`).
- **Acoustic Worklet:** Custom off-main-thread DSP generating calibrated brown/pink noise and granular pitch shifting.
