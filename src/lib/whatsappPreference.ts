/**
 * WhatsApp account preference + universal open helper.
 *
 * Users can have WhatsApp (personal) and/or WhatsApp Business installed.
 * On first tap we ask which one to use, with a "Remember my decision" checkbox.
 * The chosen preference is stored in localStorage and used silently next time.
 *
 * To open WhatsApp anywhere in the app, call `requestOpenWhatsApp(phone, message?)`.
 */

export type WhatsAppApp = 'whatsapp' | 'whatsapp_business' | 'ask';

const STORAGE_KEY = 'enarsia.whatsapp_preference';

export function getWhatsAppPreference(): WhatsAppApp {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'whatsapp' || v === 'whatsapp_business' || v === 'ask') return v;
  } catch {}
  return 'ask';
}

export function setWhatsAppPreference(pref: WhatsAppApp): void {
  try {
    localStorage.setItem(STORAGE_KEY, pref);
    // Notify listeners (e.g. profile settings UI) so they re-render.
    window.dispatchEvent(new CustomEvent('enarsia:whatsapp-pref-changed', { detail: pref }));
  } catch {}
}

export function clearWhatsAppPreference(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('enarsia:whatsapp-pref-changed', { detail: 'ask' }));
  } catch {}
}

/** Normalize Indian-default phone — strip +/space/dash, auto-prefix 91 if 10 digits. */
export function normalizePhone(phone: string): string {
  let n = (phone || '').replace(/[\s\-+]/g, '');
  if (n.length === 10) n = '91' + n;
  return n;
}

function isAndroid(): boolean {
  return /Android/i.test(navigator.userAgent);
}

/** Build the URL for a specific WhatsApp app. */
export function buildAppLink(app: 'whatsapp' | 'whatsapp_business', phone: string, message?: string): string {
  const n = normalizePhone(phone);
  const text = message ? encodeURIComponent(message) : '';
  const qs = text ? `?text=${text}` : '';

  if (app === 'whatsapp_business' && isAndroid()) {
    // Android intent URI — forces the Business app package.
    const params = [`phone=${n}`, text && `text=${text}`].filter(Boolean).join('&');
    return `intent://send?${params}#Intent;scheme=whatsapp;package=com.whatsapp.w4b;end`;
  }

  // Personal WhatsApp, or Business on iOS (no separate scheme exists on iOS).
  return `whatsapp://send?phone=${n}${qs ? '&text=' + text : ''}`;
}

/** Actually open WhatsApp using the selected app. */
export function openWhatsAppWith(
  app: 'whatsapp' | 'whatsapp_business',
  phone: string,
  message?: string
): void {
  const url = buildAppLink(app, phone, message);
  window.location.href = url;
}

/**
 * Request to open WhatsApp. If a preference is saved, opens immediately.
 * Otherwise dispatches an event picked up by <WhatsAppChoiceProvider /> which
 * shows the chooser modal.
 */
export function requestOpenWhatsApp(phone: string, message?: string): void {
  const pref = getWhatsAppPreference();
  if (pref === 'whatsapp' || pref === 'whatsapp_business') {
    openWhatsAppWith(pref, phone, message);
    return;
  }
  window.dispatchEvent(
    new CustomEvent('enarsia:whatsapp-open-request', { detail: { phone, message } })
  );
}
