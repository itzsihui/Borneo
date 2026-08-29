<div align="center">

# Borneo

[![Visa](https://img.shields.io/badge/Visa-scoped%20cards-1A1F71?style=for-the-badge&logo=visa&logoColor=white)](#features)
[![Fiat](https://img.shields.io/badge/Fiat-authorize%20first-0B6E4F?style=for-the-badge)](#features)
[![Stablecoin](https://img.shields.io/badge/Visa--powered-stablecoin-2775CA?style=for-the-badge)](#features)
[![Base](https://img.shields.io/badge/Base%20Sepolia-x402-0052FF?style=for-the-badge)](#features)
[![Next.js](https://img.shields.io/badge/Next.js-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![AWS](https://img.shields.io/badge/AWS-Bedrock%20%2B%20Lambda-FF9900?style=for-the-badge&logo=amazon-aws&logoColor=white)](#get-running)

<br />

<img src="https://readme-typing-svg.demolab.com?font=Space+Grotesk&weight=700&size=28&duration=3200&pause=900&color=1A1F71&center=true&vCenter=true&width=720&height=60&lines=Pay+with+Visa.+Agents+authorized.;Fiat+first.+Stablecoin+when+you+want+it.;Discover+%E2%86%92+authorize+%E2%86%92+settle+in+one+chat.;Scoped+cards.+Locked+quotes.+No+HTML+scrape." alt="Borneo typing headline" />

**AI shoppers discover and check out in one chat: Visa-scoped cards for fiat, plus a Visa-powered stablecoin rail when you want on-chain settle.**

Architecture → [`architecture.drawio`](./architecture.drawio) (open in [diagrams.net](https://app.diagrams.net/) — overview, product, protocol, x402, agents, AWS, data model).

</div>

---

## The problem

Agents still can’t shop like people.

- **No real card checkout** — most “agent shopping” demos scrape HTML, invent SKUs, or stop before money moves.
- **Merchants aren’t agent-ready** — human storefronts, no Visa receive path for AI buyers, no machine-readable catalog an agent can trust.
- **Trust dies at settle** — product copy tries to redirect the payee, skip authorize, or inject instructions into the pay agent.

**Borneo is where an AI can shop — and pay — like it has a real wallet and a real card.**

---

## Features

### 1. Visa-scoped checkout (fiat first)

Virtual card with **spend cap**, **merchant scope**, **TTL**, and **burn**. Nothing charges until the shopper **authorizes in chat**.

### 2. Merchant fiat receive

Sellers bind **Visa receive** + identity on setup. Dual-receive without leaving the agent flow — fiat lands where the merchant expects it.

### 3. Visa-powered stablecoin rail

Same conversation, second rail: **USDC on Base** via **HTTP 402 / x402** when you want on-chain settle. Fiat leads; stablecoin is opt-in, not the headline.

### 4. Personal salesperson buyer

Fashion chat that clarifies intent (date night? set vs one piece?), then ranks **live** SKUs across seller catalogs — not a hardcoded demo aisle.

### 5. Locked-quote settle

The pay path only sees a structured quote (slug / SKU / price / payee). **Catalog prose never enters the pay agent.**

### 6. Injection quarantine

Prompt-injection-shaped listings get flagged and held out of fashion picks. Settle still locks payee and amount even if someone taps a hostile title.

### 7. Agentic storefront protocol

Agents read `/llms.txt`, `/registry.json`, and `/s/{slug}/catalog.json`. **Do not scrape HTML.** Publish once — every agent on the network can discover you.

### 8. Conversational merchant onboard

Talk inventory, drop CSV, or paste a store URL → publish a live agent storefront.

### 9. Governance

Buyer spend limits (per tx / day / week). Merchant rails, price floors, market listing — policies that actually gate checkout.

```mermaid
flowchart LR
  chat[BuyerChat] --> discover[Discover]
  discover --> quarantine[Quarantine]
  quarantine --> auth[Authorize]
  auth --> visaRail[VisaScopedCard]
  auth --> stableRail[VisaPoweredStablecoin_x402]
```

---

## Try it

```bash
npm install
cp .env.example .env
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

| Path | What it is |
|---|---|
| `/buyer` | Salesperson chat → Visa or USDC settle |
| `/onboard` | Merchant agent: inventory → published store |
| `/market` | Human + agent marketplace index |
| `/dashboard` | Ops view of both payment rails |
| `/demo` | End-to-end protocol demo |
| `/s/hackathon-shirts/llms.txt` | Seed store agent discovery |

---

## Get running

### Prerequisites

- Node.js 20+ and npm
- (Optional) [AWS CLI v2](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) — Bedrock agents and/or protocol deploy
- (Optional) Funded Base Sepolia wallet with USDC for live x402 settlement

Skip AWS entirely if you want: the app still runs, `llms.txt` / HTTP **402** still work, and agents fall back to deterministic tools when Bedrock is unavailable.

### Setup

1. **Install**

```bash
cd Borneo
npm install
cp .env.example .env
```

2. **AWS auth** (optional — Bedrock and/or Lambda deploy)

**A. Access keys in `.env` (runtime — Bedrock / DynamoDB)**

IAM → Users → Security credentials → Create access key, then:

```bash
AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
BEDROCK_ENABLED=true
BEDROCK_MODEL_ID=anthropic.claude-3-haiku-20240307-v1:0
```

Enable model access in **Amazon Bedrock → Model access** (same region).

**B. AWS SSO / CLI profile (hackathon credits + `protocol:deploy`)**

```bash
aws configure sso
# start URL, region, account, role — profile often AdministratorAccess-<account-id>

aws sso login --profile AdministratorAccess-283515821863
export AWS_PROFILE=AdministratorAccess-283515821863
export AWS_REGION=ap-southeast-1
aws sts get-caller-identity
```

Replace the account id with yours (`aws configure list-profiles`). Personal accounts can use `aws configure` or path A.

IAM needs Bedrock `InvokeModel` / Converse; deploy also needs CloudFormation, Lambda, API Gateway, DynamoDB, S3, IAM, CloudWatch, SSM.

3. **Env knobs**

| Var | Required? | Purpose |
|---|---|---|
| `MERCHANT_ADDRESS` | Recommended | Base Sepolia pay-to for x402 |
| `BUYER_PRIVATE_KEY` | Optional | Live USDC settlement; without it, **HTTP 402 still fires** |
| `BUYER_ADDRESS` | Optional | Buyer address paired with the key |
| `OPENAI_API_KEY` | Optional | Stronger salesperson / merchant LLM + Whisper |
| `AWS_*` / `BEDROCK_*` | Optional | See step 2 |
| `PROTOCOL_BASE_URL` / `AISLE_TABLE` | Optional | After AWS protocol deploy — agents hit API Gateway |

Base Sepolia defaults (RPC, chain id, Circle USDC, Basescan) ship in `.env.example`.

4. **Run**

```bash
npm run dev
```

### Optional: AWS protocol deploy

Requires `aws sts get-caller-identity` to succeed. Deploys storefront handlers as API Gateway + Lambda + DynamoDB + CloudWatch (`infra/protocol.yaml`).

```bash
export AWS_REGION=ap-southeast-1 MERCHANT_ADDRESS=0xYourMerchant
npm run protocol:deploy
```

Paste `PROTOCOL_BASE_URL` and `AISLE_TABLE` into `.env`, restart `npm run dev`. Tear down the CloudFormation stack when you’re done.

#### Buyer says `store not found` / Expected 402

AWS login can be fine while the buyer still fails — the buyer calls `PROTOCOL_BASE_URL`, not your browser session.

1. Check `/api/ops` → `aws.protocolBase`.
2. It must match the **current** stack `ProtocolBaseUrl` (redeploys often mint a new API id).
3. Update `PROTOCOL_BASE_URL` and `NEXT_PUBLIC_PROTOCOL_BASE_URL`, then **restart** `npm run dev`.
4. Smoke: `curl -s "$PROTOCOL_BASE_URL/s/your-slug/llms.txt"` → **200**; `POST …/buy` without payment → **402**.

Stores from `/onboard` land in `AISLE_TABLE`. A stale `PROTOCOL_BASE_URL` can make local `/s/…/llms.txt` 200 while the buyer still 404s.

### Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Local Next.js server |
| `npm run build` / `npm start` | Production build |
| `npm run lint` | ESLint |
| `npm run protocol:build` | Bundle Lambda artifact |
| `npm run protocol:deploy` | Build + upload + CloudFormation deploy |
