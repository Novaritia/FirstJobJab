# Deploy: Cloudflare → Nginx Proxy Manager → Docker

Server: `103.216.158.122`. Traffic: browser → Cloudflare (orange cloud) → Nginx Proxy Manager (`proxy`, ports 80/443) → `web:3000` / `api:4000` on the compose network. Postgres, api and web ports are bound to `127.0.0.1` only.

Replace `example.com` below with your domain.

## 1. Cloudflare DNS
| Type | Name | Content | Proxy |
|---|---|---|---|
| A | `app` | `103.216.158.122` | Proxied |
| A | `api` | `103.216.158.122` | Proxied |

SSL/TLS → Overview → **Full (strict)**. SSL/TLS → Origin Server → **Create certificate** for `*.example.com, example.com` and keep the cert + private key for step 4.

## 2. `.env` on the server
```sh
WEB_ORIGIN=https://app.example.com
PUBLIC_API_URL=https://api.example.com
TRUST_PROXY=2          # Cloudflare + proxy manager → req.ip is the real client
POSTGRES_PASSWORD=...  # only used when the DB volume is created
```
Plus the keys from `.env.example` (`PII_KEY`, `FILE_KEY`, `IP_HMAC_KEY`, Gemini, ElevenLabs).

## 3. Start
```sh
docker volume create app_dbdata   # once
docker compose --profile full --profile proxy up -d --build
```
`PUBLIC_API_URL` is baked into the web bundle at build time, so after changing it run `docker compose --profile full build web`.

## 4. Nginx Proxy Manager
Admin UI is on port 81, host-only. From your laptop: `ssh -L 81:localhost:81 user@103.216.158.122`, then open http://localhost:81 and log in with the first-run account the UI asks you to create (older versions use `admin@example.com` / `changeme`).

1. SSL Certificates → Add → **Custom** → upload the Cloudflare Origin cert and key.
2. Proxy Hosts → Add:

| Domain | Forward host | Port | Options |
|---|---|---|---|
| `app.example.com` | `web` | `3000` | Websockets on, Block common exploits |
| `api.example.com` | `api` | `4000` | Block common exploits |

   SSL tab on each: the Origin cert, **Force SSL**, HTTP/2 on.

Use the service names `web` / `api`, not `localhost`: the proxy runs in its own container on the same compose network.

## Check
- https://app.example.com loads, login works (the session cookie is set by `api.example.com`; both are the same site, so `SameSite=Lax` is fine).
- Settings → Security → login history shows your real IP, not a Cloudflare one. If it shows a `172.x`/Cloudflare IP, `TRUST_PROXY` is wrong.

## Optional hardening
Firewall 80/443 to [Cloudflare's IP ranges](https://www.cloudflare.com/ips/) only, so nobody can skip Cloudflare by hitting `103.216.158.122` directly (that would also let them fake `X-Forwarded-For`).
