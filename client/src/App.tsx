import type { Component } from "solid-js"
import { ServiceProvider } from "./service/context"
import { createErrorHandler } from "./service/errorHandler"
import { createApi } from "./service/api"

const App: Component = () => {
  const api = createApi(new URL(import.meta.env.VITE_API_URL))
  const errorHandler = createErrorHandler()

  return (
    <ServiceProvider services={{ api, errorHandler }}>
      <h1>Hello, world!</h1>
    </ServiceProvider>
  )
}

export default App
