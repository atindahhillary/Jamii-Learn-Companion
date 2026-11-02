# Jamii Learn Companion

A Kiswahili and English learning companion that helps Indigenous and local communities in Kenya understand carbon markets on their own terms. It listens first, turns what people say into a community training plan, and gives facilitators dashboards and a report.

## Live demo

The public site runs with `VITE_DEMO=1`: everything happens in the visitor's browser (`src/demo.ts`), with fictional sample data and prepared, sourced answers. No database, no accounts, no phone numbers, and what a visitor types stays on their device. Live AI and WhatsApp are off until the backend below is deployed. To go full stack, remove `.vercelignore`, change `buildCommand` back to `npm run build`, and add the `/api` rewrite.

## Run it locally

Needs Node 24. Uses embedded Postgres (PGlite), so no account or Docker. Data resets on restart unless `PGLITE_DIR=.data` is set.

```bash
npm install
```

In one terminal (PowerShell):

```powershell
$env:SEED_DEMO="1"; npm run api
```

In a second terminal:

```bash
npm run dev
```

Open http://localhost:5199. The API prints the demo admin login. Demo learner: `0700000002`, PIN `482913`. All demo people are fictional.

`npm test` runs the checks. `npm run check` type-checks.

## How the vision paper maps to the app

| Capability | Where |
| --- | --- |
| Community of practice | Circles, `@msaidizi` calls the AI only when asked |
| Explanations at different levels | Audience setting (leader, herder, student, elder, trainer) |
| Mapping learners | Admin Learners table and journey stages. Village level only, no GPS |
| Instant creativity | "Give an analogy" and "Give a game" buttons |
| Curriculum over time | 8 modules ordered by each community's gaps, two days apart |
| Exercise-based learning | Village meeting role play |
| Diligence | Contract review. Raises questions, never says "safe" |
| Translation | Translate tool plus glossary |
| Understanding AI trust | Module 8, "This is AI" labels, sources, "Not right" button |

## The journey

Lessons are a conversation, not slides. Mzee Sironka, a fictional AI guide, walks the learner through one fictional village, Enkare (`shared/story.ts`). Each stop opens with a scene, asks a question in the learner's own words (which feeds the community analysis), checks understanding through choices, and plants a tree on the learner's own land, which slowly comes back to life. Read-aloud uses the device voice where one exists for the language.

## The council

Questions route by keyword to one of seven seats: Carbon Analyst, Community Lawyer, Knowledge Keeper, Rangeland Ecologist, Community Educator, Benefit Analyst, AI Safety Guide. These are AI roles, not real people, and the app says so.

## How analysis works

`server/analyze.ts` is rule-based on purpose so a community can audit it. Each contribution is classed by theme and type. Gap = 60% quiz result + 40% share of concerns and questions. Basics stay first; other modules follow the largest gaps.

## Safety and privacy

- Phones are encrypted (AES-256-GCM) and looked up by HMAC. Admins only see masked numbers.
- PINs use scrypt. Five wrong tries lock the account for 15 minutes. Sessions are hashed, httpOnly, SameSite=Strict.
- Roles are enforced on the server. Nobody can sign up as admin.
- Phone numbers, emails, ID numbers and PINs are redacted before storage and before any AI call.
- AI is opt-in. Without consent or a key, the bot uses sourced offline cards. Model text is treated as data, and documents cannot give it instructions.
- Report quotes need consent, no names, five or more different people, and never include traditional knowledge.
- People can download or delete all their data. Facilitator actions are audited.
- WhatsApp webhooks verify Meta's signature and ignore replays. A link code only works from the phone that requested it.
- `/api` is never cached on the device.

## Deploying

1. Create a Postgres database and set `DATABASE_URL`. Prefer a provider with verified TLS.
2. Set `APP_SECRET` (32+ random characters). Changing it later makes stored phones unreadable.
3. Create the first admin: `ADMIN_PHONE=... ADMIN_SECRET=... npm run make-admin`
4. Optional: `ANTHROPIC_API_KEY` for AI answers. Default model is `claude-opus-5-5`; set `CLAUDE_MODEL` to change it and `MAX_AI_PER_DAY` to cap spend.
5. Deploy to Vercel. `vercel.json` carries the rewrites and security headers.

## Connecting WhatsApp

1. In Meta Business, create a WhatsApp Business app and verify the business and number.
2. Set `WA_TOKEN`, `WA_PHONE_ID`, `WA_BOT_NUMBER` (digits only, with 254), `WA_APP_SECRET`, `WA_VERIFY_TOKEN`.
3. Set the webhook to `https://<domain>/api/whatsapp/webhook` and subscribe to `messages`.
4. Optional: register a template with one code variable and set `WA_TEMPLATE` so the bot can message first.

Commands on WhatsApp: `JIUNGE <code>`, `SOMO`, `MAENDELEO`, `MENYU`, `ACHA`, `ANZA`.

## Before real communities use this

- Native Kiswahili review of all content, ideally with community members.
- Kenyan counsel review of the legal content and privacy terms, plus ODPC registration and a decision on data residency.
- Community review of how traditional knowledge is handled.

Legal facts come from the Climate Change (Carbon Markets) Regulations 2024 (LN 84 of 2024), reg 28, reg 29 and the Fourth Schedule. Check for amendments.
