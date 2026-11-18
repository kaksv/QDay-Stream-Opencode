# Brand — StreamPay

**Product:** Real-time stablecoin payment streams on QDay Aevum Testnet
**One-liner:** Money that moves at the speed of time.
**Voice:** Precise, calm, active. Confident, never hype. Say "stream", not "supercharge".
**Never:** imply tUSD8 has monetary value, invent partnerships, use casino/crypto-bro language, or hide the testnet status.

## Status

Live. This file is the source of truth for color, type, and tone.

## Palette — "night ledger"

A warm, near-black financial surface with one electric signal color. Green-tinted
blacks read as calm and financial; the lime accent is used sparingly, for value
movement and only the primary action.

| Token | Hex | Role |
|---|---|---|
| `--background` | `#070907` | Page ink |
| `--surface` | `#0C100D` | Cards, nav |
| `--elevated` | `#111712` | Popovers, inputs, hover |
| `--line` | `rgba(236, 241, 228, 0.10)` | 1px hairlines |
| `--line-strong` | `rgba(236, 241, 228, 0.18)` | Selected borders |
| `--foreground` | `#ECF1E4` | Bone text (≈16:1 on background) |
| `--muted-foreground` | `#98A294` | Secondary text (≈8:1 on background) |
| `--faint` | `#66705F` | Disabled / tertiary only (never body copy) |
| `--primary` | `#C8F169` | Signal lime, primary CTA |
| `--primary-strong` | `#B7E84A` | Hover |
| `--primary-foreground` | `#0A0C07` | Text on lime |
| `--mint` | `#7DE2C3` | Incoming / accrual |
| `--amber` | `#F2C879` | Scheduled / pending |
| `--coral` | `#F07A6A` | Destructive / cancelled |
| `--info` | `#9DB4FF` | Links / informational |

Semantic rules: lime = primary action and live value; mint = incoming/accrued;
amber = scheduled; coral = cancel/error. Never use red for decoration.

### Flow gradient

`linear-gradient(90deg, #7DE2C3 0%, #C8F169 55%, #F2C879 100%)`

Used for progress fills, the logo mark, and one hero emphasis. Never as a full-page
background, never under body text.

## Typography

- **UI / body:** Geist Sans (`--font-geist-sans`), weights 400/500/600.
- **Money / addresses / code:** Geist Mono (`--font-geist-mono`) with
  `font-variant-numeric: tabular-nums`. All live numbers use this, always.
- **Editorial accent:** Instrument Serif 400 italic, only for 2–5 word phrases in
  the hero and section headings. Never in product UI, forms, or tables.

Scale: body 14–16px, UI labels 12–13px, card numbers 28–40px, hero 56–104px
(fluid). Line height 1.05–1.15 for display, 1.5–1.65 for body. Letter spacing
-0.02em to -0.04em on display only.

## Spacing, radius, motion

- 4px spacing grid; page container max 1200px; gutters 20px mobile / 32px desktop.
- Cards `20px`, buttons/inputs `10–12px`, badges pill. One radius per element class.
- Borders are 1px. No shadows on cards; elevation is a lighter surface + hairline.
  Dialogs may use a soft black shadow.
- Durations: 100ms hover, 150ms small enter, 200–250ms dialog, 300–400ms page
  entrance. Ease-out for enter, ease-in for exit. No `transition: all`.
- All non-essential motion respects `prefers-reduced-motion`.

## Copy patterns

- Headline: "Pay by the second. Not by the invoice."
- CTA: "Start a stream", "Open app", "Withdraw 12.50 tUSD8".
- Status: "Accruing", "Scheduled", "Completed", "Cancelled".
- Estimate disclaimers: "Live estimate · finalized on-chain when withdrawn."
- Testnet: "Aevum Testnet · tUSD8 has no monetary value."
- Errors state the fix: "Not enough tUSD8. Get test tokens from the QDay faucet."
