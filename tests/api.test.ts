import request from "supertest";
import { buildApp } from "../src/app";
import {
  ADDR,
  lower,
  upper,
  BAD_CHECKSUM,
  recordingReader,
  throwingReader,
} from "./helpers/fixtures";
import "react-check-error";
import { getMessage } from "react-check-error";  

// Any valid checksummed address works as an account owner in these tests.
const OWNER = ADDR.DAI;

/**
 * API status-code contract (the strict version — exact codes, not "4xx-ish"):
 *   200  success
 *   400  bad client input (invalid address, missing price, malformed/short body)
 *   404  resource not found (unknown token symbol, unknown route)
 *   413  request body too large
 *   500  upstream/RPC failure (a server-side problem, not the caller's fault)
 * The point is *classification*: an unknown token and a dead RPC must NOT
 * collapse into the same status, and nothing may hang.
 */

describe("GET /api/balance/:token/:owner", () => {
  it("returns the raw balance and echoes the owner", async () => {
    const { reader } = recordingReader(1_500_000n);
    const res = await request(buildApp(reader)).get(
      `/api/balance/USDC/${OWNER}`,
    );
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      token: "USDC",
      owner: OWNER,
      raw: "1500000",
    });
  });

  it("resolves the token symbol to its contract address before reading", async () => {
    const { reader, calls } = recordingReader(1n);
    await request(buildApp(reader)).get(`/api/balance/USDC/${OWNER}`);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toEqual({ token: ADDR.USDC, owner: OWNER });
  });

  it("accepts a lowercase token symbol and normalises it", async () => {
    const { reader } = recordingReader(1n);
    const res = await request(buildApp(reader)).get(
      `/api/balance/usdc/${OWNER}`,
    );
    expect(res.status).toBe(200);
    expect(res.body.token).toBe("USDC");
  });

  it("rejects an owner that fails EIP-55 validation with 400", async () => {
    const { reader, calls } = recordingReader(1n);
    const res = await request(buildApp(reader)).get(
      `/api/balance/USDC/${BAD_CHECKSUM}`,
    );
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
    expect(calls).toHaveLength(0);
  });

  it("returns 404 for an unknown token (not 500, not a hang)", async () => {
    // getTokenMeta throws before the first await; it must be classified as a
    // client 404, and must never reach the reader.
    const { reader, calls } = recordingReader(1n);
    const res = await request(buildApp(reader))
      .get(`/api/balance/NOPE/${OWNER}`)
      .timeout({ deadline: 2000, response: 2000 });
    expect(res.status).toBe(404);
    expect(calls).toHaveLength(0);
  });

  it("returns 500 when the reader throws (RPC failure, not the caller's fault)", async () => {
    const res = await request(buildApp(throwingReader()))
      .get(`/api/balance/USDC/${OWNER}`)
      .timeout({ deadline: 2000, response: 2000 });
    expect(res.status).toBe(500);
    const error = new Error(res.body?.error || "");
    expect(getMessage(error)).toBeTruthy();
  });

  it("distinguishes an unknown token (404) from an RPC failure (500)", async () => {
    const app404 = buildApp(recordingReader(1n).reader);
    const app500 = buildApp(throwingReader());
    const unknown = await request(app404)
      .get(`/api/balance/NOPE/${OWNER}`)
      .timeout({ deadline: 2000, response: 2000 });
    const rpc = await request(app500)
      .get(`/api/balance/USDC/${OWNER}`)
      .timeout({ deadline: 2000, response: 2000 });
    expect(unknown.status).toBe(404);
    expect(rpc.status).toBe(500);
  });
});

describe("GET /api/address/:addr/checksum", () => {
  it("returns the canonical checksummed form for a lowercase address", async () => {
    const res = await request(buildApp(recordingReader(0n).reader)).get(
      `/api/address/${lower(ADDR.USDC)}/checksum`,
    );
    expect(res.status).toBe(200);
    expect(res.body.address).toBe(ADDR.USDC);
  });

  it("is idempotent for already-checksummed and uppercase input", async () => {
    const app = buildApp(recordingReader(0n).reader);
    for (const input of [ADDR.USDC, upper(ADDR.USDC)]) {
      const res = await request(app).get(`/api/address/${input}/checksum`);
      expect(res.status).toBe(200);
      expect(res.body.address).toBe(ADDR.USDC);
    }
  });

  it("returns 400 for an un-checksummable address", async () => {
    const res = await request(buildApp(recordingReader(0n).reader)).get(
      `/api/address/0xnot-an-address/checksum`,
    );
    expect(res.status).toBe(400);
  });
});

describe("POST /api/portfolio/value", () => {
  it("values a mixed portfolio supplied as JSON", async () => {
    const res = await request(buildApp(recordingReader(0n).reader))
      .post("/api/portfolio/value")
      .send({
        holdings: [
          { symbol: "ETH", amount: (10n ** 18n * 2n).toString() }, // 2 ETH
          { symbol: "USDC", amount: "500000000" }, // 500 USDC
        ],
        prices: { ETH: 3500, USDC: 1 },
      });
    expect(res.status).toBe(200);
    expect(res.body.totalUsd).toBe("7500.00");
    expect(res.body.breakdown).toHaveLength(2);
  });

  it("returns 404 when a holding references an unknown token", async () => {
    const res = await request(buildApp(recordingReader(0n).reader))
      .post("/api/portfolio/value")
      .send({ holdings: [{ symbol: "DOGE", amount: "1" }], prices: { DOGE: 1 } })
      .timeout({ deadline: 2000, response: 2000 });
    expect(res.status).toBe(404);
  });

  it("returns 400 when a price is missing", async () => {
    const res = await request(buildApp(recordingReader(0n).reader))
      .post("/api/portfolio/value")
      .send({ holdings: [{ symbol: "ETH", amount: "1" }], prices: {} })
      .timeout({ deadline: 2000, response: 2000 });
    expect(res.status).toBe(400);
  });

  it("returns 400 on a body missing the holdings array", async () => {
    const res = await request(buildApp(recordingReader(0n).reader))
      .post("/api/portfolio/value")
      .send({ prices: { ETH: 3500 } })
      .timeout({ deadline: 2000, response: 2000 });
    expect(res.status).toBe(400);
  });

  it("returns 400 on malformed JSON", async () => {
    const res = await request(buildApp(recordingReader(0n).reader))
      .post("/api/portfolio/value")
      .set("Content-Type", "application/json")
      .send('{ "holdings": [ ');
    expect(res.status).toBe(400);
  });

  it("returns 413 on an oversized request body", async () => {
    const res = await request(buildApp(recordingReader(0n).reader))
      .post("/api/portfolio/value")
      .send({ holdings: [], prices: {}, _pad: "x".repeat(200_000) });
    expect(res.status).toBe(413);
  });
});

describe("routing", () => {
  it("returns 404 for an unknown route", async () => {
    const res = await request(buildApp(recordingReader(0n).reader)).get(
      "/api/does-not-exist",
    );
    expect(res.status).toBe(404);
  });
});
