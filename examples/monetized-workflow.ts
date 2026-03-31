/**
 * Monetized Workflow Example
 *
 * Demonstrates a complete end-to-end workflow:
 * 1. Create a new monetized resource
 * 2. Discover it in the resource catalog
 * 3. Pay for access to the resource
 * 4. Verify access was granted
 * 5. Check revenue analytics
 *
 * Run: MAINLAYER_API_KEY=<your_key> npx tsx examples/monetized-workflow.ts
 */

import { createMainlayerAgent } from '../dist/index.js'
import { MainlayerClient } from '../dist/index.js'
import { openai } from '@ai-sdk/openai'

const API_KEY = process.env.MAINLAYER_API_KEY
if (!API_KEY) {
  throw new Error('MAINLAYER_API_KEY environment variable is required')
}

const client = new MainlayerClient({ apiKey: API_KEY })

/**
 * Step 1: Create a new monetized resource
 */
async function createResource() {
  console.log('\n📦 Step 1: Creating a monetized resource...')

  const resource = await client.createResource({
    name: 'Real-time Market Data API',
    description: 'Provides live market data, pricing, and trends for financial instruments.',
    price: 4.99,
    currency: 'USD',
    tags: ['financial-data', 'market-data', 'api'],
    metadata: {
      rateLimit: '10000 req/month',
      dataRefresh: '1 minute',
      coverage: 'US stocks, crypto, commodities',
    },
  })

  console.log(`✓ Resource created: ${resource.id}`)
  console.log(`  Name: ${resource.name}`)
  console.log(`  Price: $${resource.price}`)

  return resource.id
}

/**
 * Step 2: Discover the resource
 */
async function discoverResources(query: string) {
  console.log('\n🔍 Step 2: Discovering resources matching query...')

  const results = await client.discoverResources({
    query,
    limit: 5,
  })

  console.log(`✓ Found ${results.length} resource(s):`)
  results.forEach((r) => {
    console.log(`  - ${r.name} ($${r.price})`)
  })

  return results
}

/**
 * Step 3: Pay for a resource
 */
async function payForResource(resourceId: string) {
  console.log(`\n💳 Step 3: Paying for resource...`)

  const payment = await client.payForResource(resourceId, 'buyer-agent-001')

  console.log(`✓ Payment completed:`)
  console.log(`  Payment ID: ${payment.paymentId}`)
  console.log(`  Amount: ${payment.currency} ${payment.amount}`)
  console.log(`  Status: ${payment.status}`)

  return payment
}

/**
 * Step 4: Check access to the resource
 */
async function checkAccess(resourceId: string) {
  console.log(`\n🔐 Step 4: Verifying access...`)

  const status = await client.checkAccess(resourceId, 'buyer-agent-001')

  if (status.hasAccess) {
    console.log(`✓ Access verified!`)
    if (status.expiresAt) {
      console.log(`  Expires: ${status.expiresAt}`)
    }
  } else {
    console.log(`✗ Access denied`)
  }

  return status
}

/**
 * Step 5: Check revenue
 */
async function checkRevenue() {
  console.log(`\n📊 Step 5: Checking revenue analytics...`)

  const revenue = await client.getRevenue({
    periodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    periodEnd: new Date().toISOString(),
  })

  console.log(`✓ Revenue report:`)
  console.log(`  Total: ${revenue.currency} ${revenue.totalRevenue.toFixed(2)}`)
  console.log(`  Payment count: ${revenue.paymentCount}`)

  if (revenue.breakdown && revenue.breakdown.length > 0) {
    console.log(`\n  Per-resource breakdown:`)
    revenue.breakdown.forEach((row) => {
      console.log(
        `    - ${row.resourceName}: ${revenue.currency} ${row.revenue.toFixed(2)} (${row.paymentCount} payments)`,
      )
    })
  }

  return revenue
}

/**
 * Step 6: Use a Mastra agent to automate the workflow
 */
async function automateWithAgent() {
  console.log(`\n🤖 Step 6: Automating workflow with Mastra agent...`)

  const agent = createMainlayerAgent({
    apiKey: API_KEY,
    model: openai('gpt-4o-mini'),
    name: 'Monetization Agent',
    instructions: `You are a Mainlayer monetization agent.
Your job is to:
1. Help creators discover resources in the Mainlayer catalog
2. Assist with payment workflows
3. Provide revenue insights

Use the available tools to help users discover, pay for, and create resources.`,
  })

  try {
    const response = await agent.generate(
      'List 3 popular resources under $10 that have "data" or "api" in their name. Tell me which one has the best reviews.',
    )

    console.log(`✓ Agent response:`)
    console.log(`  ${response.text}`)
  } catch (err) {
    console.warn(`⚠ Agent call failed (this is OK in test environments):`, (err as Error).message)
  }
}

/**
 * Main workflow
 */
async function main() {
  try {
    console.log('🚀 Mainlayer Monetized Workflow Example')
    console.log('=====================================\n')

    // Create a resource
    const resourceId = await createResource()

    // Discover resources
    const discovered = await discoverResources('market data')

    // Pay for the first discovered resource (if any exist)
    if (discovered.length > 0) {
      const payment = await payForResource(discovered[0].id)

      // Check access
      await checkAccess(discovered[0].id)
    }

    // Check revenue
    await checkRevenue()

    // Try to automate with an agent
    await automateWithAgent()

    console.log('\n✓ Workflow completed successfully!')
  } catch (error) {
    console.error('\n✗ Workflow failed:')
    console.error((error as Error).message)
    if ((error as Record<string, unknown>).details) {
      console.error('Details:', (error as Record<string, unknown>).details)
    }
    process.exit(1)
  }
}

main()
