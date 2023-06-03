import { mask, Struct } from "superstruct"
import { v4 as uuid } from "uuid"
import { contextualizedError, customError } from "../../util/error"
import {
  AuthenticateResponse,
  CurrentMaps,
  CurrentServers,
  ErrorResponse,
  GetCurrentMapsQuery,
  ReportPlayedMapBody,
} from "./schema"

export type * from "./schema"

const enum Header {
  Authorization = "Authorization",
  ContentType = "Content-Type",
  RequestId = "X-Request-Id",
}

export const ApiError = contextualizedError("ApiError")

export const ApiResponseError = customError(
  "ApiResponseError",
  (detail: ErrorResponse) => `API returned error ${detail.error}`,
)

export interface Api {
  reportPlayedMap(token: string, body: ReportPlayedMapBody): Promise<void>
  getCurrentMaps(query: GetCurrentMapsQuery): Promise<CurrentMaps>
  getCurrentServers(): Promise<CurrentServers>
  authenticate(params: FormData): Promise<AuthenticateResponse>
}

export function createApi(baseUrl: URL): Api {
  async function reportPlayedMap(token: string, body: ReportPlayedMapBody) {
    const url = new URL("/api/played-map", baseUrl)
    body = mask(body, ReportPlayedMapBody)
    const res = await fetch(url, {
      method: "POST",
      headers: {
        [Header.Authorization]: `Bearer ${token}`,
        [Header.ContentType]: "application/json",
        [Header.RequestId]: uuid(),
      },
      body: JSON.stringify(body),
    })
    return expectNoResponse(res)
  }

  async function getCurrentMaps(query: GetCurrentMapsQuery) {
    const url = new URL("/api/current-maps", baseUrl)
    query = mask(query, GetCurrentMapsQuery)
    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, value.toString())
    }
    const res = await fetch(url, {
      headers: { [Header.RequestId]: uuid() },
    })
    return expectJsonResponse(res, CurrentMaps)
  }

  async function getCurrentServers() {
    const url = new URL("/api/current-servers", baseUrl)
    const res = await fetch(url, {
      headers: { [Header.RequestId]: uuid() },
    })
    return expectJsonResponse(res, CurrentServers)
  }

  async function authenticate(params: URLSearchParams) {
    const url = new URL("/api/authenticate", baseUrl)
    const res = await fetch(url, {
      method: "POST",
      headers: { [Header.RequestId]: uuid() },
      body: params,
    })
    return expectJsonResponse(res, AuthenticateResponse)
  }

  return { reportPlayedMap, getCurrentMaps, getCurrentServers, authenticate }
}

async function expectJsonResponse<T>(res: Response, Type: Struct<T>) {
  const json = await ApiError.try("Unexpected response type", () => res.json())
  if (res.ok) {
    return ApiError.try("Unexpected API response", () => mask(json, Type))
  } else {
    const errorResponse = ApiError.try("Unexpected API response", () => mask(json, ErrorResponse))
    throw new ApiResponseError(errorResponse)
  }
}

async function expectNoResponse<T>(res: Response) {
  if (!res.ok) {
    const json = await ApiError.try("Unexpected response type", () => res.json())
    const errorResponse = ApiError.try("Unexpected API response", () => mask(json, ErrorResponse))
    throw new ApiResponseError(errorResponse)
  }
}
