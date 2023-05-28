import {
  array,
  enums,
  Infer,
  mask,
  number,
  optional,
  record,
  string,
  Struct,
  type,
  unknown,
} from "superstruct"
import { customError, wrapperError } from "../util"

export interface Api {
  reportPlayedMap(token: string, body: ReportPlayedMapBody): Promise<void>
  getCurrentMaps(query: GetCurrentMapsQuery): Promise<CurrentMaps>
  getCurrentServers(): Promise<CurrentServers>
  authenticate(params: FormData): Promise<AuthenticateResponse>
}

export function createApi(baseUrl: URL): Api {
  async function reportPlayedMap(token: string, body: ReportPlayedMapBody) {
    const url = new URL("/api/played-map", baseUrl)
    const res = await fetch(url, {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
    return expectNoResponse(res)
  }

  async function getCurrentMaps(query: GetCurrentMapsQuery) {
    const url = new URL("/api/current-maps", baseUrl)
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

  async function authenticate(params: FormData) {
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

export interface ReportPlayedMapBody {
  server: string
  map: string
  mode: string
  bottom_tier: number
  top_tier: number
}

export interface GetCurrentMapsQuery {
  server: string
  min_tier: number
  max_tier: number
}

export type CurrentMap = Infer<typeof CurrentMap>
const CurrentMap = type({
  map: string(),
  mode: string(),
  count: number(),
})

export type CurrentMaps = Infer<typeof CurrentMaps>
const CurrentMaps = type({
  modes: record(string(), array(CurrentMap)),
})

export type CurrentServer = Infer<typeof CurrentServer>
const CurrentServer = type({
  name: string(),
  region: string(),
  count: number(),
})

export type CurrentServers = Infer<typeof CurrentServers>
const CurrentServers = type({
  regions: record(string(), array(CurrentServer)),
})

export type AuthenticateResponse = Infer<typeof AuthenticateResponse>
const AuthenticateResponse = type({
  token: string(),
})

export type ErrorResponse = Infer<typeof ErrorResponse>
const ErrorResponse = type({
  error: enums([
    "IncorrectType",
    "Invalid",
    "ExpectedBearerToken",
    "InvalidBearerToken",
    "AuthRequired",
    "OpenIDRejected",
    "NotEnoughBattles",
  ]),
  detail: optional(unknown()),
})

export const ApiResponseError = customError(
  "ApiResponseError",
  (detail: ErrorResponse) => `API returned error ${detail.error}`,
)

export const ApiError = wrapperError("ApiError")
