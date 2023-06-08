import { array, Infer, literal, number, object, string, union } from "superstruct"

export const enum MessageType {
  PlayedMap = "PlayedMap",
  BlockedMaps = "BlockedMaps",
  ActiveModes = "ActiveModes",
}

export type PlayedMap = Infer<typeof PlayedMap>
const PlayedMap = object({
  type: literal(MessageType.PlayedMap),
  server: string(),
  map: string(),
  mode: string(),
  bottom_tier: number(),
  top_tier: number(),
})

export type BlockedMap = Infer<typeof BlockedMap>
const BlockedMap = object({
  map: string(),
  blocked_until: number(),
})

export type BlockedMaps = Infer<typeof BlockedMaps>
const BlockedMaps = object({
  type: literal(MessageType.BlockedMaps),
  maps: array(BlockedMap),
})

export type ActiveModes = Infer<typeof ActiveModes>
const ActiveModes = object({
  type: literal("ActiveModes"),
  modes: array(string()),
})

export type ModMessage = Infer<typeof ModMessage>
export const ModMessage = union([PlayedMap, BlockedMaps, ActiveModes])
