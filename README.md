# Web3 Backend Engineer Coding Test

A small TypeScript service that reads ERC-20 balances, formats token amounts, validates addresses, sums portfolio value across wallets, and exposes a REST API. It has **5 intentional bugs** of the kind we hit in production. Your job is to find and fix them so the test suite passes.

**Time budget:** 60–90 minutes. We care more about correctness than speed.

---

## Setup

```bash
npm install
npm test
```

You should see **several failing tests**. Each failure points at a bug in `src/`. The unit tests are deterministic — no RPC access required (the provider is mocked).

---

## What we're looking for

- **Correctness.** All tests in `npm test` must pass with no changes to test files.
- **Production sense.** Some bugs are subtle (precision loss, race conditions). Don't band-aid them — fix the root cause.
- **Clean diffs.** Keep changes minimal and focused. Don't reformat unrelated code.
- **A short writeup.** Add a `NOTES.md` at the repo root: for each bug, one line on what it was, and (if relevant) why the obvious fix would still be wrong.

---

## Repo layout

```
src/
  utils/
    format.ts        # Wei → human amount formatting
    address.ts       # Address validation
  services/
    token.service.ts # Balance reads, token metadata
    portfolio.ts     # Aggregate value across wallets
    nonce.service.ts # Tx nonce tracking
  routes/
    api.ts           # Express handlers
  app.ts             # Express app factory
tests/
  helpers/
    fixtures.ts
  format.test.ts
  address.test.ts
  portfolio.test.ts
  nonce.test.ts
  api.test.ts
```

---

## Rules

- Do **not** edit anything under `tests/`. Reviewers run the same tests.
- You **may** add new files, helpers, or types.
- Keep dependencies as-is. Don't add new packages unless you explain why in `NOTES.md`.
- If you find more than 5 bugs, list the extras in `NOTES.md` — bonus points.

---

## Submitting

Push to a private repo and share access with `hiring@pancaketech.dev`, or zip the directory (excluding `node_modules`) and email it back. Include your `NOTES.md`.
