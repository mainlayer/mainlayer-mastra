/**
 * @mainlayer/mastra
 *
 * Mastra TypeScript agent framework integration for Mainlayer — Stripe for AI agents.
 * Provides typed tools and an agent factory for discovering, paying for, and
 * monetizing AI-accessible resources via the Mainlayer API.
 */

// HTTP client
export { MainlayerClient, MAINLAYER_BASE_URL } from './client.js'
export type {
  MainlayerClientConfig,
  MainlayerApiError,
  Resource,
  Payment,
  AccessStatus,
  RevenueReport,
  CreateResourceInput,
  DiscoverResourcesParams,
} from './client.js'

// Individual tools
export {
  payForResource,
  checkAccess,
  discoverResources,
  createResource,
  getRevenue,
  mainlayerTools,
} from './tools.js'

// Agent factory
export { createMainlayerAgent } from './agent.js'
export type { MainlayerAgentConfig } from './agent.js'
