const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** Short, collision-resistant ids (12 chars ≈ 71 bits of entropy). */
export function uid(size = 12): string {
  const bytes = crypto.getRandomValues(new Uint8Array(size));
  let id = '';
  for (let i = 0; i < size; i++) id += ALPHABET[bytes[i] % ALPHABET.length];
  return id;
}
