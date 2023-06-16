import type { Component } from "solid-js"
import { ServiceProvider } from "./context"
import { createApi } from "./service/api"
import { createAuth, OpenIDEndpoint } from "./service/auth"
import { createMod } from "./service/mod"
import { Map } from "./map/Map"

const App: Component = () => {
  const api = createApi(new URL(import.meta.env.VITE_API_URL))
  const auth = createAuth(api)
  const mod = createMod(api, auth)

  return (
    <ServiceProvider services={{ api, auth, mod }}>
      <button onclick={() => auth.authenticate(OpenIDEndpoint.EU)}>Verify account</button>
      <Map map="01_karelia" mode="assault" />
    </ServiceProvider>
  )
}

export default App
