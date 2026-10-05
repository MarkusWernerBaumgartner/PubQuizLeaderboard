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
  assert.deepEqual(s.flow, { returnToBoard: true, splitOptions: true, revealNoBoard: false, sectionPages: false });
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
  assert.deepEqual(L.normalizeState(JSON.parse(JSON.stringify(off))).flow, { returnToBoard: false, splitOptions: false, revealNoBoard: false, sectionPages: false });
  const old = JSON.parse(JSON.stringify(s)); delete old.flow;
  assert.deepEqual(L.normalizeState(old).flow, { returnToBoard: true, splitOptions: true, revealNoBoard: false, sectionPages: false });
  assert.deepEqual(L.reduce(off, { type: 'resetAll' }).flow, { returnToBoard: true, splitOptions: true, revealNoBoard: false, sectionPages: false });
});

test('section pages: a stop at the start of every round that has questions, never revealable', () => {
  const base = quiz();
  assert.deepEqual(L.presentationSteps(base).map((x) => x.type).includes('section'), false, 'off by default');
  let s = flow(base, { sectionPages: true });
  assert.deepEqual(L.presentationSteps(s).map((x) => x.type),
    ['board', 'section', 'board', 'question', 'options', 'board', 'question', 'board', 'section', 'board', 'question', 'options', 'board'],
    'with return-to-leaderboard on, the board follows the section page so questions can be read out aloud');
  const sec = L.presentationSteps(s).filter((x) => x.type === 'section');
  assert.deepEqual(sec.map((x) => x.roundId), [s.rounds[0].id, s.rounds[1].id]);
  // rounds without questions get no section page
  const empty = flow(L.defaultState(), { sectionPages: true });
  assert.deepEqual(L.presentationSteps(empty).map((x) => x.type), ['board']);
  // a section page is not a question and nothing can be revealed on it, even in reveal mode
  s = L.reduce(s, { type: 'setAutoReveal', on: true });
  s = L.reduce(s, { type: 'presentGoto', step: 1 });
  assert.equal(L.currentStep(s).type, 'section');
  assert.equal(L.currentQuestion(s), null);
  assert.equal(s.presentation.revealAnswer, false);
  assert.equal(L.reduce(s, { type: 'presentReveal' }), s, 'reveal rejected on a section page');
  s = L.reduce(s, { type: 'presentNext' });
  assert.equal(L.currentStep(s).type, 'board', 'leaderboard after the section page');
  s = L.reduce(s, { type: 'presentNext' });
  assert.equal(s.presentation.revealAnswer, false, 'the question step has nothing to reveal yet');
  s = L.reduce(s, { type: 'presentNext' });
  assert.equal(s.presentation.revealAnswer, true, 'options step reveals on arrival');
});

test('section pages: no board after the section page when return-to-leaderboard is off', () => {
  const s = flow(flow(quiz(), { sectionPages: true }), { returnToBoard: false });
  assert.deepEqual(L.presentationSteps(s).map((x) => x.type), ['board', 'section', 'question', 'options', 'question', 'section', 'question', 'options', 'board']);
});

test('section pages: toggling other switches on the board after a section page keeps that board', () => {
  let s = flow(quiz(), { sectionPages: true });
  s = L.reduce(s, { type: 'presentGoto', step: 9 }); // the board after round 2's section page
  assert.deepEqual([L.currentStep(s).type, L.presentationSteps(s)[8].type], ['board', 'section']);
  const t = flow(s, { splitOptions: false });
  assert.deepEqual([L.currentStep(t).type, L.presentationSteps(t)[t.presentation.step - 1].type], ['board', 'section'], 'still the board right after the section page');
});

test('section pages: switching keeps your place', () => {
  let s = L.reduce(quiz(), { type: 'presentGoto', step: 6 }); // round 2, question C
  assert.equal(L.currentQuestion(s).question.text, 'C');
  s = flow(s, { sectionPages: true });
  assert.equal(L.currentQuestion(s).question.text, 'C');
  s = L.reduce(s, { type: 'presentGoto', step: 8 }); // the round 2 section page
  assert.equal(L.currentStep(s).type, 'section');
  s = flow(s, { sectionPages: false }); // page disappears: land on that round's first question
  assert.equal(L.currentQuestion(s).question.text, 'C');
});

test('revealNoBoard: leaderboard steps between questions are dropped only while Answer reveal mode is on', () => {
  let s = flow(quiz(), { revealNoBoard: true });
  const plain = L.presentationSteps(s).map((x) => x.type);
  assert.deepEqual(plain, ['board', 'question', 'options', 'board', 'question', 'board', 'question', 'options', 'board'], 'no effect with reveal mode off');
  s = L.reduce(s, { type: 'setAutoReveal', on: true });
  assert.deepEqual(L.presentationSteps(s).map((x) => x.type), ['board', 'question', 'options', 'question', 'question', 'options', 'board'], 'one board kept at the end');
  s = L.reduce(s, { type: 'setAutoReveal', on: false });
  assert.deepEqual(L.presentationSteps(s).map((x) => x.type), plain, 'back again when reveal mode is off');
  // without the option, reveal mode keeps the boards
  const keep = L.reduce(quiz(), { type: 'setAutoReveal', on: true });
  assert.deepEqual(L.presentationSteps(keep).map((x) => x.type), plain);
});

test('revealNoBoard: toggling reveal mode keeps the same question on screen', () => {
  let s = flow(quiz(), { revealNoBoard: true });
  s = L.reduce(s, { type: 'presentGoto', step: 7 }); // round 2, question C, options step
  assert.equal(L.currentQuestion(s).question.text, 'C');
  s = L.reduce(s, { type: 'setAutoReveal', on: true });
  assert.equal(L.currentQuestion(s).question.text, 'C');
  assert.equal(s.presentation.revealAnswer, true);
  s = L.reduce(s, { type: 'setAutoReveal', on: false });
  assert.equal(L.currentQuestion(s).question.text, 'C');
  // section pages and no-board together: the section page is the only stop between rounds
  let t = flow(quiz(), { revealNoBoard: true, sectionPages: true });
  t = L.reduce(t, { type: 'setAutoReveal', on: true });
  assert.deepEqual(L.presentationSteps(t).map((x) => x.type), ['board', 'section', 'question', 'options', 'question', 'section', 'question', 'options', 'board']);
});

test('new flow options survive normalize, reset and ignore junk', () => {
  const s = flow(quiz(), { revealNoBoard: true, sectionPages: true });
  assert.deepEqual(L.normalizeState(JSON.parse(JSON.stringify(s))).flow, { returnToBoard: true, splitOptions: true, revealNoBoard: true, sectionPages: true });
  assert.equal(flow(s, { sectionPages: true }), s, 'no-op when unchanged');
  assert.equal(flow(quiz(), { sectionPages: 'yes' }).flow.sectionPages, false, 'only literal true turns it on');
});

test('toggling a flow option while on a leaderboard step keeps that same leaderboard (not the first one)', () => {
  let s = L.reduce(quiz(), { type: 'presentGoto', step: 5 }); // the board right after question B
  const after = (t) => { const st = L.presentationSteps(t); const i = t.presentation.step; return [st[i].type, st[i - 1].type, st[i - 1].qIndex]; };
  assert.deepEqual(after(s), ['board', 'question', 1]);
  assert.deepEqual(after(flow(s, { sectionPages: true })), ['board', 'question', 1], 'adding section pages');
  assert.deepEqual(after(flow(s, { splitOptions: false })), ['board', 'question', 1], 'merging options');
  const reveal = L.reduce(flow(s, { revealNoBoard: false }), { type: 'setAutoReveal', on: true });
  assert.equal(L.currentStep(reveal).type, 'board', 'reveal mode without the option keeps the boards');
  assert.ok(reveal.presentation.step > 0, 'did not jump back to the start');
});
