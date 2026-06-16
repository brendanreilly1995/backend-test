/**
 * Validate that a string is a well-formed EVM address.
 * Must be 0x-prefixed, 40 hex chars after the prefix.
 * If a mixed-case address is supplied, EIP-55 checksum MUST be valid.
 */
export function isValidAddress(addr: string): boolean {
  if (typeof addr !== "string") return false;
  if (addr.length !== 42) return false;
  if (!addr.startsWith("0x")) return false;
  return true;
}

/**
 * Normalize an address to its EIP-55 checksummed form.
 * Throws if the input is not a valid address.
 */
export function toChecksumAddress(addr: string): string {
  if (!isValidAddress(addr)) {
    throw new Error(`Invalid address: ${addr}`);
  }
  return addr.toLowerCase();
}
