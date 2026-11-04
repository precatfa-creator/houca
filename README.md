# Arabian Horse Auction

A live auction display for Arabian horses (Arabic, right-to-left UI, prices in Libyan dinars — د.ل).

The app has two screens that run in separate tabs of the **same browser**:

| Route   | Screen         | Who uses it                                                          |
| ------- | -------------- | -------------------------------------------------------------------- |
| `/`     | Control panel  | Auction operator: introduces a horse, records bids, confirms the sale |
| `/list` | Auction board  | Audience: full-screen display for a projector or TV                  |

Each change in the control panel shows up on the board right away, with an animation.

## How an auction runs

1. **Introduce:** the operator enters a horse name. The board shows the name and "waiting for opening" (في انتظار افتتاح المزاد).
2. **Bid:** the operator enters each new bid. A bid must be a positive number higher than the current price. The board animates each new price.
3. **Sell:** the operator confirms the sale. The board shows a "sold" screen (تم البيع!) for 4 seconds, then goes back to the waiting screen.
4. **Cancel** (optional): "إلغاء العرض" ends the current auction without a sale.

## Getting started

Requires Node.js 22.18 or newer. The test script runs TypeScript directly in Node.

```bash
npm install
npm run dev        # http://localhost:3000
```

Open `http://localhost:3000/` in one tab and `http://localhost:3000/list` in another tab of the same browser. On a second screen, drag the board tab into its own window.

### Scripts

| Script            | What it does                                    |
| ----------------- | ----------------------------------------------- |
| `npm run dev`     | Starts the Vite dev server on port 3000         |
| `npm run build`   | Builds a production bundle into `dist/`         |
| `npm run preview` | Serves the built bundle locally                 |
| `npm run lint`    | Type-checks the project with `tsc` (strict mode) |
| `npm test`        | Runs unit tests with Node's built-in test runner |
| `npm run clean`   | Deletes `dist/`                                 |

## How sync works, and its limits

The app has no backend. All state is stored in `localStorage` under the key `arabian_horse_auction_state`:

```ts
interface AuctionState {
  horseName: string;           // horse currently on the block
  currentPrice: number | null; // highest bid, null before the first bid
  timestamp: number;           // epoch ms of the last change
  isSold: boolean;             // true once the sale is confirmed
}
```

Every action writes this key. Other tabs get the browser's `storage` event and re-render. This means:

- **Same browser, same machine only.** A phone, a second computer, or another browser on the same computer will **not** see the auction. That includes devices reaching the dev server over the LAN.
- One auction at a time.
- Bids are not kept. Only the current price is stored, so there is no bid history after a sale.
- If the stored value is corrupt or edited by hand, it is thrown away and the app starts empty.

Running the control panel and the board on separate devices would need a real-time backend, such as WebSockets or a hosted realtime database.

## Project structure

```
src/
  main.tsx                 React entry point
  App.tsx                  Routes and toast container
  index.css                Tailwind v4 setup and fonts (Cairo, Tajawal)
  components/Layout.tsx    Background, header, and navigation
  pages/RegisterPage.tsx   Control panel (/)
  pages/ListPage.tsx       Public auction board (/list)
  hooks/useAuction.ts      Shared auction state and cross-tab sync
  lib/auction.ts           Pure logic: state type, validation, price formatting
  lib/auction.test.ts      Unit tests for lib/auction.ts
```

Stack: React 19, React Router 7, Vite 6, Tailwind CSS 4, Motion (animations), Sonner (toasts), and lucide-react (icons).

## Deployment

`npm run build` produces a static site in `dist/`. `netlify.toml` sends every path to `index.html`, so opening `/list` directly works on Netlify. On other static hosts, set up the same single-page-app fallback.
