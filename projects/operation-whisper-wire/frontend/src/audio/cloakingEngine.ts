import { CloakingSettings, AudioTelemetry, NoiseType, DisguiseMode } from '../types';

export class CloakingEngine {
  private audioCtx: AudioContext | null = null;
  private micStream: MediaStream | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private cloakedDestination: MediaStreamAudioDestinationNode | null = null;
  private monitorGain: GainNode | null = null;

  // Analysers for dual oscilloscope and tripwire
  private rawAnalyser: AnalyserNode | null = null;
  private cloakedAnalyser: AnalyserNode | null = null;

  // Telemetry animation loop
  private animationFrameId: number | null = null;
  private onTelemetryCallback: ((telemetry: AudioTelemetry) => void) | null = null;

  // Settings
  private settings: CloakingSettings = {
    noiseType: 'brown',
    noiseGain: 0.08,
    disguiseMode: 'deep_operative',
    disguiseIntensity: 0.7,
    tripwireThresholdDb: -32,
    tripwireEnabled: true,
    localMonitor: false,
  };

  private breachHoldTime = 0;

  async init(
    onTelemetry: (telemetry: AudioTelemetry) => void
  ): Promise<MediaStream> {
    this.onTelemetryCallback = onTelemetry;

    // 1. Initialize AudioContext
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.audioCtx = new AudioContextClass({ latencyHint: 'interactive' });
    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }

    // 2. Request Raw Microphone Access (disable native AGC & noise suppression to allow our DSP worklet full control)
    this.micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: false,
        autoGainControl: false,
      },
      video: false,
    });

    // 3. Load AudioWorkletProcessor
    await this.audioCtx.audioWorklet.addModule('/worklets/cloaker-processor.js');

    // 4. Create Nodes
    this.micSource = this.audioCtx.createMediaStreamSource(this.micStream);
    this.workletNode = new AudioWorkletNode(this.audioCtx, 'cloaker-processor');
    this.cloakedDestination = this.audioCtx.createMediaStreamDestination();

    // Raw Analyser (Mic input)
    this.rawAnalyser = this.audioCtx.createAnalyser();
    this.rawAnalyser.fftSize = 512;
    this.rawAnalyser.smoothingTimeConstant = 0.6;

    // Cloaked Analyser (Worklet output)
    this.cloakedAnalyser = this.audioCtx.createAnalyser();
    this.cloakedAnalyser.fftSize = 512;
    this.cloakedAnalyser.smoothingTimeConstant = 0.6;

    // Local Monitor Gain (Allows operator to audition their cloaked voice; muted by default to avoid feedback)
    this.monitorGain = this.audioCtx.createGain();
    this.monitorGain.gain.setValueAtTime(0, this.audioCtx.currentTime);

    // 5. Wire Audio Graph:
    // micSource -> rawAnalyser
    // micSource -> workletNode -> cloakedDestination (for WebRTC outbound)
    // workletNode -> cloakedAnalyser
    // workletNode -> monitorGain -> audioCtx.destination (speaker)
    this.micSource.connect(this.rawAnalyser);
    this.micSource.connect(this.workletNode);

    this.workletNode.connect(this.cloakedDestination);
    this.workletNode.connect(this.cloakedAnalyser);
    this.workletNode.connect(this.monitorGain);
    this.monitorGain.connect(this.audioCtx.destination);

    // Apply initial settings to worklet
    this.applySettings(this.settings);

    // 6. Start Telemetry Loop
    this.startTelemetryLoop();

    // Return the cloaked outbound stream to pass into WebRTC RTCPeerConnection!
    return this.cloakedDestination.stream;
  }

  public applySettings(newSettings: Partial<CloakingSettings>) {
    this.settings = { ...this.settings, ...newSettings };

    if (!this.workletNode) return;

    // Map noise type to integer enum
    const noiseMap: Record<NoiseType, number> = {
      off: 0,
      brown: 1,
      pink: 2,
      white: 3,
    };

    // Map disguise mode to integer enum
    const disguiseMap: Record<DisguiseMode, number> = {
      off: 0,
      deep_operative: 1,
      vocoder: 2,
      whisper: 3,
    };

    // Send params to worklet thread
    this.workletNode.port.postMessage({
      type: 'SET_NOISE',
      payload: {
        type: noiseMap[this.settings.noiseType],
        gain: this.settings.noiseGain,
      },
    });

    this.workletNode.port.postMessage({
      type: 'SET_DISGUISE',
      payload: {
        mode: disguiseMap[this.settings.disguiseMode],
        intensity: this.settings.disguiseIntensity,
      },
    });

    // Monitor toggle
    if (this.monitorGain && this.audioCtx) {
      const targetGain = this.settings.localMonitor ? 0.35 : 0;
      this.monitorGain.gain.setTargetAtTime(targetGain, this.audioCtx.currentTime, 0.05);
    }
  }

  /**
   * Auto-calibrates the synthetic noise floor to the operative's ambient room acoustics.
   * Samples ambient room decibels over 1.5 seconds and adjusts synthetic shield accordingly.
   */
  public async autoCalibrateRoom(): Promise<{ calibratedGain: number; baselineDb: number }> {
    if (!this.rawAnalyser) {
      throw new Error('Cloaking engine not initialized');
    }

    const samples: number[] = [];
    const buffer = new Float32Array(this.rawAnalyser.fftSize);

    for (let i = 0; i < 15; i++) {
      this.rawAnalyser.getFloatTimeDomainData(buffer);
      let sumSq = 0;
      for (let j = 0; j < buffer.length; j++) {
        sumSq += buffer[j] * buffer[j];
      }
      const rms = Math.sqrt(sumSq / buffer.length);
      const db = 20 * Math.log10(Math.max(rms, 1e-5));
      samples.push(db);
      await new Promise((r) => setTimeout(r, 100));
    }

    const avgBaselineDb = samples.reduce((a, b) => a + b, 0) / samples.length;

    // Calculate protective noise gain based on ambient room dB
    // Quiet room (-55dB) -> lower noise gain (~0.05)
    // Noisy hostile room (-30dB) -> higher masking shield (~0.18)
    const normalized = Math.min(1.0, Math.max(0.1, (avgBaselineDb + 60) / 40));
    const calibratedGain = Number((normalized * 0.16).toFixed(3));

    // Also auto-calibrate tripwire threshold to 12dB above ambient baseline
    const recommendedTripwire = Math.min(-12, Math.round(avgBaselineDb + 14));

    this.applySettings({
      noiseGain: calibratedGain,
      tripwireThresholdDb: recommendedTripwire,
    });

    return { calibratedGain, baselineDb: Math.round(avgBaselineDb) };
  }

  private startTelemetryLoop() {
    const rawBuffer = new Float32Array(this.rawAnalyser!.fftSize);
    const cloakedBuffer = new Float32Array(this.cloakedAnalyser!.fftSize);
    const freqData = new Uint8Array(this.rawAnalyser!.frequencyBinCount);

    const check = () => {
      if (!this.rawAnalyser || !this.cloakedAnalyser) return;

      // Calculate Raw Mic RMS dB
      this.rawAnalyser.getFloatTimeDomainData(rawBuffer);
      let rawSum = 0;
      for (let i = 0; i < rawBuffer.length; i++) {
        rawSum += rawBuffer[i] * rawBuffer[i];
      }
      const rawRms = Math.sqrt(rawSum / rawBuffer.length);
      const rawDb = 20 * Math.log10(Math.max(rawRms, 1e-5));

      // Calculate Cloaked Output RMS dB
      this.cloakedAnalyser.getFloatTimeDomainData(cloakedBuffer);
      let cloakedSum = 0;
      for (let i = 0; i < cloakedBuffer.length; i++) {
        cloakedSum += cloakedBuffer[i] * cloakedBuffer[i];
      }
      const cloakedRms = Math.sqrt(cloakedSum / cloakedBuffer.length);
      const cloakedDb = 20 * Math.log10(Math.max(cloakedRms, 1e-5));

      // Peak Frequency detection
      this.rawAnalyser.getByteFrequencyData(freqData);
      let maxVal = -1;
      let maxIdx = 0;
      for (let i = 0; i < freqData.length; i++) {
        if (freqData[i] > maxVal) {
          maxVal = freqData[i];
          maxIdx = i;
        }
      }
      const nyquist = (this.audioCtx?.sampleRate || 48000) / 2;
      const peakFreqHz = Math.round((maxIdx / freqData.length) * nyquist);

      // Decibel Tripwire Detection (Spike check)
      const now = Date.now();
      let isBreach = false;
      if (this.settings.tripwireEnabled && rawDb > this.settings.tripwireThresholdDb) {
        this.breachHoldTime = now + 1200; // Hold visual warning for 1.2s
        isBreach = true;
      } else if (now < this.breachHoldTime) {
        isBreach = true;
      }

      if (this.onTelemetryCallback) {
        this.onTelemetryCallback({
          inputRmsDb: Math.round(rawDb),
          outputRmsDb: Math.round(cloakedDb),
          peakFreqHz,
          isBreach,
          snrEstimateDb: Math.round(rawDb - cloakedDb),
        });
      }

      this.animationFrameId = requestAnimationFrame(check);
    };

    this.animationFrameId = requestAnimationFrame(check);
  }

  public getRawAnalyser(): AnalyserNode | null {
    return this.rawAnalyser;
  }

  public getCloakedAnalyser(): AnalyserNode | null {
    return this.cloakedAnalyser;
  }

  public stop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.micStream) {
      this.micStream.getTracks().forEach((t) => t.stop());
    }
    if (this.audioCtx) {
      this.audioCtx.close();
    }
  }
}
