import { Api } from "../api"
import { Auth } from "../auth"
import { onPageVisible } from "../../util/browser"
import { Accessor, createRoot, createSignal, onCleanup } from "solid-js"
import { createModConnection, ModConnection } from "./connection"

export type { ModConnection } from "./connection"

const MOD_URL = new URL("ws://localhost:15457")
const MOD_HEALTH_URL = new URL("http://localhost:15457/health")
const CONNECTION_SUPERSEDED_CODE = 4000
const RECONNECT_INTERVAL = 10_000

export const enum ModState {
  Disconnected,
  CheckingHealth,
  Connecting,
  Connected,
}

interface DisconnectedState {
  type: ModState.Disconnected
  reconnectTimeout?: number
}

interface CheckingHealthState {
  type: ModState.CheckingHealth
}

interface ConnectingState {
  type: ModState.Connecting
  socket: WebSocket
}

interface ConnectedState {
  type: ModState.Connected
  socket: WebSocket
  connection: ModConnection
}

type InternalState = DisconnectedState | CheckingHealthState | ConnectingState | ConnectedState

export interface Mod {
  state: Accessor<ModState>
  connection: Accessor<ModConnection | undefined>
}

export function createMod(api: Api, auth: Auth): Mod {
  const [internalState, setInternalState] = createSignal<InternalState>({
    type: ModState.Disconnected,
  })

  onPageVisible(connect)
  onCleanup(close)

  function connect() {
    setInternalState(state => {
      if (state.type !== ModState.Disconnected) return state

      window.clearTimeout(state.reconnectTimeout)

      fetch(MOD_HEALTH_URL).then(healthy).catch(unhealthy)

      return { type: ModState.CheckingHealth }
    })
  }

  function healthy() {
    setInternalState(state => {
      if (state.type !== ModState.CheckingHealth) return state

      const socket = new WebSocket(MOD_URL)
      socket.addEventListener("open", connected)
      socket.addEventListener("close", e => disconnected(e.code))
      return { type: ModState.Connecting, socket }
    })
  }

  function unhealthy() {
    setInternalState(state => {
      if (state.type !== ModState.CheckingHealth) return state

      const reconnectTimeout = window.setTimeout(connect, RECONNECT_INTERVAL)
      return { type: ModState.Disconnected, reconnectTimeout }
    })
  }

  function connected() {
    setInternalState(state => {
      if (state.type !== ModState.Connecting || state.socket.readyState !== WebSocket.OPEN)
        return state

      const socket = state.socket
      return createRoot(dispose => {
        socket.addEventListener("close", dispose)

        const connection = createModConnection(socket, api, auth)
        return { type: ModState.Connected, socket, connection }
      })
    })
  }

  function disconnected(code: number) {
    setInternalState(state => {
      if (
        state.type === ModState.Disconnected ||
        state.type === ModState.CheckingHealth ||
        state.socket.readyState !== WebSocket.CLOSED
      )
        return state

      if (code === CONNECTION_SUPERSEDED_CODE) {
        return { type: ModState.Disconnected }
      } else {
        const reconnectTimeout = window.setTimeout(connect, RECONNECT_INTERVAL)
        return { type: ModState.Disconnected, reconnectTimeout }
      }
    })
  }

  function close() {
    setInternalState(state => {
      switch (state.type) {
        case ModState.Disconnected:
          window.clearTimeout(state.reconnectTimeout)
          return { type: ModState.Disconnected }
        case ModState.CheckingHealth:
          return { type: ModState.Disconnected }
        case ModState.Connecting:
        case ModState.Connected:
          state.socket.close()
          return { type: ModState.Disconnected }
      }
    })
  }

  return {
    state: () => internalState().type,
    connection: () => {
      const currentState = internalState()
      if (currentState.type === ModState.Connected) {
        return currentState.connection
      }
    },
  }
}
