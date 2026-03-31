/**
 * Example: Mastra Workflow with Payment Steps
 *
 * A Mastra workflow that orchestrates a complete "discover → pay → consume"
 * pipeline. Steps are composable and each step's output feeds into the next.
 *
 * Usage:
 *   MAINLAYER_API_KEY=<your-key> npx tsx examples/workflow.ts
 */

import { Step, Workflow } from '@mastra/core'
import { z } from 'zod'

import { MainlayerClient } from '../src/client.js'
import { Resource } from '../src/client.js'

// ---------------------------------------------------------------------------
// Workflow input / shared context
// ---------------------------------------------------------------------------

interface WorkflowContext {
  apiKey: string
  payerId: string
  searchQuery: string
  maxPrice: number
}

// ---------------------------------------------------------------------------
// Step 1: Discover matching resources
// ---------------------------------------------------------------------------

const discoverStep = new Step({
  id: 'discover',
  description: 'Search Mainlayer for resources matching the query and price cap',
  inputSchema: z.object({
    apiKey: z.string(),
    payerId: z.string(),
    searchQuery: z.string(),
    maxPrice: z.number(),
  }),
  outputSchema: z.object({
    resources: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        description: z.string(),
        price: z.number(),
        currency: z.string(),
        ownerId: z.string(),
        tags: z.array(z.string()).optional(),
        createdAt: z.string(),
        updatedAt: z.string(),
      }),
    ),
    selectedResource: z
      .object({
        id: z.string(),
        name: z.string(),
        description: z.string(),
        price: z.number(),
        currency: z.string(),
        ownerId: z.string(),
        tags: z.array(z.string()).optional(),
        createdAt: z.string(),
        updatedAt: z.string(),
      })
      .optional(),
  }),
  execute: async ({ context }) => {
    const { apiKey, searchQuery, maxPrice } = context
    const client = new MainlayerClient({ apiKey })

    console.log(`[discover] Searching for: "${searchQuery}" (max price: $${maxPrice})`)

    const resources = await client.discoverResources({
      query: searchQuery,
      maxPrice,
      limit: 10,
    })

    console.log(`[discover] Found ${resources.length} resource(s)`)

    // Select the cheapest matching resource.
    const sorted = [...resources].sort((a: Resource, b: Resource) => a.price - b.price)
    const selectedResource = sorted[0]

    if (selectedResource) {
      console.log(`[discover] Selected: "${selectedResource.name}" ($${selectedResource.price})`)
    } else {
      console.log('[discover] No matching resources found')
    }

    return { resources, selectedResource }
  },
})

// ---------------------------------------------------------------------------
// Step 2: Check existing access
// ---------------------------------------------------------------------------

const checkAccessStep = new Step({
  id: 'check-access',
  description: 'Check whether the payer already has access to the selected resource',
  inputSchema: z.object({
    apiKey: z.string(),
    payerId: z.string(),
    resourceId: z.string(),
  }),
  outputSchema: z.object({
    hasAccess: z.boolean(),
    paymentId: z.string().optional(),
    expiresAt: z.string().optional(),
  }),
  execute: async ({ context }) => {
    const { apiKey, payerId, resourceId } = context
    const client = new MainlayerClient({ apiKey })

    console.log(`[check-access] Checking access for payer=${payerId}, resource=${resourceId}`)

    const status = await client.checkAccess(resourceId, payerId)

    if (status.hasAccess) {
      console.log(`[check-access] Access already granted (payment: ${status.paymentId})`)
    } else {
      console.log('[check-access] No existing access — payment required')
    }

    return {
      hasAccess: status.hasAccess,
      paymentId: status.paymentId,
      expiresAt: status.expiresAt,
    }
  },
})

// ---------------------------------------------------------------------------
// Step 3: Pay for the resource (only if access is missing)
// ---------------------------------------------------------------------------

const payStep = new Step({
  id: 'pay',
  description: 'Pay for access to the selected resource',
  inputSchema: z.object({
    apiKey: z.string(),
    payerId: z.string(),
    resourceId: z.string(),
    skipIfHasAccess: z.boolean().default(true),
    existingAccess: z.boolean().default(false),
    existingPaymentId: z.string().optional(),
  }),
  outputSchema: z.object({
    paid: z.boolean(),
    paymentId: z.string().optional(),
    amount: z.number().optional(),
    currency: z.string().optional(),
    skipped: z.boolean(),
  }),
  execute: async ({ context }) => {
    const { apiKey, payerId, resourceId, skipIfHasAccess, existingAccess, existingPaymentId } = context

    if (skipIfHasAccess && existingAccess) {
      console.log(`[pay] Skipping payment — access already exists (paymentId: ${existingPaymentId})`)
      return { paid: false, paymentId: existingPaymentId, skipped: true }
    }

    const client = new MainlayerClient({ apiKey })

    console.log(`[pay] Processing payment for resource=${resourceId}, payer=${payerId}`)

    const payment = await client.payForResource(resourceId, payerId)

    if (payment.status === 'completed') {
      console.log(`[pay] Payment successful: ${payment.paymentId} ($${payment.amount} ${payment.currency})`)
    } else {
      console.log(`[pay] Payment status: ${payment.status}`)
    }

    return {
      paid: payment.status === 'completed',
      paymentId: payment.paymentId,
      amount: payment.amount,
      currency: payment.currency,
      skipped: false,
    }
  },
})

// ---------------------------------------------------------------------------
// Step 4: Verify final access and complete the workflow
// ---------------------------------------------------------------------------

const verifyStep = new Step({
  id: 'verify',
  description: 'Verify access is now active and output a summary',
  inputSchema: z.object({
    apiKey: z.string(),
    payerId: z.string(),
    resourceId: z.string(),
    resourceName: z.string(),
    paymentId: z.string().optional(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    summary: z.string(),
    resourceId: z.string(),
    paymentId: z.string().optional(),
  }),
  execute: async ({ context }) => {
    const { apiKey, payerId, resourceId, resourceName, paymentId } = context
    const client = new MainlayerClient({ apiKey })

    console.log(`[verify] Confirming access for resource=${resourceId}`)

    const status = await client.checkAccess(resourceId, payerId)

    const success = status.hasAccess
    const summary = success
      ? `Access confirmed for "${resourceName}" (payment: ${paymentId ?? status.paymentId}). Ready to use.`
      : `Access could not be confirmed for "${resourceName}". Payment may still be processing.`

    console.log(`[verify] ${summary}`)

    return { success, summary, resourceId, paymentId: paymentId ?? status.paymentId }
  },
})

// ---------------------------------------------------------------------------
// Assemble and run the workflow
// ---------------------------------------------------------------------------

async function runPaymentWorkflow(ctx: WorkflowContext) {
  console.log('\n=== Mainlayer Payment Workflow ===')
  console.log(`Query: "${ctx.searchQuery}" | Max price: $${ctx.maxPrice} | Payer: ${ctx.payerId}\n`)

  const workflow = new Workflow({
    name: 'mainlayer-payment-workflow',
    triggerSchema: z.object({
      apiKey: z.string(),
      payerId: z.string(),
      searchQuery: z.string(),
      maxPrice: z.number(),
    }),
  })

  workflow
    .step(discoverStep)
    .then(checkAccessStep, {
      when: async ({ context }) => {
        // Only proceed if a resource was selected
        return !!context.steps?.discover?.output?.selectedResource
      },
      variables: {
        apiKey: { step: 'trigger', path: 'apiKey' },
        payerId: { step: 'trigger', path: 'payerId' },
        resourceId: { step: 'discover', path: 'selectedResource.id' },
      },
    })
    .then(payStep, {
      variables: {
        apiKey: { step: 'trigger', path: 'apiKey' },
        payerId: { step: 'trigger', path: 'payerId' },
        resourceId: { step: 'discover', path: 'selectedResource.id' },
        existingAccess: { step: 'check-access', path: 'hasAccess' },
        existingPaymentId: { step: 'check-access', path: 'paymentId' },
      },
    })
    .then(verifyStep, {
      variables: {
        apiKey: { step: 'trigger', path: 'apiKey' },
        payerId: { step: 'trigger', path: 'payerId' },
        resourceId: { step: 'discover', path: 'selectedResource.id' },
        resourceName: { step: 'discover', path: 'selectedResource.name' },
        paymentId: { step: 'pay', path: 'paymentId' },
      },
    })
    .commit()

  const { runId, start } = workflow.createRun()
  console.log(`Workflow run ID: ${runId}\n`)

  const result = await start({ triggerData: ctx })

  console.log('\n=== Workflow Complete ===')
  console.log('Final result:', JSON.stringify(result.results?.verify?.output ?? result, null, 2))

  return result
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

const apiKey = process.env.MAINLAYER_API_KEY
if (!apiKey) {
  console.error('MAINLAYER_API_KEY environment variable is required')
  process.exit(1)
}

runPaymentWorkflow({
  apiKey,
  payerId: `workflow-agent-${Date.now()}`,
  searchQuery: 'weather data',
  maxPrice: 10,
}).catch((err) => {
  console.error('Workflow error:', err)
  process.exit(1)
})
