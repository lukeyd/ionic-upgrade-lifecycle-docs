// Split a capture's entries into phases using the `marker` entries injected by capture.mjs.
//   boot:    PHASE:boot    -> PHASE:forward
//   forward: PHASE:forward -> PHASE:back
//   back:    PHASE:back    -> PHASE:end
// `t` is rebased to the phase start (the marker's t). Each entry keeps its absolute index
// in the capture as `i` so tables can refer back to the raw log.

export const PHASE_NAMES = ['boot', 'forward', 'back'];
const NEXT = { boot: 'forward', forward: 'back', back: 'end' };

export function splitPhases(entries) {
  const phases = {};
  for (const name of PHASE_NAMES) phases[name] = { name, startT: 0, endT: null, entries: [] };

  let current = 'boot';
  let startT = 0;
  entries.forEach((raw, i) => {
    if (raw.source === 'marker') {
      const m = /^PHASE:(\w+)$/.exec(raw.hook || '');
      if (!m) return;
      const phase = m[1];
      if (phase === 'boot') { current = 'boot'; startT = raw.t || 0; phases.boot.startT = startT; return; }
      if (phases[current]) phases[current].endT = raw.t - startT;
      if (phase === 'end') { current = null; return; }
      current = NEXT[current] === phase || PHASE_NAMES.includes(phase) ? phase : current;
      startT = raw.t;
      if (phases[current]) phases[current].startT = startT;
      return;
    }
    if (!current || !phases[current]) return; // entries after PHASE:end are ignored
    const { t, ...rest } = raw;
    phases[current].entries.push({ ...rest, t: +(t - startT).toFixed(2), tAbs: t, i });
  });
  for (const p of Object.values(phases)) {
    if (p.endT == null && p.entries.length) p.endT = p.entries[p.entries.length - 1].t;
    p.durationMs = p.endT == null ? 0 : +p.endT.toFixed(1);
  }
  return phases;
}

/** Convenience: load a capture object and return { app, meta, phases }. */
export function phasesOf(capture) {
  return {
    app: capture.app,
    meta: { url: capture.url, userAgent: capture.userAgent, capturedAt: capture.capturedAt, total: capture.entries.length },
    phases: splitPhases(capture.entries),
  };
}
