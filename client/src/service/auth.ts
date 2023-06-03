import { Api, ApiResponseError } from "./api"
import { Accessor, createEffect, createSignal, Signal } from "solid-js"
import { onUnhandledError, onWindowEvent } from "../util/browser"

const TOKEN_STORAGE_KEY = "API_ACCESS_TOKEN"

export const enum OpenIDEndpoint {
  EU = "https://eu.wargaming.net/id/openid/",
  NA = "https://na.wargaming.net/id/openid/",
  Asia = "https://asia.wargaming.net/id/openid/",
}

export const enum AuthState {
  Unauthenticated = 1,
  Verifying = 2,
  NotEnoughBattles = 3,
  Authenticated = 4,
}

interface UnauthenticatedState {
  type: AuthState.Unauthenticated
}

interface VerifyingState {
  type: AuthState.Verifying
}

interface NotEnoughBattlesState {
  type: AuthState.NotEnoughBattles
}

interface AuthenticatedState {
  type: AuthState.Authenticated
  token: string
}

type InternalState =
  | UnauthenticatedState
  | VerifyingState
  | NotEnoughBattlesState
  | AuthenticatedState

export interface Auth {
  state: Accessor<AuthState>
  token: Accessor<string | undefined>
  authenticate(region: OpenIDEndpoint): void
}

export function createAuth(api: Api): Auth {
  const [internalState, setInternalState] = createInternalState()

  onUnhandledError(err => {
    if (err instanceof ApiResponseError && err.detail.error === "InvalidBearerToken") {
      setInternalState({ type: AuthState.Unauthenticated })
    }
  })

  function authenticate(region: OpenIDEndpoint) {
    const url = new URL(region)
    url.searchParams.set("openid.ns", "http://specs.openid.net/auth/2.0")
    url.searchParams.set("openid.mode", "checkid_setup")
    url.searchParams.set("openid.realm", window.location.origin)
    url.searchParams.set("openid.return_to", window.location.href)
    url.searchParams.set("openid.claimed_id", "http://specs.openid.net/auth/2.0/identifier_select")
    url.searchParams.set("openid.identity", "http://specs.openid.net/auth/2.0/identifier_select")
    window.location.assign(url)
  }

  if (window.location.search.includes("openid.mode=id_res")) {
    const url = new URL(window.location.href)
    const params = removeOpenIDParams(url.searchParams)
    window.history.replaceState(null, "", url)
    void verifyIdentity(params)
  }

  async function verifyIdentity(params: URLSearchParams) {
    try {
      setInternalState({ type: AuthState.Verifying })
      const { token } = await api.authenticate(params)
      setInternalState({ type: AuthState.Authenticated, token })
    } catch (err) {
      if (err instanceof ApiResponseError && err.detail.error === "NotEnoughBattles") {
        setInternalState({ type: AuthState.NotEnoughBattles })
      } else {
        setInternalState({ type: AuthState.Unauthenticated })
        throw err
      }
    }
  }

  return {
    state: () => internalState().type,
    token: () => {
      const currentState = internalState()
      if (currentState.type === AuthState.Authenticated) {
        return currentState.token
      }
    },
    authenticate,
  }
}

function createInternalState(): Signal<InternalState> {
  const [internalState, setInternalState] = createSignal<InternalState>(
    newStateFromToken(localStorage.getItem(TOKEN_STORAGE_KEY)),
  )

  onWindowEvent("storage", e => {
    if (e.key !== TOKEN_STORAGE_KEY) return
    setInternalState(newStateFromToken(e.newValue))
  })

  function newStateFromToken(token: string | null): InternalState {
    return token !== null
      ? { type: AuthState.Authenticated, token }
      : { type: AuthState.Unauthenticated }
  }

  createEffect(() => {
    const currentState = internalState()
    if (currentState.type === AuthState.Authenticated) {
      localStorage.setItem(TOKEN_STORAGE_KEY, currentState.token)
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY)
    }
  })

  return [internalState, setInternalState]
}

function removeOpenIDParams(searchParams: URLSearchParams): URLSearchParams {
  const openIDParams = new URLSearchParams()
  for (const [key, value] of new URLSearchParams(searchParams)) {
    if (key.startsWith("openid.")) {
      openIDParams.set(key, value)
      searchParams.delete(key)
    }
  }
  return openIDParams
}
