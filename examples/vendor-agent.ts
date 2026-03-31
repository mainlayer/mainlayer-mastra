/**
 * Example: Vendor Agent
 *
 * A Mastra agent that monetizes a service by publishing a resource to Mainlayer
 * and reporting on its revenue. Run this to see how to integrate Mainlayer
 * into an agent that earns money by providing AI-accessible services.
 *
 * Usage:
 *   MAINLAYER_API_KEY=<your-key> npx tsx examples/vendor-agent.ts
 */

import { openai } from '@ai-sdk/openai'

import { createMainlayerAgent } from '../src/agent.js'

async function main() {
  const apiKey = process.env.MAINLAYER_API_KEY
  if (!apiKey) {
    throw new Error('MAINLAYER_API_KEY environment variable is required')
  }

  // Create a Mastra agent pre-configured with all Mainlayer tools.
  const vendorAgent = createMainlayerAgent({
    apiKey,
    model: openai('gpt-4o'),
    name: 'Vendor Agent',
    instructions: `You are a vendor agent responsible for managing and monetizing AI services on Mainlayer.
You help publish new resources, set appropriate prices, and review revenue performance.
Always confirm successful creation before reporting results.`,
  })

  console.log('=== Vendor Agent: Publishing a new resource ===\n')

  // Ask the agent to create a new monetized resource.
  const publishResponse = await vendorAgent.generate(
    `Create a new resource on Mainlayer with the following details:
    - Name: "Real-Time Weather Intelligence API"
    - Description: "Provides real-time weather data, forecasts, and climate analytics for any location on Earth. Includes hourly forecasts up to 14 days, historical data, and severe weather alerts."
    - Price: 4.99 USD
    - Tags: ["weather", "climate", "forecasting", "geospatial"]

    After creating it, tell me the resource ID and confirm it was published successfully.`,
  )

  console.log('Publish result:')
  console.log(publishResponse.text)
  console.log()

  // Ask the agent to check revenue.
  console.log('=== Vendor Agent: Checking revenue ===\n')

  const revenueResponse = await vendorAgent.generate(
    `Check my revenue for the current month and give me a summary including:
    - Total revenue earned
    - Number of payments received
    - Which resources are performing best`,
  )

  console.log('Revenue report:')
  console.log(revenueResponse.text)
  console.log()

  // Ask the agent to discover what other resources exist.
  console.log('=== Vendor Agent: Scouting competition ===\n')

  const discoverResponse = await vendorAgent.generate(
    'Discover existing weather and geospatial resources on Mainlayer so I can understand the competitive landscape. Show me up to 5 results.',
  )

  console.log('Market research:')
  console.log(discoverResponse.text)
}

main().catch((err) => {
  console.error('Vendor agent error:', err)
  process.exit(1)
})
