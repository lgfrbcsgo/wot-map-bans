import { Component, For } from "solid-js"
import { Coordinate } from "./assets"

const BASE_RADIUS = 75

export const Bases: Component<{ positions: Coordinate[]; icons: string[] }> = props => {
  return (
    <For each={props.positions}>
      {(position, index) => (
        <image
          x={position.x - BASE_RADIUS}
          y={position.y - BASE_RADIUS}
          width={BASE_RADIUS * 2}
          height={BASE_RADIUS * 2}
          href={props.icons[index() % props.icons.length]}
        />
      )}
    </For>
  )
}
