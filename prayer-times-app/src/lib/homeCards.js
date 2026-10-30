// Cards under the arch and the five prayers on Home, which the user can hide
// and reorder (Settings › Home screen). The arch and prayers always stay.
export const HOME_CARDS = {
  fasting: 'Seheri & Iftar',
  extraTimes: 'Duha, Isha ends, Tahajjud',
  secondCity: 'Second city',
  prohibited: 'Prohibited times',
  comingUp: 'Coming up',
  sunnah: 'Sunnah of the day',
};

export function homeCardOrder(saved) {
  const ids = Object.keys(HOME_CARDS);
  const list = (saved || []).filter((c) => ids.includes(c.id));
  ids.forEach((id) => { if (!list.find((c) => c.id === id)) list.push({ id, hidden: false }); });
  // The Seheri & Iftar card always sits above the prayers, so it stays first.
  return [...list.filter((c) => c.id === 'fasting'), ...list.filter((c) => c.id !== 'fasting')];
}
