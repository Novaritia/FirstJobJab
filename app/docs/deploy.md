# Deploy: Cloudflare → Nginx Proxy Manager → Docker

Server: `103.216.158.122`. Traffic: browser → Cloudflare (orange cloud) → the server's existing Nginx Proxy Manager (ports 80/443) → `firstjobjab-web:9800` / `firstjobjab-api:9900` over NPM's Docker network. `docker-compose.yml` joins web and api to that network; their host ports and Postgres are bound to `127.0.0.1` only.

## 1. Cloudflare DNS
| Type | Name | Content | Proxy |
|---|---|---|---|
| A | `firstjobjab` | `103.216.158.122` | Proxied |
| A | `api-firstjobjab` | `103.216.158.122` | Proxied |

SSL/TLS → Overview → **Full (strict)**. SSL/TLS → Origin Server → **Create certificate** for `*.novaovalist.dev, novaovalist.dev` and keep the cert + private key for step 4.

## 2. `.env` on the server
```sh
WEB_ORIGIN=https://firstjobjab.novaovalist.dev
PUBLIC_API_URL=https://api-firstjobjab.novaovalist.dev
TRUST_PROXY=2               # Cloudflare + proxy manager → req.ip is the real client
PROXY_NETWORK=npm_default     # the network NPM is on: docker network ls
POSTGRES_PASSWORD=...       # only used when the DB volume is created
```
Plus the keys from `.env.example` (`PII_KEY`, `FILE_KEY`, `IP_HMAC_KEY`, Gemini, ElevenLabs).

## 3. Start
```sh
docker compose --profile full up -d --build
```
`PUBLIC_API_URL` is baked into the web bundle at build time, so after changing it rebuild web: `docker compose --profile full build web`.

Locally (no NPM): run `docker network create npm_default` once, then the same command.

## 4. Nginx Proxy Manager
1. SSL Certificates → Add → **Custom** → upload the Cloudflare Origin cert and key.
2. Proxy Hosts → Add:

| Domain | Forward host | Port | Options |
|---|---|---|---|
| `firstjobjab.novaovalist.dev` | `firstjobjab-web` | `9800` | Websockets on, Block common exploits |
| `api-firstjobjab.novaovalist.dev` | `firstjobjab-api` | `9900` | Block common exploits |

   SSL tab on each: the Origin cert, **Force SSL**, HTTP/2 on.

## Check
- https://firstjobjab.novaovalist.dev loads, login works (the session cookie is set by `api-firstjobjab.novaovalist.dev`; both are the same site, so `SameSite=Lax` is fine).
- Settings → Security → login history shows your real IP, not a Cloudflare one. If it shows a `172.x`/Cloudflare IP, `TRUST_PROXY` is wrong.

## Optional hardening
Firewall 80/443 to [Cloudflare's IP ranges](https://www.cloudflare.com/ips/) only, so nobody can skip Cloudflare by hitting `103.216.158.122` directly (that would also let them fake `X-Forwarded-For`).
