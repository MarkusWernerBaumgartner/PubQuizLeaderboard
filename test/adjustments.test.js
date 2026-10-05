const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../src/shared/logic');

const q = (text, correct = null) => ({ text, options: ['a', 'b', 'c', 'd'], correct });
const tq = (text, answer) => ({ type: 'text', text, answer });

function quiz({ teams = ['Red', 'Blue', 'Green'], rounds = 3 } = {}) {
  let s = L.defaultState();
  s = L.reduce(s, { type: 'setRounds', rounds: Array.from({ length: rounds }, (_, i) => ({ name: `R${i + 1}`, maxScore: 10 })) });
  for (const t of teams) s = L.reduce(s, { type: 'addTeam', name: t });
  return s;
}
const ids = (s) => ({ t: s.teams.map((t) => t.id), r: s.rounds.map((r) => r.id) });
const score = (s, ti, ri, v) => { const i = ids(s); return L.reduce(s, { type: 'setScore', teamId: i.t[ti], roundId: i.r[ri], value: v }); };

// ---- written-answer questions ------------------------------------------------------
test('written questions: validated, normalised, no options step', () => {
  let s = quiz();
  const rid = s.rounds[0].id;
  s = L.reduce(s, { type: 'setQuestions', roundId: rid, questions: [tq('  Capital of France? ', ' Paris '), q('B', 1)] });
  assert.deepEqual(s.rounds[0].questions[0], { type: 'text', text: 'Capital of France?', options: [], correct: null, answer: 'Paris', media: '', notes: '' });
  assert.equal(s.rounds[0].questions[1].type, 'choice');
  assert.deepEqual(L.presentationSteps(s).map((x) => x.type), ['board', 'question', 'board', 'question', 'options', 'board']);
  assert.equal(L.reduce(s, { type: 'setQuestions', roundId: rid, questions: [{ type: 'essay', text: 'x' }] }), s);
  assert.equal(L.reduce(s, { type: 'setQuestions', roundId: rid, questions: [{ type: 'text', text: 'x', answer: 5 }] }), s);
  assert.equal(L.normalizeState(JSON.parse(JSON.stringify(s))).rounds[0].questions[0].type, 'text');
});

test('written questions: reveal works on the question step when an answer is set', () => {
  let s = quiz();
  s = L.reduce(s, { type: 'setQuestions', roundId: s.rounds[0].id, questions: [tq('A', 'Paris'), tq('B', '')] });
  assert.equal(L.reduce(s, { type: 'presentReveal' }), s); // board step
  s = L.reduce(s, { type: 'presentNext' });
  s = L.reduce(s, { type: 'presentReveal' });
  assert.equal(s.presentation.revealAnswer, true);
  s = L.reduce(s, { type: 'presentNext' });
  assert.equal(s.presentation.revealAnswer, false);
  s = L.reduce(s, { type: 'presentNext' }); // question B: no answer set
  assert.equal(L.reduce(s, { type: 'presentReveal' }), s);
});

// ---- bonus / penalty adjustments ---------------------------------------------------
test('adjustments: bonus and penalty change totals and ranking; reason trimmed', () => {
  let s = quiz();
  s = score(s, 0, 0, 5);
  s = score(s, 1, 0, 4);
  const [red, blue, green] = ids(s).t;
  s = L.reduce(s, { type: 'addAdjustment', teamId: red, points: -3, reason: ' peeked at phone ' });
  s = L.reduce(s, { type: 'addAdjustment', teamId: blue, points: '2', reason: 'spotted the cheat' });
  assert.deepEqual(s.adjustments.map((a) => [a.points, a.reason]), [[-3, 'peeked at phone'], [2, 'spotted the cheat']]);
  const st = L.standings(s);
  assert.deepEqual(st.map((e) => [e.team.id, e.total, e.rank]), [[blue, 6, 1], [red, 2, 2], [green, 0, 3]]);
  assert.equal(st[0].bonus, 2);
  assert.equal(st[1].penalty, 3);
});

test('adjustments: totals may go negative; invalid input rejected', () => {
  let s = quiz();
  const t = ids(s).t[0];
  for (const bad of [0, NaN, 'abc', '', null, undefined]) assert.equal(L.reduce(s, { type: 'addAdjustment', teamId: t, points: bad }), s);
  assert.equal(L.reduce(s, { type: 'addAdjustment', teamId: 'nope', points: 1 }), s);
  s = L.reduce(s, { type: 'addAdjustment', teamId: t, points: -4 });
  assert.equal(L.standings(s).find((e) => e.team.id === t).total, -4);
});

test('adjustments: undo, remove, team removal, clear scores', () => {
  let s = quiz();
  const [a, b] = ids(s).t;
  s = score(s, 0, 0, 3);
  s = L.reduce(s, { type: 'addAdjustment', teamId: a, points: -1 });
  s = L.reduce(s, { type: 'undo' });
  assert.equal(s.adjustments.length, 0);
  s = L.reduce(s, { type: 'undo' });
  assert.equal(s.teams[0].scores[ids(s).r[0]], undefined);
  s = L.reduce(s, { type: 'addAdjustment', teamId: a, points: 1 });
  s = L.reduce(s, { type: 'addAdjustment', teamId: b, points: 1 });
  s = L.reduce(s, { type: 'removeAdjustment', id: s.adjustments[0].id });
  assert.equal(s.adjustments.length, 1);
  assert.equal(s.history.length, 1);
  s = L.reduce(s, { type: 'removeTeam', teamId: b });
  assert.equal(s.adjustments.length, 0);
  assert.equal(s.history.length, 0);
  s = L.reduce(s, { type: 'addAdjustment', teamId: a, points: 1 });
  s = L.reduce(s, { type: 'clearScores' });
  assert.equal(s.adjustments.length, 0);
});

test('adjustments survive setRounds and normalizeState; old saves load without them', () => {
  let s = quiz();
  s = L.reduce(s, { type: 'addAdjustment', teamId: ids(s).t[0], points: 2, reason: 'x' });
  s = L.reduce(s, { type: 'setRounds', rounds: s.rounds.slice(0, 2).map((r) => ({ id: r.id, name: r.name, maxScore: 10 })) });
  assert.equal(s.history.length, 1);
  const n = L.normalizeState(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(n.adjustments, s.adjustments);
  assert.equal(n.nextId > Number(s.adjustments[0].id.slice(1)), true);
  const old = JSON.parse(JSON.stringify(s)); delete old.adjustments;
  assert.deepEqual(L.normalizeState(old).adjustments, []);
  const orphan = JSON.parse(JSON.stringify(s)); orphan.adjustments[0].teamId = 'zzz';
  assert.deepEqual(L.normalizeState(orphan).adjustments, []);
});

// ---- effects integration -----------------------------------------------------------
test('penalty/bonus effects are switchable and presets treat them sensibly', () => {
  const E = require('../src/shared/effects');
  const keys = ['celebrate.adjustment.banner', 'celebrate.adjustment.shake', 'celebrate.adjustment.confetti'];
  for (const k of keys) assert.ok(E.FLAGS.some((f) => f.key === k), k);
  assert.ok(keys.every((k) => E.PRESETS.party.flags[k]));
  assert.deepEqual(keys.map((k) => E.PRESETS.calm.flags[k]), [true, false, false]);
  assert.deepEqual(keys.map((k) => E.PRESETS.minimal.flags[k]), [true, false, false]); // the reason is information, so it stays
  assert.ok(keys.every((k) => !E.PRESETS.off.flags[k]));
  assert.ok(E.htmlClasses({ flags: { ...E.PRESETS.off.flags } }).length > 0);
});

test('answer media works on both question types; a written question with only media can be revealed', () => {
  let s = quiz();
  s = L.reduce(s, { type: 'setQuestions', roundId: s.rounds[0].id, questions: [
    { type: 'text', text: 'Who is this?', media: ' https://example.com/a.gif ' }, { ...q('B', 1), media: 'https://youtu.be/dQw4w9WgXcQ' }] });
  assert.equal(s.rounds[0].questions[0].media, 'https://example.com/a.gif');
  assert.equal(s.rounds[0].questions[1].media, 'https://youtu.be/dQw4w9WgXcQ');
  assert.equal(L.reduce(s, { type: 'setQuestions', roundId: s.rounds[0].id, questions: [{ ...q('x'), media: 5 }] }), s);
  s = L.reduce(L.reduce(s, { type: 'presentNext' }), { type: 'presentReveal' });
  assert.equal(s.presentation.revealAnswer, true);
});
