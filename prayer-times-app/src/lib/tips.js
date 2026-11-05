// Reason tips: if the same reason made a prayer late 3 or more times in a
// month, suggest one of Deen's own alert settings that could help. Only
// existing settings are suggested; "Other" gets no tip.
export function reasonTips({ reasonsBy, data, monthKey }) {
  const out = [];
  Object.entries(reasonsBy || {}).forEach(([name, rs]) => {
    Object.entries(rs).forEach(([reason, n]) => {
      if (n < 3 || reason === 'other' || reason === 'none') return;
      const id = `${monthKey}|${name}|${reason}`;
      if ((data.tipsHidden || {})[id]) return;
      const nudgeOn = !!(data.nudgeOn || {})[name];
      const preOn = !!data.preReminderMins && !(data.preOff || {})[name];
      if (reason === 'sleep') {
        if (!nudgeOn) out.push({ id, name, reason, n, text: 'Turn on the "Did you pray?" check for {name}, 30 minutes before its time ends?', action: 'Turn on', patch: (p) => ({ nudgeOn: { ...(p.nudgeOn || {}), [name]: true } }) });
        else if (!preOn) out.push({ id, name, reason, n, text: 'Turn on the reminder before {name} as well?', action: 'Turn on', patch: (p) => ({ preOff: { ...(p.preOff || {}), [name]: false }, preReminderMins: p.preReminderMins || 10 }) });
      } else if (reason === 'job') {
        if (!preOn) out.push({ id, name, reason, n, text: 'Get a reminder before {name}, so you can plan a short break?', action: 'Turn on', patch: (p) => ({ preOff: { ...(p.preOff || {}), [name]: false }, preReminderMins: p.preReminderMins || 10 }) });
        else if (!nudgeOn) out.push({ id, name, reason, n, text: 'Turn on the "Did you pray?" check for {name}, so you\'re reminded before it ends?', action: 'Turn on', patch: (p) => ({ nudgeOn: { ...(p.nudgeOn || {}), [name]: true } }) });
      } else if (reason === 'class') {
        out.push({ id, name, reason, n, text: '{name} lasts until the next prayer. Praying between classes may work, even late in its time.', action: null });
      }
    });
  });
  return out.slice(0, 2);
}
