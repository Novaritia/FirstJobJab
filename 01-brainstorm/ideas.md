# Ideas

Category is not fixed yet. Judging is 80% *execution + practicality*, so prefer a real local problem with a tight, reliable demo over raw novelty.
Every idea uses **U-Bot** as the brain and **ElevenLabs** as the voice; **Avalanche** only if we go Web3 track.

---

## 1. Voice Money Guardian ⭐ current favourite

**Pitch:** A Thai-speaking voice assistant that lets elderly people move money by talking — and stops scam transfers before they happen.

- **Problem:** Call-centre and "police/bank officer" scams drain the savings of elderly Thais; banking apps are hard for them to use.
- **Exists?** Partly. Banks have scam warnings; voice banking exists (BofA Erica, India's Hello UPI). None combine voice-first use with a pre-transfer scam check and family alert.
- **How we innovate:** Every transfer request is checked for scam patterns ("safe account", urgency, stranger told you to) before it executes; risky ones are paused and a family member gets a voice alert.
- **U-Bot role:** Understands the request, runs the scam-risk reasoning, decides allow / pause / block.
- **ElevenLabs role:** Speech-to-text in, calm natural voice out (confirmations, warnings, family alert).
- **AVAX role (Web3):** Transfer as stablecoin on Fuji testnet; smart contract enforces a hold period on flagged transfers.
- **Demo moment:** "Grandma" asks to send money because "the police said so" → assistant refuses, explains why, son's phone gets an alert.
- **Risk:** Thai voice quality in ElevenLabs must be verified first.

## 2. Deepfake Voice Scam Shield

**Pitch:** Detect cloned-voice "family emergency" calls before the victim pays.

- **Exists?** Yes for enterprises (Pindrop, Reality Defender); ElevenLabs has an AI Speech Classifier.
- **How we innovate:** Consumer-side, built into the payment flow, with a programmable hold.
- **U-Bot role:** Conversation analysis and verdict. **ElevenLabs role:** Classifier + voice alerts. **AVAX role:** Escrow hold.
- **Demo moment:** Play a cloned voice → app flags it and holds the payment.
- **Risk:** Hard to demo convincingly; detection accuracy is out of our control.

## 3. Voice Ledger → Credit History for Street Vendors

**Pitch:** Vendors speak their daily sales; AI keeps the books and builds an income record lenders can trust.

- **Exists?** Partly. Khatabook / OkCredit (ledgers, not voice-first, no portable credit); Goldfinch (on-chain lending to institutions).
- **How we innovate:** Voice-only bookkeeping; the vendor owns a verifiable, portable credit history.
- **U-Bot role:** Parses sales talk into ledger entries, summarises, answers "how did I do this week?". **ElevenLabs role:** Voice in/out. **AVAX role:** Hash of monthly summaries on-chain as proof.
- **Demo moment:** Speak three sales → dashboard updates → "credit report" generated.
- **Risk:** Value only shows over time; harder to make dramatic in a demo.

## 4. Voice Remittance with Spoken Receipts

**Pitch:** "Send 100 to Mom" — stablecoin transfer, Mom gets a voice note in her dialect explaining how to cash out.

- **Exists?** Yes — Félix Pago (WhatsApp + stablecoins).
- **How we innovate:** Voice-only, bilingual on both ends.
- **Risk:** Judges may see it as "Félix with voice".

## 5. AI Money Coach that Calls You

**Pitch:** Proactive voice calls when you're about to overspend.

- **Exists?** Yes — Cleo AI.
- **Risk:** Crowded, least fresh.

---

## Add your idea

```
## N. Name
**Pitch:**
- **Problem:**
- **Exists?** (name competitors; if yes, how we go further)
- **U-Bot role:**
- **ElevenLabs role:**
- **AVAX role (Web3):**
- **Demo moment:**
- **Risk:**
```
