# Decision Log

Newest at the bottom. Format: Context / Options / Choice / Why.

## 2026-10-15 — Workspace structure
- **Context:** Need one place for references, business, tech, plan and pitch.
- **Options:** Numbered phase folders; split by track; flat docs.
- **Choice:** Numbered phase folders in repo root; `app/` empty until stack chosen.
- **Why:** Order of work is visible; anyone can find things cold.

## 2026-10-15 — Partner tech
- **Context:** Organiser sheet lists U-Bot, ElevenLabs, Avalanche, Tokenomist.
- **Choice:** Use U-Bot + ElevenLabs; Avalanche only if Web3 track; **no Tokenomist**.
- **Why:** U-Bot is scored (5%); team chose not to use Tokenomist.

## 2026-10-15 — Track
- **Context:** Two tracks: AI, Web3. Team is coding the app themselves.
- **Choice:** **AI track.** Avalanche dropped (stretch only).
- **Why:** Fewer moving parts → better execution score (40%).

## 2026-10-15 — U-Bot integration
- **Context:** `ubot-user-guide.pdf` documents only the chat web app — no API.
- **Choice:** Pending — ask staff whether an API/embed exists. See `03-tech/ubot.md`.

## 2026-10-15 — U-Bot
- **Choice:** Skip U-Bot for now (no API documented; 5% of score). Revisit if staff provide an API.

## 2026-10-15 — Idea: ChatCFO (superseded)
- **Context:** Judging is 80% execution + practicality. Brainstormed ~20 ideas (see `01-brainstorm/`).
- **Options:** ChatCFO, Debt Escape Agent, Intent Money, Voice Money Guardian, others.
- **Choice:** **ChatCFO** — chats → books, analysis, prediction, tax, Credit Passport. Full detail: `01-brainstorm/idea-chatcfo.md`.
- **Why:** Real, current Thai pain (e-Payment reporting, fake slips, no credit); judges recognise it instantly; strong demo moments; buildable in a day; fits u-topia PayFi.

## 2026-10-15 — Stack
- **Choice:** Next.js on Vercel + Claude API (extraction/insights) + plain TypeScript engines (tax, forecast) + ElevenLabs TTS (stretch). Detail: `03-tech/stack.md`.
- **Why:** One repo + one deploy; exact numbers from code, not AI; no database needed for the demo.

## 2026-10-15 — ChatCFO dropped as standalone
- **Context:** Bookkeeping-in-chat already exists (Parnuan, Zendai, FlowAccount AI Connector, PEAK). ~50 alternative ideas explored; most already existed, needed datasets, could be faked, or required bank access / licences.
- **Choice:** Keep ChatCFO only as the core engine of a broader product.

## 2026-10-15 — Idea: Univerxal 🔒
- **Choice:** **Univerxal** — AI books, tax and credit for everyone who earns outside a payslip. Personal + Business + Group spaces; ChatCFO engine + LoanReady + group money + u-topia credit/identity/compliance layer. Full detail: `01-brainstorm/idea-univerxal.md`.
- **Why:** Legal as a third party (upload only, never holds money or lends); verified problems (e-Payment reporting, 60–70% SME loan rejection); differentiated (deposit classifier separates reimbursements from income for tax and credit); multiple revenue streams; fits u-topia's credit/identity/compliance strength.
