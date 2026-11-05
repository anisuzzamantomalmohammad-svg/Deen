// The app's "now". Normally the real time; "Preview a day" (Settings › About)
// moves it to another moment so the whole app acts as that day. Nothing is
// saved, synced or scheduled while previewing.
let offset = 0;
export const setClockOffset = (ms) => { offset = ms || 0; };
export const clockOffset = () => offset;
export const nowMs = () => Date.now() + offset;
export const nowDate = () => new Date(Date.now() + offset);
