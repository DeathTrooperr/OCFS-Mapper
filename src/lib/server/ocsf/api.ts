import type { OCSFSchemaData, OCSFClass, OCSFAttribute } from '$lib/scripts/types/types';

const DEFAULT_API_URL = 'https://schema.ocsf.io';

export async function fetchOCSFSchema(apiUrl?: string): Promise<OCSFSchemaData> {
    let baseUrl = (apiUrl || DEFAULT_API_URL).replace(/\/$/, '');
    
    // The official OCSF API has /api prefix for most endpoints, 
    // but /export/schema is at the root. If the user provided 
    // a URL ending in /api, we strip it to get the root.
    if (baseUrl.endsWith('/api')) {
        baseUrl = baseUrl.substring(0, baseUrl.length - 4);
    }
    
    // Fetch schema and categories in parallel
    const [schemaRes, categoriesRes, profilesRes] = await Promise.all([
        fetch(`${baseUrl}/export/schema`),
        fetch(`${baseUrl}/api/categories`),
        fetch(`${baseUrl}/api/profiles`)
    ]);

    if (!schemaRes.ok) {
        throw new Error(`Failed to fetch OCSF schema from ${baseUrl}: ${schemaRes.statusText}`);
    }

    const rawData = await schemaRes.json() as any;
    const categoriesJson = (categoriesRes.ok ? await categoriesRes.json() : {}) as any;
    const rawCategories = categoriesJson.attributes || categoriesJson.categories || categoriesJson || {};
    const profiles = (profilesRes.ok ? await profilesRes.json() : {}) as any;
    
    const dictionary = (rawData.dictionary_attributes || rawData.dictionary?.attributes || {}) as any;
    const types = (rawData.types || rawData.dictionary?.types || {}) as any;
    const objects = (rawData.objects || {}) as any;
    const rawClasses = (rawData.classes || {}) as any;

    const categories: Record<string, any> = {};
    for (const [key, value] of Object.entries(rawCategories)) {
        if (key.startsWith('$')) continue;
        const val = value as any;
        categories[key] = {
            name: key,
            caption: val.caption || key,
            description: val.description || ''
        };
    }
    
    const resolvedClasses: Record<string, OCSFClass> = {};
    const combinedRaw = { ...rawClasses, ...objects };
    if (rawData.base_event) {
        combinedRaw['base_event'] = rawData.base_event;
    }

    function createAttribute(name: string, details: any): OCSFAttribute {
        const dictAttr = dictionary[name] || {};
        const merged = { ...dictAttr, ...(details as any) };
        
        let observable = merged.observable;
        if (observable === undefined) {
            if (merged.type && types[merged.type]) {
                observable = types[merged.type].observable;
            }
            if (observable === undefined && merged.object_type && objects[merged.object_type]) {
                observable = objects[merged.object_type].observable;
            }
        }

        return {
            name,
            caption: merged.caption || name,
            description: merged.description || '',
            type: merged.type || 'string_t',
            is_array: merged.is_array,
            requirement: merged.requirement,
            enum: merged.enum || dictAttr.enum,
            observable
        };
    }

    for (const [name, data] of Object.entries(combinedRaw)) {
        if (name.startsWith('$')) continue;
        const clsData = data as any;
        const attributes: Record<string, OCSFAttribute> = {};
        
        if (clsData.attributes) {
            for (const [attrName, attrDetails] of Object.entries(clsData.attributes)) {
                if (attrName.startsWith('$')) continue;
                attributes[attrName] = createAttribute(attrName, attrDetails);
            }
        }

        resolvedClasses[name] = {
            name: clsData.name || name,
            caption: clsData.caption || name,
            description: clsData.description || '',
            category: clsData.category || (name === 'base_event' ? 'other' : 'unknown'),
            attributes
        };
    }

    return {
        categories,
        classes: resolvedClasses,
        dictionary: Object.fromEntries(
            Object.entries(dictionary).map(([name, details]) => [name, createAttribute(name, details)])
        ),
        types,
        profiles
    };
}
