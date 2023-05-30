import type { Component } from "solid-js"
import { ServiceProvider } from "./service/context"
import { createErrorHandler } from "./service/errorHandler"
import { createApi } from "./service/api"
import { createAuth, OpenIDEndpoint } from "./service/auth"
import { createMod } from "./service/mod"

const App: Component = () => {
  const errorHandler = createErrorHandler()
  const api = createApi(new URL(import.meta.env.VITE_API_URL))
  const auth = createAuth(api, errorHandler)
  const mod = createMod(api, auth)

  return (
    <ServiceProvider services={{ errorHandler, api, auth, mod }}>
      <button onclick={() => auth.authenticate(OpenIDEndpoint.EU)}>Verify account</button>
    </ServiceProvider>
  )
}

export default App
