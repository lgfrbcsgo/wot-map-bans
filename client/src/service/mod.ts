import { Api } from "./api"
import { Auth } from "./auth"
import { Infer, literal, mask, number, object, string, union } from "superstruct"
import { createPageVisibilityListener } from "../util/browser"
import { Accessor, createEffect, createSignal, on, onCleanup } from "solid-js"
import { wrapperError } from "../util/error"

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
  IncompatibleVersion,
}

export interface Mod {
  connectionState: Accessor<ConnectionState>
}

export function createMod(api: Api, auth: Auth): Mod {
  const [connectionState, setConnectionState] = createSignal(ConnectionState.Disconnected)

  const pageVisible = createPageVisibilityListener()
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
    if (socket === undefined) {
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
        socket = undefined
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
      setConnectionState(ConnectionState.IncompatibleVersion)
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
