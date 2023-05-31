import {
  array,
  Infer,
  mask,
  number,
  object,
  optional,
  record,
  string,
  Struct,
  unknown,
} from "superstruct"
import { customError, contextualizedError } from "../util/error"

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
      headers: { "authorization": `Bearer ${token}`, "content-type": "application/json" },
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
    const res = await fetch(url)
    return expectJsonResponse(res, CurrentMaps)
  }

  async function getCurrentServers() {
    const url = new URL("/api/current-servers", baseUrl)
    const res = await fetch(url)
    return expectJsonResponse(res, CurrentServers)
  }

  async function authenticate(params: URLSearchParams) {
    const url = new URL("/api/authenticate", baseUrl)
    const res = await fetch(url, {
      method: "POST",
      body: params,
    })
    return expectJsonResponse(res, AuthenticateResponse)
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

  return { reportPlayedMap, getCurrentMaps, getCurrentServers, authenticate }
}

export type ReportPlayedMapBody = Infer<typeof ReportPlayedMapBody>
const ReportPlayedMapBody = object({
  server: string(),
  map: string(),
  mode: string(),
  bottom_tier: number(),
  top_tier: number(),
})

export type GetCurrentMapsQuery = Infer<typeof GetCurrentMapsQuery>
const GetCurrentMapsQuery = object({
  server: string(),
  min_tier: number(),
  max_tier: number(),
})

export type CurrentMap = Infer<typeof CurrentMap>
const CurrentMap = object({
  map: string(),
  mode: string(),
  count: number(),
})

export type CurrentMaps = Infer<typeof CurrentMaps>
const CurrentMaps = object({
  modes: record(string(), array(CurrentMap)),
})

export type CurrentServer = Infer<typeof CurrentServer>
const CurrentServer = object({
  name: string(),
  region: string(),
  count: number(),
})

export type CurrentServers = Infer<typeof CurrentServers>
const CurrentServers = object({
  regions: record(string(), array(CurrentServer)),
})

export type AuthenticateResponse = Infer<typeof AuthenticateResponse>
const AuthenticateResponse = object({
  token: string(),
})

export type ErrorResponse = Infer<typeof ErrorResponse>
const ErrorResponse = object({
  error: string(),
  detail: optional(unknown()),
})

export const ApiResponseError = customError(
  "ApiResponseError",
  (detail: ErrorResponse) => `API returned error ${detail.error}`,
)

export const ApiError = contextualizedError("ApiError")
