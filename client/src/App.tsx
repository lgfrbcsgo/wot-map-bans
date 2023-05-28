import type { Component } from "solid-js"
import { ServiceProvider } from "./service/context"
import { createErrorHandler } from "./service/errorHandler"
import { createApi } from "./service/api"
import { createAuth } from "./service/auth"

const App: Component = () => {
  const api = createApi(new URL(import.meta.env.VITE_API_URL))
  const auth = createAuth(api)
  const errorHandler = createErrorHandler(auth)

  return (
    <ServiceProvider services={{ api, auth, errorHandler }}>
      <h1>Hello, world!</h1>
    </ServiceProvider>
  )
}

export default App
