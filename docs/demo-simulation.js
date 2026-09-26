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
  constructor(canvas, _unusedImage, onFrame = () => {}, onEnded = () => {}) {
    if (!canvas?.getContext) throw new TypeError('DemoSimulation needs a canvas.');
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onFrame = onFrame;
    this.onEnded = onEnded;
    this.fraction = 0;
    this.playing = false;
    this.destroyed = false;
    this.raf = null;
    this.lastTimestamp = null;
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
    c.translate(x, roadY);
    c.lineCap = 'round';
    c.lineJoin = 'round';

    // This is a standalone vector motorcycle, not a crop or transformation of an upload.
    const path = (points, fill, stroke = null, width = 2) => {
      c.beginPath(); c.moveTo(...points[0]);
      for (const point of points.slice(1)) c.lineTo(...point);
      if (fill) { c.closePath(); c.fillStyle = fill; c.fill(); }
      if (stroke) { c.strokeStyle = stroke; c.lineWidth = width; c.stroke(); }
    };
    c.fillStyle = '#17221e0c';
    c.beginPath(); c.ellipse(0, 3, 73, 5, 0, 0, Math.PI * 2); c.fill();

    const wheelAngle = (x - initialX) / 21;
    for (const wheelX of [-47, 47]) {
      c.save(); c.translate(wheelX, -22);
      c.fillStyle = '#253238';
      c.beginPath(); c.arc(0, 0, 22, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#536269'; c.lineWidth = 1.5;
      c.beginPath(); c.arc(0, 0, 19, 0, Math.PI * 2); c.stroke();
      c.fillStyle = '#f8faf8';
      c.beginPath(); c.arc(0, 0, 15, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#a1b0b5'; c.lineWidth = 2.5;
      c.rotate(wheelAngle);
      for (let spoke = 0; spoke < 5; spoke++) {
        const angle = spoke * Math.PI * 2 / 5;
        c.beginPath(); c.moveTo(0, 0);
        c.lineTo(Math.cos(angle) * 14, Math.sin(angle) * 14); c.stroke();
      }
      c.fillStyle = '#536269';
      c.beginPath(); c.arc(0, 0, 5, 0, Math.PI * 2); c.fill();
      c.restore();
    }

    // Swingarm, chassis, engine, and exhaust make the motorcycle silhouette distinct.
    path([[-47, -22], [-10, -26], [16, -52], [-28, -52], [-47, -22]], null, '#576972', 5);
    path([[-47, -22], [-17, -29]], null, '#acb8bb', 2);
    path([[-11, -43], [10, -43], [15, -29], [8, -22], [-10, -23]], '#3d4b52', '#26353b');
    for (const y of [-37, -32, -27]) path([[-7, y], [8, y]], null, '#8b999d', 1.5);
    path([[-2, -23], [-25, -15], [-54, -18]], null, '#70838b', 7);
    path([[-25, -15], [-53, -18]], null, '#c4ced0', 4);

    // Forks and front mudguard.
    path([[30, -65], [46, -23]], null, '#d5dfe0', 7);
    path([[33, -59], [47, -22]], null, '#536975', 3);
    c.strokeStyle = '#1478a0'; c.lineWidth = 5;
    c.beginPath(); c.arc(47, -22, 27, Math.PI * 1.08, Math.PI * 1.87); c.stroke();

    // Blue bodywork: rear cowl, fuel tank, and angled fairing.
    path([[-67, -56], [-39, -60], [-17, -53], [-30, -44], [-57, -46]], '#2185ab', '#176180');
    path([[-30, -55], [-16, -70], [4, -71], [25, -60], [14, -45], [-9, -45]], '#268fb4', '#155d7b');
    path([[-15, -64], [2, -66], [16, -59]], null, '#80c7da', 3);
    path([[21, -65], [39, -61], [48, -47], [30, -33], [8, -35], [15, -49]], '#1478a0', '#155d7b');
    path([[19, -53], [40, -51], [28, -40], [16, -41]], '#eef5ef');
    path([[29, -68], [34, -82], [43, -72], [41, -61]], '#c1e3e6', '#87bac4', 1.5);
    path([[43, -53], [49, -48], [43, -45]], '#f6d683');
    path([[-53, -59], [-20, -60], [-13, -54], [-42, -53]], '#26373f');
    path([[-65, -53], [-61, -52]], null, '#f09a79', 3);
    path([[24, -66], [31, -77], [38, -75]], null, '#344d58', 3);
    path([[31, -76], [29, -87]], null, '#637f8a', 2);
    c.fillStyle = '#536d77';
    c.beginPath(); c.ellipse(28, -89, 5, 3, -0.35, 0, Math.PI * 2); c.fill();

    // A helmeted rider leans into the handlebars. Broad shapes remain readable at iPad size.
    path([[-26, -64], [-5, -45], [-17, -27]], null, '#243d50', 12);
    path([[-24, -63], [-6, -45]], null, '#486478', 3);
    path([[-18, -28], [-11, -23], [-1, -23]], null, '#172b37', 7);
    path([[-33, -64], [-21, -88], [-5, -105], [8, -96], [-2, -77], [-17, -61]], '#27675e', '#194d48', 2);
    path([[-23, -82], [-7, -99]], null, '#79a798', 3);
    path([[3, -96], [14, -83], [31, -76]], null, '#27675e', 9);
    path([[5, -95], [16, -84], [28, -79]], null, '#79a798', 2.5);
    path([[30, -76], [35, -75]], null, '#203d3c', 6);
    path([[1, -104], [6, -97]], null, '#243e46', 7);

    // Full-face helmet with a high-contrast dark visor.
    c.fillStyle = '#f1b57c'; c.strokeStyle = '#ad7651'; c.lineWidth = 1.5;
    c.beginPath(); c.ellipse(10, -111, 14, 12, 0.35, 0, Math.PI * 2); c.fill(); c.stroke();
    path([[8, -121], [20, -116], [24, -109], [10, -109], [3, -115]], '#203e4b');
    path([[12, -117], [19, -114]], null, '#83b9c8', 2);
    path([[11, -108], [24, -107], [20, -101], [8, -103]], '#e6a670', '#ad7651', 1);
    path([[1, -118], [4, -120]], null, '#ffdeba', 2.5);
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
