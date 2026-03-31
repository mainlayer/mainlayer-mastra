/**
 * Mastra tool definitions for the Mainlayer API.
 * Each tool wraps a Mainlayer API endpoint with typed input/output schemas.
 */

import { createTool } from '@mastra/core'
import { z } from 'zod'

import { MainlayerClient } from './client.js'

// ---------------------------------------------------------------------------
// Schema definitions
// ---------------------------------------------------------------------------

const resourceSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  price: z.number(),
  currency: z.string(),
  ownerId: z.string(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

// ---------------------------------------------------------------------------
// Tool: payForResource
// ---------------------------------------------------------------------------

/**
 * Pay for access to a Mainlayer resource.
 * On success returns a payment receipt including a unique paymentId.
 */
export const payForResource = createTool({
  id: 'mainlayer_pay',
  description:
    'Pay for access to a Mainlayer resource. Provide the resource ID and the payer ID. ' +
    'Returns a payment confirmation with a unique paymentId on success.',
  inputSchema: z.object({
    resourceId: z.string().min(1).describe('The unique identifier of the resource to pay for'),
    payerId: z.string().min(1).describe('The unique identifier of the agent or user making the payment'),
    apiKey: z.string().min(1).describe('Mainlayer API key'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    paymentId: z.string().optional(),
    resourceId: z.string().optional(),
    amount: z.number().optional(),
    currency: z.string().optional(),
    status: z.enum(['pending', 'completed', 'failed']).optional(),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    const { resourceId, payerId, apiKey } = context
    const client = new MainlayerClient({ apiKey })
    try {
      const payment = await client.payForResource(resourceId, payerId)
      return {
        success: payment.status === 'completed',
        paymentId: payment.paymentId,
        resourceId: payment.resourceId,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
      }
    } catch (err) {
      return {
        success: false,
        error: (err as Error).message,
      }
    }
  },
})

// ---------------------------------------------------------------------------
// Tool: checkAccess
// ---------------------------------------------------------------------------

/**
 * Check whether a payer currently has access to a resource.
 */
export const checkAccess = createTool({
  id: 'mainlayer_check_access',
  description:
    'Check whether a payer has active access to a Mainlayer resource. ' +
    'Returns hasAccess: true if the payer has paid and access has not expired.',
  inputSchema: z.object({
    resourceId: z.string().min(1).describe('The unique identifier of the resource to check'),
    payerId: z.string().min(1).describe('The unique identifier of the agent or user to check'),
    apiKey: z.string().min(1).describe('Mainlayer API key'),
  }),
  outputSchema: z.object({
    hasAccess: z.boolean(),
    resourceId: z.string().optional(),
    payerId: z.string().optional(),
    expiresAt: z.string().optional(),
    paymentId: z.string().optional(),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    const { resourceId, payerId, apiKey } = context
    const client = new MainlayerClient({ apiKey })
    try {
      const status = await client.checkAccess(resourceId, payerId)
      return {
        hasAccess: status.hasAccess,
        resourceId: status.resourceId,
        payerId: status.payerId,
        expiresAt: status.expiresAt,
        paymentId: status.paymentId,
      }
    } catch (err) {
      return {
        hasAccess: false,
        error: (err as Error).message,
      }
    }
  },
})

// ---------------------------------------------------------------------------
// Tool: discoverResources
// ---------------------------------------------------------------------------

/**
 * Discover available Mainlayer resources, optionally filtered by search terms.
 */
export const discoverResources = createTool({
  id: 'mainlayer_discover',
  description:
    'Discover available Mainlayer resources. Optionally filter by a text query, tags, or price range. ' +
    'Returns a list of matching resources with their IDs, descriptions, and prices.',
  inputSchema: z.object({
    apiKey: z.string().min(1).describe('Mainlayer API key'),
    query: z.string().optional().describe('Free-text search query'),
    tags: z.array(z.string()).optional().describe('Filter resources by tags'),
    minPrice: z.number().min(0).optional().describe('Minimum price filter'),
    maxPrice: z.number().min(0).optional().describe('Maximum price filter'),
    limit: z.number().int().min(1).max(100).default(20).describe('Maximum number of results to return'),
    offset: z.number().int().min(0).default(0).describe('Pagination offset'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    resources: z.array(resourceSchema),
    total: z.number().optional(),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    const { apiKey, query, tags, minPrice, maxPrice, limit, offset } = context
    const client = new MainlayerClient({ apiKey })
    try {
      const resources = await client.discoverResources({ query, tags, minPrice, maxPrice, limit, offset })
      return {
        success: true,
        resources,
        total: resources.length,
      }
    } catch (err) {
      return {
        success: false,
        resources: [],
        error: (err as Error).message,
      }
    }
  },
})

// ---------------------------------------------------------------------------
// Tool: createResource
// ---------------------------------------------------------------------------

/**
 * Create a new monetized resource in Mainlayer.
 */
export const createResource = createTool({
  id: 'mainlayer_create_resource',
  description:
    'Create a new monetized resource in Mainlayer. ' +
    'Define a name, description, and price so other agents can discover and pay for it.',
  inputSchema: z.object({
    apiKey: z.string().min(1).describe('Mainlayer API key'),
    name: z.string().min(1).max(256).describe('Human-readable name for the resource'),
    description: z.string().min(1).max(2048).describe('Detailed description of what the resource provides'),
    price: z.number().min(0).describe('Price in the specified currency'),
    currency: z.string().length(3).default('USD').describe('ISO 4217 currency code (e.g. USD)'),
    tags: z.array(z.string()).optional().describe('Searchable tags for the resource'),
    metadata: z.record(z.unknown()).optional().describe('Arbitrary key-value metadata'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    resource: resourceSchema.optional(),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    const { apiKey, name, description, price, currency, tags, metadata } = context
    const client = new MainlayerClient({ apiKey })
    try {
      const resource = await client.createResource({ name, description, price, currency, tags, metadata })
      return { success: true, resource }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  },
})

// ---------------------------------------------------------------------------
// Tool: getRevenue
// ---------------------------------------------------------------------------

/**
 * Retrieve revenue analytics for the authenticated Mainlayer account.
 */
export const getRevenue = createTool({
  id: 'mainlayer_revenue',
  description:
    'Retrieve revenue analytics for the authenticated Mainlayer account. ' +
    'Returns total revenue, payment count, and a per-resource breakdown for the given period.',
  inputSchema: z.object({
    apiKey: z.string().min(1).describe('Mainlayer API key'),
    periodStart: z
      .string()
      .optional()
      .describe('ISO 8601 start date for the reporting period (e.g. 2025-01-01T00:00:00Z)'),
    periodEnd: z
      .string()
      .optional()
      .describe('ISO 8601 end date for the reporting period (e.g. 2025-12-31T23:59:59Z)'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    totalRevenue: z.number().optional(),
    currency: z.string().optional(),
    paymentCount: z.number().optional(),
    periodStart: z.string().optional(),
    periodEnd: z.string().optional(),
    breakdown: z
      .array(
        z.object({
          resourceId: z.string(),
          resourceName: z.string(),
          revenue: z.number(),
          paymentCount: z.number(),
        }),
      )
      .optional(),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    const { apiKey, periodStart, periodEnd } = context
    const client = new MainlayerClient({ apiKey })
    try {
      const report = await client.getRevenue({ periodStart, periodEnd })
      return {
        success: true,
        totalRevenue: report.totalRevenue,
        currency: report.currency,
        paymentCount: report.paymentCount,
        periodStart: report.periodStart,
        periodEnd: report.periodEnd,
        breakdown: report.breakdown,
      }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  },
})

// ---------------------------------------------------------------------------
// Convenience export: all tools in a single array
// ---------------------------------------------------------------------------

export const mainlayerTools = [
  payForResource,
  checkAccess,
  discoverResources,
  createResource,
  getRevenue,
] as const
