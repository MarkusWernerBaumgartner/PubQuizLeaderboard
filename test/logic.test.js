const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../src/shared/logic');

const q = (text, correct = null) => ({ text, options: ['a', 'b', 'c', 'd'], correct });

function quiz({ teams = ['Red', 'Blue', 'Green'], rounds = 3 } = {}) {
  let s = L.defaultState();
  s = L.reduce(s, { type: 'setRounds', rounds: Array.from({ length: rounds }, (_, i) => ({ name: `R${i + 1}`, maxScore: 10 })) });
  for (const t of teams) s = L.reduce(s, { type: 'addTeam', name: t });
  return s;
}
const ids = (s) => ({ t: s.teams.map((t) => t.id), r: s.rounds.map((r) => r.id) });
const score = (s, ti, ri, v) => { const i = ids(s); return L.reduce(s, { type: 'setScore', teamId: i.t[ti], roundId: i.r[ri], value: v }); };

test('defaults', () => {
  const s = L.defaultState();
  assert.equal(s.title, 'Pub Quiz Night');
  assert.ok(s.rounds.length > 0);
  assert.equal(s.rules.visible, true);
  assert.ok(s.rules.items.length > 0);
  assert.equal(s.presentation.step, 0);
});

test('setTitle trims and ignores blank', () => {
  let s = L.reduce(L.defaultState(), { type: 'setTitle', title: '  Hello  ' });
  assert.equal(s.title, 'Hello');
  assert.equal(L.reduce(s, { type: 'setTitle', title: '   ' }), s);
});

test('setRounds keeps ids by id, drops scores of removed rounds', () => {
  let s = quiz();
  s = score(s, 0, 2, 5);
  const keep = s.rounds.slice(0, 2).map((r) => ({ id: r.id, name: r.name, maxScore: r.maxScore }));
  s = L.reduce(s, { type: 'setRounds', rounds: keep });
  assert.equal(s.rounds.length, 2);
  assert.deepEqual(Object.keys(s.teams[0].scores), []);
});

test('teams: add, rename, remove; blank/duplicate names rejected', () => {
  let s = quiz({ teams: [] });
  s = L.reduce(s, { type: 'addTeam', name: ' Quizzy Rascals ' });
  assert.equal(s.teams[0].name, 'Quizzy Rascals');
  assert.ok(s.teams[0].colour);
  assert.equal(L.reduce(s, { type: 'addTeam', name: '  ' }), s);
  assert.equal(L.reduce(s, { type: 'addTeam', name: 'quizzy rascals' }), s);
  s = L.reduce(s, { type: 'renameTeam', teamId: s.teams[0].id, name: 'Brains' });
  assert.equal(s.teams[0].name, 'Brains');
  s = L.reduce(s, { type: 'removeTeam', teamId: s.teams[0].id });
  assert.equal(s.teams.length, 0);
});

test('setScore validation: no NaN, negatives, strings, above max', () => {
  let s = quiz();
  const same = (v) => assert.equal(score(s, 0, 0, v), s, `rejects ${v}`);
  same(-1); same(NaN); same('abc'); same(11); same(Infinity);
  s = score(s, 0, 0, '7');
  assert.equal(s.teams[0].scores[s.rounds[0].id], 7);
  s = score(s, 0, 0, 7.5);
  assert.equal(s.teams[0].scores[s.rounds[0].id], 7.5);
  s = score(s, 0, 0, '');
  assert.equal(s.teams[0].scores[s.rounds[0].id], undefined);
});

test('setScore with unknown ids is ignored', () => {
  const s = quiz();
  assert.equal(L.reduce(s, { type: 'setScore', teamId: 'nope', roundId: s.rounds[0].id, value: 1 }), s);
  assert.equal(L.reduce(s, { type: 'setScore', teamId: s.teams[0].id, roundId: 'nope', value: 1 }), s);
});

test('undo reverts last score change', () => {
  let s = quiz();
  s = score(s, 0, 0, 4);
  s = score(s, 0, 0, 6);
  s = L.reduce(s, { type: 'undo' });
  assert.equal(s.teams[0].scores[s.rounds[0].id], 4);
  s = L.reduce(s, { type: 'undo' });
  assert.equal(s.teams[0].scores[s.rounds[0].id], undefined);
  assert.equal(L.reduce(s, { type: 'undo' }), s);
});

test('clearScores keeps teams; resetAll restores defaults', () => {
  let s = score(quiz(), 0, 0, 3);
  const c = L.reduce(s, { type: 'clearScores' });
  assert.equal(c.teams.length, 3);
  assert.deepEqual(c.teams[0].scores, {});
  assert.equal(c.history.length, 0);
  const r = L.reduce(s, { type: 'resetAll' });
  assert.equal(r.teams.length, 0);
  assert.equal(r.title, L.defaultState().title);
});

test('rules', () => {
  let s = L.reduce(L.defaultState(), { type: 'setRules', items: ['  one ', '', 'two'] });
  assert.deepEqual(s.rules.items, ['one', 'two']);
  s = L.reduce(s, { type: 'setRulesVisible', visible: false });
  assert.equal(s.rules.visible, false);
});

test('setQuestions enforces 4 options', () => {
  let s = quiz();
  const rid = s.rounds[0].id;
  const bad = { text: 'x', options: ['a', 'b', 'c'], correct: null };
  assert.equal(L.reduce(s, { type: 'setQuestions', roundId: rid, questions: [bad] }), s);
  assert.equal(L.reduce(s, { type: 'setQuestions', roundId: rid, questions: [{ ...q('x'), correct: 4 }] }), s);
  s = L.reduce(s, { type: 'setQuestions', roundId: rid, questions: [q('Q1', 2)] });
  assert.equal(s.rounds[0].questions[0].correct, 2);
});

test('presentation step sequence', () => {
  let s = quiz({ rounds: 2 });
  s = L.reduce(s, { type: 'setQuestions', roundId: s.rounds[0].id, questions: [q('A'), q('B')] });
  s = L.reduce(s, { type: 'setQuestions', roundId: s.rounds[1].id, questions: [q('C')] });
  const types = L.presentationSteps(s).map((x) => x.type);
  assert.deepEqual(types, ['board', 'question', 'options', 'board', 'question', 'options', 'board', 'question', 'options', 'board']);
  assert.deepEqual(L.presentationSteps(quiz()).map((x) => x.type), ['board']);
});

test('presentation next/prev clamp, reveal only on options with correct answer', () => {
  let s = quiz({ rounds: 1 });
  s = L.reduce(s, { type: 'setQuestions', roundId: s.rounds[0].id, questions: [q('A', 1)] });
  assert.equal(L.reduce(s, { type: 'presentPrev' }).presentation.step, 0);
  s = L.reduce(s, { type: 'presentNext' });
  assert.equal(L.reduce(s, { type: 'presentReveal' }), s, 'not on options step');
  s = L.reduce(s, { type: 'presentNext' });
  s = L.reduce(s, { type: 'presentReveal' });
  assert.equal(s.presentation.revealAnswer, true);
  s = L.reduce(s, { type: 'presentNext' });
  assert.equal(s.presentation.revealAnswer, false);
  s = L.reduce(s, { type: 'presentNext' });
  assert.equal(s.presentation.step, 3);
  s = L.reduce(s, { type: 'presentGoto', step: 99 });
  assert.equal(s.presentation.step, 3);
  s = L.reduce(s, { type: 'presentGoto', step: 1 });
  assert.equal(s.presentation.step, 1);
});

test('presentation step clamps when questions are removed', () => {
  let s = quiz({ rounds: 1 });
  const rid = s.rounds[0].id;
  s = L.reduce(s, { type: 'setQuestions', roundId: rid, questions: [q('A'), q('B')] });
  s = L.reduce(s, { type: 'presentGoto', step: 6 });
  s = L.reduce(s, { type: 'setQuestions', roundId: rid, questions: [q('A')] });
  assert.ok(s.presentation.step <= 3);
  s = L.reduce(s, { type: 'presentGoto', step: 3 });
  s = L.reduce(s, { type: 'setRounds', rounds: [{ name: 'New', maxScore: 0 }] });
  assert.equal(s.presentation.step, 0);
});

test('standings: totals, ties share rank, zero teams ok', () => {
  assert.deepEqual(L.standings(quiz({ teams: [] })), []);
  let s = quiz();
  s = score(s, 0, 0, 5); s = score(s, 1, 0, 5); s = score(s, 2, 0, 2);
  const st = L.standings(s);
  assert.deepEqual(st.map((x) => x.rank), [1, 1, 3]);
  assert.deepEqual(st.map((x) => x.team.name), ['Red', 'Blue', 'Green']);
  assert.equal(st[0].total, 5);
});

test('standings: rank delta after latest round', () => {
  let s = quiz();
  s = score(s, 0, 0, 9); s = score(s, 1, 0, 5); s = score(s, 2, 0, 1);
  s = score(s, 0, 1, 0); s = score(s, 1, 1, 0); s = score(s, 2, 1, 10);
  const st = L.standings(s);
  const green = st.find((x) => x.team.name === 'Green');
  assert.equal(green.rank, 1);
  assert.equal(green.delta, 2);
  assert.equal(st.find((x) => x.team.name === 'Red').delta, -1);
});

test('stats', () => {
  let s = quiz();
  s = score(s, 0, 0, 9); s = score(s, 1, 0, 5); s = score(s, 2, 0, 1);
  s = score(s, 0, 1, 0); s = score(s, 1, 1, 0); s = score(s, 2, 1, 10);
  const st = L.stats(s);
  assert.deepEqual(st.roundWinners.map((w) => [w.round.name, w.teams.map((t) => t.name), w.score]), [['R1', ['Red'], 9], ['R2', ['Green'], 10]]);
  assert.equal(st.biggestClimber.team.name, 'Green');
  assert.equal(st.biggestClimber.delta, 2);
  const red = st.bestWorst.find((b) => b.team.name === 'Red');
  assert.equal(red.best.score, 9); assert.equal(red.worst.score, 0);
  assert.equal(st.leadChanges, 1);
  assert.equal(st.gap, 2);
  assert.equal(st.woodenSpoon.name, 'Blue');
});

test('stats on empty / unscored quiz do not throw', () => {
  for (const s of [quiz({ teams: [] }), quiz()]) {
    const st = L.stats(s);
    assert.equal(st.biggestClimber, null);
    assert.equal(st.woodenSpoon, null);
    assert.equal(st.leadChanges, 0);
    assert.deepEqual(st.roundWinners, []);
  }
});

test('normalizeState accepts valid, fills defaults, rejects garbage', () => {
  const s = quiz();
  assert.deepEqual(L.normalizeState(JSON.parse(JSON.stringify(s))).teams.length, 3);
  const partial = { title: 'T', rounds: [{ id: 'r1', name: 'x', maxScore: 0 }], teams: [] };
  const n = L.normalizeState(partial);
  assert.equal(n.rules.visible, true);
  assert.equal(n.presentation.step, 0);
  for (const bad of [null, 5, 'x', [], { title: 5 }, { title: 'a', rounds: 'x', teams: [] }, { title: 'a', rounds: [], teams: [{}] }]) {
    assert.throws(() => L.normalizeState(bad), /invalid/i);
  }
});

test('load action replaces state via normalizeState; bad shape leaves state untouched', () => {
  const s = quiz();
  const other = L.reduce(L.defaultState(), { type: 'setTitle', title: 'Other' });
  assert.equal(L.reduce(s, { type: 'load', state: other }).title, 'Other');
  assert.equal(L.reduce(s, { type: 'load', state: { nope: 1 } }), s);
});

test('reducer does not mutate input and ignores unknown actions', () => {
  const s = quiz();
  const frozen = JSON.stringify(s);
  score(s, 0, 0, 3);
  assert.equal(JSON.stringify(s), frozen);
  assert.equal(L.reduce(s, { type: 'whatever' }), s);
});
