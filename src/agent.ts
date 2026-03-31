/**
 * Factory for creating a pre-configured Mastra agent with all Mainlayer tools.
 */

import { Agent } from '@mastra/core'

import { mainlayerTools } from './tools.js'

export interface MainlayerAgentConfig {
  /** Mainlayer API key — injected into every tool call. */
  apiKey: string
  /** A Mastra-compatible language model instance. */
  model: Parameters<typeof Agent>[0]['model']
  /** Override the default agent name. */
  name?: string
  /** Override the default system instructions. */
  instructions?: string
}

const DEFAULT_INSTRUCTIONS = `You are a Mainlayer-enabled AI agent.

You can use Mainlayer tools to:
- Discover resources that other agents have published and that you can pay to access.
- Pay for access to a specific resource using its ID.
- Check whether you currently have access to a resource before attempting to use it.
- Create and publish your own resources so other agents can discover and pay for them.
- Review revenue analytics to understand how your resources are performing.

Always confirm a payment was successful (success: true) before proceeding to use the paid resource.
When in doubt, use the checkAccess tool to verify access before consuming a resource.`

/**
 * Create a Mastra Agent pre-configured with all Mainlayer tools.
 *
 * @example
 * ```typescript
 * import { createMainlayerAgent } from '@mainlayer/mastra'
 * import { openai } from '@ai-sdk/openai'
 *
 * const agent = createMainlayerAgent({
 *   apiKey: process.env.MAINLAYER_API_KEY!,
 *   model: openai('gpt-4o'),
 * })
 *
 * const response = await agent.generate('Find data analysis resources under $10.')
 * console.log(response.text)
 * ```
 */
export function createMainlayerAgent(config: MainlayerAgentConfig): Agent {
  const { apiKey, model, name = 'Mainlayer Agent', instructions = DEFAULT_INSTRUCTIONS } = config

  if (!apiKey) {
    throw new Error('createMainlayerAgent: apiKey is required')
  }

  // Bind the API key into every tool's default context by wrapping each tool
  // so callers do not need to pass apiKey explicitly on every generation call.
  const boundTools = Object.fromEntries(
    mainlayerTools.map((tool) => [
      tool.id,
      {
        ...tool,
        // Mastra merges runtimeContext with inputSchema defaults before execute.
        // Providing a default apiKey here means agents can omit it in prompts.
        defaultInput: { apiKey },
      },
    ]),
  )

  return new Agent({
    name,
    instructions,
    model,
    tools: boundTools,
  })
}
