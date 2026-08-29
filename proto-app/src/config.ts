export interface AppConfig {
  s3: {
    cloudfrontBaseUrl: string
    outputFolder: string
  }
  mapbox: {
    accessToken: string
    styleUrl: string
  }
}

let _config: AppConfig | null = null

export async function loadConfig(): Promise<void> {
  const res = await fetch(import.meta.env.BASE_URL + 'config.json')
  if (!res.ok) throw new Error(`Failed to load config.json: ${res.status}`)
  _config = await res.json()
}

export function getConfig(): AppConfig {
  if (!_config) throw new Error('config.json not loaded — call loadConfig() first')
  return _config
}
