import { formatTokenAmount, sumAmounts } from "../utils/format";
import { getTokenMeta } from "./token.service";

export interface Holding {
  symbol: string;
  /** Raw on-chain amount in the token's smallest unit. */
  amount: bigint;
}

export interface PortfolioValue {
  /** USD value, as a fixed-point string with 2 decimals (e.g. "1234.56"). */
  totalUsd: string;
  breakdown: Array<{ symbol: string; amountHuman: string; usd: string }>;
}

/**
 * Compute portfolio USD value from a list of holdings and a price map.
 *
 * @param holdings  Token holdings, raw on-chain amounts.
 * @param pricesUsd Map of symbol → USD price per 1 whole token (e.g. ETH=3500).
 */
export function valuePortfolio(
  holdings: Holding[],
  pricesUsd: Record<string, number>,
): PortfolioValue {
  const breakdown: PortfolioValue["breakdown"] = [];
  let totalUsd = 0;

  for (const h of holdings) {
    const meta = getTokenMeta(h.symbol);
    const price = pricesUsd[h.symbol.toUpperCase()];
    if (price === undefined) throw new Error(`No price for ${h.symbol}`);

    const human = formatTokenAmount(h.amount, meta.decimals);
    const usd = Number(h.amount) * price;

    breakdown.push({
      symbol: meta.symbol,
      amountHuman: human,
      usd: usd.toFixed(2),
    });
    totalUsd += usd;
  }

  return { totalUsd: totalUsd.toFixed(2), breakdown };
}

/** Total raw amount of a single token across many wallets. */
export function totalForToken(amounts: bigint[]): bigint {
  return sumAmounts(amounts);
}
