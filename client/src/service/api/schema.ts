import { array, Infer, number, object, optional, record, string, unknown } from "superstruct"

export type ReportPlayedMapBody = Infer<typeof ReportPlayedMapBody>
export const ReportPlayedMapBody = object({
  server: string(),
  map: string(),
  mode: string(),
  bottom_tier: number(),
  top_tier: number(),
})

export type GetCurrentMapsQuery = Infer<typeof GetCurrentMapsQuery>
export const GetCurrentMapsQuery = object({
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
export const CurrentMaps = object({
  modes: record(string(), array(CurrentMap)),
})

export type CurrentServer = Infer<typeof CurrentServer>
const CurrentServer = object({
  name: string(),
  region: string(),
  count: number(),
})

export type CurrentServers = Infer<typeof CurrentServers>
export const CurrentServers = object({
  regions: record(string(), array(CurrentServer)),
})

export type AuthenticateResponse = Infer<typeof AuthenticateResponse>
export const AuthenticateResponse = object({
  token: string(),
})

export type ErrorResponse = Infer<typeof ErrorResponse>
export const ErrorResponse = object({
  error: string(),
  detail: optional(unknown()),
})
