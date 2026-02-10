/**
 * Build a WhatsApp click-to-chat link.
 * Normalizes the phone number and optionally appends a pre-filled message.
 */
export function buildWhatsAppLink(phone: string, message?: string): string {
  // Normalize phone: strip +, spaces, dashes
  let normalized = phone.replace(/[\s\-+]/g, '');
  // Auto-add 91 if it looks like a 10-digit Indian number
  if (normalized.length === 10) normalized = '91' + normalized;

  let url = `https://wa.me/${encodeURIComponent(normalized)}`;
  if (message) url += `?text=${encodeURIComponent(message)}`;
  return url;
}
