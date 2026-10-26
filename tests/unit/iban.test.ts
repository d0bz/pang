import { describe, it, expect } from 'vitest';
import { normalizeIban } from '@/lib/iban';

describe('normalizeIban', () => {
  it('normalizes valid IBANs (spaces, lowercase)', () => {
    expect(normalizeIban('GB82WEST12345698765432')).toBe('GB82WEST12345698765432');
    expect(normalizeIban('gb82 west 1234 5698 7654 32')).toBe('GB82WEST12345698765432');
    expect(normalizeIban('DE89 3704 0044 0532 0130 00')).toBe('DE89370400440532013000');
    expect(normalizeIban('EE382200221020145685')).toBe('EE382200221020145685');
  });
  it.each([undefined, null, '', '   '])('returns empty string for %j', (v) => {
    expect(normalizeIban(v)).toBe('');
  });
  it.each([
    'GB82WEST12345698765433', // bad checksum
    'GB82WEST1234569876543!', // bad char
    'GB82', // too short
    '1234567890123456', // no country
    'XX00' + 'A'.repeat(40), // too long
    'garbage',
  ])('returns null for invalid %s', (v) => {
    expect(normalizeIban(v)).toBeNull();
  });
});
