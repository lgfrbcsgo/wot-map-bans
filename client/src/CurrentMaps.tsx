import { Component, createResource, For } from "solid-js"
import { useService } from "./context"
import { Mode } from "./constants"
import { Map } from "./map/Map"
import { CurrentMap } from "./service/api"

interface Props {
  server: string
  minTier: number
  maxTier: number
}

export const CurrentMaps: Component<Props> = props => {
  const { api, mod } = useService()

  const [data] = createResource(
    () => ({ server: props.server, min_tier: props.minTier, max_tier: props.maxTier }),
    api.getCurrentMaps,
  )

  const isBlocked = (map: CurrentMap) => {
    const blockedMaps = mod.connection()?.blockedMaps()
    const activeModes = mod.connection()?.activeModes()
    return (
      (activeModes?.length && !activeModes.includes(map.mode)) ||
      (map.mode === Mode.Standard && blockedMaps?.some(blockedMap => blockedMap.map === map.map))
    )
  }

  return (
    <>
      <h2>Standard Battle</h2>
      <For each={data()?.modes[Mode.Standard]}>
        {item => <Map map={item.map} mode={item.mode} blocked={isBlocked(item)} />}
      </For>
      <h2>Encounter</h2>
      <For each={data()?.modes[Mode.Encounter]}>
        {item => <Map map={item.map} mode={item.mode} blocked={isBlocked(item)} />}
      </For>
      <h2>Assault</h2>
      <For each={data()?.modes[Mode.Assault]}>
        {item => <Map map={item.map} mode={item.mode} blocked={isBlocked(item)} />}
      </For>
    </>
  )
}
