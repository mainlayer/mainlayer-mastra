# Examples

Three complete, runnable examples demonstrating different Mainlayer integration patterns with Mastra.

## Quick Start

All examples require a valid Mainlayer API key:

```bash
export MAINLAYER_API_KEY=ml_live_your_key_here
```

Run any example with:

```bash
npx tsx examples/<example-name>.ts
```

---

## 1. Monetized Workflow (`monetized-workflow.ts`)

**What it does:**
- Creates a new monetized resource
- Discovers resources in the catalog
- Pays for access to a resource
- Verifies access was granted
- Checks revenue analytics
- Demonstrates Mastra agent automation

**Best for:**
Learning the complete end-to-end flow with error handling and real-world scenarios.

**Run:**

```bash
MAINLAYER_API_KEY=ml_live_... npx tsx examples/monetized-workflow.ts
```

**Output:**

```
📦 Step 1: Creating a monetized resource...
✓ Resource created: res_abc123
  Name: Real-time Market Data API
  Price: $4.99

🔍 Step 2: Discovering resources...
✓ Found 3 resource(s):
  - Market Analytics ($4.99)
  - ...

💳 Step 3: Paying for resource...
✓ Payment completed: pay_xyz789

✓ Workflow completed successfully!
```

---

## 2. Vendor Agent (`vendor-agent.ts`)

**What it does:**
- Creates a new resource to monetize
- Checks revenue for published resources
- Lists all active resources
- Demonstrates the vendor perspective

**Best for:**
Building services that want to monetize their APIs or AI tools.

**Run:**

```bash
MAINLAYER_API_KEY=ml_live_... npx tsx examples/vendor-agent.ts
```

**Sample prompt:**
"I want to monetize my NLP analysis service at $10/month. Create a resource for it and show me the revenue."

---

## 3. Buyer Agent (`buyer-agent.ts`)

**What it does:**
- Discovers available resources
- Checks existing access
- Pays for access to resources
- Demonstrates the buyer perspective

**Best for:**
Building agents that need to purchase and use external services.

**Run:**

```bash
MAINLAYER_API_KEY=ml_live_... npx tsx examples/buyer-agent.ts
```

**Sample prompt:**
"Find me 5 cheap data APIs I can use. Pick the best one and pay for access."

---

## Integration Patterns

### Pattern 1: Simple Tool Usage

Use individual tools directly without an agent:

```typescript
import { payForResource } from '@mainlayer/mastra'

const result = await payForResource.execute!({
  context: {
    apiKey: process.env.MAINLAYER_API_KEY!,
    resourceId: 'res_abc123',
    payerId: 'agent-001',
  },
})

if (result.success) {
  console.log(`Paid! Payment ID: ${result.paymentId}`)
}
```

### Pattern 2: Pre-configured Agent

Use the agent factory for out-of-the-box functionality:

```typescript
import { createMainlayerAgent } from '@mainlayer/mastra'
import { openai } from '@ai-sdk/openai'

const agent = createMainlayerAgent({
  apiKey: process.env.MAINLAYER_API_KEY!,
  model: openai('gpt-4o'),
})

const response = await agent.generate('Find cheap APIs and pay for one.')
console.log(response.text)
```

### Pattern 3: Custom Agent with Tools

Extend the Mainlayer tools with your own logic:

```typescript
import { Agent } from '@mastra/core'
import { mainlayerTools } from '@mainlayer/mastra'

const agent = new Agent({
  name: 'Custom Agent',
  model: yourModel,
  tools: {
    ...mainlayerTools.reduce((acc, tool) => ({ ...acc, [tool.id]: tool }), {}),
    yourCustomTool: customTool,
  },
})
```

---

## Error Handling

All examples use try-catch to handle errors gracefully:

```typescript
try {
  const resource = await client.createResource({
    name: 'My API',
    description: 'My description',
    price: 10.0,
  })
  console.log(`Created: ${resource.id}`)
} catch (error) {
  console.error('Failed to create resource:', (error as Error).message)
}
```

---

## Debugging

Enable verbose logging:

```typescript
const client = new MainlayerClient({
  apiKey: process.env.MAINLAYER_API_KEY!,
  baseUrl: 'https://api.mainlayer.fr',
  timeoutMs: 30_000,
})

// Add logging
import { MainlayerClient } from '@mainlayer/mastra'
// (In production, use a proper logger)
console.log('Making request to:', client)
```

---

## Testing Locally

For development without a real API key, you can mock the client:

```typescript
import { vi } from 'vitest'

// Mock fetch
const mockFetch = vi.fn()
globalThis.fetch = mockFetch as unknown as typeof fetch

mockFetch.mockResolvedValue({
  ok: true,
  json: async () => ({
    id: 'res_test123',
    name: 'Test Resource',
    price: 9.99,
  }),
})
```

---

## Next Steps

1. **Extend the examples** — Add your own business logic
2. **Integrate with frameworks** — Use with Nest.js, Express, or any Node.js app
3. **Deploy** — Run as background jobs or microservices
4. **Monitor** — Track payments and revenue in production

---

## Resources

- **API Docs:** https://docs.mainlayer.fr
- **Dashboard:** https://app.mainlayer.fr
- **Support:** support@mainlayer.xyz
