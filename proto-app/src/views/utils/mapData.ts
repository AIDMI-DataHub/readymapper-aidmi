import { isEqual } from 'es-toolkit/predicate'
import type { Store } from 'vuex'

import { layers, type LayerConfig } from '@/layers/index.ts'

let trackedLayerIds: string[] = []
let trackedSourceIds: string[] = []
let currentLoadId = 0

export const teardownMapData = (map: any): void => {
  currentLoadId++
  for (const id of [...trackedLayerIds].reverse()) {
    try { if (map.getLayer(id)) map.removeLayer(id) } catch (e) {}
  }
  for (const id of [...trackedSourceIds].reverse()) {
    try { if (map.getSource(id)) map.removeSource(id) } catch (e) {}
  }
  trackedLayerIds = []
  trackedSourceIds = []
}

/**
 * Returns the subset of layers that apply to the current disaster's
 * type, country, and US states.
 */
const findMatchingLayers = (state: any): LayerConfig[] => {
  const disasterConfig = state.disasterConfig;
  const {
    type: disasterType,
    usStatesAffected: usStatesAffectedRaw,
    isInternational,
  } = disasterConfig;

  let usStatesAffected = [];
  if (typeof usStatesAffectedRaw === "string") {
    usStatesAffected = usStatesAffectedRaw.split(",")
  }

  return layers.filter(l => {
    const disasterMatches = (
      l.disasterType === 'all' ||
      l.disasterType === disasterType
    );

    const countryMatches = (
      (!l.usOnly && !l.nonUsOnly) ||
      (l.usOnly && !isInternational) ||
      (l.nonUsOnly && isInternational)
    );

    const usStatesMatch = (
      !l.usStates ||
      !usStatesAffected.length ||
      isEqual(l.usStates, usStatesAffected)
    );

    return disasterMatches && countryMatches && usStatesMatch;
  });
};

/**
 * Returns layers whose `adderDependencies` include `id` ie layers
 * that must be re-added when `id` finishes loading.
 */
const findAdderDependents = (id: string): LayerConfig[] => {
  return layers.filter(l => l.adderDependencies?.includes(id));
};

/**
 * Returns layers whose `postProcessDependencies` include `id` ie layers
 * that must re-run postProcess when `id` finishes loading.
 */
const findPostProcessDependents = (id: string): LayerConfig[] => {
  return layers.filter(l => l.postProcessDependencies?.includes(id));
};

/**
 * Returns the Mapbox layer ID that `l` should be inserted before, preserving z-order.
 * Finds the lowest-zIndex layer above `l` that is already on the map.
 * If `l` has a `beforeLayerIdPrefix`, only considers layers sharing that prefix (for
 * layers that need to sit below a specific Mapbox basemap group, e.g. "water").
 */
const getBeforeId = (map: any, layers: LayerConfig[], l: LayerConfig): string | undefined => {
  let higherLayers = layers;
  let mapLayerId: string;

  if (l.beforeLayerIdPrefix) {
    higherLayers = layers.filter(({ beforeLayerIdPrefix }) => beforeLayerIdPrefix === l.beforeLayerIdPrefix);
  }

  higherLayers = higherLayers
    .filter(({ zIndex }) => zIndex != null && zIndex > l.zIndex)
    .filter(({ mapLayerId }) => mapLayerId && map.getLayer(mapLayerId))
    .toSorted((a, b) => a.zIndex - b.zIndex);
  if (higherLayers.length) {
    mapLayerId = higherLayers[0].mapLayerId;
  }
  else if (l.beforeLayerIdPrefix) {
    mapLayerId = map.getStyle().layers.find(layer => layer.id.startsWith(l.beforeLayerIdPrefix))?.id;
  }
  return mapLayerId;
}

/**
 * Loads and adds all layers matching the current disaster to the map.
 * Patches map.addLayer/addSource on first call to track added IDs for teardown.
 * For each matching layer: fetches data, commits it to the store, runs postProcess,
 * adds the Mapbox layer, then triggers any dependent layers' adders and postProcesses.
 */
export const loadMapData = async (map: any, store: Store<any>): Promise<void> => {
  const loadId = ++currentLoadId

  if (!map._rmTracked) {
    const origAddLayer = map.addLayer.bind(map)
    const origAddSource = map.addSource.bind(map)
    map.addLayer = (layer: any, beforeId?: string) => {
      trackedLayerIds.push(layer.id)
      return origAddLayer(layer, beforeId)
    }
    map.addSource = (id: string, source: any) => {
      trackedSourceIds.push(id)
      return origAddSource(id, source)
    }
    map._rmTracked = true
  }

  const matchingLayers = findMatchingLayers(store.state);
  await Promise.allSettled(matchingLayers.map(async (l) => {
    let data;

    try {
      // Load data
      if (l.loader) {
        data = await l.loader(store, l.loadLabel);
      }
      if (l.loaders && l.loadersCombine) {
        data = l.loadersCombine(await Promise.all(l.loaders.map(fn => fn(store, l.loadLabel))));
      }
    } catch(e) {
      console.error(e)
    }

    // Bail out if a newer disaster load has started
    if (loadId !== currentLoadId) return

    store.commit('setData', { [l.id]: data });

    // Post process
    if (l.postProcess) {
      l.postProcess(data, store);
    }

    // Add to map
    if (l.adder) {
      l.adder(map, data, store, getBeforeId(map, layers, l));
    }

    // Find layers that depend on this layer and update those
    findAdderDependents(l.id).forEach(l => l.adder(map, store.state[l.id], store));
    findPostProcessDependents(l.id).forEach(l => {
      l.postProcess(store.state[l.id], store);
      if (l.updater) l.updater(map, store);
    });

    if (l.updater) {
      l.updater(map, store);
    }
  }));

  if (loadId !== currentLoadId) return

  store.dispatch('setActiveLayerIds', {
    activeLayerIds: matchingLayers.map(({ id }) => id),
  });

  store.commit('setHiddenMapLayerIds', matchingLayers.filter(l => l.hiddenByDefault).map(l => l.mapLayerId))
}

export const layerEnabled = (state: any, layerId: string) => {
  const matchingLayers = findMatchingLayers(state);
  return matchingLayers.map(l => l.id).includes(layerId);
}

export const layerById = (layerId: string) => {
  return layers.find(l => l.id === layerId)
}

