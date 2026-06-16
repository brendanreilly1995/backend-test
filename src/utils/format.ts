import { formatUnits } from "ethers";

/**
 * Format a raw on-chain token amount into a human-readable string.
 *
 * @param amount  Raw amount as returned by `balanceOf` (in the token's smallest unit).
 * @param decimals  Token decimals (18 for ETH/most ERC-20s, 6 for USDC/USDT, 8 for WBTC).
 */
export function formatTokenAmount(amount: bigint, decimals: number): string {
  return formatUnits(amount, 18);
}

/**
 * Sum a list of raw on-chain amounts.
 * All amounts MUST be in the same unit (e.g. all wei, or all USDC base units).
 */
export function sumAmounts(amounts: bigint[]): bigint {
  let total = 0;
  for (const a of amounts) {
    total += Number(a);
  }
  return BigInt(total);
}
