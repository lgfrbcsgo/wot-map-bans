import { Api } from "../api"
import { Auth } from "../auth"
import { mask } from "superstruct"
import { ActiveModes, BlockedMap, BlockedMaps, MessageType, ModMessage, PlayedMap } from "./message"
import { contextualizedError } from "../../util/error"
import { Accessor, createSignal } from "solid-js"

export const ModConnectionError = contextualizedError("ModError")

export interface ModConnection {
  blockedMaps: Accessor<BlockedMap[]>
  activeModes: Accessor<string[]>
}

export function createModConnection(socket: WebSocket, api: Api, auth: Auth): ModConnection {
  const [blockedMaps, setBlockedMaps] = createSignal<BlockedMap[]>([])
  const [activeModes, setActiveModes] = createSignal<string[]>([])

  socket.addEventListener("message", e => {
    const json = ModConnectionError.try("Unexpected message type", () => JSON.parse(e.data))
    const message = ModConnectionError.try("Unexpected mod message", () => mask(json, ModMessage))
    void handleMessage(message)
  })

  async function handleMessage(message: ModMessage) {
    switch (message.type) {
      case MessageType.PlayedMap:
        return handlePlayedMap(message)
      case MessageType.BlockedMaps:
        return handleBlockedMaps(message)
      case MessageType.ActiveModes:
        return handleActiveModes(message)
    }
  }

  async function handlePlayedMap(message: PlayedMap) {
    const currentToken = auth.token()
    if (currentToken) {
      await api.reportPlayedMap(currentToken, message)
    }
  }

  function handleBlockedMaps(message: BlockedMaps) {
    setBlockedMaps(message.maps)
  }

  function handleActiveModes(message: ActiveModes) {
    setActiveModes(message.modes)
  }

  return { blockedMaps, activeModes }
}
