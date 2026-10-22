# Operation Dead Drop: Project Context & Architecture

## 1. Mission Overview
**Operation Dead Drop** is a zero-knowledge, ephemeral incident-response war room built for distributed engineering and security teams. When production-critical infrastructure is compromised or standard communication channels (Slack, Teams, Email) are deemed unsafe, Operation Dead Drop provides an encrypted, volatile-memory operational bridge that leaves zero digital or forensic footprints upon conclusion.

---

## 2. Core Architectural Pillars

### 2.1 Zero-Knowledge Cryptography (RFC 3986 URL Fragment Isolation)
- **Client-Side Key Generation:** War room initialization produces a 256-bit symmetric encryption key using browser hardware randomness:
  ```ts
  const rawBytes = new Uint8Array(32);
  crypto.getRandomValues(rawBytes);
  ```
- **Out-of-Band Key Transmission:** The key is passed in the URL fragment (`https://<domain>/#room=<UUID>&key=<BASE64URL_KEY>`). Per RFC 3986, URL fragments are processed strictly by the client user agent and are **never transmitted** in HTTP request lines, headers, or WebSocket handshake frames.
- **Blind Relay Server:** The backend server cannot decrypt any event, chat message, runbook update, or metric telemetry. It acts solely as an opaque envelope router.
- **Ciphertext Integrity (AES-256-GCM):** Every message generates a fresh 96-bit (12-byte) initialization vector (IV) and computes a 128-bit authentication tag. The `room_id` is bound as Additional Authenticated Data (AAD) to prevent ciphertext transplantation or cross-room replay attacks.

### 2.2 Volatile RAM Only (Strict Zero Persistence)
- **Zero Disk Writes:** There are no databases (no SQLite, PostgreSQL, Redis, or disk caches) and no persistent disk loggers.
- **In-Memory Registry:** Rooms are maintained in thread-safe volatile RAM structures (`DashMap<String, Arc<RwLock<Room>>>`).
- **Sanitized Logging:** Server runtime logs via `tracing` sanitize all message bodies, client IP addresses, and payload contents.

### 2.3 Forensic Memory Zeroing (`zeroize` Crate)
- Volatile memory structures implement Rust's `zeroize` and `ZeroizeOnDrop` traits.
- Upon room burn, the backend iterates over memory buffers and overwrites memory with zeroes (`0x00`) before deallocation, defending against cold-boot attacks and process core dumps.

### 2.4 Multi-Vector Kill Switch & Self-Destruct Routines
1. **Countdown Timer Expiry:** Tokio background watchdog purges rooms once their configured TTL (5m, 15m, 30m, 60m) elapses.
2. **Burn-on-Disconnect (60-Second Grace Period):** When the last active operator disconnects, a 60-second grace timer is initiated. If no operator reconnects within 60 seconds, the room and its memory buffers are purged permanently.
3. **Manual Nuclear Kill Switch:** Operators can disarm the safety interlock and trigger an immediate kill switch, broadcasting an irreversible termination frame (`code: 4000`) to all peers and zeroing server RAM.
4. **Post-Purge State (HTTP 410 Gone):** Any subsequent request to a purged room returns `HTTP 410 Gone` with a confirmation of memory scrubbing.

---

## 3. Technology Stack

- **Backend Engine:** Rust 1.99+ (2024 Edition), Axum 0.8, Tokio async runtime, Tower-HTTP, DashMap, Zeroize, Serde, Chrono, Uuid.
- **Frontend Dashboard:** TypeScript, React, Vite, Web Crypto API (`SubtleCrypto`), Web Audio API tactical sound synthesizer, Lucide icons.
- **Styling:** Custom Obsidian Cyber Glassmorphic Design System (`#06070A` background, amber `#FFB000`, cyan `#00F0FF`, and crimson `#FF1744` alerts).

---

## 4. File Manifest

```
mi-project-one/
├── .gitignore                      # Git exclusion rules (Rust target, node_modules, etc.)
├── README.md                       # High-level overview & setup guide
├── context.md                      # Comprehensive architectural & operational context
├── test_relay.js                   # Automated E2E verification test script
│
├── backend/                        # High-Concurrency Rust Axum Engine
│   ├── Cargo.toml                  # Cargo dependencies & build configuration
│   ├── Cargo.lock                  # Dependency lockfile
│   └── src/
│       ├── main.rs                 # Server entrypoint, CORS, static asset hosting, graceful shutdown
│       ├── models.rs               # Protocol frames, Serde models, Zeroize envelopes
│       ├── state.rs                # Volatile RoomManager, RAM state, 60s disconnect timer, expiry watchdog
│       ├── routes.rs               # REST API endpoints (health, create room, status, kill switch, WS upgrade)
│       └── ws.rs                   # WebSocket actor, blind broadcasting, presence, and pingback loops
│
└── frontend/                       # Tactical React TypeScript War Room
    ├── index.html                  # HTML5 entry with cyber title and meta tags
    ├── package.json                # NPM configuration & dependencies
    ├── tsconfig.json               # TypeScript compiler options
    ├── vite.config.ts              # Vite bundler & reverse proxy (/api & /ws to :4000)
    └── src/
        ├── main.tsx                # React root mount
        ├── App.tsx                 # Core controller: URL hash key parser, WebSocket listener, kill switch state
        ├── types.ts                # TypeScript interfaces for envelopes, events, and checklists
        ├── index.css               # Obsidian glassmorphic cyber design tokens and animations
        ├── crypto/
        │   ├── aes.ts              # Web Crypto AES-256-GCM encrypt/decrypt, key import, memory scrubbing
        │   └── audio.ts            # Web Audio API tactical sound effects (chirps, pulses, glitch bursts)
        └── components/
            ├── Header.tsx          # Classified banner, countdown clock, operator presence, kill switch button
            ├── Lobby.tsx           # Mission briefing, NATO codename generator, TTL selector, single-use link modal
            ├── EventLogStream.tsx  # Real-time event log, severity chips, live ciphertext inspector toggle
            ├── ContainmentChecklist.tsx # Collaborative containment runbook with encrypted state sync
            ├── MetricTelemetry.tsx # Animated SVG sparklines for CPU, memory, egress, and auth flood anomalies
            ├── KillSwitchModal.tsx # Armed safety interlock & detonation trigger
            └── PurgedScreen.tsx    # Terminal screen rendered upon complete memory wipe
```

---

## 5. Operational Commands

### 5.1 Run Standalone Backend Server (Port 4000)
```bash
cd backend
export PATH="$HOME/.cargo/bin:$PATH"
cargo run
```
*Serves REST API, WebSocket relay, and production frontend bundle at `http://localhost:4000`.*

### 5.2 Run Frontend in Development Mode (Port 5175)
```bash
cd frontend
npm run dev
```

### 5.3 Run Automated Verification Test
```bash
node test_relay.js
```
Runs a 5-step integration suite verifying health, room initialization, status polling, kill switch activation, and HTTP 410 Gone post-purge confirmation.
