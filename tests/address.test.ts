import { isValidAddress, toChecksumAddress } from "../src/utils/address";
import { ADDR, lower, upper, BAD_CHECKSUM, NON_HEX } from "./helpers/fixtures";

describe("isValidAddress", () => {
  describe("accepts well-formed addresses", () => {
    it.each([
      ["canonical EIP-55 checksum", ADDR.USDC],
      ["all-lowercase (no checksum to verify)", lower(ADDR.USDC)],
      ["all-uppercase (no checksum to verify)", upper(ADDR.USDC)],
      ["the zero address", "0x" + "0".repeat(40)],
    ])("accepts %s", (_label, addr) => {
      expect(isValidAddress(addr)).toBe(true);
    });
  });

  describe("rejects malformed addresses", () => {
    it.each([
      ["a mixed-case address with an invalid EIP-55 checksum", BAD_CHECKSUM],
      ["a non-hex character in the body", NON_HEX],
      ["too short", "0xabc"],
      ["41 hex chars (one short)", "0x" + "a".repeat(39)],
      ["43 hex chars (one long)", "0x" + "a".repeat(41)],
      ["missing 0x prefix", "a".repeat(42)],
      ["empty string", ""],
      ["just the prefix", "0x"],
      ["leading whitespace", " " + ADDR.USDC],
    ])("rejects %s", (_label, addr) => {
      expect(isValidAddress(addr)).toBe(false);
    });

    it.each([
      ["null", null],
      ["undefined", undefined],
      ["a number", 0x1234],
      ["an object", { toString: () => ADDR.USDC }],
    ])("rejects non-string input: %s", (_label, value) => {
      // Callers are not always well-typed; the guard must hold at runtime.
      expect(isValidAddress(value as unknown as string)).toBe(false);
    });
  });

  it("is case-sensitive about the checksum, not just the characters", () => {
    // Same 40 hex nibbles, differing only by case: exactly one casing is the
    // valid EIP-55 form, so a pure lowercasing/uppercasing check is insufficient.
    expect(isValidAddress(ADDR.USDC)).toBe(true);
    expect(isValidAddress(BAD_CHECKSUM)).toBe(false);
  });
});

describe("toChecksumAddress", () => {
  it("derives the canonical EIP-55 form from a lowercase address", () => {
    expect(toChecksumAddress(lower(ADDR.USDC))).toBe(ADDR.USDC);
  });

  it("derives the canonical form from an uppercase address", () => {
    expect(toChecksumAddress(upper(ADDR.USDC))).toBe(ADDR.USDC);
  });

  it("is idempotent on already-checksummed input", () => {
    expect(toChecksumAddress(ADDR.USDC)).toBe(ADDR.USDC);
    expect(toChecksumAddress(toChecksumAddress(lower(ADDR.USDC)))).toBe(ADDR.USDC);
  });

  it("produces output that passes isValidAddress", () => {
    for (const addr of Object.values(ADDR)) {
      const checksummed = toChecksumAddress(lower(addr));
      expect(isValidAddress(checksummed)).toBe(true);
    }
  });

  it("checksums every known token address to its canonical form", () => {
    // Round-trips the real mainnet addresses, not just one happy-path example.
    for (const addr of Object.values(ADDR)) {
      expect(toChecksumAddress(lower(addr))).toBe(addr);
    }
  });

  it.each([
    ["garbage", "nope"],
    ["a non-hex body", NON_HEX],
    ["an invalid checksum", BAD_CHECKSUM],
    ["wrong length", "0xabc"],
  ])("throws on invalid input (%s)", (_label, addr) => {
    expect(() => toChecksumAddress(addr)).toThrow();
  });
});
