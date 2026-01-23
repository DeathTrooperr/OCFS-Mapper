import type { SavedMap } from '$lib/scripts/types/types.ts';

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
        schemaFields: (map.schemaFields || []).map((f: any) => ({
            name: f.name,
            type: f.type,
            enumValues: f.enumValues || ''
        })),
        selectedCategory: map.selectedCategory || '',
        selectedClass: map.selectedClass || '',
        useConditionalClass: !!map.useConditionalClass,
        mappings: map.mappings || {}
    };

    // Migrate default mappings from schemaFields to mappings
    if (map.schemaFields && Object.keys(loadedMap.mappings).length === 0) {
        map.schemaFields.forEach((f: any) => {
            if (f.mappedTo && f.mappedTo !== 'unmapped' && f.mappedTo !== '') {
                loadedMap.mappings[f.mappedTo] = {
                    sourceField: f.name,
                    enumMapping: f.enumMapping || {}
                };
            }
        });
    }

    // Migration and loading logic from legacy structures
    if (map.classDeterminingField) {
        const fieldName = map.classDeterminingField as string;
        loadedMap.classDeterminingFields = [{
            name: fieldName,
            mappings: (map.classMappings || []).map((m: any) => {
                const condMappings: Record<string, any> = {};
                if (m.schemaFields) {
                    m.schemaFields.forEach((sf: any) => {
                        if (sf.mappedTo && sf.mappedTo !== 'unmapped' && sf.mappedTo !== '') {
                            condMappings[sf.mappedTo] = {
                                sourceField: sf.name,
                                enumMapping: sf.enumMapping || {}
                            };
                        }
                    });
                }
                return {
                    enumValue: m.enumValue || m.enumValues?.[fieldName] || '',
                    selectedCategory: m.selectedCategory,
                    selectedClass: m.selectedClass,
                    mappings: condMappings
                };
            })
        }];
    } else if (map.classDeterminingFields && Array.isArray(map.classDeterminingFields) && typeof map.classDeterminingFields[0] === 'string') {
        const fieldNames = map.classDeterminingFields as string[];
        loadedMap.classDeterminingFields = fieldNames.map(name => ({
            name,
            mappings: (map.classMappings || []).filter((m: any) => m.enumValues && m.enumValues[name]).map((m: any) => {
                const condMappings: Record<string, any> = {};
                if (m.schemaFields) {
                    m.schemaFields.forEach((sf: any) => {
                        if (sf.mappedTo && sf.mappedTo !== 'unmapped' && sf.mappedTo !== '') {
                            condMappings[sf.mappedTo] = {
                                sourceField: sf.name,
                                enumMapping: sf.enumMapping || {}
                            };
                        }
                    });
                }
                return {
                    enumValue: m.enumValues[name],
                    selectedCategory: m.selectedCategory,
                    selectedClass: m.selectedClass,
                    mappings: condMappings
                };
            })
        }));
    } else {
        loadedMap.classDeterminingFields = (map.classDeterminingFields || []).map((f: any) => ({
            ...f,
            mappings: (f.mappings || []).map((m: any) => {
                const condMappings = m.mappings || {};
                if (m.schemaFields && Object.keys(condMappings).length === 0) {
                    m.schemaFields.forEach((sf: any) => {
                        if (sf.mappedTo && sf.mappedTo !== 'unmapped' && sf.mappedTo !== '') {
                            condMappings[sf.mappedTo] = {
                                sourceField: sf.name,
                                enumMapping: sf.enumMapping || {}
                            };
                        }
                    });
                }
                return {
                    ...m,
                    mappings: condMappings
                };
            })
        }));
    }

    return loadedMap as SavedMap;
}

export function saveMap(mapData: Omit<SavedMap, 'timestamp' | 'id'> & { id?: string, name?: string }): SavedMap[] {
    const recentMaps = loadRecentMaps();
    const name = mapData.name || 'Untitled Map';
    
    // If no ID, it's a new map. Generate a unique one.
    // If we have an ID, we are updating an existing map.
    let id = mapData.id;
    
    if (!id) {
        // Generate a unique ID that doesn't exist
        id = Date.now().toString() + '-' + Math.random().toString(36).substring(2, 9);
        
        // Ensure name doesn't collide with existing maps if it's a NEW map
        let finalName = name;
        let counter = 1;
        while (recentMaps.some(m => m.name === finalName)) {
            finalName = `${name} (${counter++})`;
        }
        mapData.name = finalName;
    } else {
        // We are updating an existing map (identified by ID)
        // Check if the NEW name (if changed) collides with ANOTHER map's name
        const otherMaps = recentMaps.filter(m => m.id !== id);
        let finalName = name;
        let counter = 1;
        while (otherMaps.some(m => m.name === finalName)) {
            finalName = `${name} (${counter++})`;
        }
        mapData.name = finalName;
    }
    
    const newMap: SavedMap = {
        ...mapData,
        id: id,
        name: mapData.name || name,
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
    
    // Keep only last 20 maps (increased from 10)
    updatedMaps = updatedMaps.sort((a, b) => b.timestamp - a.timestamp).slice(0, 20);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedMaps));
    return updatedMaps;
}

export function deleteMapFromStorage(id: string): SavedMap[] {
    const recentMaps = loadRecentMaps();
    const updatedMaps = recentMaps.filter(m => m.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedMaps));
    return updatedMaps;
}
