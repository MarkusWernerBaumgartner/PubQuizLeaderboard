// Pure quiz logic: state shape, reducer and derived selectors.
// UMD so it loads in Node (tests, main process) and in renderers via <script>.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.QuizLogic = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const DEFAULT_TITLE = 'Pub Quiz Night';
  const COLOURS = ['#ffc83d', '#ff6b6b', '#4ecdc4', '#a78bfa', '#ff9f43', '#54a0ff', '#f368e0', '#7bed9f', '#ff7f9c', '#48dbfb'];
  const DEFAULT_RULES = [
    'One answer sheet per team, and one team captain to hand it in.',
    'No phones, no Googling. The quizmaster sees all.',
    'Keep your answers secret from other tables.',
    'The quizmaster\'s decision is final (and slightly biased).',
    'Be loud, be silly, be kind. Most importantly: have fun!',
  ];
  const HISTORY_CAP = 500;

  const clone = (o) => JSON.parse(JSON.stringify(o));
  const isObj = (o) => o !== null && typeof o === 'object' && !Array.isArray(o);
  const str = (v) => (typeof v === 'string' ? v.trim() : '');

  // opts.title seeds the quiz title (the host's configured default); falls back to DEFAULT_TITLE.
  function defaultState(opts) {
    const rounds = [];
    for (let i = 1; i <= 5; i++) rounds.push({ id: 'r' + i, name: 'Round ' + i, maxScore: 0, questions: [] });
    return {
      version: 1,
      title: str(opts && opts.title) || DEFAULT_TITLE,
      rounds,
      teams: [],
      adjustments: [],
      rules: { items: DEFAULT_RULES.slice(), visible: true },
      presentation: { step: 0, revealAnswer: false, autoReveal: false },
      history: [],
      nextId: 6,
    };
  }

  // A question is multiple choice (default; four options, optional correct index) or
  // a written answer ('text'; optional model answer shown on reveal).
  const isText = (q) => !!q && q.type === 'text';
  function validQuestion(x) {
    if (!isObj(x) || typeof x.text !== 'string') return false;
    if (x.type !== undefined && x.type !== 'choice' && x.type !== 'text') return false;
    if (x.media !== undefined && typeof x.media !== 'string') return false;
    if (x.type === 'text') return x.answer === undefined || x.answer === null || typeof x.answer === 'string';
    return Array.isArray(x.options) && x.options.length === 4 && x.options.every((o) => typeof o === 'string') &&
      (x.correct === null || x.correct === undefined || (Number.isInteger(x.correct) && x.correct >= 0 && x.correct <= 3));
  }
  const cleanQuestion = (x) => x.type === 'text'
    ? { type: 'text', text: x.text.trim(), options: [], correct: null, answer: str(x.answer), media: str(x.media) }
    : { type: 'choice', text: x.text.trim(), options: x.options.map((o) => o.trim()), correct: x.correct === undefined ? null : x.correct, media: str(x.media) };
  // Does this question have something to reveal? (written: a model answer or answer media)
  const hasAnswer = (q) => !!q && (isText(q) ? !!(q.answer || q.media) : q.correct != null);
  const adjKind = (a) => (a.points > 0 ? 'bonus' : 'penalty');

  // Answer media: an https image/GIF URL or a YouTube link. Returns { kind: 'image' | 'youtube', src } or null if unusable.
  const IMAGE_RE = /\.(png|jpe?g|gif|webp|avif|svg)$/i;
  const YT_ID = /^[\w-]{11}$/;
  function parseMedia(input) {
    if (typeof input !== 'string' || !input.trim()) return null;
    let u;
    try { u = new URL(input.trim()); } catch (e) { return null; }
    if (u.protocol !== 'https:') return null;
    const host = u.hostname.toLowerCase().replace(/^(www|m)\./, '');
    let id = null;
    if (host === 'youtu.be') id = u.pathname.slice(1).split('/')[0];
    else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      const m = u.pathname.match(/^\/(?:embed|shorts|live|v)\/([^/]+)/);
      id = m ? m[1] : u.pathname === '/watch' ? u.searchParams.get('v') : null;
    }
    if (id !== null) {
      if (!YT_ID.test(id)) return null;
      const q = new URLSearchParams({ autoplay: '1', rel: '0', playsinline: '1' });
      const t = parseInt(u.searchParams.get('t') || u.searchParams.get('start') || '', 10);
      if (t > 0) q.set('start', String(t));
      return { kind: 'youtube', src: `https://www.youtube-nocookie.com/embed/${id}?${q}` };
    }
    return IMAGE_RE.test(u.pathname) ? { kind: 'image', src: input.trim() } : null;
  }

  // Validate arbitrary (e.g. loaded from disk) data; fill optional fields. Throws on bad shape.
  function normalizeState(obj) {
    const fail = (why) => { throw new Error('Invalid quiz state: ' + why); };
    if (!isObj(obj)) fail('not an object');
    if (typeof obj.title !== 'string') fail('title');
    if (!Array.isArray(obj.rounds)) fail('rounds');
    if (!Array.isArray(obj.teams)) fail('teams');
    const d = defaultState();
    const rounds = obj.rounds.map((r) => {
      if (!isObj(r) || typeof r.id !== 'string' || typeof r.name !== 'string') fail('round');
      const questions = Array.isArray(r.questions) ? r.questions : [];
      if (!questions.every(validQuestion)) fail('question');
      return { id: r.id, name: r.name, maxScore: Number.isFinite(r.maxScore) && r.maxScore > 0 ? r.maxScore : 0, questions: questions.map(cleanQuestion) };
    });
    const roundIds = new Set(rounds.map((r) => r.id));
    const teams = obj.teams.map((t) => {
      if (!isObj(t) || typeof t.id !== 'string' || typeof t.name !== 'string') fail('team');
      const scores = {};
      if (isObj(t.scores)) for (const [k, v] of Object.entries(t.scores)) if (roundIds.has(k) && Number.isFinite(v) && v >= 0) scores[k] = v;
      return { id: t.id, name: t.name, colour: typeof t.colour === 'string' ? t.colour : COLOURS[0], scores };
    });
    const rules = isObj(obj.rules) && Array.isArray(obj.rules.items)
      ? { items: obj.rules.items.filter((i) => typeof i === 'string'), visible: obj.rules.visible !== false }
      : d.rules;
    const teamIds = new Set(teams.map((t) => t.id));
    const adjustments = (Array.isArray(obj.adjustments) ? obj.adjustments : []).filter((a) => isObj(a) && typeof a.id === 'string' &&
      teamIds.has(a.teamId) && Number.isFinite(a.points) && a.points !== 0)
      .map((a) => ({ id: a.id, teamId: a.teamId, points: a.points, reason: str(a.reason) }));
    const adjIds = new Set(adjustments.map((a) => a.id));
    let maxN = 0;
    for (const x of [...rounds, ...teams, ...adjustments]) { const m = /(\d+)$/.exec(x.id); if (m) maxN = Math.max(maxN, +m[1]); }
    const history = Array.isArray(obj.history) ? obj.history.filter((h) => isObj(h) && (h.adjId !== undefined
      ? typeof h.adjId === 'string' && adjIds.has(h.adjId)
      : typeof h.teamId === 'string' && typeof h.roundId === 'string')) : [];
    const state = {
      version: 1, title: obj.title, rounds, teams, adjustments, rules,
      presentation: {
        step: Number.isInteger(obj.presentation && obj.presentation.step) ? obj.presentation.step : 0,
        autoReveal: !!(obj.presentation && obj.presentation.autoReveal),
        revealAnswer: !!(obj.presentation && obj.presentation.autoReveal),
      },
      history, nextId: Math.max(maxN + 1, Number.isInteger(obj.nextId) ? obj.nextId : 0),
    };
    return clampPresentation(state);
  }

  // ---- presentation -------------------------------------------------------
  function presentationSteps(state) {
    const steps = [{ type: 'board' }];
    for (const round of state.rounds) {
      (round.questions || []).forEach((_, qIndex) => {
        steps.push({ type: 'question', roundId: round.id, qIndex });
        if (!isText(round.questions[qIndex])) steps.push({ type: 'options', roundId: round.id, qIndex });
        steps.push({ type: 'board' });
      });
    }
    return steps;
  }
  function currentQuestion(state) {
    const step = presentationSteps(state)[state.presentation.step];
    if (!step || step.type === 'board') return null;
    const round = state.rounds.find((r) => r.id === step.roundId);
    return round ? { step, round, question: round.questions[step.qIndex] } : null;
  }
  // The answer can be revealed on the options step (choice) or the question step (written), if one is set.
  function canReveal(cur) {
    if (!cur || !hasAnswer(cur.question)) return false;
    return cur.step.type === (isText(cur.question) ? 'question' : 'options');
  }
  // Mutates (callers pass a clone). Keeps the step in range and drops stale reveal state.
  function clampPresentation(s) {
    const max = presentationSteps(s).length - 1;
    const step = Math.min(Math.max(s.presentation.step | 0, 0), max);
    s.presentation.step = step;
    if (!canReveal(currentQuestion(s))) s.presentation.revealAnswer = false;
    return s;
  }

  // ---- reducer --------------------------------------------------------------
  function parseScore(value) {
    if (value === null || value === undefined) return { clear: true };
    if (typeof value === 'string') {
      if (value.trim() === '') return { clear: true };
      const n = Number(value);
      return Number.isFinite(n) ? { value: n } : null;
    }
    return typeof value === 'number' && Number.isFinite(value) ? { value } : null;
  }

  function reduce(state, action) {
    if (!action || typeof action.type !== 'string') return state;
    const s = clone(state);
    const done = (next) => next;
    switch (action.type) {
      case 'setTitle': {
        const t = str(action.title);
        if (!t || t === state.title) return state;
        s.title = t;
        return s;
      }
      case 'setRounds': {
        if (!Array.isArray(action.rounds) || action.rounds.length === 0) return state;
        const old = new Map(s.rounds.map((r) => [r.id, r]));
        const rounds = action.rounds.map((r, i) => {
          const prev = r && old.get(r.id);
          const id = prev ? prev.id : 'r' + s.nextId++;
          const max = Number(r && r.maxScore);
          return { id, name: str(r && r.name) || 'Round ' + (i + 1), maxScore: Number.isFinite(max) && max > 0 ? max : 0, questions: prev ? prev.questions : [] };
        });
        const keep = new Set(rounds.map((r) => r.id));
        for (const t of s.teams) for (const k of Object.keys(t.scores)) if (!keep.has(k)) delete t.scores[k];
        s.history = s.history.filter((h) => h.adjId !== undefined || keep.has(h.roundId));
        s.rounds = rounds;
        return clampPresentation(s);
      }
      case 'addTeam': {
        const name = str(action.name);
        if (!name || s.teams.some((t) => t.name.toLowerCase() === name.toLowerCase())) return state;
        const id = 't' + s.nextId++;
        s.teams.push({ id, name, colour: COLOURS[s.teams.length % COLOURS.length], scores: {} });
        return s;
      }
      case 'renameTeam': {
        const name = str(action.name);
        const t = s.teams.find((x) => x.id === action.teamId);
        if (!t || !name || s.teams.some((x) => x !== t && x.name.toLowerCase() === name.toLowerCase())) return state;
        if (t.name === name) return state;
        t.name = name;
        return s;
      }
      case 'removeTeam': {
        if (!s.teams.some((t) => t.id === action.teamId)) return state;
        s.teams = s.teams.filter((t) => t.id !== action.teamId);
        const gone = new Set(s.adjustments.filter((a) => a.teamId === action.teamId).map((a) => a.id));
        s.adjustments = s.adjustments.filter((a) => !gone.has(a.id));
        s.history = s.history.filter((h) => h.teamId !== action.teamId && !gone.has(h.adjId));
        return s;
      }
      case 'setScore': {
        const team = s.teams.find((t) => t.id === action.teamId);
        const round = s.rounds.find((r) => r.id === action.roundId);
        const parsed = parseScore(action.value);
        if (!team || !round || !parsed) return state;
        if (!parsed.clear && (parsed.value < 0 || (round.maxScore > 0 && parsed.value > round.maxScore))) return state;
        const prev = team.scores[round.id];
        const next = parsed.clear ? undefined : parsed.value;
        if (prev === next) return state;
        if (next === undefined) delete team.scores[round.id]; else team.scores[round.id] = next;
        s.history.push({ teamId: team.id, roundId: round.id, prev: prev === undefined ? null : prev, next: next === undefined ? null : next });
        if (s.history.length > HISTORY_CAP) s.history.shift();
        return s;
      }
      case 'undo': {
        const h = s.history.pop();
        if (!h) return state;
        if (h.adjId !== undefined) { s.adjustments = s.adjustments.filter((a) => a.id !== h.adjId); return s; }
        const team = s.teams.find((t) => t.id === h.teamId);
        if (team) { if (h.prev === null) delete team.scores[h.roundId]; else team.scores[h.roundId] = h.prev; }
        return s;
      }
      case 'clearScores': {
        for (const t of s.teams) t.scores = {};
        s.adjustments = [];
        s.history = [];
        return s;
      }
      // Bonus (points > 0) or penalty (points < 0) outside the rounds, e.g. for catching cheaters.
      case 'addAdjustment': {
        const points = typeof action.points === 'string' && action.points.trim() === '' ? NaN : Number(action.points);
        if (!s.teams.some((t) => t.id === action.teamId) || !Number.isFinite(points) || points === 0) return state;
        const id = 'a' + s.nextId++;
        s.adjustments.push({ id, teamId: action.teamId, points, reason: str(action.reason) });
        s.history.push({ adjId: id });
        if (s.history.length > HISTORY_CAP) s.history.shift();
        return s;
      }
      case 'removeAdjustment': {
        if (!s.adjustments.some((a) => a.id === action.id)) return state;
        s.adjustments = s.adjustments.filter((a) => a.id !== action.id);
        s.history = s.history.filter((h) => h.adjId !== action.id);
        return s;
      }
      case 'resetAll':
        return defaultState({ title: action.title });
      case 'setRules': {
        if (!Array.isArray(action.items)) return state;
        s.rules.items = action.items.map(str).filter(Boolean);
        return s;
      }
      case 'setRulesVisible':
        if (s.rules.visible === !!action.visible) return state;
        s.rules.visible = !!action.visible;
        return s;
      case 'setQuestions': {
        const round = s.rounds.find((r) => r.id === action.roundId);
        if (!round || !Array.isArray(action.questions) || !action.questions.every(validQuestion)) return state;
        round.questions = action.questions.map(cleanQuestion);
        return clampPresentation(s);
      }
      case 'presentNext':
      case 'presentPrev':
      case 'presentGoto': {
        const max = presentationSteps(s).length - 1;
        let step = s.presentation.step;
        if (action.type === 'presentNext') step += 1;
        else if (action.type === 'presentPrev') step -= 1;
        else if (Number.isInteger(action.step)) step = action.step;
        else return state;
        step = Math.min(Math.max(step, 0), max);
        if (step === state.presentation.step) return state;
        s.presentation.step = step;
        // Answer reveal mode: arriving on a revealable step shows the answer straight away.
        s.presentation.revealAnswer = !!s.presentation.autoReveal && canReveal(currentQuestion(s));
        return s;
      }
      case 'setAutoReveal': {
        const on = !!action.on;
        if (!!s.presentation.autoReveal === on) return state;
        s.presentation.autoReveal = on;
        s.presentation.revealAnswer = on && canReveal(currentQuestion(s));
        return s;
      }
      case 'presentReveal': {
        if (!canReveal(currentQuestion(s))) return state;
        s.presentation.revealAnswer = !s.presentation.revealAnswer;
        return s;
      }
      case 'load':
        try { return normalizeState(action.state); } catch (e) { return state; }
      default:
        return done(state);
    }
  }

  // ---- selectors --------------------------------------------------------------
  const adjustmentTotal = (state, team) => state.adjustments.filter((a) => a.teamId === team.id).reduce((n, a) => n + a.points, 0);
  const total = (state, team, rounds) => rounds.reduce((a, r) => a + (team.scores[r.id] || 0), 0) + adjustmentTotal(state, team);
  function rankList(entries) {
    // entries: [{team,total}] -> ranks (competition ranking: 1,1,3)
    const sorted = entries.slice().sort((a, b) => b.total - a.total);
    return sorted.map((e, i) => ({ ...e, rank: i > 0 && e.total === sorted[i - 1].total ? undefined : i + 1 }))
      .map((e, i, arr) => { if (e.rank === undefined) { let j = i; while (arr[j].rank === undefined) j--; e.rank = arr[j].rank; } return e; });
  }
  const scoredRounds = (state) => state.rounds.filter((r) => state.teams.some((t) => t.scores[r.id] !== undefined));

  function standings(state) {
    const scored = scoredRounds(state);
    const prevRounds = scored.length >= 2 ? state.rounds.filter((r) => r !== scored[scored.length - 1]) : null;
    const prevRank = new Map();
    if (prevRounds) for (const e of rankList(state.teams.map((team) => ({ team, total: total(state, team, prevRounds) })))) prevRank.set(e.team.id, e.rank);
    return rankList(state.teams.map((team) => ({ team, total: total(state, team, state.rounds) }))).map((e) => ({
      team: e.team, total: e.total, rank: e.rank,
      delta: prevRank.has(e.team.id) ? prevRank.get(e.team.id) - e.rank : 0,
      scores: e.team.scores,
      bonus: state.adjustments.filter((a) => a.teamId === e.team.id && a.points > 0).reduce((n, a) => n + a.points, 0),
      penalty: -state.adjustments.filter((a) => a.teamId === e.team.id && a.points < 0).reduce((n, a) => n + a.points, 0),
    }));
  }

  function stats(state) {
    const st = standings(state);
    const scored = scoredRounds(state);
    const roundWinners = scored.map((round) => {
      const entries = state.teams.filter((t) => t.scores[round.id] !== undefined);
      const best = Math.max(...entries.map((t) => t.scores[round.id]));
      return { round, teams: entries.filter((t) => t.scores[round.id] === best), score: best };
    });
    let biggestClimber = null;
    for (const e of st) if (e.delta > 0 && (!biggestClimber || e.delta > biggestClimber.delta)) biggestClimber = { team: e.team, delta: e.delta };
    const bestWorst = [];
    for (const team of state.teams) {
      const played = scored.filter((r) => team.scores[r.id] !== undefined).map((r) => ({ round: r, score: team.scores[r.id] }));
      if (!played.length) continue;
      bestWorst.push({
        team,
        best: played.reduce((a, b) => (b.score > a.score ? b : a)),
        worst: played.reduce((a, b) => (b.score < a.score ? b : a)),
      });
    }
    let leadChanges = 0, last = null;
    scored.forEach((_, i) => {
      const upto = scored.slice(0, i + 1);
      const tots = state.teams.map((team) => ({ team, total: total(state, team, upto) })).sort((a, b) => b.total - a.total);
      if (!tots.length || (tots.length > 1 && tots[0].total === tots[1].total)) return;
      if (last && last !== tots[0].team.id) leadChanges++;
      last = tots[0].team.id;
    });
    const hasScores = scored.length > 0;
    const gap = hasScores && st.length >= 2 ? st[0].total - st[1].total : null;
    const lastOnes = st.filter((e) => e.rank === st[st.length - 1].rank);
    const woodenSpoon = hasScores && st.length >= 2 && lastOnes.length === 1 && lastOnes[0].rank !== 1 ? lastOnes[0].team : null;
    return { roundWinners, biggestClimber, bestWorst, leadChanges, gap, woodenSpoon };
  }

  return { DEFAULT_TITLE, COLOURS, defaultState, normalizeState, reduce, standings, stats, presentationSteps, currentQuestion, parseMedia, scoredRounds, isText, hasAnswer, canReveal, adjKind, adjustmentTotal };
});
