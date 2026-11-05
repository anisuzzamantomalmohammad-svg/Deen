// Feedback goes to a Google Form owned by Tamal's Gmail. Responses land in
// a private Google Sheet only he can see. The app posts the form itself, so
// people never leave Deen and don't need an account.
//
// To connect it: make a form with three short-answer/choice questions
// (Type, Message, App), open "Get pre-filled link", fill each with x, copy
// the link, and put its form id and the entry numbers below.
export const FEEDBACK_FORM = {
  id: '', // the long id in .../forms/d/e/<id>/viewform
  type: '', // entry.123... for "Suggestion" / "Problem"
  message: '', // entry for the message
  app: '', // entry for the app and Android version
};

export const feedbackReady = () => !!(FEEDBACK_FORM.id && FEEDBACK_FORM.message);

export async function sendFeedback({ type, message, app }) {
  const f = FEEDBACK_FORM;
  const body = [
    f.type ? `${f.type}=${encodeURIComponent(type)}` : null,
    `${f.message}=${encodeURIComponent(message)}`,
    f.app ? `${f.app}=${encodeURIComponent(app)}` : null,
  ].filter(Boolean).join('&');
  const res = await fetch(`https://docs.google.com/forms/d/e/${f.id}/formResponse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  // Google answers 200 with a thank-you page when it's accepted.
  if (!res.ok) throw new Error(`form-${res.status}`);
  return true;
}
