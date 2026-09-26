export const DEMO = Object.freeze({ x0: 5, v0: 15, a: 4, t: 2, unknowns: ['v', 'x'] });
export const EQUATIONS = [
  ['v = v₀ + at', 'Velocity after a time'],
  ['x = x₀ + v₀t + ½at²', 'Position after a time'],
  ['v² = v₀² + 2a(x − x₀)', 'When time is not needed'],
  ['x − x₀ = ½(v₀ + v)t', 'Displacement from average velocity'],
];
export function validateModel(input) {
  const m = {};
  for (const key of ['x0', 'v0', 'a', 't']) {
    if (input[key] === null || input[key] === undefined || String(input[key]).trim() === '') throw new Error(`Add a value for ${key}.`);
    m[key] = Number(input[key]);
    if (!Number.isFinite(m[key]) || Math.abs(m[key]) > 100000) throw new Error(`${key} must be a finite number between −100000 and 100000.`);
  }
  if (m.t <= 0 || m.t > 3600) throw new Error('Time must be greater than 0 and no more than 3600 seconds.');
  m.unknowns = [...new Set((input.unknowns || []).filter(x => ['v', 'x', 'dx'].includes(x)))];
  if (!m.unknowns.length) throw new Error('Choose what to find: final velocity, position, or displacement.');
  return m;
}
export function stateAt(model, time) {
  return { t: time, x: model.x0 + model.v0 * time + 0.5 * model.a * time ** 2, v: model.v0 + model.a * time, a: model.a };
}
export function solve(model) {
  const m = validateModel(model), s = stateAt(m, m.t);
  return { ...m, ...s, dx: s.x - m.x0 };
}
export function motionBounds(m) {
  const positions = [m.x0, stateAt(m, m.t).x];
  const turning = m.a ? -m.v0 / m.a : -1;
  if (turning > 0 && turning < m.t) positions.push(stateAt(m, turning).x);
  return { min: Math.min(...positions), max: Math.max(...positions) };
}
export const format = n => Number(n.toFixed(2)).toString();
export function normalize(text) {
  return String(text).toLowerCase().replace(/₀/g, '0').replace(/²/g, '^2').replace(/³/g, '^3')
    .replace(/[−–]/g, '-').replace(/[×·⋅]/g, '*').replace(/÷/g, '/').replace(/½/g, '(1/2)')
    .replace(/δx|Δx/gi, 'dx').replace(/v_?0_?x/g, 'v0').replace(/v_?x/g, 'v')
    .replace(/x_0/g, 'x0').replace(/v_0/g, 'v0').replace(/a_?x/g, 'a')
    .replace(/\bvf\b/g, 'v').replace(/\bxi\b/g, 'x0').replace(/\bvi\b/g, 'v0');
}
export function parseLabels(labels) {
  const result = { x0: null, v0: null, a: null, t: null, unknowns: [], warnings: [] };
  for (const label of labels) {
    const text = normalize(label.text ?? label).trim();
    const matches = text.matchAll(/\b(x0|v0|dx|x|v|a|t)\s*=\s*(\?|[+-]?(?:\d+(?:\.\d*)?|\.\d+))\s*([^,;\n]*)/g);
    for (const [, key, raw, tail] of matches) {
      if (raw === '?') { if (['v', 'x', 'dx'].includes(key)) result.unknowns.push(key); continue; }
      if (!['x0', 'v0', 'a', 't'].includes(key)) continue;
      const unit = tail.trim().replace(/\s/g, '').replace(/\*\*/g, '^');
      const conversions = { x0: { m: 1, cm: .01, km: 1000 }, v0: { 'm/s': 1, 'km/h': 1/3.6, 'cm/s': .01 }, a: { 'm/s^2': 1, 'm/s2': 1, 'cm/s^2': .01 }, t: { s: 1, sec: 1, min: 60 } };
      if (!(unit in conversions[key])) { result.warnings.push(`Use a clear unit for ${key}.`); continue; }
      const value = Number(raw) * conversions[key][unit];
      if (key === 't' && value === 0) continue;                                                           
      if (result[key] !== null && result[key] !== value) { result.warnings.push(`Conflicting ${key} labels. Review the value.`); result[key] = null; }
      else result[key] = value;
    }
  }
  result.unknowns = [...new Set(result.unknowns)];
  return result;
}
