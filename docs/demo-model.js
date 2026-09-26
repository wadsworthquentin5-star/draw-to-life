export const DEMO_OVERVIEW = Object.freeze({
  simulated: true,
  title: 'A motorcyclist accelerating east',
  summary: 'At t = 0 s, the rider is 5 m east of the city-limit sign and travelling east at 15 m/s. She accelerates east at a constant 4 m/s². Find her velocity and position after 2 s.',
  values: Object.freeze({ x0: 5, v0: 15, a: 4, t: 2, v: 23, x: 43, dx: 38 }),
  knowns: Object.freeze([
    Object.freeze({ symbol: 'x₀', label: 'Initial position', value: 5, unit: 'm' }),
    Object.freeze({ symbol: 'v₀', label: 'Initial velocity', value: 15, unit: 'm/s' }),
    Object.freeze({ symbol: 'a', label: 'Constant acceleration', value: 4, unit: 'm/s²' }),
    Object.freeze({ symbol: 't', label: 'Elapsed time', value: 2, unit: 's' }),
  ]),
  unknowns: Object.freeze(['Final velocity v', 'Final position x']),
  equations: Object.freeze(['v = v₀ + at', 'x = x₀ + v₀t + ½at²']),
  disclosure: 'Scripted demo: the overview, animation and handwriting feedback are predetermined for this problem. No AI reads your image or handwriting.',
});

export const DEMO_STEPS = Object.freeze([
  Object.freeze({
    id: 'formula',
    simulated: true,
    title: '1. Choose the equation',
    prompt: 'Which constant-acceleration equation gives the final velocity? Write the formula, then draw a selection box around your handwriting.',
    expectedWriting: 'v = v₀ + at',
    optionalWriting: 'x = x₀ + v₀t + ½at²',
    status: 'correct',
    feedbackTitle: 'Correct — that is the right equation.',
    explanation: 'For constant acceleration, v = v₀ + at relates the initial velocity, acceleration and elapsed time to the final velocity. To find position as well, use x = x₀ + v₀t + ½at². This is the planned correct response for step 1; it does not assess your handwriting.',
  }),
  Object.freeze({
    id: 'substitution',
    simulated: true,
    title: '2. Substitute the values',
    prompt: 'For the planned mistake, write v = 15 + 3 × 2. Put 3 in place of the acceleration, then box the line to check this step.',
    expectedWriting: 'v = 15 + 3 × 2',
    status: 'incorrect',
    feedbackTitle: 'Check the acceleration: 3 should be 4.',
    explanation: 'The planned error is the acceleration, not the equation: the problem gives a = 4 m/s², not 3 m/s². The initial velocity 15 m/s and time 2 s are correct. Replace 3 with 4: Δv = at = 4 × 2 = 8 m/s, so v = 15 + 8 = 23 m/s. This is the scripted feedback for step 2, not a reading of your handwriting.',
    correction: 'v = 15 + 4 × 2 = 23 m/s',
  }),
  Object.freeze({
    id: 'answer',
    simulated: true,
    title: '3. Finish with the answers',
    prompt: 'Use a = 4 m/s², simplify and write the final velocity with units. You can also show the final position. Box your finished answer to check it.',
    expectedWriting: 'v = 23 m/s',
    optionalWriting: 'x = 5 + 15 × 2 + ½ × 4 × 2² = 43 m',
    status: 'correct',
    feedbackTitle: 'Yes — 23 m/s east is correct.',
    explanation: 'v = 15 + 4 × 2 = 23 m/s east. For position, x = 5 + 15 × 2 + ½ × 4 × 2² = 43 m east of the sign. The rider travels 38 m from her starting point; 38 m is displacement, not the final position. This is the planned correct response for step 3; it does not assess your handwriting.',
    answers: Object.freeze({ velocity: '23 m/s east', position: '43 m east of the sign', displacement: '38 m east' }),
  }),
]);

export const MIN_SELECTION_SIZE = 8;
const inkTypes = new Set(['pen', 'line', 'circle', 'arrow', 'rectangle', 'rect']);
const finitePoint = point => point != null && Number.isFinite(point.x) && Number.isFinite(point.y);

class GeometryBounds {
  constructor(left, top, right, bottom) {
    Object.assign(this, { left, top, right, bottom });
  }

  static fromCorners(start, end) {
    if (!finitePoint(start) || !finitePoint(end)) return null;
    return new GeometryBounds(
      Math.min(start.x, end.x), Math.min(start.y, end.y),
      Math.max(start.x, end.x), Math.max(start.y, end.y),
    );
  }

  static fromRectangle(rectangle) {
    if (!rectangle || typeof rectangle !== 'object') return null;
    const { left, top, right, bottom, x, y, width, height } = rectangle;
    if ([left, top, right, bottom].every(Number.isFinite)) {
      return GeometryBounds.fromCorners({ x: left, y: top }, { x: right, y: bottom });
    }
    if ([x, y, width, height].every(Number.isFinite)) {
      return GeometryBounds.fromCorners({ x, y }, { x: x + width, y: y + height });
    }
    return null;
  }

  static fromPoints(points) {
    if (!points.length) return null;
    const bounds = new GeometryBounds(Infinity, Infinity, -Infinity, -Infinity);
    for (const point of points) {
      if (!finitePoint(point)) return null;
      bounds.left = Math.min(bounds.left, point.x);
      bounds.top = Math.min(bounds.top, point.y);
      bounds.right = Math.max(bounds.right, point.x);
      bounds.bottom = Math.max(bounds.bottom, point.y);
    }
    return bounds;
  }

  get width() { return this.right - this.left; }
  get height() { return this.bottom - this.top; }

  contains(bounds) {
    return bounds !== null && bounds.left >= this.left && bounds.right <= this.right
      && bounds.top >= this.top && bounds.bottom <= this.bottom;
  }

  toRectangle() {
    const { left, top, right, bottom, width, height } = this;
    return { left, top, right, bottom, width, height };
  }
}

function resolveInkBounds(item) {
  return Array.isArray(item.points)
    ? GeometryBounds.fromPoints(item.points)
    : GeometryBounds.fromRectangle(item.bbox || item.bounds);
}

export function normaliseBox(start, end) {
  return GeometryBounds.fromCorners(start, end)?.toRectangle() ?? null;
}

export function selectInkIds(items, rectangle) {
  const box = GeometryBounds.fromRectangle(rectangle);
  if (!Array.isArray(items) || !box || box.width < MIN_SELECTION_SIZE || box.height < MIN_SELECTION_SIZE) return [];
  const selected = new Set();
  for (const item of items) {
    if (!item || !inkTypes.has(item.type) || item.id == null) continue;
    if (box.contains(resolveInkBounds(item))) selected.add(item.id);
  }
  return [...selected];
}

export function hasBoxedInk(items, rectangle) {
  return selectInkIds(items, rectangle).length > 0;
}
