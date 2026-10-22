import { P2PState, SignalMessage } from '../types';

export interface PeerMeshCallbacks {
  onStateChange: (state: P2PState) => void;
  onRemoteStream: (stream: MediaStream) => void;
  onLog: (message: string) => void;
}

export class PeerMesh {
  private ws: WebSocket | null = null;
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private room: string;
  private peerId: string;
  private callbacks: PeerMeshCallbacks;
  private iceCandidatesQueue: RTCIceCandidateInit[] = [];
  private isOfferer = false;

  constructor(room: string, peerId: string, callbacks: PeerMeshCallbacks) {
    this.room = room;
    this.peerId = peerId;
    this.callbacks = callbacks;
  }

  public connect(localCloakedStream: MediaStream) {
    this.localStream = localCloakedStream;
    this.callbacks.onStateChange('CONNECTING_SIGNAL');
    this.callbacks.onLog(`Connecting to Go Ephemeral Signaling Relay for frequency [${this.room}]...`);

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws?room=${encodeURIComponent(this.room)}&peer=${encodeURIComponent(this.peerId)}`;

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this.callbacks.onLog('✓ Connected to Go Signaling Relay. Waiting for remote operative...');
      this.callbacks.onStateChange('WAITING_PEER');
    };

    this.ws.onmessage = async (evt) => {
      try {
        const msg: SignalMessage = JSON.parse(evt.data);
        await this.handleSignalMessage(msg);
      } catch (err) {
        console.error('Error handling signaling message:', err);
      }
    };

    this.ws.onclose = () => {
      this.callbacks.onLog('Signaling socket closed.');
    };

    this.ws.onerror = (e) => {
      console.error('Signaling WebSocket error:', e);
      this.callbacks.onLog('Signaling socket error occurred.');
    };
  }

  private initPeerConnection() {
    if (this.pc) return;

    this.callbacks.onLog('Initializing WebRTC RTCPeerConnection with STUN traversal...');

    const config: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
      ],
      iceCandidatePoolSize: 4,
    };

    this.pc = new RTCPeerConnection(config);

    // Attach local cloaked audio track
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        this.pc!.addTrack(track, this.localStream!);
      });
      this.callbacks.onLog('Outbound cloaked audio track attached to P2P pipeline.');
    }

    // ICE Candidate handler
    this.pc.onicecandidate = (event) => {
      if (event.candidate && this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.sendSignal({
          type: 'candidate',
          room: this.room,
          sender: this.peerId,
          payload: event.candidate.toJSON(),
        });
      }
    };

    // Connection state monitor
    this.pc.oniceconnectionstatechange = () => {
      const state = this.pc?.iceConnectionState;
      this.callbacks.onLog(`ICE Connection State: ${state?.toUpperCase()}`);

      if (state === 'checking') {
        this.callbacks.onStateChange('ICE_GATHERING');
      } else if (state === 'connected' || state === 'completed') {
        this.callbacks.onStateChange('P2P_DIRECT_LIVE');
        this.callbacks.onLog('⚡ DIRECT P2P AUDIO WIRE ESTABLISHED! Signaling server stepped out.');
      } else if (state === 'failed' || state === 'disconnected' || state === 'closed') {
        this.callbacks.onStateChange('TERMINATED');
      }
    };

    // Inbound remote audio track handler
    this.pc.ontrack = (event) => {
      this.callbacks.onLog('✓ Inbound remote cloaked audio stream received.');
      if (event.streams && event.streams[0]) {
        this.callbacks.onRemoteStream(event.streams[0]);
      }
    };
  }

  private async handleSignalMessage(msg: SignalMessage) {
    switch (msg.type) {
      case 'room_full': {
        this.callbacks.onStateChange('ROOM_FULL');
        this.callbacks.onLog('❌ Frequency channel full (Maximum 2 operatives per secure wire).');
        break;
      }
      case 'peer_joined': {
        this.callbacks.onLog(`Remote operative joined frequency. Initiating SDP Offer...`);
        this.isOfferer = true;
        this.initPeerConnection();

        this.callbacks.onStateChange('NEGOTIATING_SDP');
        const offer = await this.pc!.createOffer({
          offerToReceiveAudio: true,
        });
        await this.pc!.setLocalDescription(offer);

        this.sendSignal({
          type: 'offer',
          room: this.room,
          sender: this.peerId,
          payload: offer,
        });
        break;
      }
      case 'offer': {
        this.callbacks.onLog('Incoming SDP Offer received. Generating SDP Answer...');
        this.isOfferer = false;
        this.initPeerConnection();

        this.callbacks.onStateChange('NEGOTIATING_SDP');
        await this.pc!.setRemoteDescription(new RTCSessionDescription(msg.payload));

        // Process queued ICE candidates
        while (this.iceCandidatesQueue.length > 0) {
          const candidate = this.iceCandidatesQueue.shift();
          if (candidate) await this.pc!.addIceCandidate(new RTCIceCandidate(candidate));
        }

        const answer = await this.pc!.createAnswer();
        await this.pc!.setLocalDescription(answer);

        this.sendSignal({
          type: 'answer',
          room: this.room,
          sender: this.peerId,
          payload: answer,
        });
        break;
      }
      case 'answer': {
        this.callbacks.onLog('SDP Answer received. Handshake finalized.');
        if (this.pc) {
          await this.pc.setRemoteDescription(new RTCSessionDescription(msg.payload));

          // Process queued ICE candidates
          while (this.iceCandidatesQueue.length > 0) {
            const candidate = this.iceCandidatesQueue.shift();
            if (candidate) await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
          }
        }
        break;
      }
      case 'candidate': {
        const candidateInit: RTCIceCandidateInit = msg.payload;
        if (this.pc && this.pc.remoteDescription) {
          await this.pc.addIceCandidate(new RTCIceCandidate(candidateInit));
        } else {
          this.iceCandidatesQueue.push(candidateInit);
        }
        break;
      }
      case 'peer_left': {
        this.callbacks.onLog('Remote operative disconnected from frequency.');
        this.callbacks.onStateChange('WAITING_PEER');
        if (this.pc) {
          this.pc.close();
          this.pc = null;
        }
        break;
      }
    }
  }

  private sendSignal(msg: SignalMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  public disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
    this.callbacks.onStateChange('TERMINATED');
    this.callbacks.onLog('P2P Wire manually terminated.');
  }
}
