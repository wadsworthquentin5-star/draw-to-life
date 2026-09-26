// A deliberately preset clip for the hackathon demonstration. No AI or network calls.
export const DEMO_CLIP_SECONDS = 7;
export const DEMO_PHYSICS_SECONDS = 2;

export function demoFrame(fraction) {
  const progress = Math.max(0, Math.min(1, Number(fraction) || 0));
  const time = progress * DEMO_PHYSICS_SECONDS;
  return { time, x: 5 + 15 * time + 2 * time * time, v: 15 + 4 * time };
}

const W = 900;
const H = 420;
const roadY = 273;
const initialX = 160;
const finalX = 718;
const ink = '#17221e';
const green = '#137755';
const muted = '#718078';
const round = value => value.toFixed(1);

export class DemoSimulation {
  constructor(canvas, image, onFrame = () => {}, onEnded = () => {}) {
    if (!canvas?.getContext) throw new TypeError('DemoSimulation needs a canvas.');
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.image = image;
    this.onFrame = onFrame;
    this.onEnded = onEnded;
    this.fraction = 0;
    this.playing = false;
    this.destroyed = false;
    this.raf = null;
    this.lastTimestamp = null;
    this.imageLoaded = () => this.render();
    image?.addEventListener?.('load', this.imageLoaded);
    this.tick = this.tick.bind(this);
    this.resize = this.resize.bind(this);
    this.resize();
    this.observer = typeof ResizeObserver === 'function' ? new ResizeObserver(this.resize) : null;
    this.observer?.observe(canvas);
    this.emit();
  }

  resize() {
    if (this.destroyed) return;
    const ratio = Math.max(1, Math.min(2, globalThis.devicePixelRatio || 1));
    if (this.canvas.width !== W * ratio || this.canvas.height !== H * ratio) {
      this.canvas.width = W * ratio;
      this.canvas.height = H * ratio;
    }
    this.render();
  }

  emit() {
    this.onFrame({ ...demoFrame(this.fraction), playing: this.playing });
  }

  play() {
    if (this.destroyed || this.playing) return;
    if (this.fraction >= 1) this.fraction = 0;
    this.playing = true;
    this.lastTimestamp = null;
    this.emit();
    this.raf = requestAnimationFrame(this.tick);
  }

  pause() {
    if (this.destroyed) return;
    this.playing = false;
    cancelAnimationFrame(this.raf);
    this.raf = null;
    this.lastTimestamp = null;
    this.render();
    this.emit();
  }

  replay() {
    if (this.destroyed) return;
    this.pause();
    this.fraction = 0;
    this.render();
    this.play();
  }

  seek(fraction) {
    if (this.destroyed) return;
    this.fraction = Math.max(0, Math.min(1, Number(fraction) || 0));
    this.lastTimestamp = null;
    this.render();
    this.emit();
  }

  tick(timestamp) {
    if (this.destroyed || !this.playing) return;
    if (this.lastTimestamp !== null) {
      // Capping a frame gap prevents a backgrounded iPad tab from skipping the whole clip.
      const delta = Math.min(100, Math.max(0, timestamp - this.lastTimestamp));
      this.fraction = Math.min(1, this.fraction + delta / (DEMO_CLIP_SECONDS * 1000));
    }
    this.lastTimestamp = timestamp;
    const ended = this.fraction >= 1;
    if (ended) {
      this.playing = false;
      this.raf = null;
      this.lastTimestamp = null;
    }
    this.render();
    this.emit();
    if (ended) this.onEnded();
    else this.raf = requestAnimationFrame(this.tick);
  }

  destroy() {
    this.destroyed = true;
    this.playing = false;
    cancelAnimationFrame(this.raf);
    this.observer?.disconnect();
    this.image?.removeEventListener?.('load', this.imageLoaded);
    this.onFrame = () => {};
    this.onEnded = () => {};
  }

  text(text, x, y, size = 15, color = ink, weight = 500, align = 'left') {
    const c = this.ctx;
    c.font = `${weight} ${size}px system-ui, -apple-system, sans-serif`;
    c.fillStyle = color;
    c.textAlign = align;
    c.fillText(text, x, y);
  }

  arrow(x1, y1, x2, y2, color, width = 3) {
    const c = this.ctx;
    const angle = Math.atan2(y2 - y1, x2 - x1);
    c.strokeStyle = color;
    c.fillStyle = color;
    c.lineWidth = width;
    c.beginPath();
    c.moveTo(x1, y1);
    c.lineTo(x2, y2);
    c.stroke();
    c.beginPath();
    c.moveTo(x2, y2);
    c.lineTo(x2 - 9 * Math.cos(angle - Math.PI / 6), y2 - 9 * Math.sin(angle - Math.PI / 6));
    c.lineTo(x2 - 9 * Math.cos(angle + Math.PI / 6), y2 - 9 * Math.sin(angle + Math.PI / 6));
    c.closePath();
    c.fill();
  }

  rider(x, alpha = 1) {
    const c = this.ctx;
    c.save();
    c.globalAlpha = alpha;
    const sourceW = this.image?.naturalWidth || this.image?.width || 0;
    const sourceH = this.image?.naturalHeight || this.image?.height || 0;
    if (sourceW > 0 && sourceH > 0 && this.image?.complete !== false) {
      // Crop the solid rider from the supplied 1200 × 488 problem image at render time.
      // Ratios preserve the crop when the same source is saved at another resolution.
      c.drawImage(this.image, sourceW * 0.56, sourceH * 0.52, sourceW * 0.125,
        sourceH * 0.2275, x - 69, roadY - 105, 142, 105);
    } else {
      // The UI remains usable if its bundled image has not loaded yet.
      c.strokeStyle = ink;
      c.lineWidth = 4;
      for (const wheelX of [x - 43, x + 42]) {
        c.beginPath(); c.arc(wheelX, roadY - 17, 17, 0, Math.PI * 2); c.stroke();
      }
      c.beginPath();
      c.moveTo(x - 43, roadY - 17); c.lineTo(x - 8, roadY - 51);
      c.lineTo(x + 24, roadY - 51); c.lineTo(x + 42, roadY - 17);
      c.moveTo(x - 8, roadY - 51); c.lineTo(x + 6, roadY - 80);
      c.lineTo(x + 28, roadY - 63); c.stroke();
      c.beginPath(); c.arc(x + 8, roadY - 92, 9, 0, Math.PI * 2); c.stroke();
    }
    c.restore();
  }

  render() {
    if (this.destroyed || !this.ctx) return;
    const c = this.ctx;
    const state = demoFrame(this.fraction);
    const position = initialX + (state.x - 5) / 38 * (finalX - initialX);
    c.setTransform(this.canvas.width / W, 0, 0, this.canvas.height / H, 0, 0);
    c.clearRect(0, 0, W, H);
    c.fillStyle = '#ffffff'; c.fillRect(0, 0, W, H);

    this.text('THE MOTORCYCLE, IN MOTION', 30, 32, 12, muted, 700);
    this.text('Constant acceleration', 30, 63, 24, ink, 650);
    this.text('Preset demo clip · slowed down to see the motion', 30, 86, 12, muted);
    this.text('a = 4.0 m/s² east', 866, 52, 19, green, 650, 'right');
    this.text('The acceleration stays the same. Speed increases.', 866, 75, 12, muted, 500, 'right');

    // A little sign anchors the coordinate origin to the problem statement.
    c.strokeStyle = '#9ca79e'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(77, 195); c.lineTo(77, roadY); c.stroke();
    c.fillStyle = '#f4f7f3'; c.fillRect(44, 168, 66, 32);
    c.strokeStyle = '#c5cec5'; c.lineWidth = 1; c.strokeRect(44, 168, 66, 32);
    this.text('CITY LIMITS', 77, 188, 8, muted, 650, 'center');
    this.text('0', 77, roadY + 25, 13, muted, 500, 'center');

    if (this.fraction > 0.06) this.rider(initialX, 0.16);
    // A fixed-acceleration trajectory produces gradually larger gaps between marks.
    for (const past of [0, 0.2, 0.4, 0.6, 0.8]) {
      if (past >= this.fraction - 0.035) continue;
      const marker = initialX + (demoFrame(past).x - 5) / 38 * (finalX - initialX);
      c.fillStyle = '#d9e9df'; c.beginPath(); c.arc(marker, roadY + 7, 3, 0, Math.PI * 2); c.fill();
    }
    this.rider(position);

    c.strokeStyle = '#a5b2a9'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(29, roadY + 1); c.lineTo(850, roadY + 1); c.stroke();
    this.arrow(806, roadY + 27, 856, roadY + 27, muted, 1.5);
    this.text('east (+x)', 831, roadY + 48, 11, muted, 500, 'center');
    for (const [point, label] of [[initialX, 'x₀ = 5.0 m'], [finalX, 'x = 43.0 m']]) {
      c.strokeStyle = '#a5b2a9'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(point, roadY + 1); c.lineTo(point, roadY + 9); c.stroke();
      this.text(label, point, roadY + 28, 13, muted, 500, 'center');
    }

    const arrowLength = 45 + (state.v - 15) * 4;
    this.arrow(position - 24, roadY - 128, position - 24 + arrowLength, roadY - 128, green, 3);
    this.text(`${round(state.v)} m/s`, position + 12, roadY - 140, 15, green, 650, 'center');

    c.fillStyle = '#f4f7f3'; c.fillRect(20, 335, 860, 66);
    const values = [
      ['ELAPSED TIME', `${round(state.time)} s`],
      ['VELOCITY', `${round(state.v)} m/s`],
      ['POSITION', `${round(state.x)} m`],
      ['ACCELERATION', '4.0 m/s²'],
    ];
    values.forEach(([label, value], index) => {
      const center = 128 + index * 215;
      this.text(label, center, 356, 9, muted, 700, 'center');
      this.text(value, center, 384, 22, index === 1 ? green : ink, 650, 'center');
    });
  }
}
