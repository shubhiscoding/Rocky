# Rocky — AUDD Agent on Solana

Rocky is an AI financial agent that lets users manage **AUDD** (Australian Dollar stablecoin on Solana) through plain-English conversation. Say *"Invest 100 AUDD"* and Rocky understands the intent, asks for confirmation, executes the on-chain transaction, and reports back.

Rocky's personality is modelled on the Eridian alien from *Project Hail Mary* by Andy Weir — stilted broken English, enthusiastic repetition ("amaze amaze"), and short direct sentences.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, Turbopack) |
| AI | Vercel AI SDK 4.1 — `streamText`, `useChat`, tool calling |
| LLM | Claude 3.5 Sonnet (primary) · GPT-4o (fallback) · GPT-4o-mini (orchestrator) |
| Auth & Wallets | Privy — embedded wallets + OAuth |
| On-chain | SolanaAgentKit (slimeonmyhead fork) — Jupiter swaps · Lulo yield |
| Portfolio data | Helius SDK |
| Database | Prisma 6 + PostgreSQL |
| UI | Tailwind CSS · shadcn/ui · Framer Motion |

---

## Project Structure

```
rocky/
├── prisma/
│   └── schema.prisma          # 4-model schema: User, Wallet, Conversation, Message
│
├── src/
│   ├── ai/
│   │   ├── audd/
│   │   │   └── audd-tools.tsx # The 4 AUDD tools + askForConfirmation
│   │   └── providers.tsx      # LLM config, system prompt, tool registry, orchestrator
│   │
│   ├── app/
│   │   ├── page.tsx           # Landing page
│   │   ├── layout.tsx         # Root layout + metadata
│   │   ├── globals.css
│   │   ├── api/
│   │   │   ├── chat/
│   │   │   │   ├── route.ts              # Main streaming chat endpoint
│   │   │   │   └── [conversationId]/
│   │   │   │       └── route.ts          # Polling endpoint for message sync
│   │   │   ├── conversations/route.ts    # List conversations
│   │   │   └── wallet/[address]/
│   │   │       └── portfolio/route.ts    # Wallet portfolio API
│   │   └── (user)/
│   │       ├── layout.tsx                # Auth gate + sidebar shell
│   │       ├── home/
│   │       │   ├── page.tsx
│   │       │   ├── home-content.tsx      # Landing chat + suggestions
│   │       │   ├── conversation-input.tsx
│   │       │   ├── suggestion-card.tsx
│   │       │   └── data/suggestions.ts  # 6 AUDD prompt suggestions
│   │       └── chat/[id]/
│   │           ├── page.tsx             # Chat page (server component)
│   │           ├── chat-interface.tsx   # Full chat UI (messages, input, tools)
│   │           └── chat-skeleton.tsx
│   │
│   ├── components/
│   │   ├── dashboard/
│   │   │   ├── app-sidebar.tsx
│   │   │   ├── app-sidebar-conversations.tsx
│   │   │   └── app-sidebar-user.tsx
│   │   ├── message/
│   │   │   ├── audd-results.tsx         # AuddBalanceCard, SwapResultCard, InvestResultCard, PortfolioView
│   │   │   ├── tool-result.tsx          # Generic collapsible tool result wrapper
│   │   │   └── wallet-portfolio.tsx     # Token list component
│   │   ├── ui/                          # shadcn/ui + custom components
│   │   ├── confimation.tsx              # Confirm/deny dialog for tool execution
│   │   ├── floating-wallet.tsx          # SOL balance badge in chat input
│   │   ├── logo.tsx                     # Rocky "R" badge
│   │   ├── provider-auth.tsx            # Privy auth provider
│   │   └── provider-theme.tsx
│   │
│   ├── hooks/
│   │   ├── use-user.ts                  # Auth + user data (Privy + DB)
│   │   ├── use-conversations.ts
│   │   ├── use-wallet-portfolio.ts
│   │   └── use-polling.ts
│   │
│   ├── lib/
│   │   ├── constants.ts                 # AUDD_MINT, USDC_MINT, SOL_MINT, RPC_URL
│   │   ├── prisma.ts
│   │   ├── safe-action.ts
│   │   ├── utils.ts
│   │   └── solana/
│   │       ├── helius.ts                # searchWalletAssets, token price lookup
│   │       ├── index.ts                 # SolanaUtils, createConnection
│   │       ├── PrivyEmbeddedWallet.ts   # Privy → Keypair adapter for SolanaAgentKit
│   │       └── wallet-generator.ts
│   │
│   ├── server/
│   │   ├── actions/
│   │   │   ├── ai.ts                    # retrieveAgentKit() — builds SolanaAgentKit from session wallet
│   │   │   ├── user.ts                  # verifyUser(), getOrCreateUser(), syncEmbeddedWallets()
│   │   │   ├── conversation.ts          # markConversationAsRead()
│   │   │   ├── orchestrator.ts          # GPT-4o-mini intent routing
│   │   │   └── wallet.ts
│   │   ├── db/
│   │   │   └── queries.ts               # Typed Prisma helpers
│   │   └── utils/index.ts
│   │
│   ├── types/
│   │   ├── db.ts                        # NeurUser, PrismaUser, EmbeddedWallet, etc.
│   │   ├── util.ts                      # ToolActionResult, ToolUpdate
│   │   └── helius/                      # Helius API response types
│   │
│   └── middleware.ts                    # Privy auth middleware — protects /home, /chat
```

---

## How It Works

### Request flow

```
User message
    │
    ▼
POST /api/chat
    │
    ├─ orchestrator (GPT-4o-mini)
    │   └─ reads intent → returns required tool names as JSON array
    │
    ├─ streamText() with filtered toolset
    │   └─ Rocky (Claude 3.5 Sonnet) reasons and calls tools
    │
    ├─ Tool execution
    │   └─ retrieveAgentKit() → SolanaAgentKit → Jupiter / Lulo / Helius
    │
    └─ Streamed response → useChat() → ChatInterface renders tool cards
```

### Confirmation flow

Tools marked `requiresConfirmation: true` (swap, invest) always go through two turns:

1. Rocky calls `askForConfirmation` with a plain-English summary → **stops**
2. User clicks Confirm or Deny in the UI
3. On confirm: Rocky calls the actual tool (swap / invest) in the next turn

### Tools

| Tool | Description | Confirmation |
|---|---|---|
| `checkAuddBalance` | AUDD + SOL balance for the session wallet | No |
| `swapAudd` | Swap AUDD → USDC or SOL via Jupiter | Yes |
| `investAudd` | Deposit AUDD into Lulo for yield | Yes |
| `getPortfolio` | Full wallet portfolio, AUDD highlighted | No |
| `askForConfirmation` | Pause and ask user before executing | — |

---

## Database Schema

```
User ──< Wallet
User ──< Conversation ──< Message
```

- **User** — linked to Privy ID
- **Wallet** — encrypted private key stored per user; Privy embedded wallets are synced here
- **Conversation** — chat session with title and visibility
- **Message** — role, content, tool invocations (JSON), attachments (JSON)

---

## Getting Started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
# Fill in the values — minimum required:
#   NEXT_PUBLIC_PRIVY_APP_ID, PRIVY_APP_SECRET
#   ANTHROPIC_API_KEY (or OPENAI_API_KEY)
#   DATABASE_URL, DIRECT_URL
#   NEXT_PUBLIC_HELIUS_RPC_URL, HELIUS_API_KEY
#   WALLET_ENCRYPTION_KEY  ← generate with: openssl rand -base64 32
```

### 3. Push database schema

```bash
pnpm db:push
```

### 4. Run dev server

```bash
pnpm dev
# → http://localhost:3000
```

---

## Environment Variables

See [.env.example](.env.example) for the full annotated list. The minimum set to get running:

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_PRIVY_APP_ID` | Yes | Privy dashboard → App settings |
| `PRIVY_APP_SECRET` | Yes | Privy dashboard → App settings |
| `ANTHROPIC_API_KEY` | Yes* | *or `OPENAI_API_KEY` |
| `OPENAI_API_KEY` | Yes* | Needed for orchestrator (GPT-4o-mini) regardless |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `DIRECT_URL` | Yes | Direct (non-pooled) Postgres URL for migrations |
| `NEXT_PUBLIC_HELIUS_RPC_URL` | Yes | Helius RPC endpoint with API key |
| `HELIUS_API_KEY` | Yes | For portfolio / token data |
| `WALLET_ENCRYPTION_KEY` | Yes | 32-byte secret — never rotate after first use |
| `NEXT_PUBLIC_SOLANA_CLUSTER` | No | `devnet` (default) or `mainnet-beta` |
| `NEXT_PUBLIC_AUDD_MINT` | No | Defaults to mainnet AUDD mint |

---

## Roadmap

### MVP (current)
- [x] Privy auth with embedded Solana wallets
- [x] Chat UI with conversation history and DB persistence
- [x] Check AUDD + SOL balance
- [x] Swap AUDD → USDC / SOL via Jupiter (with confirmation)
- [x] Invest AUDD via Lulo yield protocol (with confirmation)
- [x] Full wallet portfolio view
- [x] Rocky Eridian alien personality (Project Hail Mary)
- [x] Orchestrator routing (GPT-4o-mini selects tools per message)

### Near-term
- [ ] Devnet end-to-end test with real transactions
- [ ] Mainnet launch with production AUDD mint
- [ ] Swap any token → AUDD (on-ramp)
- [ ] Lulo withdrawal / position management
- [ ] Transaction history view
- [ ] Multi-wallet support

### Later
- [ ] Yield strategy comparisons (Lulo vs alternatives)
- [ ] AUDD price alerts
- [ ] Recurring investment scheduling (DCA)
- [ ] Mobile-optimised UI
- [ ] Public share links for conversations

---

## Key Constants

| Constant | Value |
|---|---|
| AUDD mint | `AUDDttiEpCydTm7joUMbYddm72jAWXZnCpPZtDoxqBSw` |
| USDC mint | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` |
| SOL mint | `So11111111111111111111111111111111111111112` |
| Default slippage | 300 bps (3%) |

---

## Credits

Built on the [Neur](https://github.com/neur-sh/neur-app) open-source Solana agent framework. Uses [SolanaAgentKit](https://github.com/slimeonmyhead/solana-agent-kit) for on-chain actions.
