# ElevenLabs

AI voice. Counts toward *Innovation & ecosystem* (5%).

## What it offers
- **Text-to-speech** — `POST /v1/text-to-speech/{voice_id}`, returns audio.
- **Speech-to-text (Scribe)** — `POST /v1/speech-to-text`, returns transcript.
- **Agents (conversational AI)** — full real-time voice agent with turn-taking; can call your tools.
- **Voice cloning / voice design** — custom voices.

## Getting started
1. Claim free credits: **1 month Creator plan ($22)** via Discord — join https://discord.com/invite/VnBvbbcdEC → `#coupon-codes` → "Start Redemption" → use the **hackathon-registered email**. Support: `#hackathon-support`.
2. Create an API key in the dashboard → put it in `.env` as `ELEVENLABS_API_KEY`.
3. Pick a voice in the Voice Library → `ELEVENLABS_VOICE_ID`.
4. Call it from the **backend only** (header `xi-api-key`).

## Check early
- [ ] Is our target language (e.g. Thai) supported with good quality? Guide says TTS and Agents cover **32 languages** — test Thai in the dashboard before committing to it.
- [ ] Credit budget: how many seconds of audio does the demo + rehearsals need?
- [ ] Latency: is streaming TTS needed for the demo to feel live?

## Docs
- https://elevenlabs.io/docs
- API reference: https://elevenlabs.io/docs/api-reference/introduction

## Extra
- Showcase (swag): https://showcase.elevenlabs.io/ — submit after the event.
- 2025 winners worth copying the shape of: *Kisan* (voice-first multilingual assistant for farmers), *Aphasio*, *Reconnect Generations*.
