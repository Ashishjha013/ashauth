# AshAuth — OIDC Auth Service

A self-hosted **OAuth 2.0 / OpenID Connect (OIDC)** authentication server built with Node.js and Express. Register users, manage OAuth clients from a web dashboard, and let third-party apps delegate login through the **authorization code** flow with **RS256 JWT** access and refresh tokens.

## What it offers

- **User authentication** — Email/password signup and sign-in with bcrypt-hashed passwords
- **Developer dashboard** — Register, list, update, and delete OAuth clients (applications)
- **OAuth 2.0 authorization code flow** — Third-party apps redirect users here; after login, users return with a short-lived `code` to exchange for tokens
- **OIDC-style endpoints** — Discovery document, JWKS (`/certs`), token exchange, and `/userinfo`
- **JWT tokens** — Access and refresh tokens signed with **RS256** (RSA key pair in `cert/`)
- **Static web UI** — Landing page, dashboard, and sign-in/sign-up pages served from `public/`

## Tech stack

| Layer        | Technology                          |
| ------------ | ----------------------------------- |
| Runtime      | Node.js                             |
| Framework    | Express 5                           |
| Language     | TypeScript                          |
| Database     | PostgreSQL 16                       |
| ORM          | Drizzle ORM + Drizzle Kit           |
| Auth         | jsonwebtoken (RS256), bcryptjs      |
| Validation   | Zod                                 |
| Dev tooling  | tsc-watch, Docker Compose           |

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+ recommended)
- [Docker](https://www.docker.com/) (for PostgreSQL)
- [OpenSSL](https://www.openssl.org/) (for RSA keys; included on most systems, or use `generate-keys.bat` on Windows)

## Getting started

### 1. Clone and install

```bash
git clone https://github.com/ashishjha013/Auth-Service-OIDC-OAUTH.git
cd "Auth-Service-OIDC-OAUTH"
npm install
```

### 2. Start PostgreSQL

```bash
docker compose up -d
```

This starts Postgres on port **5555** with database `auth-oidc` (user/password: `test` / `test`).

### 3. Generate RSA keys

```bash
./generate-keys.sh
```

On Windows, run this via Git Bash or WSL.

### 4. Configure environment

Copy `env_sample.txt` to `.env` and adjust if needed:

```env
PORT=8000
DATABASE_URL=postgresql://test:test@localhost:5555/auth-oidc
MIGRATION_DATABASE_URL=postgresql://test:test@localhost:5555/auth-oidc
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d
```

### 5. Run database migrations

```bash
npm run db:migrate
```

### 6. Build and run

**Development (watch + auto-restart):**

```bash
npm run dev
```

**Production:**

```bash
npm run build
npm start
```

Open **http://localhost:8000** for the landing page and **http://localhost:8000/dashboard** for the developer dashboard.

## How to use

### Developer flow (register an OAuth client)

1. Open `/dashboard` and create an account (signup) or sign in.
2. Use the dashboard to register a new OAuth client with:
   - Application name, contact email, application URL, redirect URL
3. Save the returned **`clientId`** and **`clientSecret`** — you need them for the token exchange.

Protected client APIs require the dashboard access token:

```http
Authorization: Bearer <access_token>
```

| Method | Endpoint | Description |
| ------ | -------- | ------------- |
| `GET`  | `/clients` | List your OAuth clients |
| `POST` | `/client/register` | Register a new client |
| `PUT`  | `/client/:clientId` | Update a client |
| `DELETE` | `/client/:clientId` | Delete a client |

### Third-party app flow (authorization code)

1. **Redirect the user to login** with your client id and redirect URI:

   ```
   GET /user/login?client_id=<CLIENT_ID>&redirect_uri=<REDIRECT_URI>&state=<OPTIONAL_STATE>
   ```

   Or signup:

   ```
   GET /user/register?client_id=<CLIENT_ID>&redirect_uri=<REDIRECT_URI>&state=<OPTIONAL_STATE>
   ```

2. **User signs in** — The API returns a redirect URL containing a one-time `code` (valid for 5 minutes).

3. **Exchange the code for tokens:**

   ```http
   POST /token
   Content-Type: application/json

   {
     "code": "<authorization_code>",
     "client_id": "<CLIENT_ID>",
     "client_secret": "<CLIENT_SECRET>",
     "redirect_uri": "<REDIRECT_URI>"
   }
   ```

   Response includes `accessToken`, `refreshToken`, `tokenType`, and `user`.

4. **Call protected APIs** with the access token:

   ```http
   GET /userinfo
   Authorization: Bearer <access_token>
   ```

### OIDC discovery

| Endpoint | Description |
| -------- | ----------- |
| `GET /.well-known/openid-configuration` | Issuer, endpoints, supported grants |
| `GET /certs` | JWKS public key for verifying RS256 tokens |
| `GET /userinfo` | Authenticated user profile |
| `POST /token` | Authorization code → tokens |

## NPM scripts

| Script | Description |
| ------ | ----------- |
| `npm run dev` | Compile TypeScript on change and run the server |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled server |
| `npm run db:generate` | Generate Drizzle migrations from schema |
| `npm run db:migrate` | Apply migrations |
| `npm run studio` | Open Drizzle Studio |

## Project structure

```
├── cert/                 # RSA private.pem & public.pem (not in git)
├── drizzle/              # SQL migrations
├── public/               # Static HTML (landing, dashboard, auth pages)
├── src/
│   ├── index.ts          # HTTP server entry
│   ├── app/
│   │   ├── app.ts        # Express app setup
│   │   └── module/auth/  # Routes, controllers, services, middleware
│   └── db/               # Drizzle schema & DB config
├── docker-compose.yml    # PostgreSQL
└── generate-keys.bat     # Windows helper for RSA keys
```

## License

ISC
