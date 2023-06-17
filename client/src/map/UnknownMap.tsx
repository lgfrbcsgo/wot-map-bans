import { Component } from "solid-js"
import styles from "./styles.module.css"

export const UnknownMap: Component = () => {
  return (
    <svg class={styles.map} viewBox="0 0 1000 1000">
      <rect width="100%" height="100%" fill="#DDD" />
    </svg>
  )
}
