(function () {
  const Q = window.quiz, L = window.QuizLogic;
  let state = null;
  let fx = null;         // { effects } payload from the settings store
  let brand = null;      // { branding, images } payload from the branding store
  let section = 'scoring';
  let selRound = null;   // round shown in the Scoring tab
  let qRound = null;     // round shown in the Questions tab
  let pendingFocus = null;
  let lastMainKey = null;
  let adjDraft = { teamId: null, points: '', reason: '' };   // survives re-renders while typing
  try { section = sessionStorage.getItem('admin.section') || section; } catch (e) { /* ignore */ }
  const requested = new URLSearchParams(location.search).get('section');
  if (requested) section = requested;

  const SECTIONS = [['setup', 'Setup'], ['rules', 'Rules'], ['questions', 'Questions'], ['teams', 'Teams'], ['scoring', 'Scoring'], ['effects', '✨ Effects'], ['branding', '⚙ Branding']];
  const $ = (id) => document.getElementById(id);

  function el(tag, props, ...kids) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else if (v === true) n.setAttribute(k, '');
      else if (v !== false && v != null) n.setAttribute(k, v);
    }
    for (const kid of kids.flat()) if (kid != null) n.append(kid);
    return n;
  }

  // ---- helpers -----------------------------------------------------------
  let toastTimer;
  function toast(msg, ok) {
    if (ok && !Effects.on('admin.successToasts')) return; // errors (ok falsy) are always shown
    const t = $('toast');
    t.textContent = msg; t.className = ok ? 'ok' : ''; t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
  }
  function confirmDialog(message, okLabel = 'Yes, do it') {
    return new Promise((resolve) => {
      const m = $('modal');
      const close = (v) => { m.hidden = true; m.replaceChildren(); resolve(v); };
      m.replaceChildren(el('div', { class: 'dialog', role: 'dialog' },
        el('p', { text: message }),
        el('div', { class: 'actions' },
          el('button', { class: 'btn ghost', text: 'Cancel', onclick: () => close(false) }),
          el('button', { class: 'btn coral', text: okLabel, onclick: () => close(true) }))));
      m.hidden = false;
      m.querySelector('.btn.ghost').focus();
    });
  }
  async function dispatch(action, inputEl, failMsg) {
    const res = await Q.dispatch(action);
    if (!res.ok && inputEl) {
      inputEl.classList.remove('shake'); void inputEl.offsetWidth; inputEl.classList.add('shake');
      if (failMsg) toast(failMsg);
    }
    return res.ok;
  }
  const hasScores = (pred) => state.teams.some((t) => Object.keys(t.scores).some(pred));
  const roundList = () => state.rounds.map((r) => ({ id: r.id, name: r.name, maxScore: r.maxScore }));

  // ---- sections ----------------------------------------------------------
  function buildSetup() {
    const title = el('input', { type: 'text', value: state.title, 'data-key': 'title', maxlength: 80,
      onchange: (e) => dispatch({ type: 'setTitle', title: e.target.value }, e.target, 'Title cannot be empty') });
    title.value = state.title;
    const rows = state.rounds.map((r, i) => el('div', { class: 'row' },
      el('span', { class: 'muted', text: String(i + 1).padStart(2, '0') }),
      (() => { const inp = el('input', { type: 'text', 'data-key': 'rname' + i, maxlength: 60, class: 'grow',
        onchange: (e) => { const l = roundList(); l[i].name = e.target.value; dispatch({ type: 'setRounds', rounds: l }); } }); inp.value = r.name; return inp; })(),
      (() => { const inp = el('input', { type: 'number', min: 0, step: 'any', class: 'num', 'data-key': 'rmax' + i, title: 'Max score (0 = no limit)',
        onchange: (e) => { const l = roundList(); l[i].maxScore = Number(e.target.value) || 0; dispatch({ type: 'setRounds', rounds: l }); } }); inp.value = r.maxScore; return inp; })(),
      el('button', { class: 'icon del', title: 'Remove round', disabled: state.rounds.length <= 1, text: '✕', onclick: async () => {
        if (hasScores((k) => k === r.id) && !(await confirmDialog(`Remove "${r.name}"? Its scores will be lost.`, 'Remove'))) return;
        dispatch({ type: 'setRounds', rounds: roundList().filter((_, j) => j !== i) });
      } })));
    return el('div', { class: 'panel' },
      el('div', { class: 'card' }, el('h2', { text: 'Quiz title' }), title),
      el('div', { class: 'card' }, el('h2', { text: 'Rounds' }),
        el('div', { class: 'row muted' }, el('span', { text: '  #' }), el('span', { class: 'grow', text: 'Round name' }), el('span', { text: 'Max score (0 = no limit)' }), el('span', { style: 'width:2.2rem' })),
        rows,
        el('button', { class: 'btn small', text: '+ Add round', onclick: () => {
          const l = roundList(); l.push({ name: 'Round ' + (l.length + 1), maxScore: 0 });
          pendingFocus = 'rname' + (l.length - 1);
          dispatch({ type: 'setRounds', rounds: l });
        } })));
  }

  function buildRules() {
    const items = state.rules.items;
    const commit = (list) => dispatch({ type: 'setRules', items: list });
    const toggle = el('div', { class: 'toggle-big' },
      el('div', { class: 'switch' + (state.rules.visible ? ' on' : ''), role: 'switch', tabindex: 0, 'aria-checked': String(state.rules.visible),
        onclick: () => dispatch({ type: 'setRulesVisible', visible: !state.rules.visible }),
        onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); dispatch({ type: 'setRulesVisible', visible: !state.rules.visible }); } } }),
      el('div', {}, el('b', { text: state.rules.visible ? 'Rules are showing on the big screen' : 'Rules are hidden' }),
        el('div', { class: 'muted', text: 'Turn this on at the start of the quiz; turn it off to reveal the leaderboard.' })));
    const rows = items.map((text, i) => el('div', { class: 'row' },
      el('span', { class: 'muted', text: (i + 1) + '.' }),
      (() => { const inp = el('input', { type: 'text', class: 'grow', 'data-key': 'rule' + i,
        onchange: (e) => { const l = items.slice(); l[i] = e.target.value; commit(l); } }); inp.value = text; return inp; })(),
      el('button', { class: 'icon', text: '▲', disabled: i === 0, onclick: () => { const l = items.slice(); [l[i - 1], l[i]] = [l[i], l[i - 1]]; commit(l); } }),
      el('button', { class: 'icon', text: '▼', disabled: i === items.length - 1, onclick: () => { const l = items.slice(); [l[i + 1], l[i]] = [l[i], l[i + 1]]; commit(l); } }),
      el('button', { class: 'icon del', text: '✕', onclick: () => commit(items.filter((_, j) => j !== i)) })));
    const add = el('input', { type: 'text', class: 'grow', placeholder: 'Add a rule and press Enter…', 'data-key': 'newrule',
      onkeydown: (e) => { if (e.key === 'Enter' && e.target.value.trim()) { pendingFocus = 'newrule'; commit(items.concat(e.target.value)); } } });
    return el('div', { class: 'panel' },
      el('div', { class: 'card' }, el('h2', { text: 'Show rules' }), toggle),
      el('div', { class: 'card' }, el('h2', { text: 'The rules' }), rows, el('div', { class: 'row' }, add)));
  }

  function roundPills(current, onPick, mark) {
    return el('div', { class: 'pills' }, state.rounds.map((r) => el('button', {
      class: 'pill' + (r.id === current ? ' on' : ''), text: (mark && mark(r) ? '✓ ' : '') + r.name, onclick: () => onPick(r.id) })));
  }

  function buildQuestions() {
    if (!state.rounds.some((r) => r.id === qRound)) qRound = state.rounds[0].id;
    const round = state.rounds.find((r) => r.id === qRound);
    const qs = round.questions;
    const commit = (list) => dispatch({ type: 'setQuestions', roundId: round.id, questions: list });
    const copy = () => qs.map((q) => ({ ...q, options: q.options.slice() }));
    const blank = (type) => (type === 'text' ? { type: 'text', text: '', answer: '' } : { type: 'choice', text: '', options: ['', '', '', ''], correct: null });
    const cards = qs.map((q, qi) => el('div', { class: 'q-card' },
      el('div', { class: 'row' },
        el('b', { class: 'muted', text: 'Q' + (qi + 1) }),
        (() => { const inp = el('input', { type: 'text', class: 'grow', placeholder: 'Question text', 'data-key': `q${qi}`,
          onchange: (e) => { const l = copy(); l[qi].text = e.target.value; commit(l); } }); inp.value = q.text; return inp; })(),
        el('button', { class: 'icon', text: '▲', disabled: qi === 0, onclick: () => { const l = copy(); [l[qi - 1], l[qi]] = [l[qi], l[qi - 1]]; commit(l); } }),
        el('button', { class: 'icon', text: '▼', disabled: qi === qs.length - 1, onclick: () => { const l = copy(); [l[qi + 1], l[qi]] = [l[qi], l[qi + 1]]; commit(l); } }),
        el('button', { class: 'icon del', text: '✕', title: 'Delete question', onclick: () => commit(copy().filter((_, j) => j !== qi)) })),
      el('div', { class: 'pills small' }, [['choice', 'Multiple choice'], ['text', 'Written answer']].map(([type, label]) => el('button', {
        class: 'pill' + ((L.isText(q) ? 'text' : 'choice') === type ? ' on' : ''), text: label,
        onclick: () => { if ((L.isText(q) ? 'text' : 'choice') === type) return; const l = copy(); l[qi] = { ...blank(type), text: q.text }; commit(l); } }))),
      L.isText(q)
        ? [el('div', { class: 'q-opt' }, el('span', { class: 'letter', text: '✎' }),
            (() => { const inp = el('input', { type: 'text', placeholder: 'Model answer (optional – shown on "Reveal answer")', 'data-key': `q${qi}ans`,
              onchange: (e) => { const l = copy(); l[qi].answer = e.target.value; commit(l); } }); inp.value = q.answer || ''; return inp; })()),
          el('div', { class: 'row muted', style: 'margin-top:.5rem', text: 'Teams write their answer down – nothing but the question is shown on screen until you reveal.' })]
        : [...q.options.map((o, oi) => el('div', { class: 'q-opt' },
            el('span', { class: 'letter', text: 'ABCD'[oi] }),
            (() => { const inp = el('input', { type: 'text', placeholder: 'Option ' + 'ABCD'[oi], 'data-key': `q${qi}o${oi}`,
              onchange: (e) => { const l = copy(); l[qi].options[oi] = e.target.value; commit(l); } }); inp.value = o; return inp; })(),
            el('input', { type: 'radio', name: 'correct' + qi, title: 'Mark as correct answer', checked: q.correct === oi,
              onclick: () => { const l = copy(); l[qi].correct = oi; commit(l); } }))),
          el('div', { class: 'row muted', style: 'margin-top:.5rem' },
            el('span', { text: q.correct == null ? 'No correct answer set (optional – needed for "Reveal answer")' : `Correct answer: ${'ABCD'[q.correct]}` }),
            q.correct == null ? null : el('button', { class: 'btn small ghost', text: 'Clear', onclick: () => { const l = copy(); l[qi].correct = null; commit(l); } }))]));
    return el('div', { class: 'panel' },
      el('div', { class: 'card' }, el('h2', { text: 'Questions by round' }),
        roundPills(qRound, (id) => { qRound = id; render(true); }, (r) => r.questions.length > 0),
        cards.length ? cards : el('p', { class: 'muted', text: 'No questions for this round yet. Add one to use the on-screen question presentation.' }),
        el('div', { class: 'row' },
          el('button', { class: 'btn small', text: '+ Multiple choice', onclick: () => { const l = copy(); l.push(blank('choice')); pendingFocus = `q${l.length - 1}`; commit(l); } }),
          el('button', { class: 'btn small', text: '+ Written answer', onclick: () => { const l = copy(); l.push(blank('text')); pendingFocus = `q${l.length - 1}`; commit(l); } }))),
      el('p', { class: 'muted', text: 'Use ◀ ▶ (or arrow keys / Space) in the bar at the bottom to step through: leaderboard → question → question + options (multiple choice only) → leaderboard → …' }));
  }

  function buildTeams() {
    const add = el('input', { type: 'text', class: 'grow', placeholder: 'New team name – press Enter', maxlength: 60, 'data-key': 'newteam',
      onkeydown: async (e) => {
        if (e.key !== 'Enter' || !e.target.value.trim()) return;
        pendingFocus = 'newteam';
        const input = e.target;
        if (!(await dispatch({ type: 'addTeam', name: input.value }, input, 'Team name is blank or already used'))) pendingFocus = null;
      } });
    const bulk = el('textarea', { rows: 4, placeholder: 'Or paste several team names, one per line…', 'data-key': 'bulk' });
    const rows = state.teams.map((t, i) => el('div', { class: 'row' },
      el('span', { class: 'dot', style: `background:${t.colour};width:1.2rem;height:1.2rem;border-radius:50%;display:inline-block` }),
      (() => { const inp = el('input', { type: 'text', class: 'grow', 'data-key': 'team' + i,
        onchange: (e) => dispatch({ type: 'renameTeam', teamId: t.id, name: e.target.value }, e.target, 'Name is blank or already used') }); inp.value = t.name; return inp; })(),
      el('button', { class: 'icon del', text: '✕', title: 'Remove team', onclick: async () => {
        if (Object.keys(t.scores).length && !(await confirmDialog(`Remove "${t.name}" and their scores?`, 'Remove'))) return;
        dispatch({ type: 'removeTeam', teamId: t.id });
      } })));
    return el('div', { class: 'panel' },
      el('div', { class: 'card' }, el('h2', { text: `Teams (${state.teams.length})` }),
        rows.length ? rows : el('p', { class: 'muted', text: 'No teams yet.' }),
        el('div', { class: 'row' }, add)),
      el('div', { class: 'card' }, bulk,
        el('div', { class: 'row', style: 'margin-top:.6rem' }, el('button', { class: 'btn small gold', text: 'Add all', onclick: async () => {
          let n = 0;
          for (const line of bulk.value.split('\n')) if (line.trim() && (await Q.dispatch({ type: 'addTeam', name: line })).ok) n++;
          bulk.value = ''; toast(`Added ${n} team${n === 1 ? '' : 's'}`, true);
        } }))));
  }

  function buildScoring() {
    if (!state.teams.length) return el('div', { class: 'panel' }, el('div', { class: 'card' }, el('h2', { text: 'Scoring' }),
      el('p', { text: 'Add some teams first.' }), el('button', { class: 'btn gold', text: 'Go to Teams', onclick: () => go('teams') })));
    if (!state.rounds.some((r) => r.id === selRound)) selRound = state.rounds[0].id;
    const round = state.rounds.find((r) => r.id === selRound);
    const st = new Map(L.standings(state).map((e) => [e.team.id, e]));
    const complete = (r) => state.teams.every((t) => t.scores[r.id] !== undefined);
    const inputs = [];
    const rows = state.teams.map((t, i) => {
      const inp = el('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off', 'data-key': 'score' + i, placeholder: '–',
        onchange: (e) => dispatch({ type: 'setScore', teamId: t.id, roundId: round.id, value: e.target.value }, e.target,
          round.maxScore > 0 ? `Enter a number from 0 to ${round.maxScore}` : 'Enter a number 0 or more'),
        onkeydown: (e) => {
          if (e.key !== 'Enter') return;
          e.preventDefault();
          const next = inputs[i + 1] || null;
          pendingFocus = next ? 'score' + (i + 1) : null;
          if (e.target.value.trim() === (t.scores[round.id] === undefined ? '' : String(t.scores[round.id]))) { if (next) next.focus(); else e.target.blur(); return; }
          e.target.dispatchEvent(new Event('change'));
        } });
      inp.value = t.scores[round.id] === undefined ? '' : String(t.scores[round.id]);
      inputs.push(inp);
      const e = st.get(t.id);
      return el('div', { class: 'score-row' },
        el('span', { class: 'dot', style: `background:${t.colour}` }),
        el('span', { class: 'name', text: t.name }),
        inp,
        el('span', { class: 'tot', text: `${e.total}  ·  #${e.rank}` }));
    });
    return el('div', { class: 'panel' }, el('div', { class: 'card' },
      el('h2', { text: 'Enter scores' }),
      roundPills(selRound, (id) => { selRound = id; render(true); }, complete),
      el('div', { class: 'muted', style: 'margin-bottom:.6rem', text: round.maxScore > 0 ? `${round.name} – max ${round.maxScore} points. Enter moves to the next team.` : `${round.name} – Enter moves to the next team.` }),
      el('div', { class: 'score-row score-head' }, el('span'), el('span', { text: 'Team' }), el('span', { text: 'This round' }), el('span', { text: 'Total · rank' })),
      rows),
      buildAdjustments());
  }

  // Bonus / penalty points outside the rounds (e.g. punish a cheat, reward whoever spotted it).
  const fmtPts = (n) => (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n);
  function buildAdjustments() {
    const pick = el('select', { 'data-key': 'adj-team', onchange: (e) => { adjDraft.teamId = e.target.value; } }, state.teams.map((t) => el('option', { value: t.id, text: t.name })));
    if (state.teams.some((t) => t.id === adjDraft.teamId)) pick.value = adjDraft.teamId;
    const pts = el('input', { type: 'text', inputmode: 'decimal', class: 'num', placeholder: 'Pts', 'data-key': 'adj-pts', onchange: (e) => { adjDraft.points = e.target.value; } });
    pts.value = adjDraft.points;
    const why = el('input', { type: 'text', class: 'grow', maxlength: 100, placeholder: 'Reason (shown on the big screen) – e.g. caught using a phone', 'data-key': 'adj-why', onchange: (e) => { adjDraft.reason = e.target.value; } });
    why.value = adjDraft.reason;
    const apply = async (sign) => {
      adjDraft = { teamId: pick.value, points: pts.value, reason: why.value };
      const n = Math.abs(Number(pts.value));
      if (!(n > 0) || !Number.isFinite(n)) { pts.classList.remove('shake'); void pts.offsetWidth; pts.classList.add('shake'); toast('Enter the number of points (more than 0)'); return; }
      pendingFocus = 'adj-pts';
      if (await dispatch({ type: 'addAdjustment', teamId: pick.value, points: sign * n, reason: why.value })) adjDraft = { teamId: pick.value, points: '', reason: '' };
    };
    const byTeam = new Map(state.teams.map((t) => [t.id, t]));
    const log = state.adjustments.slice().reverse().map((a) => el('div', { class: 'row adj ' + L.adjKind(a) },
      el('b', { class: 'adj-pts', text: fmtPts(a.points) }),
      el('span', { class: 'grow', text: (byTeam.get(a.teamId) || {}).name + (a.reason ? ' – ' + a.reason : '') }),
      el('button', { class: 'icon del', text: '✕', title: 'Remove this adjustment', onclick: () => dispatch({ type: 'removeAdjustment', id: a.id }) })));
    return el('div', { class: 'card' }, el('h2', { text: 'Penalties & bonuses' }),
      el('p', { class: 'muted', text: 'Applied to a team’s total on top of the round scores. The big screen announces each one with its reason.' }),
      el('div', { class: 'row' }, pick, pts, why),
      el('div', { class: 'row' },
        el('button', { class: 'btn small coral', text: '🚨 Penalty', onclick: () => apply(-1) }),
        el('button', { class: 'btn small gold', text: '🎁 Bonus', onclick: () => apply(1) })),
      log.length ? log : el('p', { class: 'muted', text: 'None yet.' }));
  }



  // ---- effects (animations & celebrations) -----------------------------------------
  const PREVIEW_FLAGS = {
    leadChange: ['celebrate.leadChange.confetti', 'celebrate.leadChange.banner'],
    roundComplete: ['celebrate.roundComplete.confetti', 'celebrate.roundComplete.banner', 'celebrate.roundComplete.chipPop'],
    reveal: ['celebrate.reveal.confetti', 'celebrate.reveal.highlight'],
  };
  function buildEffects() {
    if (!fx) return el('div', { class: 'panel' }, el('div', { class: 'card' }, el('p', { text: 'Loading…' })));
    const FX = window.QuizEffects, s = fx.effects;
    const set = (patch) => Q.setSettings(patch);
    const presetRow = el('div', { class: 'pills' },
      Object.entries(FX.PRESETS).map(([name, p]) => el('button', { class: 'pill' + (s.preset === name ? ' on' : ''), text: p.label, onclick: () => Q.applyEffectsPreset(name) })),
      s.preset === 'custom' ? el('span', { class: 'pill on', text: '🎛 Custom' }) : null);
    const amount = el('select', { 'data-key': 'fx-amount', onchange: (e) => set({ confettiAmount: e.target.value }) },
      [['low', 'Low'], ['normal', 'Normal'], ['lots', 'Lots']].map(([v, label]) => el('option', { value: v, text: label })));
    amount.value = s.confettiAmount;
    const follow = el('input', { type: 'checkbox', checked: s.followSystemReducedMotion, onchange: (e) => set({ followSystemReducedMotion: e.target.checked }) });
    const flagRow = (f) => el('div', { class: 'fx-row' },
      el('div', { class: 'switch' + (s.flags[f.key] ? ' on' : ''), role: 'switch', tabindex: 0, 'aria-checked': String(s.flags[f.key]), 'aria-label': f.label,
        onclick: () => set({ flags: { [f.key]: !s.flags[f.key] } }),
        onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); set({ flags: { [f.key]: !s.flags[f.key] } }); } } }),
      el('div', {}, el('b', { text: f.label }), el('div', { class: 'muted', text: f.hint })));
    const previews = el('div', { class: 'row', style: 'margin-top:.8rem' }, el('span', { class: 'muted', text: 'Preview on the Leaderboard:' }),
      FX.PREVIEWS.map((p) => el('button', { class: 'btn small', text: '▶ ' + p.label, onclick: async () => {
        if (!PREVIEW_FLAGS[p.kind].some((k) => s.flags[k])) { toast('Nothing to preview – those effects are switched off'); return; }
        const r = await Q.previewEffect(p.kind);
        if (!r.delivered) toast('Open the Leaderboard window to see the preview');
      } })));
    return el('div', { class: 'panel' },
      el('div', { class: 'card' }, el('h2', { text: 'Animations & celebrations' }),
        el('p', { class: 'muted', text: 'Pick a preset, then fine-tune individual effects. Changes apply instantly on every screen. Error messages and "are you sure?" confirmations are always shown.' }),
        presetRow,
        el('div', { class: 'row' }, el('label', { class: 'field', style: 'width:200px' }, 'Confetti amount', amount),
          el('label', { class: 'row', style: 'margin:1.4rem 0 0 1rem;gap:.5rem' }, follow, el('span', { text: "Respect my computer's “reduce motion” setting" })))),
      FX.GROUPS.map((g) => el('div', { class: 'card' }, el('h2', { text: g.label }), el('div', { class: 'muted', style: 'margin:-.4rem 0 .6rem', text: g.blurb }),
        FX.FLAGS.filter((f) => f.group === g.id).map(flagRow), g.id === 'celebrations' ? previews : null)),
      el('div', { class: 'card' }, el('button', { class: 'btn small coral', text: 'Reset to defaults (Party)', onclick: () => Q.resetSettings() })));
  }

  // ---- branding ------------------------------------------------------------
  const COLOUR_LABELS = {
    bg: ['Background', 'Main screen background'], bgDeep: ['Background (dark)', 'Edges, bars and panels'], bgMid: ['Background (light)', 'Glow and cards'],
    line: ['Lines & buttons', 'Borders, buttons, inactive items'], accent1: ['Accent 1', 'Titles, highlights, gold medals'], accent2: ['Accent 2', 'Alerts, round colour 2'],
    accent3: ['Accent 3', 'Confirmations, round colour 3'], accent4: ['Accent 4', 'Round colour 4'], text: ['Text', 'Main text'], muted: ['Muted text', 'Secondary text'],
  };
  const IMAGE_INFO = {
    crest: ['Crest / logo', 'Square-ish badge shown beside titles. PNG, SVG, JPG or WebP, max 5 MB.'],
    wordmark: ['Wordmark (optional)', 'Wide logo or lettering for the launcher and rules screen. Light-on-transparent works best. If empty, the app name is shown as text.'],
    icon: ['Window icon', 'PNG or JPG, ideally 512×512.'],
  };
  async function brandResult(res, okMsg) {
    if (res.ok) { if (okMsg) toast(okMsg, true); } else if (!res.canceled) toast(res.error || 'Something went wrong');
  }

  function buildBranding() {
    if (!brand) return el('div', { class: 'panel' }, el('div', { class: 'card' }, el('p', { text: 'Loading…' })));
    const b = brand.branding, BR = window.QuizBranding;
    const textField = (label, key, hint) => {
      const inp = el('input', { type: 'text', maxlength: 80, 'data-key': 'b-' + key, onchange: async (e) => brandResult(await Q.setBranding({ [key]: e.target.value })) });
      inp.value = b[key];
      return el('label', { class: 'field' }, label, inp, hint ? el('span', { class: 'muted', style: 'text-transform:none;letter-spacing:0;font-weight:600', text: hint }) : null);
    };
    const imageRow = (kind) => {
      const src = brand.images[kind] || (kind === 'crest' ? 'assets/default-crest.svg' : null);
      return el('div', { class: 'row', style: 'align-items:flex-start;gap:1rem;margin-bottom:1rem' },
        el('div', { class: 'img-slot' }, src ? el('img', { src, alt: '' }) : el('span', { class: 'muted', text: 'none' })),
        el('div', { class: 'grow' }, el('b', { text: IMAGE_INFO[kind][0] }), el('div', { class: 'muted', text: IMAGE_INFO[kind][1] }),
          el('div', { class: 'row', style: 'margin-top:.5rem' },
            el('button', { class: 'btn small', text: 'Choose image…', onclick: async () => brandResult(await Q.pickBrandingImage(kind), 'Image updated') }),
            el('button', { class: 'btn small ghost', text: kind === 'crest' ? 'Use default' : 'Remove', disabled: !b.images[kind], onclick: async () => brandResult(await Q.clearBrandingImage(kind)) }))));
    };
    const colourRow = (key) => {
      const picker = el('input', { type: 'color', 'data-key': 'c-' + key, class: 'swatch',
        oninput: (e) => document.documentElement.style.setProperty(BR.CSS_NAMES[key], e.target.value),
        onchange: async (e) => brandResult(await Q.setBranding({ colours: { [key]: e.target.value } })) });
      picker.value = b.colours[key];
      return el('div', { class: 'colour-row' }, picker, el('div', {}, el('b', { text: COLOUR_LABELS[key][0] }), el('div', { class: 'muted', text: COLOUR_LABELS[key][1] })), el('code', { text: b.colours[key] }));
    };
    const warnings = [];
    if (BR.contrastRatio(b.colours.text, b.colours.bg) < 4.5) warnings.push('Text colour has low contrast against the background – it may be hard to read on a projector.');
    if (BR.contrastRatio(b.colours.accent1, b.colours.bg) < 3) warnings.push('Accent 1 (titles) has low contrast against the background.');
    return el('div', { class: 'panel' },
      el('div', { class: 'card' }, el('h2', { text: 'Identity' }),
        el('div', { class: 'row' }, el('div', { class: 'grow' }, textField('App / event name', 'appName', 'Shown on the launcher and in window titles when there is no wordmark image.')),
          el('div', { class: 'grow' }, textField('Default quiz title', 'defaultTitle', 'Used for new and reset quizzes. The current quiz title is edited in Setup.')))),
      el('div', { class: 'card' }, el('h2', { text: 'Images' }), ['crest', 'wordmark', 'icon'].map(imageRow)),
      el('div', { class: 'card' }, el('h2', { text: 'Colours' }),
        warnings.map((w) => el('p', { class: 'warn', text: '⚠ ' + w })),
        el('div', { class: 'colour-grid' }, BR.COLOUR_KEYS.map(colourRow))),
      el('div', { class: 'card' }, el('h2', { text: 'Presets' }),
        el('p', { class: 'muted', text: 'A preset is a folder holding branding.json and its image files. Export yours to reuse it elsewhere, or import one to switch identity in one click. Your branding is stored outside the quiz data, so it survives "Reset everything".' }),
        el('div', { class: 'row' },
          el('button', { class: 'btn small gold', text: 'Import preset…', onclick: async () => brandResult(await Q.importBrandingPreset(), 'Preset imported') }),
          el('button', { class: 'btn small', text: 'Export preset…', onclick: async () => { const r = await Q.exportBrandingPreset(); if (r.ok) toast('Saved to ' + r.path, true); else if (!r.canceled) toast(r.error || 'Export failed'); } }),
          el('button', { class: 'btn small coral', text: 'Reset to default', onclick: async () => { if (await confirmDialog('Reset the name, title, colours and images to the built-in defaults?', 'Reset branding')) brandResult(await Q.resetBranding(), 'Branding reset'); } }))));
  }

  const BUILDERS = { setup: buildSetup, rules: buildRules, questions: buildQuestions, teams: buildTeams, scoring: buildScoring, effects: buildEffects, branding: buildBranding };

  // ---- presentation bar -----------------------------------------------------
  function describeStep(step) {
    if (step.type === 'board') return 'Leaderboard only';
    const round = state.rounds.find((r) => r.id === step.roundId);
    const label = `${round.name} · Q${step.qIndex + 1}`;
    return step.type === 'question' ? `${label} – question` : `${label} – question + options`;
  }
  function buildPresent() {
    const steps = L.presentationSteps(state);
    const i = state.presentation.step;
    const cur = L.currentQuestion(state);
    const canReveal = L.canReveal(cur);
    const dots = el('div', { class: 'dots' }, steps.map((s, j) => el('i', { class: (s.type === 'board' ? 'board ' : '') + (j === i ? 'on' : ''), title: describeStep(s),
      onclick: () => dispatch({ type: 'presentGoto', step: j }) })));
    return [
      el('button', { class: 'btn small ' + (state.rules.visible ? 'gold' : 'ghost'), text: state.rules.visible ? '📜 Rules: ON' : '📜 Rules: off',
        onclick: () => dispatch({ type: 'setRulesVisible', visible: !state.rules.visible }) }),
      el('button', { class: 'btn', text: '◀ Prev', disabled: i === 0, onclick: () => dispatch({ type: 'presentPrev' }) }),
      el('div', { class: 'step-info' }, el('b', { text: describeStep(steps[i]) }),
        el('div', { class: 'muted', text: steps.length > 1 ? `Step ${i + 1} of ${steps.length}` : 'No questions yet – add some in the Questions tab' }), dots),
      el('button', { class: 'btn gold', text: 'Next ▶', disabled: i >= steps.length - 1, onclick: () => dispatch({ type: 'presentNext' }) }),
      el('button', { class: 'btn small ' + (state.presentation.revealAnswer ? 'coral' : ''), disabled: !canReveal,
        text: state.presentation.revealAnswer ? 'Hide answer' : 'Reveal answer', onclick: () => dispatch({ type: 'presentReveal' }) }),
    ];
  }

  // ---- render -----------------------------------------------------------------
  function go(name) {
    section = name;
    try { sessionStorage.setItem('admin.section', name); } catch (e) { /* ignore */ }
    render(true);
  }

  function withFocusKept(fn) {
    const a = document.activeElement;
    const key = pendingFocus || (a && a.dataset && a.dataset.key);
    const sel = !pendingFocus && a && 'selectionStart' in a ? [a.selectionStart, a.selectionEnd] : null;
    const scroll = $('main').scrollTop;
    fn();
    $('main').scrollTop = scroll;
    pendingFocus = null;
    if (key) {
      const t = document.querySelector(`[data-key="${key}"]`);
      if (t) { t.focus(); if (sel && t.setSelectionRange) try { t.setSelectionRange(sel[0], sel[1]); } catch (e) { /* ignore */ } else if (t.select) t.select(); }
    }
  }

  function render(force) {
    if (!state) return;
    $('head-title').textContent = state.title;
    $('nav').replaceChildren(...SECTIONS.map(([k, label]) => el('button', { class: k === section ? 'on' : '', text: label, onclick: () => go(k) })));
    $('undo').disabled = state.history.length === 0;
    const key = section + '|' + JSON.stringify({ ...state, presentation: null }) + '|' + selRound + '|' + qRound + '|' + (brand ? JSON.stringify(brand.branding) : '') + '|' + (fx ? JSON.stringify(fx.effects) : '');
    if (force || key !== lastMainKey) {
      lastMainKey = key;
      withFocusKept(() => $('main').replaceChildren(BUILDERS[section]()));
    }
    $('present').replaceChildren(...buildPresent());
  }

  // ---- header + keyboard ------------------------------------------------------
  $('undo').onclick = () => dispatch({ type: 'undo' });
  $('fs').onclick = () => Q.toggleFullscreen();
  $('open-board').onclick = async () => {
    const d = await Q.displays();
    const other = d.find((x) => !x.primary);
    Q.openWindow('leaderboard', other ? { displayId: other.id } : {});
  };
  const closeMenu = () => document.querySelector('.menu').removeAttribute('open');
  const baseName = (p) => p.split(/[\\/]/).pop();
  const clock = (t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  function renderSaveChip(st) {
    const chip = $('savechip'), un = $('unlink');
    un.hidden = !st.path;
    let text, cls = 'savechip', tip = '';
    if (st.path && st.error) { text = `⚠ Not saved to ${baseName(st.path)}`; cls += ' warn'; tip = `${st.path}\n${st.error}`; }
    else if (st.path) { text = `💾 ${baseName(st.path)}` + (st.savedAt ? ` · saved ${clock(st.savedAt)}` : ''); cls += ' linked'; tip = `Autosaving every change to:\n${st.path}`; }
    else if (st.local.error) { text = '⚠ Cannot save on this computer'; cls += ' warn'; tip = st.local.error; }
    else { text = '💾 Autosaved on this computer'; tip = 'Use Data → Save quiz as… to also autosave to a file of your choice'; }
    chip.className = cls; chip.textContent = text; chip.title = tip;
  }
  Q.getSaveStatus().then(renderSaveChip);
  Q.onSaveChange((st) => { renderSaveChip(st); if (st.path && st.error && !renderSaveChip.warned) { renderSaveChip.warned = true; toast('Could not save to ' + baseName(st.path) + ': ' + st.error); } if (!st.error) renderSaveChip.warned = false; });

  $('saveas').onclick = async () => { closeMenu(); const r = await Q.saveAs(); if (r.ok) toast('Autosaving to ' + r.path, true); else if (!r.canceled) toast('Could not save: ' + r.error); };
  $('export').onclick = async () => { closeMenu(); const r = await Q.exportState(); if (r.ok) toast('Copy saved to ' + r.path, true); else if (!r.canceled) toast('Export failed: ' + r.error); };
  $('unlink').onclick = async () => { closeMenu(); await Q.unlinkSave(); toast('No longer autosaving to a file', true); };
  $('load').onclick = async () => {
    closeMenu();
    if (!(await confirmDialog('Loading a file replaces the current quiz (a backup of it is saved first). Afterwards, changes autosave back to the file you load.', 'Choose file…'))) return;
    const r = await Q.loadState();
    if (r.ok) toast(r.warning || (r.linked ? 'Quiz loaded – autosaving to that file' : 'Quiz loaded'), true);
    else if (!r.canceled) toast(r.error ? 'Could not load: ' + r.error : 'Nothing changed');
  };
  $('clear').onclick = async () => { closeMenu(); if (await confirmDialog('Clear ALL scores? Teams, rounds and questions stay. A backup is saved first.', 'Clear scores')) { await dispatch({ type: 'clearScores' }); toast('Scores cleared', true); } };
  $('reset').onclick = async () => { closeMenu(); if (await confirmDialog('Reset EVERYTHING (teams, scores, rounds, rules, questions, title)? A backup is saved first.', 'Reset everything')) { await dispatch({ type: 'resetAll' }); toast('Reset to a fresh quiz', true); } };

  document.addEventListener('keydown', (e) => {
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || !$('modal').hidden) return;
    if (e.key === 'ArrowRight' || (e.key === ' ' && tag !== 'BUTTON')) { e.preventDefault(); dispatch({ type: 'presentNext' }); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); dispatch({ type: 'presentPrev' }); }
  });

  Q.onChange((s) => { state = s; render(false); });
  Q.onBrandingChange((p) => { brand = p; render(false); });
  Q.onSettingsChange((v) => { fx = v; render(false); });
  Q.getSettings().then((v) => { fx = v; render(false); });
  Q.onAdminSection((name) => { if (BUILDERS[name]) go(name); });
  Q.getBranding().then((p) => { brand = p; render(false); });
  Q.getState().then((s) => { state = s; render(true); });
})();
