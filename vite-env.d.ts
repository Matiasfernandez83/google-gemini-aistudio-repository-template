
interface ImportMetaEnv {
  readonly VITE_API_KEY: string;
  readonly API_KEY: string;
  readonly [key: string]: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare const __API_KEY__: string;
