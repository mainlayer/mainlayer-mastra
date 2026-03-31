/**
 * Vitest test suite for @mainlayer/mastra tools and client.
 * All Mainlayer API calls are mocked — no real network requests are made.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Mock the global fetch used by MainlayerClient
// ---------------------------------------------------------------------------

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// ---------------------------------------------------------------------------
// Helper to build a standard fetch Response mock
// ---------------------------------------------------------------------------

function mockResponse<T>(body: T, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (key: string) => (key === 'content-type' ? 'application/json' : null),
    },
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response
}

// ---------------------------------------------------------------------------
// Imports (after fetch is stubbed)
// ---------------------------------------------------------------------------

import { MainlayerClient } from '../src/client.js'
import { checkAccess, createResource, discoverResources, getRevenue, mainlayerTools, payForResource } from '../src/tools.js'

const API_KEY = 'test-api-key-abc123'

// ---------------------------------------------------------------------------
// MainlayerClient unit tests
// ---------------------------------------------------------------------------

describe('MainlayerClient', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('throws if apiKey is missing', () => {
    expect(() => new MainlayerClient({ apiKey: '' })).toThrow('apiKey')
  })

  it('uses the default base URL when none is provided', () => {
    const client = new MainlayerClient({ apiKey: API_KEY })
    expect(client).toBeDefined()
  })

  it('sends Authorization header with Bearer token', async () => {
    const client = new MainlayerClient({ apiKey: API_KEY })
    mockFetch.mockResolvedValueOnce(
      mockResponse({ resources: [] }),
    )
    await client.discoverResources()
    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect((options.headers as Record<string, string>)['Authorization']).toBe(`Bearer ${API_KEY}`)
  })

  it('includes Content-Type: application/json header', async () => {
    const client = new MainlayerClient({ apiKey: API_KEY })
    mockFetch.mockResolvedValueOnce(mockResponse({ paymentId: 'pay_1', status: 'completed', amount: 5, currency: 'USD', resourceId: 'r1', payerId: 'u1', createdAt: '' }))
    await client.payForResource('r1', 'u1')
    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect((options.headers as Record<string, string>)['Content-Type']).toBe('application/json')
  })

  it('throws a typed MainlayerApiError on 4xx responses', async () => {
    const client = new MainlayerClient({ apiKey: API_KEY })
    mockFetch.mockResolvedValueOnce(mockResponse({ message: 'Not found', code: 'NOT_FOUND' }, 404))
    await expect(client.discoverResources()).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    })
  })

  it('throws a MainlayerApiError on 500 responses', async () => {
    const client = new MainlayerClient({ apiKey: API_KEY })
    mockFetch.mockResolvedValueOnce(mockResponse({ message: 'Internal error', code: 'SERVER_ERROR' }, 500))
    await expect(client.getRevenue()).rejects.toMatchObject({ statusCode: 500 })
  })

  it('throws NETWORK_ERROR when fetch rejects', async () => {
    const client = new MainlayerClient({ apiKey: API_KEY })
    mockFetch.mockRejectedValueOnce(new Error('Failed to connect'))
    await expect(client.checkAccess('r1', 'u1')).rejects.toMatchObject({ code: 'NETWORK_ERROR' })
  })
})

// ---------------------------------------------------------------------------
// Tool: payForResource
// ---------------------------------------------------------------------------

describe('payForResource tool', () => {
  beforeEach(() => mockFetch.mockReset())

  it('has the correct tool id', () => {
    expect(payForResource.id).toBe('mainlayer_pay')
  })

  it('returns success: true for a completed payment', async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse({
        paymentId: 'pay_abc',
        resourceId: 'res_1',
        payerId: 'agent_1',
        amount: 9.99,
        currency: 'USD',
        status: 'completed',
        createdAt: '2025-01-01T00:00:00Z',
      }),
    )
    const result = await payForResource.execute!({
      context: { resourceId: 'res_1', payerId: 'agent_1', apiKey: API_KEY },
      runId: 'test',
      mastra: undefined as never,
      agent: undefined as never,
    })
    expect(result.success).toBe(true)
    expect(result.paymentId).toBe('pay_abc')
    expect(result.amount).toBe(9.99)
  })

  it('returns success: false for a failed payment', async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse({
        paymentId: 'pay_fail',
        resourceId: 'res_1',
        payerId: 'agent_1',
        amount: 9.99,
        currency: 'USD',
        status: 'failed',
        createdAt: '2025-01-01T00:00:00Z',
      }),
    )
    const result = await payForResource.execute!({
      context: { resourceId: 'res_1', payerId: 'agent_1', apiKey: API_KEY },
      runId: 'test',
      mastra: undefined as never,
      agent: undefined as never,
    })
    expect(result.success).toBe(false)
  })

  it('returns success: false and error message on API error', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ message: 'Unauthorized', code: 'UNAUTHORIZED' }, 401))
    const result = await payForResource.execute!({
      context: { resourceId: 'res_1', payerId: 'agent_1', apiKey: 'bad-key' },
      runId: 'test',
      mastra: undefined as never,
      agent: undefined as never,
    })
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// Tool: checkAccess
// ---------------------------------------------------------------------------

describe('checkAccess tool', () => {
  beforeEach(() => mockFetch.mockReset())

  it('has the correct tool id', () => {
    expect(checkAccess.id).toBe('mainlayer_check_access')
  })

  it('returns hasAccess: true when access exists', async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse({
        resourceId: 'res_1',
        payerId: 'agent_1',
        hasAccess: true,
        expiresAt: '2099-01-01T00:00:00Z',
        paymentId: 'pay_abc',
      }),
    )
    const result = await checkAccess.execute!({
      context: { resourceId: 'res_1', payerId: 'agent_1', apiKey: API_KEY },
      runId: 'test',
      mastra: undefined as never,
      agent: undefined as never,
    })
    expect(result.hasAccess).toBe(true)
    expect(result.paymentId).toBe('pay_abc')
  })

  it('returns hasAccess: false when access is missing', async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse({ resourceId: 'res_1', payerId: 'agent_1', hasAccess: false }),
    )
    const result = await checkAccess.execute!({
      context: { resourceId: 'res_1', payerId: 'agent_1', apiKey: API_KEY },
      runId: 'test',
      mastra: undefined as never,
      agent: undefined as never,
    })
    expect(result.hasAccess).toBe(false)
  })

  it('returns hasAccess: false on API error', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ message: 'Server error', code: 'ERROR' }, 500))
    const result = await checkAccess.execute!({
      context: { resourceId: 'res_1', payerId: 'agent_1', apiKey: API_KEY },
      runId: 'test',
      mastra: undefined as never,
      agent: undefined as never,
    })
    expect(result.hasAccess).toBe(false)
    expect(result.error).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// Tool: discoverResources
// ---------------------------------------------------------------------------

describe('discoverResources tool', () => {
  beforeEach(() => mockFetch.mockReset())

  it('has the correct tool id', () => {
    expect(discoverResources.id).toBe('mainlayer_discover')
  })

  it('returns an array of resources on success', async () => {
    const resources = [
      {
        id: 'res_1',
        name: 'Data API',
        description: 'Access to market data',
        price: 4.99,
        currency: 'USD',
        ownerId: 'vendor_1',
        tags: ['data', 'market'],
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      },
    ]
    mockFetch.mockResolvedValueOnce(mockResponse(resources))
    const result = await discoverResources.execute!({
      context: { apiKey: API_KEY, limit: 20, offset: 0 },
      runId: 'test',
      mastra: undefined as never,
      agent: undefined as never,
    })
    expect(result.success).toBe(true)
    expect(result.resources).toHaveLength(1)
    expect(result.resources[0].id).toBe('res_1')
  })

  it('returns empty resources array on API error', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ message: 'Error', code: 'ERR' }, 503))
    const result = await discoverResources.execute!({
      context: { apiKey: API_KEY, limit: 20, offset: 0 },
      runId: 'test',
      mastra: undefined as never,
      agent: undefined as never,
    })
    expect(result.success).toBe(false)
    expect(result.resources).toHaveLength(0)
    expect(result.error).toBeDefined()
  })

  it('passes query params correctly', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse([]))
    await discoverResources.execute!({
      context: { apiKey: API_KEY, query: 'weather', tags: ['geo'], minPrice: 1, maxPrice: 10, limit: 5, offset: 0 },
      runId: 'test',
      mastra: undefined as never,
      agent: undefined as never,
    })
    const [url] = mockFetch.mock.calls[0] as [string]
    expect(url).toContain('q=weather')
    expect(url).toContain('tags=geo')
    expect(url).toContain('minPrice=1')
    expect(url).toContain('maxPrice=10')
    expect(url).toContain('limit=5')
  })
})

// ---------------------------------------------------------------------------
// Tool: createResource
// ---------------------------------------------------------------------------

describe('createResource tool', () => {
  beforeEach(() => mockFetch.mockReset())

  it('has the correct tool id', () => {
    expect(createResource.id).toBe('mainlayer_create_resource')
  })

  it('returns success: true with the created resource', async () => {
    const created = {
      id: 'res_new',
      name: 'My Service',
      description: 'A great service',
      price: 2.5,
      currency: 'USD',
      ownerId: 'me',
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
    }
    mockFetch.mockResolvedValueOnce(mockResponse(created))
    const result = await createResource.execute!({
      context: {
        apiKey: API_KEY,
        name: 'My Service',
        description: 'A great service',
        price: 2.5,
        currency: 'USD',
      },
      runId: 'test',
      mastra: undefined as never,
      agent: undefined as never,
    })
    expect(result.success).toBe(true)
    expect(result.resource?.id).toBe('res_new')
  })

  it('returns success: false on API error', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ message: 'Invalid price', code: 'VALIDATION_ERROR' }, 422))
    const result = await createResource.execute!({
      context: {
        apiKey: API_KEY,
        name: 'Bad Resource',
        description: 'Test',
        price: -1,
        currency: 'USD',
      },
      runId: 'test',
      mastra: undefined as never,
      agent: undefined as never,
    })
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// Tool: getRevenue
// ---------------------------------------------------------------------------

describe('getRevenue tool', () => {
  beforeEach(() => mockFetch.mockReset())

  it('has the correct tool id', () => {
    expect(getRevenue.id).toBe('mainlayer_revenue')
  })

  it('returns revenue report on success', async () => {
    const report = {
      totalRevenue: 142.5,
      currency: 'USD',
      paymentCount: 28,
      periodStart: '2025-01-01T00:00:00Z',
      periodEnd: '2025-01-31T23:59:59Z',
      breakdown: [
        { resourceId: 'res_1', resourceName: 'Data API', revenue: 142.5, paymentCount: 28 },
      ],
    }
    mockFetch.mockResolvedValueOnce(mockResponse(report))
    const result = await getRevenue.execute!({
      context: { apiKey: API_KEY },
      runId: 'test',
      mastra: undefined as never,
      agent: undefined as never,
    })
    expect(result.success).toBe(true)
    expect(result.totalRevenue).toBe(142.5)
    expect(result.paymentCount).toBe(28)
    expect(result.breakdown).toHaveLength(1)
  })

  it('returns success: false on API error', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ message: 'Forbidden', code: 'FORBIDDEN' }, 403))
    const result = await getRevenue.execute!({
      context: { apiKey: 'wrong-key' },
      runId: 'test',
      mastra: undefined as never,
      agent: undefined as never,
    })
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// mainlayerTools array
// ---------------------------------------------------------------------------

describe('mainlayerTools', () => {
  it('exports exactly 5 tools', () => {
    expect(mainlayerTools).toHaveLength(5)
  })

  it('all tools have unique IDs', () => {
    const ids = mainlayerTools.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('all tools have an execute function', () => {
    for (const tool of mainlayerTools) {
      expect(typeof tool.execute).toBe('function')
    }
  })

  it('all tools have inputSchema and outputSchema', () => {
    for (const tool of mainlayerTools) {
      expect(tool.inputSchema).toBeDefined()
      expect(tool.outputSchema).toBeDefined()
    }
  })
})
