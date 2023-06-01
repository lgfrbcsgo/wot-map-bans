import { Api } from "./api"
import { Auth } from "./auth"
import { Infer, literal, mask, number, object, string, union } from "superstruct"
import { onVisibilityChange } from "../util/browser"
import { Accessor, createSignal, onCleanup } from "solid-js"
import { contextualizedError } from "../util/error"
import { getType, hasType, unwrapType } from "../util/types"

const MOD_URL = new URL("ws://localhost:15457")
const SUPPORTED_PROTOCOL_VERSION = { major: 1, minor: 0 }
const CONNECTION_SUPERSEDED_CODE = 4000
const RECONNECT_INTERVAL = 10_000

export const enum ModState {
  Disconnected,
  Connecting,
  Connected,
}

export interface Mod {
  state: Accessor<ModState>
  connection: Accessor<ModConnection | undefined>
}

type InternalModState =
  | ModState.Disconnected
  | { type: ModState.Connecting; socket: WebSocket }
  | { type: ModState.Connected; socket: WebSocket; connection: ModConnection }

export function createMod(api: Api, auth: Auth): Mod {
  const [internalState, setInternalState] = createSignal<InternalModState>(ModState.Disconnected)
  const state = () => getType(internalState())
  const connection = () => unwrapType(internalState(), ModState.Connected)?.connection

  onCleanup(() => {
    const currentState = internalState()
    if (!hasType(currentState, ModState.Disconnected)) {
      currentState.socket.close()
    }
  })

  onVisibilityChange(visible => {
    if (visible) connect()
  })

  let reconnectTimeoutHandle: number | undefined
  onCleanup(() => window.clearTimeout(reconnectTimeoutHandle))

  function connect() {
    if (!hasType(internalState(), ModState.Disconnected)) return

    const socket = new WebSocket(MOD_URL)

    setInternalState({ type: ModState.Connecting, socket })

    socket.onopen = () => {
      const connection = createModConnection(socket, api, auth)
      setInternalState({ type: ModState.Connected, socket, connection })
    }

    socket.onclose = e => {
      setInternalState(ModState.Disconnected)
      if (e.code !== CONNECTION_SUPERSEDED_CODE) {
        reconnectTimeoutHandle = window.setTimeout(connect, RECONNECT_INTERVAL)
      }
    }
  }

  return { state, connection }
}

export interface ModConnection {
  modCompatible: Accessor<boolean>
}

function createModConnection(socket: WebSocket, api: Api, auth: Auth): ModConnection {
  const [modCompatible, setModCompatible] = createSignal(true)

  socket.onmessage = e => {
    const json = ModError.try("Unexpected message type", () => JSON.parse(e.data))
    const message = ModError.try("Unexpected mod message", () => mask(json, ModMessage))
    void handleMessage(message)
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
    const { major, minor } = SUPPORTED_PROTOCOL_VERSION
    if (message.major !== major || message.minor < minor) {
      setModCompatible(false)
    }
  }

  async function handlePlayedMap(message: PlayedMap) {
    const currentToken = auth.token()
    if (currentToken) {
      await api.reportPlayedMap(currentToken, message)
    }
  }

  return { modCompatible }
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

export const ModError = contextualizedError("ModError")
