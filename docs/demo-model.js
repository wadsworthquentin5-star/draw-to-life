export const DEMO_OVERVIEW = Object.freeze({
  simulated: true,
  title: 'A motorcyclist accelerating east',
  summary: 'At t = 0 s, the rider is 5 m east of the city-limit sign and travelling east at 15 m/s. She accelerates east at a constant 4 m/s². Find her final velocity and final position relative to the sign after 2 s.',
  values: Object.freeze({ x0: 5, v0: 15, a: 4, t: 2, v: 23, x: 43, dx: 38 }),
  knowns: Object.freeze([
    Object.freeze({ symbol: 'x₀', label: 'Initial position', value: 5, unit: 'm' }),
    Object.freeze({ symbol: 'v₀', label: 'Initial velocity', value: 15, unit: 'm/s' }),
    Object.freeze({ symbol: 'a', label: 'Constant acceleration', value: 4, unit: 'm/s²' }),
    Object.freeze({ symbol: 't', label: 'Elapsed time', value: 2, unit: 's' }),
  ]),
  unknowns: Object.freeze(['Final velocity v', 'Final position x']),
  equations: Object.freeze(['v = v₀ + at', 'x = x₀ + v₀t + ½at²']),
});

export const DEMO_STEPS = Object.freeze([
  Object.freeze({
    id: 'formula',
    simulated: true,
    title: '1. Choose the equation',
    prompt: 'Which constant-acceleration equation gives the final velocity? Write the formula, then draw a freehand loop around your handwriting.',
    expectedWriting: 'v = v₀ + at',
    optionalWriting: 'x = x₀ + v₀t + ½at²',
    status: 'correct',
    feedbackTitle: 'Correct — that is the right equation.',
    explanation: 'For constant acceleration, v = v₀ + at relates the initial velocity, acceleration and elapsed time to the final velocity. To find position as well, use x = x₀ + v₀t + ½at².',
  }),
  Object.freeze({
    id: 'substitution',
    simulated: true,
    title: '2. Substitute the values',
    prompt: 'Substitute the known values into your velocity equation, then circle the line to check this step.',
    expectedWriting: 'v = 15 + 3 × 2',
    status: 'incorrect',
    feedbackTitle: 'Check the acceleration: 3 should be 4.',
    explanation: 'The error is the acceleration, not the equation: the problem gives a = 4 m/s², not 3 m/s². The initial velocity 15 m/s and time 2 s are correct. Replace 3 with 4: Δv = at = 4 × 2 = 8 m/s, so v = 15 + 8 = 23 m/s.',
    correction: 'v = 15 + 4 × 2 = 23 m/s',
  }),
  Object.freeze({
    id: 'answer',
    simulated: true,
    title: '3. Find the final position',
    prompt: 'How far east of the city-limit sign is she at t = 2 s? Use x = x₀ + v₀t + ½at² with x₀ = 5 m, substitute the values, and circle your answer with its units.',
    expectedWriting: 'x = 5 + 15 × 2 + ½ × 4 × 2² = 43 m',
    optionalWriting: 'x = 5 + 30 + 8 = 43 m east of the sign',
    status: 'correct',
    feedbackTitle: 'Yes — her final position is 43 m east of the sign.',
    explanation: 'The motorcycle travels 15 × 2 + ½ × 4 × 2² = 30 + 8 = 38 m from her starting point. She starts 5 m east of the sign, so her final position is x = 5 + 38 = 43 m east of the city-limit sign. The 38 m is distance traveled; the 43 m is her final position relative to the sign.',
    answers: Object.freeze({ distance: '38 m', velocity: '23 m/s east', position: '43 m east of the sign', displacement: '38 m east' }),
  }),
]);

export const CHEMISTRY_OVERVIEW = Object.freeze({
  simulated: true,
  title: 'Electron-shell capacities',
  summary: 'A student is building a model of an atom with the first three electron shells. Using 2n², where n is the shell number, calculate the maximum total number of electrons the three shells can hold.',
  values: Object.freeze({
    shells: Object.freeze([1, 2, 3]),
    capacities: Object.freeze([2, 8, 18]),
    total: 28,
  }),
  knowns: Object.freeze([
    Object.freeze({ symbol: 'n', label: 'Shell number', value: '1, 2, 3', unit: '' }),
    Object.freeze({ symbol: '2n²', label: 'Maximum capacity', value: '2 × n²', unit: 'electrons' }),
  ]),
  unknowns: Object.freeze(['Capacity of each shell', 'Combined maximum capacity']),
  equations: Object.freeze(['capacity = 2n²', 'total = 2 + 8 + 18 = 28']),
  modelNote: 'This is a maximum shell-capacity model, not the ground-state electron configuration or filling order of an actual atom.',
});

export const CHEMISTRY_STEPS = Object.freeze([
  Object.freeze({
    id: 'shell-1',
    simulated: true,
    title: '1. Fill the first shell',
    prompt: 'For the first shell, use n = 1 in 2n². Write the calculation, then circle your handwriting to check it.',
    expectedWriting: '2(1)^2 = 2',
    status: 'correct',
    feedbackTitle: 'Correct — the first shell holds up to 2 electrons.',
    explanation: 'The shell number is n = 1, so 2n² = 2 × 1² = 2 electrons. The first shell is now complete in this capacity model.',
    shellCount: 1,
    firstAttempt: Object.freeze({
      simulated: true,
      status: 'incorrect',
      expectedWriting: '2(3)^2 = 18',
      prompt: 'Use 2n² to find the capacity of the first shell. Write your calculation, then circle it to check your work.',
      feedbackTitle: 'Use the first shell number: n = 1, not 3.',
      explanation: 'The arithmetic 2 × 3² = 18 is correct for the third shell, but this question asks about the first shell. Use its shell number n = 1: 2 × 1² = 2. Write a new corrected line and circle that new handwriting before continuing.',
      retryPrompt: 'Try the first shell again with n = 1. Write 2(1)^2 = 2 as new handwriting, then circle it and tap Check.',
      retryExpectedWriting: '2(1)^2 = 2',
      correction: '2(1)^2 = 2 electrons',
      shellCount: 0,
      advances: false,
      retryRequired: true,
    }),
  }),
  Object.freeze({
    id: 'shell-2',
    simulated: true,
    title: '2. Fill the second shell',
    prompt: 'For the second shell, use n = 2. Write 2n² with that shell number, then circle the calculation.',
    expectedWriting: '2(2)^2 = 8',
    status: 'correct',
    feedbackTitle: 'Correct — the second shell holds up to 8 electrons.',
    explanation: 'For n = 2, the capacity is 2 × 2² = 2 × 4 = 8 electrons. Two shells are now complete in this capacity model.',
    shellCount: 2,
  }),
  Object.freeze({
    id: 'shell-3',
    simulated: true,
    title: '3. Fill the third shell',
    prompt: 'Now use n = 3 to find the maximum capacity of the third shell. Write the calculation and circle it.',
    expectedWriting: '2(3)^2 = 18',
    status: 'correct',
    feedbackTitle: 'Correct — the third shell holds up to 18 electrons.',
    explanation: 'For n = 3, the capacity is 2 × 3² = 2 × 9 = 18 electrons. All three shells are now complete in this capacity model; this does not describe the ground-state arrangement of a specific atom.',
    shellCount: 3,
  }),
  Object.freeze({
    id: 'total',
    simulated: true,
    title: '4. Add the capacities',
    prompt: 'Add the three maximum shell capacities. Write the total and circle your answer.',
    expectedWriting: '2 + 8 + 18 = 28',
    status: 'correct',
    feedbackTitle: 'Correct — the combined maximum capacity is 28 electrons.',
    explanation: 'The first three shells have maximum capacities 2, 8 and 18, giving 2 + 8 + 18 = 28 electrons. This sum is a capacity total, not the ground-state electron configuration of a 28-electron atom.',
    shellCount: 3,
    answers: Object.freeze({ firstShell: 2, secondShell: 8, thirdShell: 18, total: 28 }),
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

const GEOMETRY_EPSILON = 1e-8;
const cross = (a, b) => a.x * b.y - a.y * b.x;
const subtract = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
const dot = (a, b) => a.x * b.x + a.y * b.y;
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const clampUnit = value => Math.max(0, Math.min(1, value));

export function normaliseLasso(points) {
  if (!Array.isArray(points) || points.length < 3) return null;
  const clean = [];
  for (const point of points) {
    if (!finitePoint(point)) return null;
    const copy = { x: point.x, y: point.y };
    if (!clean.length || distance(clean.at(-1), copy) > GEOMETRY_EPSILON) clean.push(copy);
  }
  if (clean.length > 1 && distance(clean[0], clean.at(-1)) <= GEOMETRY_EPSILON) clean.pop();
  if (clean.length < 3) return null;
  const bounds = GeometryBounds.fromPoints(clean);
  if (!bounds || !Number.isFinite(bounds.width) || !Number.isFinite(bounds.height) ||
      bounds.width < MIN_SELECTION_SIZE || bounds.height < MIN_SELECTION_SIZE) return null;
  let walked = 0, twiceArea = 0;
  for (let index = 1; index < clean.length; index++) walked += distance(clean[index - 1], clean[index]);
  for (let index = 1; index < clean.length - 1; index++) {
    twiceArea += cross(subtract(clean[index], clean[0]), subtract(clean[index + 1], clean[0]));
  }
  if (!Number.isFinite(twiceArea) || Math.abs(twiceArea) < MIN_SELECTION_SIZE ** 2 ||
      distance(clean[0], clean.at(-1)) > walked * .85) return null;
  return { ...bounds.toRectangle(), points: clean };
}

function pointOnSegment(point, start, end) {
  const direction = subtract(end, start), relative = subtract(point, start);
  const tolerance = GEOMETRY_EPSILON * Math.max(1, Math.hypot(direction.x, direction.y));
  if (Math.abs(cross(direction, relative)) > tolerance) return false;
  return point.x >= Math.min(start.x, end.x) - GEOMETRY_EPSILON &&
    point.x <= Math.max(start.x, end.x) + GEOMETRY_EPSILON &&
    point.y >= Math.min(start.y, end.y) - GEOMETRY_EPSILON &&
    point.y <= Math.max(start.y, end.y) + GEOMETRY_EPSILON;
}

function pointInPolygon(point, polygon) {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const start = polygon[previous], end = polygon[index];
    if (pointOnSegment(point, start, end)) return true;
    if ((start.y > point.y) !== (end.y > point.y) &&
        point.x < (end.x - start.x) * (point.y - start.y) / (end.y - start.y) + start.x) inside = !inside;
  }
  return inside;
}

function edgeIntersections(start, end, edgeStart, edgeEnd) {
  const direction = subtract(end, start), edge = subtract(edgeEnd, edgeStart);
  const delta = subtract(edgeStart, start), denominator = cross(direction, edge);
  const tolerance = GEOMETRY_EPSILON * Math.max(1, Math.hypot(direction.x, direction.y) * Math.hypot(edge.x, edge.y));
  if (Math.abs(denominator) > tolerance) {
    const along = cross(delta, edge) / denominator, across = cross(delta, direction) / denominator;
    return along >= -GEOMETRY_EPSILON && along <= 1 + GEOMETRY_EPSILON &&
      across >= -GEOMETRY_EPSILON && across <= 1 + GEOMETRY_EPSILON ? [clampUnit(along)] : [];
  }
  if (Math.abs(cross(delta, direction)) > GEOMETRY_EPSILON * Math.max(1, Math.hypot(direction.x, direction.y))) return [];
  const lengthSquared = dot(direction, direction);
  if (lengthSquared <= GEOMETRY_EPSILON ** 2) return [];
  return [edgeStart, edgeEnd]
    .map(point => dot(subtract(point, start), direction) / lengthSquared)
    .filter(value => value >= -GEOMETRY_EPSILON && value <= 1 + GEOMETRY_EPSILON)
    .map(clampUnit);
}

function segmentInPolygon(start, end, polygon) {
  if (!pointInPolygon(start, polygon) || !pointInPolygon(end, polygon)) return false;
  if (distance(start, end) <= GEOMETRY_EPSILON) return true;
  const parameters = [0, 1];
  for (let index = 0; index < polygon.length; index++) {
    parameters.push(...edgeIntersections(start, end, polygon[index], polygon[(index + 1) % polygon.length]));
  }
  parameters.sort((a, b) => a - b);
  for (let index = 1; index < parameters.length; index++) {
    if (parameters[index] - parameters[index - 1] <= GEOMETRY_EPSILON) continue;
    const fraction = (parameters[index] + parameters[index - 1]) / 2;
    if (!pointInPolygon({ x: start.x + fraction * (end.x - start.x), y: start.y + fraction * (end.y - start.y) }, polygon)) return false;
  }
  return true;
}

function rectanglePath(bounds) {
  return [
    { x: bounds.left, y: bounds.top }, { x: bounds.right, y: bounds.top },
    { x: bounds.right, y: bounds.bottom }, { x: bounds.left, y: bounds.bottom },
    { x: bounds.left, y: bounds.top },
  ];
}

function pathInPolygon(points, polygon) {
  if (!points.length || !points.every(finitePoint) || !pointInPolygon(points[0], polygon)) return false;
  for (let index = 1; index < points.length; index++) {
    if (!segmentInPolygon(points[index - 1], points[index], polygon)) return false;
  }
  return true;
}

function ellipseInPolygon(bounds, polygon) {
  const rx = bounds.width / 2, ry = bounds.height / 2;
  const center = { x: (bounds.left + bounds.right) / 2, y: (bounds.top + bounds.bottom) / 2 };
  if (rx <= GEOMETRY_EPSILON || ry <= GEOMETRY_EPSILON) return pathInPolygon(rectanglePath(bounds), polygon);
  if (!pointInPolygon(center, polygon)) return false;
  const normalized = polygon.map(point => ({ x: (point.x - center.x) / rx, y: (point.y - center.y) / ry }));
  for (let index = 0; index < normalized.length; index++) {
    const start = normalized[index], end = normalized[(index + 1) % normalized.length], direction = subtract(end, start);
    const lengthSquared = dot(direction, direction);
    const fraction = lengthSquared ? clampUnit(-dot(start, direction) / lengthSquared) : 0;
    const closest = { x: start.x + fraction * direction.x, y: start.y + fraction * direction.y };
    if (dot(closest, closest) < 1 - GEOMETRY_EPSILON) return false;
  }
  return true;
}

function inkInPolygon(item, bounds, polygon) {
  if (item.type === 'circle') return ellipseInPolygon(bounds, polygon);
  if (item.type === 'rectangle' || item.type === 'rect' || !Array.isArray(item.points)) return pathInPolygon(rectanglePath(bounds), polygon);
  if (!pathInPolygon(item.points, polygon)) return false;
  if (item.type !== 'arrow' || item.points.length < 2) return true;
  const start = item.points[0], end = item.points.at(-1), angle = Math.atan2(end.y - start.y, end.x - start.x);
  return pathInPolygon([
    { x: end.x - 17 * Math.cos(angle - .45), y: end.y - 17 * Math.sin(angle - .45) }, end,
    { x: end.x - 17 * Math.cos(angle + .45), y: end.y - 17 * Math.sin(angle + .45) },
  ], polygon);
}

export function selectLassoInkIds(items, selection) {
  const lasso = normaliseLasso(selection?.points);
  if (!Array.isArray(items) || !lasso) return [];
  const polygonBounds = GeometryBounds.fromRectangle(lasso), selected = new Set();
  for (const item of items) {
    if (!item || !inkTypes.has(item.type) || item.id == null) continue;
    const bounds = resolveInkBounds(item);
    if (polygonBounds.contains(bounds) && inkInPolygon(item, bounds, lasso.points)) selected.add(item.id);
  }
  return [...selected];
}
