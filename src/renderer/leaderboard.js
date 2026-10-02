(function () {
  const Q = window.quiz, L = window.QuizLogic, A = window.Anim;
  const ROUND_COLOURS = ['var(--accent-1)', 'var(--accent-2)', 'var(--accent-3)', 'var(--accent-4)', '#54a0ff', '#ff9f43', '#f368e0', '#7bed9f'];
  const $ = (id) => document.getElementById(id);
  const rowEls = new Map(); // teamId -> { el, refs }
  let state = null, prev = null;
  let statWindow = 0, lastQ = null, lastRulesVisible = null, lastStepKey = null, lastReveal = false;

  function el(tag, cls, text) { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  const roundColour = (state, roundId) => ROUND_COLOURS[state.rounds.findIndex((r) => r.id === roundId) % ROUND_COLOURS.length];
  const compact = () => $('stage').classList.contains('with-q');

  // ---- board ---------------------------------------------------------------------
  function layoutRows() {
    const box = $('rows');
    const n = Math.max(state.teams.length, 1);
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const rowH = Math.max(rem * 1.6, Math.min(rem * 5.6, box.clientHeight / n));
    box.style.setProperty('--rowh', rowH + 'px');
    return rowH;
  }

  function makeRow(team) {
    const row = el('div', 'row');
    const rank = el('div', 'rank');
    const who = el('div', 'who');
    const dot = el('i', 'dot'), crown = el('span', 'crown', '👑'), nm = el('span', 'nm'), spoon = el('span', 'spoon', '🥄');
    who.append(dot, crown, nm, spoon);
    const track = el('div', 'track'), bar = el('div', 'bar');
    track.append(bar);
    const num = el('div', 'numcol'), total = el('span', 'total', '0'), delta = el('span', 'delta');
    num.append(total, delta);
    row.append(rank, who, track, num);
    $('rows').append(row);
    return { el: row, refs: { rank, dot, nm, bar, total, delta, segs: new Map() } };
  }

  function renderBoard(st, spoonTeam) {
    const box = $('rows');
    const rowH = layoutRows();
    const maxTotal = Math.max(1, ...st.map((e) => e.total));
    const empty = box.querySelector('.empty');
    if (!state.teams.length) {
      if (!empty) { const e = el('div', 'empty'); e.append(el('span', null, '🍻'), document.createTextNode('Waiting for teams to join…')); box.append(e); }
    } else if (empty) empty.remove();

    const seen = new Set();
    st.forEach((e, i) => {
      seen.add(e.team.id);
      let r = rowEls.get(e.team.id);
      if (!r) { r = makeRow(e.team); rowEls.set(e.team.id, r); r.el.style.transform = `translateY(${state.teams.length * rowH}px)`; void r.el.offsetWidth; }
      const { el: row, refs } = r;
      row.style.transform = `translateY(${i * rowH}px)`;
      row.style.zIndex = String(100 - i);
      row.className = 'row' + (e.rank <= 3 ? ' r' + e.rank : '') + (e.rank === 1 && e.total > 0 ? ' leader' : '') + (spoonTeam && spoonTeam.id === e.team.id ? ' spoon' : '') + (row.classList.contains('pulse') ? ' pulse' : '');
      refs.rank.textContent = e.rank;
      refs.dot.style.background = e.team.colour;
      refs.nm.textContent = e.team.name;
      A.countTo(refs.total, e.total);
      refs.delta.textContent = e.delta > 0 ? '▲' + e.delta : e.delta < 0 ? '▼' + -e.delta : '';
      refs.delta.className = 'delta ' + (e.delta > 0 ? 'up' : e.delta < 0 ? 'down' : '');
      refs.bar.style.width = (e.total / maxTotal * 100) + '%';
      // Stacked per-round segments, keyed so widths animate.
      const keep = new Set();
      for (const rd of state.rounds) {
        const v = e.scores[rd.id];
        if (!(v > 0)) continue;
        keep.add(rd.id);
        let seg = refs.segs.get(rd.id);
        if (!seg) { seg = el('div', 'seg'); refs.segs.set(rd.id, seg); }
        seg.style.background = roundColour(state, rd.id);
        seg.style.width = (v / e.total * 100) + '%';
        seg.textContent = v / e.total > 0.07 ? A.fmt(v) : '';
        seg.title = `${rd.name}: ${A.fmt(v)}`;
      }
      for (const [id, seg] of refs.segs) if (!keep.has(id)) { seg.remove(); refs.segs.delete(id); }
      // Keep DOM order = round order.
      for (const rd of state.rounds) { const seg = refs.segs.get(rd.id); if (seg) refs.bar.append(seg); }
    });
    for (const [id, r] of rowEls) if (!seen.has(id)) { r.el.remove(); rowEls.delete(id); }
  }

  function renderLegend() {
    const lg = $('legend');
    lg.replaceChildren(...state.rounds.map((r) => {
      const s = el('span', 'lg'); const i = el('i'); i.style.background = roundColour(state, r.id);
      s.append(i, document.createTextNode(r.name)); return s;
    }));
  }

  // ---- stats ---------------------------------------------------------------------
  function statCards() {
    const S = L.stats(state), st = L.standings(state);
    const cards = [];
    const card = (icon, title, big, sub, list) => ({ icon, title, big, sub, list });
    if (!S.roundWinners.length) {
      return [card('🥁', 'Waiting for scores', 'Drumroll…', 'Stats appear once the first round is scored')];
    }
    cards.push(card('🏅', 'Round winners', null, null, S.roundWinners.slice(compact() ? -2 : -3).map((w) => `${w.round.name}: ${w.teams.map((t) => t.name).join(' & ')} (${A.fmt(w.score)})`)));
    cards.push(S.biggestClimber
      ? card('🚀', 'Biggest climber', S.biggestClimber.team.name, `up ${S.biggestClimber.delta} place${S.biggestClimber.delta > 1 ? 's' : ''} last round`)
      : card('🚀', 'Biggest climber', 'No movers yet', 'Positions are holding steady'));
    cards.push(card('🔥', 'Lead changes', String(S.leadChanges), S.leadChanges === 0 ? 'Same team on top the whole way' : S.leadChanges === 1 ? 'The crown has changed hands once' : 'The crown keeps moving!'));
    if (S.gap !== null) cards.push(card('📏', 'Gap at the top', S.gap === 0 ? 'Dead heat!' : `${A.fmt(S.gap)} pt${S.gap === 1 ? '' : 's'}`, `${st[0].team.name} vs ${st[1].team.name}`));
    if (S.woodenSpoon) cards.push(card('🥄', 'Wooden spoon', S.woodenSpoon.name, 'Bottom of the table – plenty of time to climb!'));
    const bw = S.bestWorst.slice().sort((a, b) => b.best.score - a.best.score);
    if (bw.length) {
      cards.push(card('💪', 'Best rounds', null, null, bw.slice(0, compact() ? 2 : 3).map((b) => `${b.team.name}: ${b.best.round.name} (${A.fmt(b.best.score)})`)));
      cards.push(card('😬', 'Toughest rounds', null, null, bw.slice().sort((a, b) => a.worst.score - b.worst.score).slice(0, compact() ? 2 : 3).map((b) => `${b.team.name}: ${b.worst.round.name} (${A.fmt(b.worst.score)})`)));
    }
    return cards;
  }
  function renderStats(animate) {
    const cards = statCards();
    const per = compact() ? 1 : 3;
    const start = (statWindow * per) % Math.max(cards.length, 1);
    const shown = [];
    for (let i = 0; i < Math.min(per, cards.length); i++) shown.push(cards[(start + i) % cards.length]);
    $('stats').replaceChildren(...shown.map((c, i) => {
      const d = el('div', 'scard'); if (animate) d.style.animationDelay = i * 0.12 + 's'; else d.style.animation = 'none';
      d.append(el('h3', null, `${c.icon} ${c.title}`));
      if (c.big) d.append(el('div', 'big', c.big));
      if (c.sub) d.append(el('div', 'sub', c.sub));
      if (c.list) { const ul = el('ul'); for (const t of c.list) ul.append(el('li', null, t)); d.append(ul); }
      return d;
    }));
  }
  setInterval(() => { if (state) { statWindow++; renderStats(true); } }, 9000);

  // ---- questions + rules ----------------------------------------------------------
  function renderQuestion() {
    const cur = L.currentQuestion(state);
    const stage = $('stage'), panel = $('qpanel');
    stage.classList.toggle('with-q', !!cur);
    if (cur) {
      const key = `${cur.step.roundId}:${cur.step.qIndex}`;
      if (key !== lastStepKey) {
        lastStepKey = key;
        lastQ = cur;
        const inner = $('qinner');
        inner.replaceChildren(el('div', 'qround', `${cur.round.name} · Question ${cur.step.qIndex + 1}`), el('div', 'qtext', cur.question.text || '…'));
        const opts = el('div', 'qopts');
        cur.question.options.forEach((o, i) => {
          const d = el('div', 'opt'); d.style.setProperty('--i', i);
          d.append(el('span', 'letter', 'ABCD'[i]), el('span', null, o || '—'));
          if (cur.question.correct === i) d.classList.add('correct');
          opts.append(d);
        });
        inner.append(opts);
        panel.classList.remove('show-opts', 'reveal');
        void panel.offsetWidth;
      }
      const showOpts = cur.step.type === 'options';
      requestAnimationFrame(() => panel.classList.toggle('show-opts', showOpts));
      const reveal = showOpts && state.presentation.revealAnswer;
      panel.classList.toggle('reveal', reveal);
      if (reveal && !lastReveal) playReveal();
      lastReveal = reveal;
    } else {
      lastStepKey = null; lastReveal = false;
      panel.classList.remove('show-opts', 'reveal');
    }
    // Compact mode changes how many stat cards fit.
    renderStats(false);
  }

  function renderRules() {
    const rules = $('rules'), vis = state.rules.visible;
    $('rules-title').textContent = state.title;
    if (vis && lastRulesVisible !== true) {
      const ol = $('rules-list'); ol.replaceChildren();
      state.rules.items.forEach((t, i) => { const li = el('li', null, t); li.style.setProperty('--i', i); ol.append(li); });
    }
    rules.classList.toggle('on', vis);
    lastRulesVisible = vis;
  }

  // ---- events ---------------------------------------------------------------------
  let bannerTimer;
  function banner(text) {
    const b = $('banner'); b.textContent = text; b.classList.remove('on'); void b.offsetWidth; b.classList.add('on');
    clearTimeout(bannerTimer);
  }
  // Each play* returns true when it showed anything, so a switched-off celebration doesn't suppress the next one.
  function playLeadChange(name) {
    let shown = false;
    if (Effects.on('celebrate.leadChange.confetti')) { window.Confetti.celebrate(); shown = true; }
    if (Effects.on('celebrate.leadChange.banner')) { banner(`👑 ${name} take the lead!`); shown = true; }
    return shown;
  }
  function playRoundComplete(roundName) {
    let shown = false;
    if (Effects.on('celebrate.roundComplete.confetti')) { window.Confetti.burst({ x: .5, y: .3, count: 160 }); shown = true; }
    if (Effects.on('celebrate.roundComplete.banner')) { banner(`✅ ${roundName} complete!`); shown = true; }
    if (Effects.on('celebrate.roundComplete.chipPop')) { const ch = $('after'); ch.classList.remove('pop'); void ch.offsetWidth; ch.classList.add('pop'); shown = true; }
    return shown;
  }
  function playReveal() {
    if (!Effects.on('celebrate.reveal.confetti')) return false;
    window.Confetti.burst({ x: 0.83, y: 0.55, count: 70, spread: Math.PI * 2, power: .8 });
    return true;
  }
  function scorePulse(r, diff) {
    if (Effects.on('scores.pulse')) {
      r.el.classList.remove('pulse'); void r.el.offsetWidth; r.el.classList.add('pulse');
      setTimeout(() => r.el.classList.remove('pulse'), 1300);
    }
    if (Effects.on('scores.plusChip')) {
      const chip = el('div', 'chipplus', (diff > 0 ? '+' : '') + A.fmt(diff));
      r.el.append(chip); setTimeout(() => chip.remove(), 1900);
    }
  }

  function detectEvents(a, b) {
    const sa = L.standings(a), sb = L.standings(b);
    const before = new Map(sa.map((e) => [e.team.id, e.total]));
    for (const e of sb) {
      if (!before.has(e.team.id)) continue;
      const diff = e.total - before.get(e.team.id);
      const r = rowEls.get(e.team.id);
      if (!diff || !r) continue;
      scorePulse(r, diff);
    }
    const leadA = sa.length && sa[0].total > 0 && sa[0].rank === 1 && (sa.length < 2 || sa[1].rank !== 1) ? sa[0].team.id : null;
    const leadB = sb.length && sb[0].total > 0 && sb[0].rank === 1 && (sb.length < 2 || sb[1].rank !== 1) ? sb[0].team : null;
    if (leadA && leadB && leadB.id !== leadA && playLeadChange(leadB.name)) return;
    const done = (s, r) => s.teams.length > 0 && s.teams.every((t) => t.scores[r.id] !== undefined);
    for (const r of b.rounds) {
      const old = a.rounds.find((x) => x.id === r.id);
      if (old && !done(a, old) && done(b, r)) { playRoundComplete(r.name); break; }
    }
  }

  // Admin's "Preview" buttons: play a celebration with the current settings.
  Q.onEffectPreview((kind) => {
    if (!state) return;
    if (kind === 'leadChange') playLeadChange((L.standings(state)[0] || { team: { name: 'Your team' } }).team.name);
    else if (kind === 'roundComplete') { const sc = L.scoredRounds(state); playRoundComplete(sc.length ? sc[sc.length - 1].name : state.rounds[0].name); }
    else if (kind === 'reveal') {
      playReveal();
      const panel = $('qpanel');
      if (compact()) { panel.classList.add('show-opts', 'reveal'); setTimeout(() => { if (!state.presentation.revealAnswer) panel.classList.remove('reveal'); }, 3000); }
    }
  });

  // ---- main render ------------------------------------------------------------------
  function render() {
    $('title').textContent = state.title;
    const scored = L.scoredRounds(state);
    $('after').textContent = scored.length ? `After ${scored[scored.length - 1].name}` : 'Let the games begin!';
    const st = L.standings(state);
    renderBoard(st, L.stats(state).woodenSpoon);
    renderLegend();
    renderQuestion();
    renderRules();
  }

  function apply(next) {
    prev = state; state = next;
    if (!prev) { render(); renderStats(false); return; }
    // Rules/question changes should not trigger score effects; detectEvents only reacts to score diffs.
    render();
    detectEvents(prev, state);
  }

  // The board needs re-layout when its box changes (window resize, question panel sliding in).
  new ResizeObserver(() => { if (state) renderBoard(L.standings(state), L.stats(state).woodenSpoon); }).observe($('rows'));

  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') { e.preventDefault(); Q.dispatch({ type: 'presentNext' }); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); Q.dispatch({ type: 'presentPrev' }); }
  });

  Q.onChange(apply);
  Q.getState().then(apply);
})();
