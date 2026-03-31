# @mainlayer/mastra

Mastra TypeScript agent framework integration for [Mainlayer](https://mainlayer.xyz) — Stripe for AI agents.

Give your Mastra agents the ability to discover, pay for, and monetize AI-accessible resources with a single npm package.

---

## Features

- **5 ready-made Mastra tools** — pay, check access, discover, create resources, and track revenue
- **Typed HTTP client** — full TypeScript types for every Mainlayer API response
- **Agent factory** — one call to spin up a pre-configured Mastra agent with all tools attached
- **Zod schemas** — inputs and outputs validated at runtime so bad data never reaches your logic
- **Error-safe by default** — every tool returns a `success` flag instead of throwing, keeping workflows stable

---

## Installation

```bash
npm install @mainlayer/mastra @mastra/core zod
```

### Peer dependencies

| Package | Version |
|---------|---------|
| `@mastra/core` | `>=0.1.0` |
| `zod` | `>=3.0.0` |

---

## Quick start

### 1. Create an agent

```typescript
import { createMainlayerAgent } from '@mainlayer/mastra'
import { openai } from '@ai-sdk/openai'

const agent = createMainlayerAgent({
  apiKey: process.env.MAINLAYER_API_KEY!,
  model: openai('gpt-4o'),
})

const response = await agent.generate(
  'Find weather data resources under $5 and pay for the cheapest one. My payer ID is agent-001.'
)
console.log(response.text)
```

### 2. Use individual tools

```typescript
import { payForResource, checkAccess, discoverResources } from '@mainlayer/mastra'

// Discover resources
const discovery = await discoverResources.execute!({
  context: {
    apiKey: process.env.MAINLAYER_API_KEY!,
    query: 'financial data',
    maxPrice: 10,
    limit: 5,
    offset: 0,
  },
  runId: 'run-1',
  mastra: mastraInstance,
  agent: myAgent,
})

console.log(discovery.resources)

// Pay for a resource
const payment = await payForResource.execute!({
  context: {
    apiKey: process.env.MAINLAYER_API_KEY!,
    resourceId: 'res_abc123',
    payerId: 'agent-001',
  },
  runId: 'run-2',
  mastra: mastraInstance,
  agent: myAgent,
})

if (payment.success) {
  console.log(`Paid! Payment ID: ${payment.paymentId}`)
}
```

### 3. Use the HTTP client directly

```typescript
import { MainlayerClient } from '@mainlayer/mastra'

const client = new MainlayerClient({ apiKey: process.env.MAINLAYER_API_KEY! })

// Create a resource to monetize your service
const resource = await client.createResource({
  name: 'My AI Service',
  description: 'Provides specialized NLP analysis.',
  price: 2.99,
  currency: 'USD',
  tags: ['nlp', 'analysis'],
})

console.log(`Resource published: ${resource.id}`)

// Check revenue
const revenue = await client.getRevenue()
console.log(`Total revenue: $${revenue.totalRevenue} (${revenue.paymentCount} payments)`)
```

---

## API Reference

### `createMainlayerAgent(config)`

Creates a Mastra `Agent` pre-configured with all five Mainlayer tools.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `apiKey` | `string` | Yes | Your Mainlayer API key |
| `model` | `LanguageModel` | Yes | Any Mastra-compatible LLM |
| `name` | `string` | No | Agent name (default: `"Mainlayer Agent"`) |
| `instructions` | `string` | No | System prompt override |

---

### Tools

All tools follow the same pattern: return a `success: boolean` with either a result or an `error: string`. They never throw in normal operation.

#### `payForResource`

Pay for access to a Mainlayer resource.

Input:
- `resourceId: string` — the resource to purchase
- `payerId: string` — the payer identifier (your agent's ID)
- `apiKey: string`

Output:
- `success: boolean`
- `paymentId?: string`
- `amount?: number`
- `currency?: string`
- `status?: 'pending' | 'completed' | 'failed'`
- `error?: string`

---

#### `checkAccess`

Check whether a payer currently has active access to a resource.

Input:
- `resourceId: string`
- `payerId: string`
- `apiKey: string`

Output:
- `hasAccess: boolean`
- `expiresAt?: string`
- `paymentId?: string`
- `error?: string`

---

#### `discoverResources`

Search for available resources on Mainlayer.

Input:
- `apiKey: string`
- `query?: string`
- `tags?: string[]`
- `minPrice?: number`
- `maxPrice?: number`
- `limit?: number` (default: 20)
- `offset?: number` (default: 0)

Output:
- `success: boolean`
- `resources: Resource[]`
- `total?: number`
- `error?: string`

---

#### `createResource`

Publish a new monetized resource.

Input:
- `apiKey: string`
- `name: string`
- `description: string`
- `price: number`
- `currency?: string` (default: `"USD"`)
- `tags?: string[]`
- `metadata?: Record<string, unknown>`

Output:
- `success: boolean`
- `resource?: Resource`
- `error?: string`

---

#### `getRevenue`

Retrieve revenue analytics for the authenticated account.

Input:
- `apiKey: string`
- `periodStart?: string` (ISO 8601)
- `periodEnd?: string` (ISO 8601)

Output:
- `success: boolean`
- `totalRevenue?: number`
- `currency?: string`
- `paymentCount?: number`
- `breakdown?: Array<{ resourceId, resourceName, revenue, paymentCount }>`
- `error?: string`

---

### `MainlayerClient`

Low-level HTTP client. All methods are async and throw a `MainlayerApiError` on failure.

```typescript
const client = new MainlayerClient({ apiKey, baseUrl?, timeoutMs? })

await client.payForResource(resourceId, payerId)
await client.checkAccess(resourceId, payerId)
await client.discoverResources({ query?, tags?, minPrice?, maxPrice?, limit?, offset? })
await client.createResource({ name, description, price, currency?, tags?, metadata? })
await client.getRevenue({ periodStart?, periodEnd? })
```

---

## Examples

Three runnable examples are included in the `examples/` directory.

### Vendor agent — monetize a service

```bash
MAINLAYER_API_KEY=<key> npx tsx examples/vendor-agent.ts
```

Demonstrates: creating a resource, checking revenue, scouting competition.

### Buyer agent — pay for services

```bash
MAINLAYER_API_KEY=<key> npx tsx examples/buyer-agent.ts
```

Demonstrates: discovering resources, checking existing access, paying for access.

### Workflow — orchestrated payment pipeline

```bash
MAINLAYER_API_KEY=<key> npx tsx examples/workflow.ts
```

Demonstrates a four-step Mastra workflow: discover → check access → pay → verify.

---

## Development

```bash
# Install dependencies
npm install

# Type-check
npm run typecheck

# Run tests (no network required — all mocked)
npm test

# Run tests with coverage
npm run test:coverage

# Build
npm run build
```

---

## Authentication

All requests are authenticated with your Mainlayer API key via the `Authorization: Bearer <key>` header. Keep your key in environment variables — never commit it to source control.

```bash
export MAINLAYER_API_KEY=your_key_here
```

---

## License

MIT — see [LICENSE](./LICENSE) for details.

---

Built for [Mainlayer](https://mainlayer.xyz) — payments infrastructure for AI agents.
