import { normalize, solve } from './physics.js';

const dimensions = { x: [1,0], x0: [1,0], dx: [1,0], v: [1,-1], v0: [1,-1], a: [1,-2], t: [0,1], m: [1,0], s: [0,1], cm: [1,0], km: [1,0], h: [0,1] };
const units = { m: 1, s: 1, cm: .01, km: 1000, h: 3600 };
const same = (a,b) => a.every((v,i)=>Math.abs(v-b[i]) < 1e-8);
const scalar = d => same(d, [0,0]);
function tokenize(text) {
  const clean = normalize(text).replace(/\b(east|west)\b/g, '').replace(/\s+/g, '').replace(/\*\*/g, '^');
  if (clean.length > 300) throw new Error('Check one short equation at a time.');
  const tokens = clean.match(/(?:\d*\.\d+|\d+\.?\d*)(?:e[+-]?\d+)?|sqrt|x0|v0|dx|cm|km|[xvatmsh]|[()+\-*/^]/g) || [];
  if (tokens.join('') !== clean) throw new Error('Use x, x0, v, v0, a, t, dx, numbers, + − × ÷, parentheses, and powers.');
  const expanded = [];
  const ends = t => /^(?:\d|\.)/.test(t) || /^[a-z]/.test(t) && t !== 'sqrt' || t === ')';
  const begins = t => /^(?:\d|\.)/.test(t) || /^[a-z]/.test(t) || t === '(';
  tokens.forEach((t,i) => { if (i && ends(tokens[i-1]) && begins(t)) expanded.push('*'); expanded.push(t); });
  return expanded;
}
export function evaluate(text, env) {
  const tokens = tokenize(text); let i=0;
  const quantity = (value, dim=[0,0], explicit=false) => ({ value, dim, explicit });
  function atom() {
    const tok=tokens[i++];
    if (tok === '(') { const q=add(); if(tokens[i++]!==')') throw new Error('Close the parentheses.'); return q; }
    if(tok==='sqrt') { const q=atom(); return quantity(Math.sqrt(q.value),q.dim.map(n=>n/2),q.explicit); }
    if(tok in dimensions) return quantity(tok in units ? units[tok] : env[tok], dimensions[tok], tok in units);
    if(tok && /^(?:\d|\.)/.test(tok)) return quantity(Number(tok));
    throw new Error('Finish the expression on both sides of the equals sign.');
  }
  function power() { let q=atom(); if(tokens[i]==='^') { i++; const r=unary(); if(!scalar(r.dim) || Math.abs(r.value)>10) throw new Error('Use a simple numerical exponent.'); q=quantity(q.value**r.value,q.dim.map(n=>n*r.value),q.explicit); } return q; }
  function unary() { if(tokens[i]==='-' || tokens[i]==='+') { const sign=tokens[i++]; const q=unary(); return {...q,value:q.value*(sign==='-'?-1:1)}; } return power(); }
  function multiply() { let q=unary(); while(tokens[i]==='*'||tokens[i]==='/') { const op=tokens[i++],r=unary(),sign=op==='*'?1:-1; q=quantity(op==='*'?q.value*r.value:q.value/r.value,q.dim.map((n,j)=>n+sign*r.dim[j]),q.explicit||r.explicit); } return q; }
  function add() { let q=multiply(); while(tokens[i]==='+'||tokens[i]==='-') { const op=tokens[i++],r=multiply(); if(!same(q.dim,r.dim)) throw new Error('The units do not match in this sum. Write units on every substituted quantity, or omit them throughout the arithmetic and add the final unit.'); q=quantity(q.value+(op==='+'?1:-1)*r.value,q.dim,q.explicit||r.explicit); } return q; }
  const q=add(); if(i!==tokens.length || !Number.isFinite(q.value)) throw new Error('That expression is incomplete or undefined.'); return q;
}
const near=(a,b)=>Math.abs(a-b)<=Math.max(1e-7,Math.max(Math.abs(a),Math.abs(b))*1e-6);
export function checkStep(text, model) {
  try {
    const env=solve(model), normalized=normalize(text).trim();
    if (/\bwest\b/i.test(normalized)) return {status:'unsupported',message:'Use signed values: east is positive, west is negative. Replace “west” with a negative number.'};
    const parts=normalized.split('=').map(x=>x.trim());
    if(parts.length<2 || parts.some(x=>!x)) return {status:'incomplete',message:'Write a full equation with an equals sign so I can check this step.'};
    const values=parts.map(x=>evaluate(x,env));
    for(let i=1;i<values.length;i++) {
      const left=values[i-1],right=values[i];
      if(!same(left.dim,right.dim) && !(scalar(left.dim)&&!left.explicit) && !(scalar(right.dim)&&!right.explicit)) return {status:'incorrect',message:'The units on the two sides differ. Velocity uses m/s; position and displacement use m.'};
      if(!near(left.value,right.value)) {
        let hint='The two sides are not equal for your given values. Check the substitution and arithmetic.';
        if(parts[0]==='x' && near(right.value,env.dx)) hint='You found displacement. Position is measured from the signpost, so include the initial position x₀.';
        else if(parts[0]==='v') hint='Start with v = v₀ + at. Acceleration changes velocity by a × t, then add the initial velocity.';
        else if(parts[0]==='x') hint='Use x = x₀ + v₀t + ½at². Check the initial position, the ½, and the squared time.';
        return {status:'incorrect',message:hint};
      }
    }
                                                                                                        
    const symbolic=parts.every(p=>!/[ms]|cm|km/.test(p.replace(/sqrt/g,''))) && parts.some(p=>/[xvat]/.test(p)) && !/[3-9]/.test(normalized);
    if(symbolic) {
      for(const test of [{x0:3,v0:7,a:2,t:4},{x0:-2,v0:9,a:-1,t:3}]) {
        const other=solve({...test,unknowns:['v','x']}), vals=parts.map(p=>evaluate(p,other));
        if(vals.some(q=>!near(q.value,vals[0].value))) return {status:'incorrect',message:'That relation happens to match these numbers, but it is not a constant-acceleration identity. Recheck the equation.'};
      }
    }
    const last=parts.at(-1), finalVariable=parts[0].match(/^(v|x|dx)$/)?.[1];
    const numericalFinal=finalVariable && /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)\s*(?:(?:m|cm|km)(?:\/(?:s|h)(?:\^2)?)?)?(?:\s+east)?$/.test(last);
    if(numericalFinal && !values.at(-1).explicit) return {status:'incomplete',message:`The number is correct. Add ${finalVariable==='v'?'m/s':'m'} to complete the answer.`};
    return {status:'correct',message:numericalFinal?'Correct — the value, direction, and units agree with your model.':'Correct — this step is consistent with constant acceleration.',solved:numericalFinal?finalVariable:null};
  } catch(error) { return {status:'unsupported',message:error.message}; }
}
