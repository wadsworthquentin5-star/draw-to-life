const VIEW = Object.freeze({ width: 900, height: 480, centerX: 300, centerY: 270 });
const SHELLS = Object.freeze([
  Object.freeze({ n: 1, capacity: 2, radius: 49, color: '#80a65f', pale: '#edf4e5', angle: -Math.PI / 2 }),
  Object.freeze({ n: 2, capacity: 8, radius: 96, color: '#398e86', pale: '#e8f4f1', angle: -Math.PI / 2 + Math.PI / 8 }),
  Object.freeze({ n: 3, capacity: 18, radius: 144, color: '#7394b0', pale: '#edf2f7', angle: -Math.PI / 2 }),
]);
const SHELL_DURATION = 1050;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const normalizeCount = count => clamp(Math.trunc(Number(count) || 0), 0, SHELLS.length);
const progressFor = (reveal, index) => clamp(reveal - index, 0, 1);
const easeOut = value => 1 - (1 - value) ** 3;

function frameState(reveal, completedShells, isAnimating) {
  const electronCounts = SHELLS.map((shell, index) => Math.ceil(progressFor(reveal, index) * shell.capacity));
  return {
    completedShells,
    electronCounts,
    total: electronCounts.reduce((sum, count) => sum + count, 0),
    isAnimating,
  };
}

export class ChemistrySimulation {
  constructor(canvas, onFrame = () => {}) {
    if (!canvas?.getContext) throw new TypeError('ChemistrySimulation needs a canvas.');
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    if (!this.ctx) throw new TypeError('ChemistrySimulation needs a 2D canvas context.');
    this.onFrame = typeof onFrame === 'function' ? onFrame : () => {};
    this._completedShells = 0;
    this._isAnimating = false;
    this.reveal = 0;
    this.destroyed = false;
    this.raf = null;
    this.animation = null;
    this.lastTimestamp = null;
    this.tick = this.tick.bind(this);
    this.resize = this.resize.bind(this);
    this.resize();
    this.observer = typeof ResizeObserver === 'function' ? new ResizeObserver(this.resize) : null;
    this.observer?.observe(canvas);
    this.emit();
  }

  get completedShells() { return this._completedShells; }
  get isAnimating() { return this._isAnimating; }

  resize() {
    if (this.destroyed) return;
    const ratio = clamp(globalThis.devicePixelRatio || 1, 1, 2);
    const width = VIEW.width * ratio, height = VIEW.height * ratio;
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    this.render();
  }

  emit() {
    this.onFrame(frameState(this.reveal, this.completedShells, this.isAnimating));
  }

  cancelAnimation() {
    if (this.raf !== null) cancelAnimationFrame(this.raf);
    this.raf = null;
    this.lastTimestamp = null;
    this.animation = null;
    this._isAnimating = false;
  }

  setCompletedShells(count, { animate = true } = {}) {
    if (this.destroyed) return;
    const target = normalizeCount(count);
    this.cancelAnimation();
    this._completedShells = target;
    const reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
    if (!animate || reducedMotion || target <= this.reveal) {
      this.reveal = target;
      this.render();
      this.emit();
      return;
    }
    this.animation = { start: this.reveal, target, elapsed: 0, duration: (target - this.reveal) * SHELL_DURATION };
    this._isAnimating = true;
    this.render();
    this.emit();
    this.raf = requestAnimationFrame(this.tick);
  }

  replay() {
    if (this.destroyed) return;
    const target = this.completedShells;
    this.cancelAnimation();
    this.reveal = 0;
    this.setCompletedShells(target);
  }

  pause() {
    if (this.destroyed) return;
    this.cancelAnimation();
    this.render();
    this.emit();
  }

  tick(timestamp) {
    if (this.destroyed || !this.isAnimating || !this.animation) return;
    const animation = this.animation;
    if (this.lastTimestamp !== null) animation.elapsed += clamp(timestamp - this.lastTimestamp, 0, 100);
    this.lastTimestamp = timestamp;
    const fraction = clamp(animation.elapsed / animation.duration, 0, 1);
    this.reveal = animation.start + (animation.target - animation.start) * fraction;
    const finished = fraction >= 1;
    if (finished) {
      this.reveal = animation.target;
      this.cancelAnimation();
    }
    this.render();
    this.emit();
    if (!finished) this.raf = requestAnimationFrame(this.tick);
  }

  destroy() {
    if (this.destroyed) return;
    this.cancelAnimation();
    this.destroyed = true;
    this.observer?.disconnect();
    this.onFrame = () => {};
  }

  text(value, x, y, size = 16, color = '#273128', weight = 500, align = 'left') {
    const c = this.ctx;
    c.font = `${weight} ${size}px system-ui, -apple-system, sans-serif`;
    c.fillStyle = color;
    c.textAlign = align;
    c.fillText(value, x, y);
  }

  circle(x, y, radius, fill, stroke = null, lineWidth = 1) {
    const c = this.ctx;
    c.beginPath();
    c.arc(x, y, radius, 0, Math.PI * 2);
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = lineWidth; c.stroke(); }
  }

  panel(x, y, width, height, radius, fill, stroke = null) {
    const c = this.ctx;
    c.beginPath();
    c.moveTo(x + radius, y);
    c.lineTo(x + width - radius, y);
    c.quadraticCurveTo(x + width, y, x + width, y + radius);
    c.lineTo(x + width, y + height - radius);
    c.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    c.lineTo(x + radius, y + height);
    c.quadraticCurveTo(x, y + height, x, y + height - radius);
    c.lineTo(x, y + radius);
    c.quadraticCurveTo(x, y, x + radius, y);
    c.closePath();
    c.fillStyle = fill;
    c.fill();
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = 1; c.stroke(); }
  }

  drawHeader() {
    this.text('ATOMS, ONE SHELL AT A TIME', 30, 32, 12, '#87917d', 700);
    this.text('Electron shell capacity', 30, 67, 29, '#273128', 600);
    this.text('Maximum electrons per shell: 2n²', 30, 93, 17, '#7b8872');
    this.panel(739, 32, 131, 40, 20, '#f2f6eb');
    this.text('2n²', 804, 59, 23, '#607e43', 650, 'center');
  }

  drawNucleus() {
    const x = VIEW.centerX, y = VIEW.centerY;
    this.circle(x, y, 29, '#f6f8f1');
    this.circle(x, y, 20, '#eaf0e0');
    const particles = [
      [-8, -6, '#a7b889'], [5, -10, '#d6dfc6'], [12, 2, '#93a874'],
      [2, 10, '#c4d2ad'], [-11, 7, '#b5c59a'], [0, 0, '#90a974'],
    ];
    for (const [dx, dy, color] of particles) this.circle(x + dx, y + dy, 8, color, '#ffffff', 1.5);
    this.text('nucleus', x, y + 42, 12, '#929c87', 500, 'center');
  }

  drawShells() {
    const c = this.ctx;
    SHELLS.forEach((shell, index) => {
      const progress = progressFor(this.reveal, index);
      this.circle(VIEW.centerX, VIEW.centerY, shell.radius, null, shell.pale, 2);
      c.save();
      c.globalAlpha = progress > 0 ? .7 : .32;
      c.setLineDash(progress > 0 ? [] : [4, 6]);
      this.circle(VIEW.centerX, VIEW.centerY, shell.radius, null, shell.color, 1.5);
      c.restore();
      const amount = progress * shell.capacity;
      for (let index = 0; index < shell.capacity; index++) {
        const entrance = clamp(amount - index, 0, 1);
        if (entrance === 0) continue;
        const eased = easeOut(entrance);
        const angle = shell.angle + index / shell.capacity * Math.PI * 2;
        const radius = shell.radius * (.76 + .24 * eased);
        const x = VIEW.centerX + Math.cos(angle) * radius, y = VIEW.centerY + Math.sin(angle) * radius;
        c.save(); c.globalAlpha = entrance;
        this.circle(x, y, 9, '#ffffff');
        this.circle(x, y, 5.5 * (.7 + .3 * eased), shell.color);
        c.strokeStyle = '#ffffff'; c.lineWidth = 1.5;
        c.beginPath(); c.moveTo(x - 2.1, y); c.lineTo(x + 2.1, y); c.stroke();
        c.restore();
      }
    });
  }

  drawLegend(state) {
    this.text('SHELL', 547, 132, 11, '#8a947e', 650);
    this.text('MAXIMUM CAPACITY', 840, 132, 11, '#8a947e', 650, 'right');
    SHELLS.forEach((shell, index) => {
      const y = 147 + index * 65;
      const complete = this.reveal >= index + 1;
      const active = progressFor(this.reveal, index) > 0;
      this.panel(533, y, 323, 55, 11, active ? shell.pale : '#f9faf6', active ? null : '#ecf0e6');
      this.circle(558, y + 27, 5, shell.color);
      this.text(`n = ${shell.n}`, 575, y + 34, 21, '#35432f', 550);
      this.text(String(shell.capacity), 831, y + 35, 25, active ? shell.color : '#a9b29f', 650, 'right');
      this.text(complete ? 'filled' : active ? 'filling…' : 'empty', 723, y + 33, 13, '#8a977e', 500, 'right');
    });
    this.panel(533, 353, 323, 66, 12, '#273128');
    this.text('TOTAL ELECTRONS SHOWN', 552, 378, 10, '#b8c5a8', 650);
    this.text(`${state.total} / 28`, 835, 397, 30, '#ffffff', 650, 'right');
    this.text(this.reveal >= SHELLS.length ? 'All three capacities filled' : 'Build the shells step by step', 552, 402, 11, '#d1dac6');
  }

  render() {
    if (this.destroyed) return;
    const c = this.ctx;
    c.setTransform(this.canvas.width / VIEW.width, 0, 0, this.canvas.height / VIEW.height, 0, 0);
    c.clearRect(0, 0, VIEW.width, VIEW.height);
    c.fillStyle = '#ffffff'; c.fillRect(0, 0, VIEW.width, VIEW.height);
    this.drawHeader();
    this.drawShells();
    this.drawNucleus();
    this.drawLegend(frameState(this.reveal, this.completedShells, this.isAnimating));
    this.text('Schematic shell capacities · not an electron configuration', 30, 458, 13, '#8b957f');
  }
}
