import { Api, ApiResponseError } from "./api"
import { Accessor, createEffect, createSignal, Signal } from "solid-js"
import { hasType } from "../util/types"
import { createErrorHandler } from "../util/browser"

const TOKEN_STORAGE_KEY = "API_ACCESS_TOKEN"

export const enum OpenIDEndpoint {
  EU = "https://eu.wargaming.net/id/openid/",
  NA = "https://na.wargaming.net/id/openid/",
  Asia = "https://asia.wargaming.net/id/openid/",
}

export const enum AuthStateEnum {
  Unauthenticated = 1,
  Verifying = 2,
  NotEnoughBattles = 3,
  Authenticated = 4,
}

export type AuthState =
  | AuthStateEnum.Unauthenticated
  | AuthStateEnum.Verifying
  | AuthStateEnum.NotEnoughBattles
  | { type: AuthStateEnum.Authenticated; token: string }

export interface Auth {
  state: Accessor<AuthState>
  authenticate(region: OpenIDEndpoint): void
}

export function createAuth(api: Api): Auth {
  const [state, setState] = createAuthState()

  createErrorHandler(err => {
    if (err instanceof ApiResponseError && err.detail.error === "InvalidBearerToken") {
      setState(AuthStateEnum.Unauthenticated)
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
      setState(AuthStateEnum.Verifying)
      const { token } = await api.authenticate(params)
      setState({ type: AuthStateEnum.Authenticated, token })
    } catch (err) {
      if (err instanceof ApiResponseError && err.detail.error === "NotEnoughBattles") {
        setState(AuthStateEnum.NotEnoughBattles)
      } else {
        setState(AuthStateEnum.Unauthenticated)
        throw err
      }
    }
  }

  return { state, authenticate }
}

function createAuthState(): Signal<AuthState> {
  const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY)

  const [state, setState] = createSignal<AuthState>(
    storedToken !== null
      ? { type: AuthStateEnum.Authenticated, token: storedToken }
      : AuthStateEnum.Unauthenticated,
  )

  createEffect(() => {
    const currentState = state()
    if (hasType(currentState, AuthStateEnum.Authenticated)) {
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
