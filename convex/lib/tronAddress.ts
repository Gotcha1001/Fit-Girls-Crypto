// convex/lib/tronAddress.ts
//
// A TRON (TRC-20) address is base58check: 25 bytes = 0x41 + 20 byte hash + 4 byte checksum.
// A typo almost always fails the checksum, which protects the girl from losing money.

const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function base58Decode(s: string): Uint8Array | null {
  let n = BigInt(0);
  for (const ch of s) {
    const i = ALPHABET.indexOf(ch);
    if (i < 0) return null;
    n = n * BigInt(58) + BigInt(i);
  }
  const bytes: number[] = [];
  while (n > BigInt(0)) {
    bytes.unshift(Number(n % BigInt(256)));
    n = n / BigInt(256);
  }
  for (const ch of s) {
    if (ch === "1") bytes.unshift(0);
    else break;
  }
  return Uint8Array.from(bytes);
}

export async function isValidTronAddress(address: string): Promise<boolean> {
  if (!/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address)) return false;
  const raw = base58Decode(address);
  if (!raw || raw.length !== 25 || raw[0] !== 0x41) return false;
  const payload = raw.slice(0, 21);
  const checksum = raw.slice(21);
  const h1 = await crypto.subtle.digest("SHA-256", payload);
  const h2 = new Uint8Array(await crypto.subtle.digest("SHA-256", h1));
  return checksum.every((b, i) => b === h2[i]);
}
