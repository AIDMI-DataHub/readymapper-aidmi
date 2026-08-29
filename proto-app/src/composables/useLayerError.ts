import { useStore } from 'vuex'

export function useLayerError() {
  const store = useStore()
  const layerError = (layerId: string): string | null => store.getters.layerLoadError(layerId)
  const layerSuccess = (layerId: string): boolean => store.getters.layerLoadSuccess(layerId)
  return { layerError, layerSuccess }
}
