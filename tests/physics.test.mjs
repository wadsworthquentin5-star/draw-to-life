import test from 'node:test';
import assert from 'node:assert/strict';
import {DEMO,solve,stateAt,validateModel,parseLabels,motionBounds} from '../public/physics.js';
import {checkStep,evaluate} from '../public/checker.js';

test('motorcyclist: velocity 23 m/s, position 43 m, displacement 38 m',()=>{
  const result=solve(DEMO);assert.equal(result.v,23);assert.equal(result.x,43);assert.equal(result.dx,38);
  assert.deepEqual(stateAt(DEMO,0),{t:0,x:5,v:15,a:4});assert.equal(stateAt(DEMO,1).x,22);
});
test('edited values drive the result rather than a hard-coded demo answer',()=>{
  const m={x0:-8,v0:-5,a:2,t:3,unknowns:['x','v']};assert.equal(solve(m).x,-14);assert.equal(solve(m).v,1);assert.equal(motionBounds(m).min,-14.25);
  assert.equal(solve({...DEMO,a:0}).x,35);
});
test('missing, non-finite and invalid model values are rejected',()=>{
  for(const t of [0,-1,Infinity,NaN,'',null,3601])assert.throws(()=>validateModel({...DEMO,t}));
  assert.throws(()=>validateModel({...DEMO,a:null}));assert.throws(()=>validateModel({...DEMO,unknowns:[]}));
});
test('typed labels support subscripts, SI conversion, questions, and initial time labels',()=>{
  const r=parseLabels(['x₀ = 500 cm','v₀ = 54 km/h','a = 4 m/s²','t = 0 s','t = 2 s','v = ?','x = ?']);
  assert.deepEqual(validateModel(r),DEMO);assert.equal(r.warnings.length,0);
  assert.equal(parseLabels(['x0 = 5 ft']).x0,null);assert.equal(parseLabels(['x0 = 5 m','x0 = 6 m']).x0,null);
});
test('correct symbolic equations, substitutions, rearrangements and unit-bearing results',()=>{
  for(const text of ['v = v0 + a*t','x = x0 + v0*t + 1/2*a*t^2','v² = v₀² + 2a(x - x₀)','dx = (v0+v)*t/2','a = (v-v0)/t','v = 15 + 4*2','v = 15+8 = 23 m/s','x = 5+15*2+0.5*4*2^2 = 43 m','dx = 38 m','15+8=23','v = 82.8 km/h','v = 23 m/s east']) {
    assert.equal(checkStep(text,DEMO).status,'correct',text+': '+JSON.stringify(checkStep(text,DEMO)));
  }
});
test('wrong arithmetic, wrong units, displacement confusion, and broken equality chains fail',()=>{
  for(const text of ['v = 21 m/s','x = 38 m','v = 23 m','x = 43 m/s','v = 15 + 4*2 = 24 m/s','x = x0 + v0*t + a*t^2','v = v0 + a'])assert.notEqual(checkStep(text,DEMO).status,'correct',text);
  assert.match(checkStep('x = 38 m',DEMO).message,/displacement/);
});
test('missing final units and incomplete work are not falsely marked complete',()=>{
  assert.equal(checkStep('v = 23',DEMO).status,'incomplete');assert.equal(checkStep('x = 43',DEMO).status,'incomplete');
  assert.equal(checkStep('23',DEMO).status,'incomplete');assert.notEqual(checkStep('v =',DEMO).status,'correct');
});
test('safe parser rejects executable text, nonfinite expressions and unsupported notation',()=>{
  for(const text of ['alert(1)=1','v=globalThis.x','v=1/0','v=23;fetch(1)','v=2^9999'])assert.equal(checkStep(text,DEMO).status,'unsupported',text);
  assert.equal(evaluate('-2^2',solve(DEMO)).value,-4);assert.equal(evaluate('2(3+4)',solve(DEMO)).value,14);
});
