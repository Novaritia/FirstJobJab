# Capture flows — LINE · Facebook · Instagram (P0)

These three chat channels are the **first thing we build**. Customers pay and send slips in the chat they already use; the merchant does nothing after a one-time connect. Everything else (statement upload, voice, notification capture) is fallback.

## 1. Shared pipeline (one code path for all three)

```mermaid
flowchart LR
  L[LINE webhook] --> V
  F[Messenger webhook] --> V
  I[Instagram webhook] --> V
  V[Verify signature] --> N[Normalise to ChatEvent]
  N --> D[Download image now<br/>URLs expire]
  D --> X[Claude extract:<br/>order / slip / other]
  X --> M[Match order ↔ slip<br/>per customer thread]
  M --> R[(Record + evidence)]
  R --> A[Notify merchant]
  R --> C[Optional reply to customer<br/>"ได้รับ ฿780 แล้วค่ะ"]
```

```ts
type ChatEvent = {
  channel: "line" | "facebook" | "instagram";
  shopId: string;          // our merchant id (from LINE destination / page id / IG user id)
  threadId: string;        // customer id on that platform
  fromShop: boolean;       // true for shop's own replies (FB/IG echoes only)
  at: string;              // ISO time
  text?: string;
  imageUrl?: string;       // our stored copy, not the platform URL
  raw: unknown;            // original payload, kept as evidence
};
```

**Matching rule (TS, not AI):** for one `threadId`, pair the latest open order total with a slip amount within 48 h → `paid` / `underpaid` / `overpaid`. Slip with no order → ask the merchant once with buttons. Order with no slip after 24 h → "unpaid" list.

**Rules:** verify every signature before parsing; answer webhooks with 200 fast and process after; dedupe by platform message id (platforms retry).

## 2. LINE OA

| | |
|---|---|
| **Merchant (once)** | Open free LINE OA (personal LINE is enough, no company registration) → add Univerxal team as admin, *or* follow the picture guide: OA Manager → Settings → Messaging API → enable → paste our webhook URL → Response settings: **Chat ON + Webhook ON, auto-response OFF** |
| **Customer** | Nothing new. Scans shop QR sticker (① PromptPay ② add LINE shop), pays, sends slip in chat |
| **Webhook** | `POST /api/webhooks/line` · header `x-line-signature` = base64(HMAC-SHA256(channel secret, raw body)) |
| **Events** | `message` (text, image). Body `destination` = which OA → `shopId` |
| **Images** | `GET https://api-data.line.me/v2/bot/message/{messageId}/content` with the channel access token |
| **Reply** | Use the event's `replyToken` for "received" (no push quota) |
| **Limit** | LINE does **not** send the shop's own manual replies to the webhook → order total must come from the customer's text or the slip |
| **Demo** | No app review → **judges can message it live** ⭐ |

## 3. Facebook Page (Messenger)

| | |
|---|---|
| **Merchant (once)** | Needs a Facebook Page (free). Tap **"Connect Facebook"** → log in → pick page → allow. We subscribe the page automatically |
| **Customer** | Nothing new. Messages the page, orders, sends slip |
| **Connect** | Facebook Login → `GET /me/accounts` (page token) → `POST /{page-id}/subscribed_apps?subscribed_fields=messages,message_echoes` |
| **Permissions** | `pages_messaging`, `pages_read_engagement`, `pages_manage_metadata` |
| **Webhook** | `GET` = verify (`hub.mode`, `hub.verify_token`, return `hub.challenge`) · `POST /api/webhooks/meta` · header `x-hub-signature-256` = `sha256=` + hex(HMAC-SHA256(app secret, raw body)) |
| **Events** | `messages` (customer) and `message_echoes` (**shop's own replies** → we read "รวม 780 ค่ะ") |
| **Images** | `attachments[].payload.url` → download immediately |
| **Demo** | App in development mode → only people with a role on the app trigger webhooks → **team phones play the customer**, or add judges as testers |

## 4. Instagram (Professional account)

| | |
|---|---|
| **Merchant (once)** | Switch IG to Professional (free, ~3 taps, keeps followers) → IG Settings → Messages → Connected tools → **Allow access to messages** → tap **"Connect Instagram"** → allow |
| **Customer** | Nothing new. DMs the shop |
| **Connect** | Business Login for Instagram (no Facebook Page needed) → IG user token → subscribe the account to `messages` |
| **Permissions** | `instagram_business_basic`, `instagram_business_manage_messages` |
| **Webhook** | Same `/api/webhooks/meta` endpoint, `object: "instagram"`, same signature header (Instagram app secret) |
| **Events** | `messages`; shop's own replies arrive with `is_echo: true` → `fromShop` |
| **Images** | attachment URL → download immediately |
| **Demo** | Same dev-mode limit as Facebook → team phones |

## 5. What the merchant sees
- Instant LINE notice from @Univerxal: "✅ ขาย ฿780 (IG · คุณนก) เสื้อดำ ×2"
- Problems only: "⚠️ คุณนกโอน ฿700 ขาด ฿80" · "❓ เงินเข้า ฿500 จากนก คืออะไร? [ขาย] [ส่วนตัว]"
- One dashboard: every channel in one timeline

## 6. Build order (deadline Fri 16 Oct 14:00)
1. Pipeline + `ChatEvent` + matcher + unit test for the matcher (~2 h)
2. LINE end to end — the live demo channel (~2 h)
3. Facebook (~2 h) — shares code with Instagram
4. Instagram (~1–2 h, mostly app setup)
5. Seeded demo data so the dashboard works even if a webhook fails on stage

## 7. Check before coding
- [ ] LINE: free-plan push message quota in Thailand (merchant notices use push)
- [ ] Meta: dev mode accepts webhooks only from app-role users (confirm), how many testers we can add
- [ ] Instagram: exact subscribe call for Instagram Login and echo format, against current docs
- [ ] Meta business verification is **not** needed for dev mode

Sources: [LINE unverified accounts](https://help.line.me/official_account/web/categoryId/20010174/pc) · [LINE Messaging API pricing](https://developers.line.biz/en/docs/messaging-api/pricing/) · [Instagram API with Instagram Login](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login) · [Messenger message_echoes](https://developers.facebook.com/documentation/business-messaging/messenger-platform/webhooks/webhook-events/message-echoes) · [Messenger FAQ](https://developers.facebook.com/docs/messenger-platform/faq)
