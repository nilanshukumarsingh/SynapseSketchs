// Web Audio API engine for subtle, tactile drawing and interface sound feedback
import { Tool } from './store';

class TactileAudioEngine {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private lastPlayTime: number = 0;
  private lastPoint: { x: number; y: number } | null = null;
  private isDrawing: boolean = false;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      if (!this.ctx) {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtxClass) {
          this.ctx = new AudioCtxClass();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  // Pre-bake a pink/textured noise buffer for realistic pencil and eraser friction
  private getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.noiseBuffer) return this.noiseBuffer;
    const sampleRate = ctx.sampleRate;
    const duration = 0.5; // half second loop buffer
    const bufferSize = sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);

    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      // Pink noise filter algorithm (Paul Kellet's method)
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }

    this.noiseBuffer = buffer;
    return buffer;
  }

  /**
   * Called on pointerdown to produce a subtle tactile touchdown click
   */
  public onPointerDown(tool: Tool, pressure: number = 0.5) {
    const ctx = this.getContext();
    if (!ctx) return;
    this.isDrawing = true;
    this.lastPlayTime = performance.now();

    try {
      const now = ctx.currentTime;
      // Micro click / paper tap
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      const baseFreq = tool === 'eraser' || tool === 'ai-eraser' ? 160 : 380;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.035);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(tool === 'eraser' ? 300 : 1200, now);

      const targetGain = Math.min(0.04, Math.max(0.008, 0.02 * pressure));
      gain.gain.setValueAtTime(targetGain, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.035);
    } catch {}
  }

  /**
   * Called continuously as the user drags their pointer across the canvas.
   * Generates micro-granular friction grains tailored to the tool type and stroke velocity.
   */
  public onPointerMove(point: { x: number; y: number }, tool: Tool, pressure: number = 0.5) {
    if (!this.isDrawing) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const nowMs = performance.now();
    // Throttle to avoid audio queue overloading (minimum 28ms between grains)
    if (nowMs - this.lastPlayTime < 26) {
      return;
    }

    let dist = 10;
    if (this.lastPoint) {
      dist = Math.hypot(point.x - this.lastPoint.x, point.y - this.lastPoint.y);
    }
    this.lastPoint = point;

    // Only make sound if the pen is actually moving
    if (dist < 1.5) return;

    this.lastPlayTime = nowMs;

    try {
      const audioTime = ctx.currentTime;
      const noise = this.getNoiseBuffer(ctx);
      const source = ctx.createBufferSource();
      source.buffer = noise;
      // Randomize buffer playback offset
      source.loop = true;
      source.playbackRate.value = 0.8 + Math.random() * 0.4;

      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      const grainDuration = Math.min(0.06, Math.max(0.02, 0.015 + dist * 0.001));

      if (tool === 'eraser' || tool === 'ai-eraser') {
        // Soft rubbing/whoosh texture
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(240 + Math.random() * 80, audioTime);
        filter.Q.value = 1.0;

        const maxGain = Math.min(0.03, 0.012 + pressure * 0.012);
        gain.gain.setValueAtTime(0.0001, audioTime);
        gain.gain.linearRampToValueAtTime(maxGain, audioTime + grainDuration * 0.3);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioTime + grainDuration);
      } else if (tool === 'ascii') {
        // Crisp typewriter mechanical click
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1400 + Math.random() * 300, audioTime);
        filter.Q.value = 4.0;

        const maxGain = Math.min(0.035, 0.015 + pressure * 0.015);
        gain.gain.setValueAtTime(0.0001, audioTime);
        gain.gain.linearRampToValueAtTime(maxGain, audioTime + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioTime + grainDuration * 0.8);
      } else {
        // Natural pencil / graphite friction on paper texture
        filter.type = 'bandpass';
        // Center around 1200 - 2400 Hz for authentic paper scratch
        const centerFreq = 1200 + Math.min(1000, dist * 25) + (Math.random() - 0.5) * 300;
        filter.frequency.setValueAtTime(centerFreq, audioTime);
        filter.Q.value = 2.2;

        const maxGain = Math.min(0.028, 0.008 + (pressure || 0.5) * 0.015);
        gain.gain.setValueAtTime(0.0001, audioTime);
        gain.gain.linearRampToValueAtTime(maxGain, audioTime + grainDuration * 0.25);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioTime + grainDuration);
      }

      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      source.start(audioTime);
      source.stop(audioTime + grainDuration + 0.01);
    } catch {}
  }

  /**
   * Called on pointerup to finish tactile drawing
   */
  public onPointerUp() {
    this.isDrawing = false;
    this.lastPoint = null;
  }
}

export const tactileAudio = new TactileAudioEngine();
