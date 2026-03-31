/**
 * HTTP client for the Mainlayer API.
 * Base URL: https://api.mainlayer.fr
 * Auth: Authorization: Bearer <api_key>
 */

export const MAINLAYER_BASE_URL = 'https://api.mainlayer.fr'

export interface MainlayerClientConfig {
  apiKey: string
  baseUrl?: string
  timeoutMs?: number
}

export interface Resource {
  id: string
  name: string
  description: string
  price: number
  currency: string
  ownerId: string
  tags?: string[]
  metadata?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface Payment {
  paymentId: string
  resourceId: string
  payerId: string
  amount: number
  currency: string
  status: 'pending' | 'completed' | 'failed'
  createdAt: string
}

export interface AccessStatus {
  resourceId: string
  payerId: string
  hasAccess: boolean
  expiresAt?: string
  paymentId?: string
}

export interface RevenueReport {
  totalRevenue: number
  currency: string
  paymentCount: number
  periodStart: string
  periodEnd: string
  breakdown: Array<{
    resourceId: string
    resourceName: string
    revenue: number
    paymentCount: number
  }>
}

export interface CreateResourceInput {
  name: string
  description: string
  price: number
  currency?: string
  tags?: string[]
  metadata?: Record<string, unknown>
}

export interface DiscoverResourcesParams {
  query?: string
  tags?: string[]
  minPrice?: number
  maxPrice?: number
  limit?: number
  offset?: number
}

export interface MainlayerApiError extends Error {
  statusCode: number
  code: string
  details?: unknown
}

function createApiError(message: string, statusCode: number, code: string, details?: unknown): MainlayerApiError {
  const error = new Error(message) as MainlayerApiError
  error.name = 'MainlayerApiError'
  error.statusCode = statusCode
  error.code = code
  error.details = details
  return error
}

export class MainlayerClient {
  private readonly apiKey: string
  private readonly baseUrl: string
  private readonly timeoutMs: number

  constructor(config: MainlayerClientConfig) {
    if (!config.apiKey) {
      throw new Error('MainlayerClient requires an apiKey')
    }
    this.apiKey = config.apiKey
    this.baseUrl = config.baseUrl ?? MAINLAYER_BASE_URL
    this.timeoutMs = config.timeoutMs ?? 30_000
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': '@mainlayer/mastra/1.0.0',
    }
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    body?: unknown,
    query?: Record<string, string | number | boolean | undefined>,
  ): Promise<T> {
    let url = `${this.baseUrl}${path}`

    if (query) {
      const params = new URLSearchParams()
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) {
          params.set(key, String(value))
        }
      }
      const qs = params.toString()
      if (qs) url += `?${qs}`
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeoutMs)

    let response: Response
    try {
      response = await fetch(url, {
        method,
        headers: this.headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      })
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        throw createApiError(`Request timed out after ${this.timeoutMs}ms`, 408, 'TIMEOUT')
      }
      throw createApiError(`Network error: ${(err as Error).message}`, 0, 'NETWORK_ERROR', err)
    } finally {
      clearTimeout(timer)
    }

    let data: unknown
    const contentType = response.headers.get('content-type') ?? ''
    if (contentType.includes('application/json')) {
      data = await response.json()
    } else {
      data = await response.text()
    }

    if (!response.ok) {
      const errorData = data as { message?: string; code?: string; details?: unknown }
      throw createApiError(
        errorData?.message ?? `HTTP ${response.status}`,
        response.status,
        errorData?.code ?? 'API_ERROR',
        errorData?.details,
      )
    }

    return data as T
  }

  /**
   * Pay for access to a Mainlayer resource.
   */
  async payForResource(resourceId: string, payerId: string): Promise<Payment> {
    return this.request<Payment>('POST', '/v1/payments', { resourceId, payerId })
  }

  /**
   * Check whether a payer currently has access to a resource.
   */
  async checkAccess(resourceId: string, payerId: string): Promise<AccessStatus> {
    return this.request<AccessStatus>('GET', `/v1/access`, undefined, { resourceId, payerId })
  }

  /**
   * Discover available resources, optionally filtered by query/tags/price.
   */
  async discoverResources(params?: DiscoverResourcesParams): Promise<Resource[]> {
    return this.request<Resource[]>('GET', '/v1/resources', undefined, {
      q: params?.query,
      tags: params?.tags?.join(','),
      minPrice: params?.minPrice,
      maxPrice: params?.maxPrice,
      limit: params?.limit ?? 20,
      offset: params?.offset ?? 0,
    })
  }

  /**
   * Create a new monetized resource.
   */
  async createResource(input: CreateResourceInput): Promise<Resource> {
    return this.request<Resource>('POST', '/v1/resources', input)
  }

  /**
   * Retrieve revenue analytics for the authenticated account.
   */
  async getRevenue(params?: { periodStart?: string; periodEnd?: string }): Promise<RevenueReport> {
    return this.request<RevenueReport>('GET', '/v1/revenue', undefined, {
      periodStart: params?.periodStart,
      periodEnd: params?.periodEnd,
    })
  }
}
