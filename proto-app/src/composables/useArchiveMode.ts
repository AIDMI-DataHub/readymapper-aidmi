import { ref, reactive } from 'vue'

export interface ArchiveFilters {
  regions: string[]
  types: string[]
  name: string
  dateStart: string
  dateEnd: string
  activeOnly: boolean
}

const archiveMode = ref(false)
const filters = reactive<ArchiveFilters>({
  regions: [],
  types: [],
  name: '',
  dateStart: '',
  dateEnd: '',
  activeOnly: false,
})

export function useArchiveMode() {
  return { archiveMode, filters }
}
