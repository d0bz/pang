// Returns normalized IBAN, '' if empty, or null if invalid
export function normalizeIban(input: unknown): string | null {
  if (input === undefined || input === null) return '';
  const iban = String(input).replace(/\s+/g, '').toUpperCase();
  if (!iban) return '';
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/.test(iban)) return null;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let rem = 0;
  for (const ch of rearranged) {
    const v = ch >= 'A' ? String(ch.charCodeAt(0) - 55) : ch;
    for (const d of v) rem = (rem * 10 + Number(d)) % 97;
  }
  return rem === 1 ? iban : null;
}
