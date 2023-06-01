import { Api, ApiResponseError } from "./api"
import { Accessor, createEffect, createSignal, Signal } from "solid-js"
import { getType, hasType, unwrapType } from "../util/types"
import { onUnhandledError } from "../util/browser"

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

export interface Auth {
  state: Accessor<AuthState>
  token: Accessor<string | undefined>
  authenticate(region: OpenIDEndpoint): void
}

type InternalAuthState =
  | AuthState.Unauthenticated
  | AuthState.Verifying
  | AuthState.NotEnoughBattles
  | { type: AuthState.Authenticated; token: string }

export function createAuth(api: Api): Auth {
  const [internalState, setInternalState] = createAuthState()
  const state = () => getType(internalState())
  const token = () => unwrapType(internalState(), AuthState.Authenticated)?.token

  onUnhandledError(err => {
    if (err instanceof ApiResponseError && err.detail.error === "InvalidBearerToken") {
      setInternalState(AuthState.Unauthenticated)
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
      setInternalState(AuthState.Verifying)
      const { token } = await api.authenticate(params)
      setInternalState({ type: AuthState.Authenticated, token })
    } catch (err) {
      if (err instanceof ApiResponseError && err.detail.error === "NotEnoughBattles") {
        setInternalState(AuthState.NotEnoughBattles)
      } else {
        setInternalState(AuthState.Unauthenticated)
        throw err
      }
    }
  }

  return { state, token, authenticate }
}

function createAuthState(): Signal<InternalAuthState> {
  const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY)

  const [state, setState] = createSignal<InternalAuthState>(
    storedToken !== null
      ? { type: AuthState.Authenticated, token: storedToken }
      : AuthState.Unauthenticated,
  )

  createEffect(() => {
    const currentState = state()
    if (hasType(currentState, AuthState.Authenticated)) {
      localStorage.setItem(TOKEN_STORAGE_KEY, currentState.token)
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY)
    }
  })

  return [state, setState]
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
