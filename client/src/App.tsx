import type { Component } from "solid-js"
import { ServiceProvider } from "./context"
import { createApi } from "./service/api"
import { createAuth, OpenIDEndpoint } from "./service/auth"
import { createMod } from "./service/mod"
import { CurrentMaps } from "./CurrentMaps"

const App: Component = () => {
  const api = createApi(new URL(import.meta.env.VITE_API_URL))
  const auth = createAuth(api)
  const mod = createMod(api, auth)

  return (
    <ServiceProvider services={{ api, auth, mod }}>
      <button onclick={() => auth.authenticate(OpenIDEndpoint.EU)}>Verify account</button>
      <CurrentMaps server="EU2" minTier={8} maxTier={10} />
    </ServiceProvider>
  )
}

export default App
