# Arabian Horse Auction

A live auction system for Arabian horses (Arabic, right-to-left UI, prices in Libyan dinars — د.ل). It runs on Supabase, so every device sees the same auction in real time.

| Route   | Screen         | Who uses it                                                       |
| ------- | -------------- | ----------------------------------------------------------------- |
| `/`     | Control panel  | Admins and managers (sign-in required): catalog and live bidding  |
| `/list` | Auction board  | Audience: full-screen display for a projector or TV (no sign-in)  |

## Features

- **Horse catalog.** Each horse has a name, lot number (unique; text such as `12A` is allowed), color, date of birth, gender, and photo. Add and edit horses one at a time, or import many from Excel.
- **Reserve price.** Tick "Reserved" and enter an amount. In the list, a horse's current bid shows **red** until it reaches the reserve and **green** at or above it. Selling below the reserve is still allowed, but needs a second click to confirm. Reserve amounts are never sent to the public board.
- **Live bidding.** Click a horse in the list to put it on the block. Raise the price with **+1k / +5k / +10k**, or type a new total price, which must be higher than the current one. The first +1k on a horse with no bids gives 1,000.
- **Sell, stop, undo.** "Sell" confirms the sale and the board shows a 4-second "sold" screen. "Stop" takes the horse off the block and keeps its bids. "Undo sale" (in the panel, or the ↶ icon in the list) cancels a sale and reopens bidding at the last price.
- **Cross-device sync.** Every screen subscribes to Supabase Realtime and refetches after each change and each reconnect. Several operators can work at once: bids are applied atomically on the server, so simultaneous clicks never overwrite each other.

## Excel import

Download the template from the control panel ("تحميل القالب"). The first sheet must have these exact headers:

| Column           | Required             | Values                                    |
| ---------------- | -------------------- | ----------------------------------------- |
| `Horse Name`     | Yes                  | Text                                      |
| `LOT Number`     | Yes                  | Unique; must not already exist            |
| `Color`          | No                   | Text                                      |
| `Date of Birth`  | No                   | Excel date, `YYYY-MM-DD`, or `DD/MM/YYYY` |
| `Gender`         | Yes                  | `Male` / `Female` (also `ذكر` / `أنثى`)    |
| `Reserved`       | Yes                  | `Yes` / `No`                              |
| `Reserve Amount` | When Reserved = Yes  | Positive number in LYD                    |

The whole file is checked before anything is saved. If any row is invalid, nothing is imported and the errors are listed by sheet row. Otherwise every horse is inserted in a single transaction. Photos can't come from Excel; add them afterwards by editing each horse.

## Setup

### 1. Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. In **SQL Editor**, run each file in `supabase/migrations/` in filename order, one query per file.
3. In **Authentication → Sign In / Providers**, turn **off** "Allow new users to sign up". Otherwise anyone holding the public key could create an account and get staff access.
4. In **Authentication → Users → Add user**, create a login for each admin or manager.

### 2. Environment variables

Copy `.env.example` to `.env` and fill in the values from **Project Settings → API Keys**:

```bash
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...   # publishable key (or legacy anon key)
```

Both values are public by design: they end up in the browser bundle. Access is enforced by row-level security. **Never** use the `sb_secret_...` or `service_role` key here.

### 3. Run

Requires Node.js 22.18 or newer.

```bash
npm install
npm run dev        # http://localhost:3000
```

Without the environment variables, the app shows a setup notice instead of the UI.

### Scripts

| Script            | What it does                                     |
| ----------------- | ------------------------------------------------ |
| `npm run dev`     | Starts the Vite dev server on port 3000          |
| `npm run build`   | Builds a production bundle into `dist/`          |
| `npm run preview` | Serves the built bundle locally                  |
| `npm run lint`    | Type-checks the project with `tsc` (strict mode) |
| `npm test`        | Runs unit tests with Node's built-in test runner |
| `npm run clean`   | Deletes `dist/`                                  |

## Security model

| Role                          | Can do                                                                                           |
| ----------------------------- | ------------------------------------------------------------------------------------------------ |
| Public (`anon`, the board)    | Read horses and the live-auction pointer. Cannot read reserves, write anything, or call any function. |
| Staff (`authenticated`)       | Manage the catalog, reserves, and photos; bid, sell, stop, and undo through SQL functions.      |

- Reserves live in their own table, `horse_reserves`, which `anon` cannot read, including over Realtime.
- `auction_state` has no write policy. It changes only through the security-definer functions `start_auction`, `stop_auction`, `raise_bid`, `place_bid`, `sell_horse`, and `reopen_horse`.
- `save_horse` and `import_horses` write a horse and its reserve in one transaction. A horse can never be saved without its reserve.
- The `horse-photos` bucket is public-read, staff-write, and limited to 5 MB JPEG/PNG/WEBP files.

There is no separate admin or manager role: every signed-in user has full staff rights.

## Project structure

```
supabase/migrations/          Database schema, RLS, functions, realtime, storage
src/
  main.tsx                    React entry point
  App.tsx                     Routes, setup notice, toast container
  index.css                   Tailwind v4 setup and fonts (Cairo, Tajawal)
  lib/
    horses.ts                 Pure logic: types, reserve status, age, formatting, Excel row validation
    horses.test.ts            Unit tests for horses.ts
    api.ts                    Supabase reads, writes, and RPC calls with Arabic error messages
    excel.ts                  Template download and sheet reading (SheetJS, loaded on demand)
    supabase.ts               Supabase client from environment variables
  hooks/
    useAuctionData.ts         Realtime-synced catalog and live-auction state
    useSession.ts             Staff auth session
    useAction.ts              Runs an action with busy state and toasts
  components/
    Layout.tsx                Background, header, navigation, sign-out
    StaffOnly.tsx             Sign-in guard for the control panel
    HorseList.tsx             Catalog list with reserve colours, undo, edit, and delete
    HorseFormDialog.tsx       Add/edit dialog (catalogue card)
    LiveAuctionPanel.tsx      Bidding, sell, stop, and undo controls
    ImportControls.tsx        Template download and Excel import
    ConfirmButton.tsx         Two-click confirmation button
    HorsePhoto.tsx            Photo or placeholder
    SetupNotice.tsx           Shown when the environment variables are missing
  pages/
    AdminPage.tsx             Control panel (/)
    LoginPage.tsx             Staff sign-in
    ListPage.tsx              Public auction board (/list)
```

Stack: React 19, React Router 7, Vite 6, Tailwind CSS 4, Supabase (Postgres, Auth, Realtime, Storage), SheetJS, Motion, Sonner, and lucide-react.

## Deployment (Netlify)

1. Under **Site configuration → Environment variables**, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, then redeploy. The values are compiled in at build time.
2. `netlify.toml` sends every path to `index.html`, so opening `/list` directly works.
3. Before each deploy, run any new files in `supabase/migrations/` on the database.
