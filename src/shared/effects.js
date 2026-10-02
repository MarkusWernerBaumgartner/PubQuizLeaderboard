// Pure model for the optional animations, celebrations and popups ("effects").
// UMD so it loads in Node (main process, tests) and in renderers via <script>.
// Errors and confirmation dialogs are deliberately NOT switchable: they protect data and report failures.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.QuizEffects = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const GROUPS = [
    { id: 'celebrations', label: 'Celebrations', blurb: 'Big moments on the leaderboard' },
    { id: 'scores', label: 'Score updates', blurb: 'What happens when a score changes' },
    { id: 'screens', label: 'Screens & transitions', blurb: 'Rules, questions and stats' },
    { id: 'ambient', label: 'Ambient decoration', blurb: 'Always-on background motion' },
    { id: 'admin', label: 'Admin window', blurb: 'The control panel on your laptop' },
  ];

  const FLAGS = [
    { key: 'celebrate.leadChange.confetti', group: 'celebrations', label: 'New leader: confetti', hint: 'Cannons and a burst when a team takes first place' },
    { key: 'celebrate.leadChange.banner', group: 'celebrations', label: 'New leader: banner', hint: '"👑 Team take the lead!" pop-up' },
    { key: 'celebrate.roundComplete.confetti', group: 'celebrations', label: 'Round complete: confetti', hint: 'Burst when every team has a score for a round' },
    { key: 'celebrate.roundComplete.banner', group: 'celebrations', label: 'Round complete: banner', hint: '"✅ Round complete!" pop-up' },
    { key: 'celebrate.roundComplete.chipPop', group: 'celebrations', label: 'Round complete: "After Round N" pop', hint: 'The round chip bounces in' },
    { key: 'celebrate.reveal.confetti', group: 'celebrations', label: 'Answer reveal: confetti', hint: 'Burst over the correct answer' },
    { key: 'celebrate.reveal.highlight', group: 'celebrations', label: 'Answer reveal: pop animation', hint: 'The correct option bounces (it still turns green)' },
    { key: 'celebrate.adjustment.banner', group: 'celebrations', label: 'Penalty / bonus: banner', hint: 'Announces who got points and why' },
    { key: 'celebrate.adjustment.shake', group: 'celebrations', label: 'Penalty: screen shake', hint: 'The scoreboard shakes when a team is penalised' },
    { key: 'celebrate.adjustment.confetti', group: 'celebrations', label: 'Bonus: confetti', hint: 'Burst when a team is given bonus points' },

    { key: 'scores.pulse', group: 'scores', label: 'Pulse the changed team', hint: 'Total flashes and the bar glows' },
    { key: 'scores.plusChip', group: 'scores', label: 'Floating "+N" points', hint: 'Points float up from the team row' },
    { key: 'scores.countUp', group: 'scores', label: 'Count-up numbers', hint: 'Totals tick up instead of jumping' },
    { key: 'scores.reorder', group: 'scores', label: 'Sliding re-order', hint: 'Teams slide to their new places' },
    { key: 'scores.barGrow', group: 'scores', label: 'Growing bars', hint: 'Bars and round segments animate their width' },

    { key: 'screens.rulesStagger', group: 'screens', label: 'Rules appear one by one', hint: 'Each rule slides in; off shows them all at once' },
    { key: 'screens.questionSlide', group: 'screens', label: 'Question panel slides in', hint: 'Panel, question and options animate in' },
    { key: 'screens.statsAnimate', group: 'screens', label: 'Stats cards animate', hint: 'Cards pop in as they rotate' },
    { key: 'screens.launcherIntro', group: 'screens', label: 'Launcher intro', hint: 'Logo and buttons pop in on start' },

    { key: 'ambient.background', group: 'ambient', label: 'Drifting background shapes', hint: 'On every screen' },
    { key: 'ambient.crestWobble', group: 'ambient', label: 'Wobbling crest', hint: 'Launcher and leaderboard header' },
    { key: 'ambient.crownBob', group: 'ambient', label: 'Bobbing leader crown', hint: 'The 👑 next to the leader' },
    { key: 'ambient.emptyBob', group: 'ambient', label: 'Bobbing "waiting for teams" icon', hint: 'Shown before any team is added' },

    { key: 'admin.uiMotion', group: 'admin', label: 'Interface motion', hint: 'Tab fade-in, dialog rise, input shake, blinking LIVE dot' },
    { key: 'admin.successToasts', group: 'admin', label: 'Success messages', hint: 'e.g. "Quiz loaded". Errors are always shown' },
  ];

  const PREVIEWS = [
    { kind: 'leadChange', label: 'New leader' },
    { kind: 'roundComplete', label: 'Round complete' },
    { kind: 'reveal', label: 'Answer reveal' },
  ];

  const AMOUNTS = { low: 0.4, normal: 1, lots: 2 };

  const only = (...keys) => Object.fromEntries(FLAGS.map((f) => [f.key, keys.includes(f.key)]));
  const except = (...keys) => Object.fromEntries(FLAGS.map((f) => [f.key, !keys.includes(f.key)]));

  const PRESETS = {
    party: { label: '🎉 Party', confettiAmount: 'normal', flags: except() },
    calm: {
      label: '🌿 Calm', confettiAmount: 'low',
      flags: except('celebrate.leadChange.confetti', 'celebrate.leadChange.banner', 'celebrate.roundComplete.confetti', 'celebrate.roundComplete.banner',
        'celebrate.roundComplete.chipPop', 'celebrate.reveal.confetti', 'celebrate.adjustment.shake', 'celebrate.adjustment.confetti', 'scores.pulse', 'scores.plusChip',
        'ambient.background', 'ambient.crestWobble', 'ambient.crownBob', 'ambient.emptyBob'),
    },
    minimal: { label: '➖ Minimal', confettiAmount: 'low', flags: only('celebrate.adjustment.banner', 'scores.countUp', 'scores.reorder', 'scores.barGrow', 'screens.questionSlide', 'admin.successToasts') },
    off: { label: '⏹ Off', confettiAmount: 'low', flags: only() },
  };

  const kebab = (key) => key.replace(/\./g, '-').replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();

  function derivePreset(flags, confettiAmount) {
    for (const [name, p] of Object.entries(PRESETS)) {
      if (p.confettiAmount === confettiAmount && FLAGS.every((f) => p.flags[f.key] === flags[f.key])) return name;
    }
    return 'custom';
  }

  function build(flags, confettiAmount, follow) {
    return { version: 1, preset: derivePreset(flags, confettiAmount), followSystemReducedMotion: follow, confettiAmount, flags };
  }

  function defaultEffects() { return build({ ...PRESETS.party.flags }, PRESETS.party.confettiAmount, true); }

  // Accepts anything (from disk, IPC, a preset file); always returns a complete, valid object.
  function normalizeEffects(obj) {
    const d = defaultEffects();
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return d;
    const src = obj.flags && typeof obj.flags === 'object' ? obj.flags : {};
    const flags = {};
    for (const f of FLAGS) flags[f.key] = typeof src[f.key] === 'boolean' ? src[f.key] : d.flags[f.key];
    const amount = Object.prototype.hasOwnProperty.call(AMOUNTS, obj.confettiAmount) ? obj.confettiAmount : d.confettiAmount;
    const follow = typeof obj.followSystemReducedMotion === 'boolean' ? obj.followSystemReducedMotion : d.followSystemReducedMotion;
    return build(flags, amount, follow);
  }

  function patchEffects(current, patch) {
    const cur = normalizeEffects(current);
    const p = patch && typeof patch === 'object' ? patch : {};
    return normalizeEffects({
      flags: { ...cur.flags, ...(p.flags && typeof p.flags === 'object' ? p.flags : {}) },
      confettiAmount: p.confettiAmount !== undefined ? p.confettiAmount : cur.confettiAmount,
      followSystemReducedMotion: p.followSystemReducedMotion !== undefined ? p.followSystemReducedMotion : cur.followSystemReducedMotion,
    });
  }

  function applyPreset(current, name) {
    const cur = normalizeEffects(current);
    const p = PRESETS[name];
    if (!p) return cur;
    return build({ ...p.flags }, p.confettiAmount, cur.followSystemReducedMotion);
  }

  // What the renderer actually uses: the OS "reduce motion" request overrides to Minimal when followed.
  function resolveEffects(settings, env = {}) {
    const s = normalizeEffects(settings);
    if (s.followSystemReducedMotion && env.systemReducedMotion) return { flags: { ...PRESETS.minimal.flags }, confettiAmount: PRESETS.minimal.confettiAmount };
    return { flags: { ...s.flags }, confettiAmount: s.confettiAmount };
  }

  const htmlClasses = (resolved) => FLAGS.filter((f) => !resolved.flags[f.key]).map((f) => `fx-off-${kebab(f.key)}`);
  const confettiScale = (resolved) => AMOUNTS[resolved.confettiAmount] || 1;

  return { GROUPS, FLAGS, PREVIEWS, PRESETS, AMOUNTS, defaultEffects, normalizeEffects, patchEffects, applyPreset, resolveEffects, htmlClasses, confettiScale };
});
