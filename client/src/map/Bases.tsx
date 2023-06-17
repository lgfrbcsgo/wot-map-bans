import { Component, For } from "solid-js"
import { Coordinate } from "./assets"

const BASE_RADIUS = 75

export const Bases: Component<{ positions: Coordinate[]; icons: string[] }> = props => {
  return (
    <For each={props.positions}>
      {(position, index) => (
        <image
          x={clamp(position.x, BASE_RADIUS, 1000 - BASE_RADIUS) - BASE_RADIUS}
          y={clamp(position.y, BASE_RADIUS, 1000 - BASE_RADIUS) - BASE_RADIUS}
          width={BASE_RADIUS * 2}
          height={BASE_RADIUS * 2}
          href={props.icons[index() % props.icons.length]}
        />
      )}
    </For>
  )
}

function clamp(value: number, min: number, max: number) {
  if (value < min) return min
  if (value > max) return max
  return value
}
