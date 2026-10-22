/**
 * Operation Whisper Wire: Acoustic Cloaking AudioWorkletProcessor
 * Runs on the dedicated audio rendering thread for zero-latency DSP.
 * Combines synthetic ambient noise cloaking with real-time vocal disguise.
 */

class CloakerProcessor extends AudioWorkletProcessor {
  constructor() {
    super();

    // Noise Cloak State
    this.noiseType = 1; // 0 = Off, 1 = Brown, 2 = Pink, 3 = White
    this.noiseGain = 0.08;

    // Pink Noise Kellet Filter States
    this.b0 = 0;
    this.b1 = 0;
    this.b2 = 0;
    this.b3 = 0;
    this.b4 = 0;
    this.b5 = 0;
    this.b6 = 0;

    // Brown Noise State
    this.lastBrown = 0;

    // Voice Disguise DSP State
    this.disguiseMode = 1; // 0 = Bypass, 1 = Deep Operative Shift, 2 = Robotic Vocoder, 3 = Cyber Whisper
    this.disguiseIntensity = 0.7;

    // Circular delay buffer for Pitch Shift (Granular crossfade delay)
    this.bufferSize = 4096;
    this.delayBuffer = new Float32Array(this.bufferSize);
    this.writeIndex = 0;
    this.readPointerA = 0;
    this.readPointerB = this.bufferSize / 2;
    this.grainWindowSize = 1024; // ~23ms window

    // Carrier phase for Ring Modulation Vocoder
    this.carrierPhase = 0;
    this.carrierFreq = 65; // Low-frequency tactical carrier

    // Metrics tracking
    this.sampleCount = 0;
    this.inputRmsSum = 0;
    this.outputRmsSum = 0;

    // Message port listener
    this.port.onmessage = (event) => {
      const { type, payload } = event.data;
      if (type === 'SET_NOISE') {
        if (payload.type !== undefined) this.noiseType = payload.type;
        if (payload.gain !== undefined) this.noiseGain = payload.gain;
      } else if (type === 'SET_DISGUISE') {
        if (payload.mode !== undefined) this.disguiseMode = payload.mode;
        if (payload.intensity !== undefined) this.disguiseIntensity = payload.intensity;
      }
    };
  }

  // Generate a random white noise sample between -1.0 and 1.0
  getWhiteNoise() {
    return Math.random() * 2 - 1;
  }

  // Generate Brown Noise (6dB/octave roll-off, deep acoustic mask)
  getBrownNoise() {
    const white = this.getWhiteNoise();
    this.lastBrown = (this.lastBrown + 0.02 * white) / 1.02;
    return this.lastBrown * 3.5;
  }

  // Generate Pink Noise (3dB/octave roll-off, ambient chatter masking)
  getPinkNoise() {
    const white = this.getWhiteNoise();
    this.b0 = 0.99886 * this.b0 + white * 0.0555179;
    this.b1 = 0.99332 * this.b1 + white * 0.0750759;
    this.b2 = 0.96900 * this.b2 + white * 0.1538520;
    this.b3 = 0.86650 * this.b3 + white * 0.3104856;
    this.b4 = 0.55000 * this.b4 + white * 0.5329522;
    this.b5 = -0.7616 * this.b5 - white * 0.0168980;
    const pink = this.b0 + this.b1 + this.b2 + this.b3 + this.b4 + this.b5 + this.b6 + white * 0.5362;
    this.b6 = white * 0.115926;
    return pink * 0.11;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];

    // If no audio stream is connected, keep processor running
    if (!input || !input[0] || !output || !output[0]) {
      return true;
    }

    const inputChannel = input[0];
    const outputChannel = output[0];
    const len = inputChannel.length;

    // Pitch shifting speed ratio: Deep operative = 0.72 (down-pitched), Vocoder = 1.0, Whisper = 1.25
    let pitchRatio = 1.0;
    if (this.disguiseMode === 1) {
      pitchRatio = 1.0 - this.disguiseIntensity * 0.32; // Drop pitch ~4 to 7 semitones
    } else if (this.disguiseMode === 3) {
      pitchRatio = 1.0 + this.disguiseIntensity * 0.28;
    }

    for (let i = 0; i < len; i++) {
      const inSample = inputChannel[i];

      // 1. Write sample to circular delay buffer
      this.delayBuffer[this.writeIndex] = inSample;

      // 2. Compute Voice Disguise DSP
      let disguisedSample = inSample;

      if (this.disguiseMode === 1 || this.disguiseMode === 3) {
        // Granular crossfade pitch shifter
        const readIntA = Math.floor(this.readPointerA);
        const fracA = this.readPointerA - readIntA;
        const nextIntA = (readIntA + 1) % this.bufferSize;
        const sampleA = this.delayBuffer[readIntA] * (1 - fracA) + this.delayBuffer[nextIntA] * fracA;

        const readIntB = Math.floor(this.readPointerB);
        const fracB = this.readPointerB - readIntB;
        const nextIntB = (readIntB + 1) % this.bufferSize;
        const sampleB = this.delayBuffer[readIntB] * (1 - fracB) + this.delayBuffer[nextIntB] * fracB;

        // Triangular crossfade window
        const posInWindowA = (this.writeIndex - readIntA + this.bufferSize) % this.grainWindowSize;
        const gainA = 0.5 * (1 + Math.cos((2 * Math.PI * posInWindowA) / this.grainWindowSize));
        const gainB = 1 - gainA;

        const shifted = sampleA * gainA + sampleB * gainB;
        disguisedSample = inSample * (1 - this.disguiseIntensity) + shifted * this.disguiseIntensity;

        // Increment read pointers
        this.readPointerA = (this.readPointerA + pitchRatio) % this.bufferSize;
        this.readPointerB = (this.readPointerB + pitchRatio) % this.bufferSize;

      } else if (this.disguiseMode === 2) {
        // Robotic Ring-Modulator Vocoder
        const carrier = Math.sin(this.carrierPhase);
        this.carrierPhase += (2 * Math.PI * this.carrierFreq) / sampleRate;
        if (this.carrierPhase > 2 * Math.PI) this.carrierPhase -= 2 * Math.PI;

        const vocoded = inSample * carrier * 1.8;
        disguisedSample = inSample * (1 - this.disguiseIntensity) + vocoded * this.disguiseIntensity;
      }

      this.writeIndex = (this.writeIndex + 1) % this.bufferSize;

      // 3. Generate Acoustic Masking Noise Shield
      let noiseSample = 0;
      if (this.noiseType === 1) {
        noiseSample = this.getBrownNoise() * this.noiseGain;
      } else if (this.noiseType === 2) {
        noiseSample = this.getPinkNoise() * this.noiseGain;
      } else if (this.noiseType === 3) {
        noiseSample = this.getWhiteNoise() * this.noiseGain;
      }

      // 4. Blend speech with acoustic noise shield
      const cloakedOut = disguisedSample + noiseSample;

      // Clamp output to avoid digital clipping
      outputChannel[i] = Math.max(-1.0, Math.min(1.0, cloakedOut));

      // Duplicate to stereo channel if available
      if (output.length > 1 && output[1]) {
        output[1][i] = outputChannel[i];
      }

      // Telemetry Accumulation
      this.inputRmsSum += inSample * inSample;
      this.outputRmsSum += outputChannel[i] * outputChannel[i];
      this.sampleCount++;
    }

    // Report periodic telemetry to main thread every ~100ms
    if (this.sampleCount >= 2048) {
      const inputRms = Math.sqrt(this.inputRmsSum / this.sampleCount);
      const outputRms = Math.sqrt(this.outputRmsSum / this.sampleCount);

      this.port.postMessage({
        type: 'TELEMETRY',
        inputRms,
        outputRms,
      });

      this.inputRmsSum = 0;
      this.outputRmsSum = 0;
      this.sampleCount = 0;
    }

    return true;
  }
}

registerProcessor('cloaker-processor', CloakerProcessor);
