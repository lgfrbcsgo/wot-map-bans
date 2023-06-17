import { Component } from "solid-js"
import styles from "./styles.module.css"

const WIDTH = 90
const HEIGHT = 600

export const Cross: Component = () => {
  return (
    <>
      <defs>
        <linearGradient id="cross-backdrop" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="5%" stop-color="rgba(40, 0, 0, 0.8)" />
          <stop offset="95%" stop-color="rgba(40, 0, 0, 0.4)" />
        </linearGradient>
      </defs>
      <rect width={1000} height={1000} fill="url(#cross-backdrop)" />
      <g class={styles.cross}>
        <rect x={500 - WIDTH / 2} y={500 - HEIGHT / 2} width={WIDTH} height={HEIGHT} />
        <rect x={500 - HEIGHT / 2} y={500 - WIDTH / 2} width={HEIGHT} height={WIDTH} />
      </g>
    </>
  )
}
