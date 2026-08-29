# Aisle

Agentic Storefront Protocol: merchants talk, agents pay — **Avalanche x402**, **StraitsX** scoped cards, **AWS** Bedrock + serverless protocol.

Architecture: [`architecture.drawio`](./architecture.drawio) (multi-page — open in [diagrams.net](https://app.diagrams.net/)). Tabs: overview, product, protocol, x402, StraitsX, agents, AWS, data model.

## Prerequisites

- Node.js 20+
- npm
- (Optional) [AWS CLI v2](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) — needed for protocol deploy; also handy to verify Bedrock access
- (Optional) Funded Avalanche Fuji wallet with XSGD for live x402 settlement

You can skip AWS entirely: the app still runs, `llms.txt` / x402 **402** still work, and agents fall back to deterministic tools when Bedrock is unavailable.

## Setup

1. **Clone and install**

```bash
git clone https://github.com/itzsihui/Aisle.git
cd Aisle
npm install
```

2. **Create env file**

```bash
cp .env.example .env
```

3. **Log into AWS** (optional — Bedrock agents and/or Lambda deploy)

Pick one auth path:

**A. Access keys in `.env` (app runtime — Bedrock / DynamoDB)**

In the AWS console: **IAM → Users → Security credentials → Create access key**. Paste into `.env`:

```bash
AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
BEDROCK_ENABLED=true
BEDROCK_MODEL_ID=anthropic.claude-3-haiku-20240307-v1:0
```

Also enable model access in the console: **Amazon Bedrock → Model access** (same region), for the model id above.

**B. AWS SSO / CLI profile (hackathon credits + `protocol:deploy`)**

Hackathon and org accounts usually use IAM Identity Center. After you accept the invite, open the AWS access portal, pick the account/role, then set up the CLI once:

```bash
aws configure sso
# follow prompts (start URL, region, account, role)
# profile name often looks like: AdministratorAccess-<account-id>
```

Each session (tokens expire), log in with **your** profile name:

```bash
aws sso login --profile AdministratorAccess-283515821863
export AWS_PROFILE=AdministratorAccess-283515821863
export AWS_REGION=ap-southeast-1
```

Replace `283515821863` with the account id from your access portal / `~/.aws/config`. List profiles with `aws configure list-profiles`.

Confirm:

```bash
aws sts get-caller-identity
```

You should see `Account`, `UserId`, and `Arn`. If this fails, fix SSO before `npm run protocol:deploy`.

**Personal account (no SSO):** use `aws configure` with an IAM access key, or put keys in `.env` (path A). Same `sts get-caller-identity` check.

IAM needs at least: Bedrock `InvokeModel` / Converse for agents; for deploy, CloudFormation + Lambda + API Gateway + DynamoDB + S3 + IAM + CloudWatch + SSM in the target account/region.

4. **Configure remaining `.env`**

| Var | Required? | Purpose |
|---|---|---|
| `MERCHANT_ADDRESS` | Recommended | Avalanche pay-to address for x402 |
| `BUYER_PRIVATE_KEY` | Optional | Buyer wallet for live XSGD settlement; without it, **HTTP 402 still fires** |
| `BUYER_ADDRESS` | Optional | Buyer address paired with the private key |
| `STRAITSX_MCP_URL` | Optional | Card MCP (`…/sandbox/sse` or production); defaults in `.env.example` |
| `AWS_*` / `BEDROCK_*` | Optional | See step 3 |
| `PROTOCOL_BASE_URL` / `AISLE_TABLE` | Optional | Set after AWS protocol deploy so agents hit API Gateway instead of Next |

Avalanche Fuji defaults (RPC, chain id, XSGD token, Snowtrace) are already in `.env.example`. Uncomment the mainnet block only for live XSGD.

5. **Start the app**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Useful paths:

| Path | What it is |
|---|---|
| `/onboard` | Merchant agent: inventory → published store |
| `/demo` | End-to-end protocol demo (x402 + StraitsX) |
| `/buyer` | Buyer agent surface |
| `/market` | Sample storefronts |
| `/dashboard` | Ops view of both payment rails |
| `/s/hackathon-shirts/llms.txt` | Seed store agent discovery |

## Optional: AWS protocol deploy

Requires AWS CLI logged in (`aws sts get-caller-identity` succeeds). Deploys the same storefront handlers as API Gateway + Lambda + DynamoDB + CloudWatch (`infra/protocol.yaml`).

```bash
export AWS_REGION=ap-southeast-1 MERCHANT_ADDRESS=0xYourMerchant
npm run protocol:deploy
```

Paste the printed `PROTOCOL_BASE_URL` and `AISLE_TABLE` into `.env`, then restart `npm run dev`. Delete the CloudFormation stack when you are done.

### Buyer says `store not found` / Expected 402

AWS login can be fine while the buyer still fails. The buyer does **not** use your browser session — it calls `PROTOCOL_BASE_URL`.

1. Confirm the URL your app is using: open `/api/ops` and check `aws.protocolBase`.
2. It must match the **current** stack output (`ProtocolBaseUrl` from `npm run protocol:deploy`). Redeploys often mint a **new** API id (e.g. `jx1brt3bz6…` vs an old `51xznqu32m…`).
3. Update both `PROTOCOL_BASE_URL` and `NEXT_PUBLIC_PROTOCOL_BASE_URL` in `.env`, then **restart** `npm run dev` (env is loaded at process start).
4. Smoke test: `curl -s "$PROTOCOL_BASE_URL/s/your-slug/llms.txt"` should be **200**, and `POST …/buy` without payment should be **402**.

Stores published via `/onboard` land in `AISLE_TABLE`. If `PROTOCOL_BASE_URL` points at an old API/table, local `/s/…/llms.txt` can be 200 while the buyer still gets 404.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Local Next.js server |
| `npm run build` / `npm start` | Production build |
| `npm run lint` | ESLint |
| `npm run protocol:build` | Bundle Lambda artifact |
| `npm run protocol:deploy` | Build + upload + CloudFormation deploy |
