# 🕵️ Operation Dead Drop
### Zero-Knowledge, Ephemeral Incident-Response War Room

> **Classification:** TOP SECRET // EYES ONLY  
> **Mission Directive:** Burn-on-read triage rooms, encrypted event log streams, automated memory-scrubbing kill switch, and strictly zero persistent storage.

---

## 🎯 Architecture & Security Highlights

1. **Zero-Knowledge Link Design (RFC 3986 Isolation):**
   - War rooms generate cryptographic single-use links: `https://<domain>/#room=<UUID>&key=<BASE64URL_32BYTE_KEY>`.
   - The encryption key is isolated exclusively in the client-side URL hash fragment (`#key=...`). Browsers never transmit hash fragments over HTTP requests or WebSocket handshake headers.
   - The backend acts as a **pure blind relay**: it cannot read or decrypt incident logs, metric telemetry, containment actions, or runbook checklists.

2. **Volatile RAM Storage (Zero-Persistence Guarantee):**
   - The Rust engine stores room state exclusively in volatile memory (`Arc<RwLock<HashMap>>` / `DashMap`).
   - No databases (no SQLite, Postgres, or Redis persistence). No disk logs.

3. **Forensic Memory Zeroing (`zeroize` Crate):**
   - Active memory buffers implement Rust's `Zeroize` and `ZeroizeOnDrop` traits.
   - When a room is terminated, all ciphertext rings and participant registries are explicitly overwritten with `0x00` bytes in RAM before deallocation.

4. **Multi-Vector Automated Kill Switch:**
   - **Countdown Expiry Watchdog:** Background Tokio task auto-purges rooms upon reaching their preset TTL (5m, 15m, 30m, 60m).
   - **Burn-on-Disconnect (60s Grace Window):** If all operators leave a room, a 60-second grace timer is initiated. If no operator reconnects within 60 seconds, the room and its memory are permanently destroyed.
   - **Manual Nuclear Detonation:** Operators can engage a two-step armed kill switch to broadcast an irreversible termination packet to all connected clients and scrub server RAM instantly.
   - **Subsequent Requests Return HTTP 410 GONE.**

5. **Military Cyber HUD Aesthetic:**
   - Pitch-black obsidian theme (`#06070A`), tactical cyber amber (`#FFB000`), cyan (`#00F0FF`), and crimson (`#FF1744`).
   - Monospace typography (JetBrains Mono).
   - Live system sparkline telemetry (CPU, Memory, Network Egress, Auth flood anomalies).
   - Real-time collaborative Containment Runbook with check/uncheck state synchronization.
   - Built-in Web Audio API tactical synthesizer (clicks, chirp on decrypted packet, urgent pulse under 60s, kill switch glitch burst).
   - Ciphertext inspector toggle proving zero plaintext was exposed to the network.

---

## 🚀 Running Locally

### Prerequisites
- **Rust toolchain:** `rustc` & `cargo` 1.80+ (Rust 2024 edition compatible)
- **Node.js:** v18+ & `npm`

### 1. Launch Backend (Standalone Server with Frontend Hosting)
The Rust Axum backend serves both the WebSocket/REST relay API and the production frontend on port 4000:

```bash
cd backend
export PATH="$HOME/.cargo/bin:$PATH"
cargo run
```
*Relay running at:* `http://localhost:4000`

### 2. Optional: Launch Frontend in Dev Mode (Hot-Reloading)
To develop or modify UI components with instant hot-reloading:

```bash
cd frontend
npm run dev
```
*Frontend running at:* `http://localhost:5175` (proxies `/api` and `/ws` to `localhost:4000`)

---

## 🧪 Automated Verification Suite

Run the automated integration test to verify health checks, room initialization, status querying, kill switch activation, and HTTP 410 Gone post-purge confirmation:

```bash
node test_relay.js
```

---

## 🔒 Threat Model & Guarantees

| Attack Vector | Defense Mechanism |
| :--- | :--- |
| **Server RAM Dump / Forensic Capture** | Memory buffers are wiped via `zeroize()`. Decryption key never enters server RAM. |
| **Network Eavesdropping / Man-in-the-Middle** | Client-side AES-256-GCM encryption with fresh 96-bit IVs and Room ID bound in Additional Authenticated Data (AAD). |
| **Cross-Room Ciphertext Replay** | AAD binds the ciphertext to the specific `room_id`; replay attempts in another room fail authentication tag validation. |
| **Forgotten / Abandoned Rooms** | 60-second Burn-on-Disconnect grace timer and automated countdown watchdog expunge dead rooms. |
| **Subpoena / Audit Log Exfiltration** | Strictly zero persistent storage. No disk write operations are performed by the application. |
