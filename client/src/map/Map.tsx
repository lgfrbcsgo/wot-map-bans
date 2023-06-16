import { Component, Show } from "solid-js"
import { getImage, greenBase, greenSpawns, maps, neutralBase, redBase, redSpawns } from "./assets"
import styles from "./Map.module.css"
import { Bases } from "./Bases"
import { UnknownMap } from "./UnknownMap"

export const Map: Component<{ map: string; mode: string }> = props => {
  return (
    <Show when={maps[props.map]} keyed fallback={<UnknownMap />}>
      {map => (
        <svg
          class={styles.map}
          style={{ "background-image": `url(${getImage(props.map)})` }}
          viewBox="0 0 1000 1000"
        >
          <Show when={map.modes[props.mode]} keyed>
            {mode => (
              <>
                <Bases positions={mode.neutral_bases} icons={[neutralBase]} />
                <Bases positions={mode.team_bases.green} icons={[greenBase]} />
                <Bases positions={mode.team_bases.red} icons={[redBase]} />
                <Bases positions={mode.team_spawns.green} icons={greenSpawns} />
                <Bases positions={mode.team_spawns.red} icons={redSpawns} />
              </>
            )}
          </Show>
        </svg>
      )}
    </Show>
  )
}
