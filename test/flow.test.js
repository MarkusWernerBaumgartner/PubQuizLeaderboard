const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../src/shared/logic');

const mc = (text, correct = null) => ({ text, options: ['a', 'b', 'c', 'd'], correct });
const wr = (text, answer = '') => ({ type: 'text', text, answer });

// Round 1: [mc A, written B]; round 2: [mc C]
function quiz() {
  let s = L.defaultState();
  s = L.reduce(s, { type: 'setQuestions', roundId: s.rounds[0].id, questions: [mc('A', 1), wr('B', 'x')] });
  s = L.reduce(s, { type: 'setQuestions', roundId: s.rounds[1].id, questions: [mc('C', 2)] });
  return s;
}
const types = (s) => L.presentationSteps(s).map((x) => x.type + (x.qIndex === undefined ? '' : x.roundId + x.qIndex));
const flow = (s, f) => L.reduce(s, { type: 'setFlow', flow: f });

test('defaults keep the original behaviour: board between questions, options after the question', () => {
  const s = quiz();
  assert.deepEqual(s.flow, { returnToBoard: true, splitOptions: true });
  assert.deepEqual(L.presentationSteps(s).map((x) => x.type),
    ['board', 'question', 'options', 'board', 'question', 'board', 'question', 'options', 'board']);
});

test('returnToBoard off: questions follow each other, one board stays at the end', () => {
  const s = flow(quiz(), { returnToBoard: false });
  assert.deepEqual(L.presentationSteps(s).map((x) => x.type), ['board', 'question', 'options', 'question', 'question', 'options', 'board']);
  assert.deepEqual(L.presentationSteps(flow(L.defaultState(), { returnToBoard: false })).map((x) => x.type), ['board']); // no questions
});

test('splitOptions off: question and options together in one step; written questions unchanged', () => {
  const s = flow(quiz(), { splitOptions: false });
  assert.deepEqual(L.presentationSteps(s).map((x) => x.type), ['board', 'options', 'board', 'question', 'board', 'options', 'board']);
  const both = flow(s, { returnToBoard: false });
  assert.deepEqual(L.presentationSteps(both).map((x) => x.type), ['board', 'options', 'question', 'options', 'board']);
});

test('reveal still works in the combined step', () => {
  let s = flow(quiz(), { splitOptions: false });
  s = L.reduce(s, { type: 'presentNext' });
  s = L.reduce(s, { type: 'presentReveal' });
  assert.equal(s.presentation.revealAnswer, true);
});

test('changing the flow keeps the same question on screen and hides any reveal', () => {
  let s = quiz();
  s = L.reduce(L.reduce(s, { type: 'presentGoto', step: 7 }), { type: 'presentReveal' }); // round 2, Q C, options step
  assert.equal(L.currentQuestion(s).question.text, 'C');
  assert.equal(s.presentation.revealAnswer, true);
  s = flow(s, { splitOptions: false });
  assert.equal(L.currentQuestion(s).question.text, 'C');
  assert.equal(s.presentation.revealAnswer, false);
  s = flow(s, { returnToBoard: false });
  assert.equal(L.currentQuestion(s).question.text, 'C');
  // from the question step of a split quiz into combined mode lands on that question's combined step
  let t = L.reduce(quiz(), { type: 'presentGoto', step: 1 });
  t = flow(t, { splitOptions: false });
  assert.deepEqual(L.currentQuestion(t).step.type, 'options');
  assert.equal(L.currentQuestion(t).question.text, 'A');
  // on a board step: stays within range
  let b = L.reduce(quiz(), { type: 'presentGoto', step: 8 });
  b = flow(b, { returnToBoard: false });
  assert.ok(b.presentation.step < L.presentationSteps(b).length);
});

test('setFlow: no-op when unchanged, ignores junk, survives normalize/reset', () => {
  const s = quiz();
  assert.equal(flow(s, { returnToBoard: true }), s);
  assert.equal(flow(s, {}), s);
  assert.equal(flow(s, { returnToBoard: 'no' }), s); // only literal false turns it off
  const off = flow(flow(s, { returnToBoard: false }), { splitOptions: false });
  assert.deepEqual(L.normalizeState(JSON.parse(JSON.stringify(off))).flow, { returnToBoard: false, splitOptions: false });
  const old = JSON.parse(JSON.stringify(s)); delete old.flow;
  assert.deepEqual(L.normalizeState(old).flow, { returnToBoard: true, splitOptions: true });
  assert.deepEqual(L.reduce(off, { type: 'resetAll' }).flow, { returnToBoard: true, splitOptions: true });
});
