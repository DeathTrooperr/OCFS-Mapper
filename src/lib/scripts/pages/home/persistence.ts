import type { SavedMap } from './types.js';

export const STORAGE_KEY = 'ocsf_mapper_saved_maps';

export function loadRecentMaps(): SavedMap[] {
    if (typeof localStorage === 'undefined') return [];
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        try {
            const maps: any[] = JSON.parse(stored);
            return maps.map(migrateMap).sort((a, b) => b.timestamp - a.timestamp);
        } catch (e) {
            console.error('Failed to parse saved maps', e);
        }
    }
    return [];
}

function migrateMap(map: any): SavedMap {
    const loadedMap: any = {
        ...map,
        jsonInput: map.jsonInput || '',
        schemaFields: map.schemaFields || [],
        selectedCategory: map.selectedCategory || '',
        selectedClass: map.selectedClass || '',
        useConditionalClass: !!map.useConditionalClass,
    };

    // Migration and loading logic from legacy structures
    if (map.classDeterminingField) {
        const fieldName = map.classDeterminingField as string;
        loadedMap.classDeterminingFields = [{
            name: fieldName,
            mappings: (map.classMappings || []).map((m: any) => ({
                enumValue: m.enumValue || m.enumValues?.[fieldName] || '',
                selectedCategory: m.selectedCategory,
                selectedClass: m.selectedClass,
                schemaFields: m.schemaFields
            }))
        }];
    } else if (map.classDeterminingFields && Array.isArray(map.classDeterminingFields) && typeof map.classDeterminingFields[0] === 'string') {
        // Mid-legacy: classDeterminingFields was string[], classMappings was flat
        const fieldNames = map.classDeterminingFields as string[];
        loadedMap.classDeterminingFields = fieldNames.map(name => ({
            name,
            mappings: (map.classMappings || []).filter((m: any) => m.enumValues && m.enumValues[name]).map((m: any) => ({
                enumValue: m.enumValues[name],
                selectedCategory: m.selectedCategory,
                selectedClass: m.selectedClass,
                schemaFields: m.schemaFields
            }))
        }));
    } else {
        // New structure or empty
        loadedMap.classDeterminingFields = map.classDeterminingFields || [];
    }

    return loadedMap as SavedMap;
}

export function saveMap(mapData: Omit<SavedMap, 'timestamp' | 'id'> & { id?: string, name?: string }): SavedMap[] {
    const recentMaps = loadRecentMaps();
    const name = mapData.name || 'Untitled Map';
    const id = mapData.id || name.toLowerCase().replace(/\s+/g, '-');
    
    const newMap: SavedMap = {
        ...mapData,
        id: id || Date.now().toString(),
        name: name,
        timestamp: Date.now(),
    } as SavedMap;

    const existingIndex = recentMaps.findIndex(m => m.id === newMap.id);
    let updatedMaps: SavedMap[];
    if (existingIndex >= 0) {
        updatedMaps = [...recentMaps];
        updatedMaps[existingIndex] = newMap;
    } else {
        updatedMaps = [newMap, ...recentMaps];
    }
    
    // Keep only last 10 maps
    updatedMaps = updatedMaps.sort((a, b) => b.timestamp - a.timestamp).slice(0, 10);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedMaps));
    return updatedMaps;
}

export function deleteMapFromStorage(id: string): SavedMap[] {
    const recentMaps = loadRecentMaps();
    const updatedMaps = recentMaps.filter(m => m.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedMaps));
    return updatedMaps;
}
