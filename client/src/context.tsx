import { Component, createContext, JSX, useContext } from "solid-js"
import { Api } from "./service/api"
import { Auth } from "./service/auth"
import { Mod } from "./service/mod"

export interface Services {
  api: Api
  auth: Auth
  mod: Mod
}

const Context = createContext<Partial<Services>>({})

export function useService(): Services {
  const services = useContext(Context)
  return new Proxy(services, { get: getService }) as Services
}

function getService<K extends keyof Services>(context: Partial<Services>, key: K): Services[K] {
  const service = context[key]
  if (service === undefined) {
    throw new Error(`Service ${key} not found in context.`)
  }
  return service
}

export const ServiceProvider: Component<{
  services: Partial<Services>
  children: JSX.Element
}> = props => {
  const parentServices = useContext(Context)
  const mergedServices = () => ({ ...parentServices, ...props.services })
  return <Context.Provider value={mergedServices()}>{props.children}</Context.Provider>
}
