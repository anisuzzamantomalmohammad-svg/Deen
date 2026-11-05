// Cards under the arch on Home, which the user can hide and reorder
// (Settings › Home screen). Only the arch stays fixed at the top. Ramadan
// has its own order (Ramadan things first); the normal order comes back
// after Eid.
export const HOME_CARDS = {
  safar: 'Safar (travelling)',
  fasting: 'Seheri & Iftar',
  prayers: 'Prayer times',
  extraTimes: 'Duha, Midnight, Tahajjud',
  today: 'Today card',
  kahf: 'Surah Al-Kahf on Fridays',
  special: 'Special days',
  nameOfDay: 'Name of the day',
  secondCity: 'Second city',
  prohibited: 'Prohibited times',
  comingUp: 'Coming up',
  sunnah: 'Sunnah of the day',
};

export const NORMAL_ORDER = ['safar', 'fasting', 'prayers', 'extraTimes', 'today', 'kahf', 'special', 'nameOfDay', 'secondCity', 'prohibited', 'comingUp', 'sunnah'];
export const RAMADAN_ORDER = ['safar', 'fasting', 'today', 'prayers', 'extraTimes', 'special', 'kahf', 'nameOfDay', 'comingUp', 'secondCity', 'prohibited', 'sunnah'];

// Saved order + any cards added since (put where they sit by default).
export function homeCardOrder(saved, ramadan = false) {
  const def = ramadan ? RAMADAN_ORDER : NORMAL_ORDER;
  const list = (saved || []).filter((c) => HOME_CARDS[c.id]).map((c) => ({ id: c.id, hidden: !!c.hidden }));
  def.forEach((id, i) => {
    if (list.find((c) => c.id === id)) return;
    // after the card that comes before it by default
    let at = 0;
    for (let k = i - 1; k >= 0; k--) {
      const j = list.findIndex((c) => c.id === def[k]);
      if (j >= 0) { at = j + 1; break; }
    }
    list.splice(at, 0, { id, hidden: false });
  });
  return list;
}
