/// <reference types="react-scripts" />
interface ImportMetaEnv {
  readonly GMAP_API_KEY: string
  // add more VITE_ keys here if needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}