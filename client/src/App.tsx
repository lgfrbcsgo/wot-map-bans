import type { Component } from "solid-js"
import { ServiceProvider } from "./service/context"
import { createErrorHandler } from "./service/errorHandler"
import { createApi } from "./service/api"
import { createAuth, OpenIDEndpoint } from "./service/auth"
import { createModController } from "./service/modController"

const App: Component = () => {
  const api = createApi(new URL(import.meta.env.VITE_API_URL))
  const auth = createAuth(api)
  const errorHandler = createErrorHandler(auth)
  const modController = createModController(api, auth)

  return (
    <ServiceProvider services={{ api, auth, errorHandler, modController }}>
      <button onclick={() => auth.authenticate(OpenIDEndpoint.EU)}>Verify account</button>
    </ServiceProvider>
  )
}

export default App
