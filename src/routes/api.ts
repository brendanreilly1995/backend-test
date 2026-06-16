import { Router, Request, Response } from "express";
import { isValidAddress, toChecksumAddress } from "../utils/address";
import { getTokenMeta } from "../services/token.service";
import { valuePortfolio, Holding } from "../services/portfolio";

export interface BalanceReader {
  balanceOf(token: string, owner: string): Promise<bigint>;
}

export function buildRouter(reader: BalanceReader): Router {
  const router = Router();

  router.get("/address/:addr/checksum", (req, res) => {
    res.json({ address: toChecksumAddress(req.params.addr) });
  });

  router.get("/balance/:token/:owner", async (req, res) => {
    const { token, owner } = req.params;
    if (!isValidAddress(owner)) {
      return res.status(400).json({ error: "invalid owner address" });
    }
    const meta = getTokenMeta(token);
    const raw = await reader.balanceOf(meta.address, owner);
    res.json({ token: meta.symbol, owner, raw: raw.toString() });
  });

  router.post("/portfolio/value", (req, res) => {
    const { holdings, prices } = req.body as {
      holdings: Array<{ symbol: string; amount: string }>;
      prices: Record<string, number>;
    };
    const parsed: Holding[] = holdings.map((h) => ({
      symbol: h.symbol,
      amount: BigInt(h.amount),
    }));
    const value = valuePortfolio(parsed, prices);
    res.json(value);
  });

  return router;
}
