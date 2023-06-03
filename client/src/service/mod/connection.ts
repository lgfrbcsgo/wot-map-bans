import { Api } from "../api"
import { Auth } from "../auth"
import { Accessor, createSignal } from "solid-js"
import { mask } from "superstruct"
import { MessageType, ModMessage, PlayedMap, ProtocolVersion } from "./message"
import { contextualizedError } from "../../util/error"

const SUPPORTED_PROTOCOL_VERSION = { major: 1, minor: 0 }

export const ModConnectionError = contextualizedError("ModError")

export interface ModConnection {
  versionMismatch: Accessor<boolean>
}

export function createModConnection(socket: WebSocket, api: Api, auth: Auth): ModConnection {
  const [versionMismatch, setVersionMismatch] = createSignal(false)

  socket.addEventListener("message", e => {
    const json = ModConnectionError.try("Unexpected message type", () => JSON.parse(e.data))
    const message = ModConnectionError.try("Unexpected mod message", () => mask(json, ModMessage))
    void handleMessage(message)
  })

  async function handleMessage(message: ModMessage) {
    switch (message.type) {
      case MessageType.ProtocolVersion:
        return handleProtocolVersion(message)
      case MessageType.PlayedMap:
        return handlePlayedMap(message)
    }
  }

  async function handleProtocolVersion(message: ProtocolVersion) {
    const { major, minor } = SUPPORTED_PROTOCOL_VERSION
    if (message.major !== major || message.minor < minor) {
      setVersionMismatch(true)
    }
  }

  async function handlePlayedMap(message: PlayedMap) {
    const currentToken = auth.token()
    if (currentToken) {
      await api.reportPlayedMap(currentToken, message)
    }
  }

  return { versionMismatch }
}
