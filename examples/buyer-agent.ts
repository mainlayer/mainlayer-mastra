/**
 * Example: Buyer Agent
 *
 * A Mastra agent that discovers resources on Mainlayer and pays for access
 * to the ones it needs to complete its task. Demonstrates how an AI agent
 * can autonomously handle payment flows before consuming paid services.
 *
 * Usage:
 *   MAINLAYER_API_KEY=<your-key> npx tsx examples/buyer-agent.ts
 */

import { openai } from '@ai-sdk/openai'

import { createMainlayerAgent } from '../src/agent.js'

async function main() {
  const apiKey = process.env.MAINLAYER_API_KEY
  if (!apiKey) {
    throw new Error('MAINLAYER_API_KEY environment variable is required')
  }

  const buyerAgentId = `buyer-agent-${Date.now()}`

  const buyerAgent = createMainlayerAgent({
    apiKey,
    model: openai('gpt-4o'),
    name: 'Buyer Agent',
    instructions: `You are a buyer agent responsible for discovering and paying for AI services on Mainlayer.

Follow this workflow for every task:
1. Use the discover tool to find relevant resources.
2. Select the most suitable resource based on description, price, and tags.
3. Before paying, use checkAccess to see if you already have access.
4. If you do not have access, use payForResource to purchase access.
5. Confirm the payment succeeded (success: true) before proceeding.
6. Report back with what you found and purchased.

Your payer ID is: ${buyerAgentId}

Never attempt to use a resource without confirming access first.`,
  })

  console.log(`=== Buyer Agent (ID: ${buyerAgentId}) ===\n`)

  // Step 1: Discover and purchase a data resource.
  console.log('Task: Find a weather data resource and pay for access.\n')

  const purchaseResponse = await buyerAgent.generate(
    `I need real-time weather data for a climate research task.
    Please:
    1. Search for weather-related resources on Mainlayer (limit 5).
    2. Pick the best option based on description and price.
    3. Check if I already have access to it.
    4. If not, pay for access.
    5. Report the resource ID and payment status.`,
  )

  console.log('Purchase flow result:')
  console.log(purchaseResponse.text)
  console.log()

  // Step 2: Verify access to a specific resource by ID (simulate follow-up).
  console.log('=== Follow-up: Verifying access ===\n')

  const verifyResponse = await buyerAgent.generate(
    `Check whether I currently have access to any weather resources.
    Search for weather resources first, then check my access status for the first result you find.`,
  )

  console.log('Access verification:')
  console.log(verifyResponse.text)
  console.log()

  // Step 3: Browse resources by budget.
  console.log('=== Browse: Finding resources under $5 ===\n')

  const budgetResponse = await buyerAgent.generate(
    'Find all available resources priced between $0 and $5. List them with names, prices, and descriptions.',
  )

  console.log('Budget search results:')
  console.log(budgetResponse.text)
}

main().catch((err) => {
  console.error('Buyer agent error:', err)
  process.exit(1)
})
