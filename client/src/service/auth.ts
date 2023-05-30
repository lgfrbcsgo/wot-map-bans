import { Api, ApiResponseError } from "./api"
import { Accessor, createSignal } from "solid-js"

import { createStoredSignal } from "../util/browser"
import { ErrorHandler } from "./errorHandler"

export const enum OpenIDEndpoint {
  EU = "https://eu.wargaming.net/id/openid/",
  NA = "https://na.wargaming.net/id/openid/",
  Asia = "https://asia.wargaming.net/id/openid/",
}

export interface Auth {
  token: Accessor<string | undefined>
  verifying: Accessor<boolean>
  authenticate(region: OpenIDEndpoint): void
}

export function createAuth(api: Api, errorHandler: ErrorHandler): Auth {
  const [token, setToken] = createStoredSignal<string>("API_ACCESS_TOKEN")
  const [verifying, setVerifying] = createSignal(false)

  errorHandler.attachListener(ApiResponseError, err => {
    if (err.detail.error === "InvalidBearerToken") setToken(undefined)
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
      setVerifying(true)
      const { token } = await api.authenticate(params)
      setToken(token)
    } catch (err) {
      setToken(undefined)
      throw err
    } finally {
      setVerifying(false)
    }
  }

  return { token, verifying, authenticate }
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
