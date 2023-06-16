import metadata from "../../assets/game/maps.json"

import greenBase from "../../assets/game/icons/311.png"
import greenSpawn1 from "../../assets/game/icons/339.png"
import greenSpawn2 from "../../assets/game/icons/341.png"
import greenSpawn3 from "../../assets/game/icons/343.png"
import greenSpawn4 from "../../assets/game/icons/345.png"

import redBase from "../../assets/game/icons/320.png"
import redSpawn1 from "../../assets/game/icons/348.png"
import redSpawn2 from "../../assets/game/icons/350.png"
import redSpawn3 from "../../assets/game/icons/352.png"
import redSpawn4 from "../../assets/game/icons/354.png"

import neutralBase from "../../assets/game/icons/367.png"

export { greenBase, redBase, neutralBase }

export const greenSpawns = [greenSpawn1, greenSpawn2, greenSpawn3, greenSpawn4]
export const redSpawns = [redSpawn1, redSpawn2, redSpawn3, redSpawn4]

export interface MapData {
  name: string
  modes: Record<string, ModeData>
}

export interface ModeData {
  team_bases: TeamBases
  team_spawns: TeamBases
  neutral_bases: Coordinate[]
}

export interface TeamBases {
  green: Coordinate[]
  red: Coordinate[]
}

export interface Coordinate {
  x: number
  y: number
}

export const maps: Record<string, MapData> = metadata

const images: Record<string, string> = import.meta.glob("../../assets/game/*.png", {
  import: "default",
  query: { w: 256, h: 256, format: "webp" },
  eager: true,
})

export function getImage(map: string): string | undefined {
  return images[`../../assets/game/${map}.png`]
}
