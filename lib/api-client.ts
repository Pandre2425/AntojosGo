import { createBoundedFetch } from './bounded-fetch'
import { currentLang, t } from '../shared/i18n'
import type { HomeOption } from '../shared/contracts/home'
import type { PublicBranchExtras, PublicCatalogItem, PublicDish } from '../modules/catalog/data/public-catalog'
import type { OpeningHours } from '../shared/contracts/hours'
import type { AssistantContext } from '../shared/contracts/assistant'
import type { AssistantResponse } from '../modules/catalog/data/assistant'
import type { AccountProfile } from '../shared/contracts/accounts'
import type { Feedback, FeedbackInput } from '../shared/contracts/feedback'
import type { MyReview, OwnerReview, PublicReview, ReviewInput } from '../shared/contracts/reviews'
export type HiddenRestaurant = { restaurant_id: string; name: string; hidden_at: string }
import type { BranchInput, BranchLocation, RestaurantBranch } from '../shared/contracts/branches'
import type { Dish, DishInput, DishPatch } from '../shared/contracts/menu'
import type { BusinessProfile, BusinessProfileInput, OwnedRestaurant } from '../shared/contracts/restaurants'

/** Error from /api/v1 with the server's user-safe message. */
export class ApiError extends Error {
  constructor(message: string, public status: number, public code: string) { super(message) }
}

type Options = {
  /** Origin of the Next.js backend (e.g. http://192.168.1.19:3000, '' for same-origin web), or a getter when it can change at runtime. */
  baseUrl: string | (() => string)
  /** Current access token, or null when signed out. */
  getToken: () => Promise<string | null>
  /** Forces a session refresh after a 401; returns the new token or null. */
  refreshToken: () => Promise<string | null>
}

/** Typed client for /api/v1, shared by the mobile app and the restaurant web panel. */
export function createApiClient({ baseUrl, getToken, refreshToken }: Options) {
  const fetchApi = createBoundedFetch(15_000)

  async function call<T>(method: string, path: string, body?: unknown, extraHeaders: Record<string, string> = {}, auth = true): Promise<T> {
    // Spanish is the default; English adds ?lang=en so messages and content come back translated (and cache per language).
    const url = `${typeof baseUrl === 'function' ? baseUrl() : baseUrl}/api/v1${path}${currentLang() === 'en' ? `${path.includes('?') ? '&' : '?'}lang=en` : ''}`
    const send = async (token: string | null) => fetchApi(url, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
        ...extraHeaders,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    let response: Response
    try {
      response = await send(auth ? await getToken() : null)
      if (auth && response.status === 401) {
        const fresh = await refreshToken()
        if (fresh) response = await send(fresh)
      }
    } catch {
      throw new ApiError(t('No pudimos conectar con el servidor. Revisa tu conexión e intenta de nuevo.'), 0, 'network')
    }
    const json = await response.json().catch(() => null)
    if (!response.ok) throw new ApiError(json?.error?.message ?? t('El servidor no respondió correctamente.'), response.status, json?.error?.code ?? 'unknown')
    return json as T
  }

  const qs = (params: Record<string, string | number | boolean | readonly string[] | undefined>) => {
    const entries = Object.entries(params)
      .map(([k, v]) => [k, Array.isArray(v) ? v.join(',') : typeof v === 'boolean' ? (v ? '1' : '') : v === undefined ? '' : String(v)] as [string, string])
      .filter(([, v]) => v !== '')
    return entries.length ? `?${new URLSearchParams(entries)}` : ''
  }

  return {
    ensureProfile: (displayName: string) => call<AccountProfile>('PUT', '/me/profile', { displayName }),
    listRestaurants: () => call<{ items: OwnedRestaurant[] }>('GET', '/me/restaurants').then(r => r.items),
    createRestaurant: (name: string) => call<OwnedRestaurant>('POST', '/me/restaurants', { name }),
    getRestaurant: (id: string) => call<BusinessProfile>('GET', `/restaurants/${id}`),
    updateRestaurant: (id: string, input: BusinessProfileInput) => call<BusinessProfile>('PATCH', `/restaurants/${id}`, input),
    listBranches: (restaurantId: string, page = 0) => call<{ items: RestaurantBranch[]; hasMore: boolean }>('GET', `/restaurants/${restaurantId}/branches${qs({ page })}`),
    /** `requestId` must stay the same across retries of one creation (idempotency). */
    createBranch: (restaurantId: string, requestId: string, input: BranchInput) =>
      call<RestaurantBranch>('POST', `/restaurants/${restaurantId}/branches`, input, { 'Idempotency-Key': requestId }),
    getBranch: (id: string) => call<RestaurantBranch>('GET', `/branches/${id}`),
    updateBranch: (id: string, input: BranchInput) => call<RestaurantBranch>('PATCH', `/branches/${id}`, input),
    saveLocation: (id: string, location: BranchLocation) => call<RestaurantBranch>('PUT', `/branches/${id}/location`, location),
    saveHours: (id: string, hours: OpeningHours) => call<RestaurantBranch>('PUT', `/branches/${id}/hours`, hours),
    setPublished: (id: string, publish: boolean) => call<{ status: RestaurantBranch['status'] }>('POST', `/branches/${id}/${publish ? 'publish' : 'unpublish'}`),
    listDishes: (restaurantId: string) => call<{ items: Dish[] }>('GET', `/restaurants/${restaurantId}/dishes`).then(r => r.items),
    createDish: (restaurantId: string, input: DishInput) => call<Dish>('POST', `/restaurants/${restaurantId}/dishes`, input),
    updateDish: (id: string, patch: DishPatch) => call<Dish>('PATCH', `/dishes/${id}`, patch),
    deleteDish: (id: string) => call<{ ok: true }>('DELETE', `/dishes/${id}`),
    /** Photo upload: 1) get a signed URL, 2) PUT the file there, 3) confirm so the server verifies it. */
    prepareDishImage: (id: string, contentType: string) =>
      call<{ path: string; token: string; signedUrl: string; maxBytes: number; contentType: string }>('POST', `/dishes/${id}/image/upload-url`, { contentType }),
    confirmDishImage: (id: string, path: string) => call<{ image_url: string }>('PUT', `/dishes/${id}/image`, { path }),
    removeDishImage: (id: string) => call<{ image_url: null }>('DELETE', `/dishes/${id}/image`),
    /** Logo or cover: same two-step upload as dish photos. */
    prepareRestaurantImage: (id: string, kind: 'logo' | 'cover', contentType: string) =>
      call<{ path: string; token: string; signedUrl: string; maxBytes: number; contentType: string }>('POST', `/restaurants/${id}/images/${kind}/upload-url`, { contentType }),
    confirmRestaurantImage: (id: string, kind: 'logo' | 'cover', path: string) => call<{ url: string }>('PUT', `/restaurants/${id}/images/${kind}`, { path }),
    removeRestaurantImage: (id: string, kind: 'logo' | 'cover') => call<{ url: null }>('DELETE', `/restaurants/${id}/images/${kind}`),
    listBusinessTypes: () => call<{ items: string[] }>('GET', '/catalog/business-types', undefined, {}, false).then(r => r.items),
    /** Home shortcuts, most searched first. */
    popularOptions: () => call<{ items: HomeOption[] }>('GET', '/catalog/popular', undefined, {}, false).then(r => r.items),
    listFavorites: () => call<{ items: PublicCatalogItem[] }>('GET', '/me/favorites').then(r => r.items),
    addFavorite: (branchId: string) => call<{ ok: true }>('PUT', `/me/favorites/${branchId}`),
    removeFavorite: (branchId: string) => call<{ ok: true }>('DELETE', `/me/favorites/${branchId}`),
    /** «No me interesa»: restaurants hidden from this diner's searches and assistant. */
    listHidden: () => call<{ items: HiddenRestaurant[] }>('GET', '/me/hidden').then(r => r.items),
    hideRestaurant: (restaurantId: string) => call<{ ok: true }>('PUT', `/me/hidden/${restaurantId}`),
    unhideRestaurant: (restaurantId: string) => call<{ ok: true }>('DELETE', `/me/hidden/${restaurantId}`),
    /** The user's app rating (one per account; saving again replaces it). */
    myFeedback: () => call<{ item: Feedback | null }>('GET', '/me/feedback').then(r => r.item),
    saveFeedback: (input: FeedbackInput) => call<Feedback>('PUT', '/me/feedback', input),
    /** Dish reviews: public list, the user's own review, and the owner's panel (reply / report). */
    /** `fresh` skips the 30 s CDN cache (right after the user saved their own review). */
    dishReviews: (dishId: string, page = 0, fresh = 0) => call<{ items: PublicReview[]; hasMore: boolean; translated?: boolean }>('GET', `/dishes/${dishId}/reviews${qs({ page, v: fresh || undefined })}`, undefined, {}, false),
    myReview: (dishId: string) => call<{ item: MyReview | null }>('GET', `/dishes/${dishId}/review`).then(r => r.item),
    saveReview: (dishId: string, input: ReviewInput) => call<MyReview>('PUT', `/dishes/${dishId}/review`, input),
    deleteReview: (dishId: string) => call<{ ok: true }>('DELETE', `/dishes/${dishId}/review`),
    ownerReviews: (restaurantId: string, page = 0) => call<{ items: OwnerReview[]; hasMore: boolean }>('GET', `/restaurants/${restaurantId}/reviews${qs({ page })}`),
    replyToReview: (reviewId: string, reply: string) => call<{ ok: true }>('PUT', `/reviews/${reviewId}/reply`, { reply }),
    reportReview: (reviewId: string, reason: string) => call<{ ok: true }>('POST', `/reviews/${reviewId}/report`, { reason }),
    /** Superadmin panel: action name and admin_* arguments (modules/admin/data/admin.ts). */
    admin: <T>(action: string, args: Record<string, unknown> = {}) => call<{ result: T }>('POST', `/admin/${action}`, args).then(r => r.result),
    /** Diner assistant turn; send back the returned context with the next message. */
    assistant: (message: string, context?: AssistantContext, location?: { latitude: number; longitude: number }, hide?: readonly string[]) =>
      call<AssistantResponse>('POST', '/assistant', { message, context, location, hide }, {}, false),
    searchCatalog: (params: {
      q?: string; lat?: number; lng?: number; radiusMeters?: number; limit?: number
      category?: string; tags?: readonly string[]; without?: readonly string[]; avoid?: readonly string[]; openNow?: boolean; sort?: 'relevance' | 'price'
      minPrice?: number; maxPrice?: number; hide?: readonly string[]
    }) =>
      call<{ items: PublicCatalogItem[]; count: number; translated?: boolean }>('GET', `/catalog/search${qs(params)}`, undefined, {}, false),
    getPublicBranch: (id: string) => call<{ branch: PublicCatalogItem & PublicBranchExtras; menu: PublicDish[]; translated?: boolean }>('GET', `/branches/${id}/public`, undefined, {}, false),
  }
}

export type ApiClient = ReturnType<typeof createApiClient>
