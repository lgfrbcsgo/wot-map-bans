import { Infer, literal, number, object, string, union } from "superstruct"

export const enum MessageType {
  ProtocolVersion = "ProtocolVersion",
  PlayedMap = "PlayedMap",
}

export type ProtocolVersion = Infer<typeof ProtocolVersion>
export const ProtocolVersion = object({
  type: literal(MessageType.ProtocolVersion),
  major: number(),
  minor: number(),
})

export type PlayedMap = Infer<typeof PlayedMap>
export const PlayedMap = object({
  type: literal(MessageType.PlayedMap),
  server: string(),
  map: string(),
  mode: string(),
  bottom_tier: number(),
  top_tier: number(),
})

export type ModMessage = Infer<typeof ModMessage>
export const ModMessage = union([ProtocolVersion, PlayedMap])
