import { Api } from "./api"
import { Auth } from "./auth"
import { Infer, literal, mask, number, object, string, union } from "superstruct"
import { createPageVisible } from "../util/browser"
import { Accessor, createEffect, createSignal, on, onCleanup } from "solid-js"
import { customError, wrapperError } from "../util/error"

const MOD_URL = new URL("ws://localhost:15457")
const SUPPORTED_PROTOCOL_VERSION = { major: 1, minor: 0 }
const RECONNECT_INTERVAL = 10_000

const enum CloseReason {
  ConnectionSuperseded = 4000,
}

export const enum ConnectionState {
  Disconnected,
  Connecting,
  Connected,
}

export interface ModController {
  connectionState: Accessor<ConnectionState>
}

export function createModController(api: Api, auth: Auth): ModController {
  const [connectionState, setConnectionState] = createSignal(ConnectionState.Disconnected)

  const pageVisible = createPageVisible()
  createEffect(
    on(pageVisible, visible => {
      if (visible) connect()
    }),
  )

  let socket: WebSocket | undefined = undefined
  onCleanup(() => socket?.close())

  let reconnectTimeoutHandle: number | undefined = undefined
  onCleanup(() => window.clearTimeout(reconnectTimeoutHandle))

  function connect() {
    if (connectionState() === ConnectionState.Disconnected) {
      setConnectionState(ConnectionState.Connecting)

      socket = new WebSocket(MOD_URL)
      socket.onopen = () => {
        setConnectionState(ConnectionState.Connected)
      }
      socket.onmessage = e => {
        const json = ModError.try("Unexpected message type", () => JSON.parse(e.data))
        const message = ModError.try("Unexpected mod message", () => mask(json, ModMessage))
        void handleMessage(message)
      }
      socket.onclose = e => {
        setConnectionState(ConnectionState.Disconnected)
        if (e.code !== CloseReason.ConnectionSuperseded) {
          reconnectTimeoutHandle = window.setTimeout(connect, RECONNECT_INTERVAL)
        }
      }
    }
  }

  async function handleMessage(message: ModMessage) {
    switch (message.type) {
      case MessageType.ProtocolVersion:
        return handleProtocolVersion(message)
      case MessageType.PlayedMap:
        return handlePlayedMap(message)
    }
  }

  async function handleProtocolVersion(message: ProtocolVersion) {
    if (
      message.major !== SUPPORTED_PROTOCOL_VERSION.major ||
      message.minor < SUPPORTED_PROTOCOL_VERSION.minor
    ) {
      throw new UnsupportedModVersion(message)
    }
  }

  async function handlePlayedMap(message: PlayedMap) {
    const token = auth.token()
    if (token) {
      await api.reportPlayedMap(token, message)
    }
  }

  return { connectionState }
}

const enum MessageType {
  ProtocolVersion = "ProtocolVersion",
  PlayedMap = "PlayedMap",
}

type ProtocolVersion = Infer<typeof ProtocolVersion>
const ProtocolVersion = object({
  type: literal(MessageType.ProtocolVersion),
  major: number(),
  minor: number(),
})

type PlayedMap = Infer<typeof PlayedMap>
const PlayedMap = object({
  type: literal(MessageType.PlayedMap),
  server: string(),
  map: string(),
  mode: string(),
  bottom_tier: number(),
  top_tier: number(),
})

type ModMessage = Infer<typeof ModMessage>
const ModMessage = union([ProtocolVersion, PlayedMap])

export const ModError = wrapperError("ModError")

export const UnsupportedModVersion = customError<ProtocolVersion>(
  "UnsupportedModVersion",
  ({ major, minor }) => `Unsupported mod version. Protocol version: ${major}.${minor}`,
)
