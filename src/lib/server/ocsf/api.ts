import type { OCSFSchemaData, OCSFClass, OCSFAttribute } from '$lib/scripts/types/types';

const DEFAULT_API_URL = 'https://schema.ocsf.io';

function sanitizeUrl(url: string): string {
    if (!url) return url;
    try {
        const parsed = new URL(url);
        parsed.port = '443';
        if (parsed.protocol === 'http:') {
            parsed.protocol = 'https:';
        }
        return parsed.toString().replace(/\/$/, '');
    } catch (e) {
        // Fallback for non-URL strings or if parsing fails
        return url.replace(/:\d+/, '').replace(/^http:/, 'https:').replace(/\/$/, '');
    }
}

let cachedSchema: OCSFSchemaData | null = null;
let lastFetchTime = 0;
const CACHE_TTL = 3600000; // 1 hour

async function fetchWithRetry(url: string, options: RequestInit = {}, retries = 3, backoff = 1000): Promise<Response> {
    const sanitizedUrl = sanitizeUrl(url);
    const headers = {
        'User-Agent': 'OCSF-Mapper/1.0',
        ...options.headers
    };

    for (let i = 0; i < retries; i++) {
        try {
            console.log(`[DEBUG_LOG] Fetching ${sanitizedUrl} (attempt ${i + 1})`);
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), 30000); // 30s timeout

            const response = await fetch(sanitizedUrl, {
                ...options,
                headers,
                signal: controller.signal
            });
            clearTimeout(id);

            if (response.ok) return response;
            
            console.warn(`[DEBUG_LOG] Fetch failed for ${sanitizedUrl}: ${response.status} ${response.statusText}`);
            if (response.status >= 400 && response.status < 500 && response.status !== 429) {
                // Don't retry client errors except rate limits
                return response;
            }
        } catch (err: any) {
            console.error(`[DEBUG_LOG] Fetch error for ${sanitizedUrl} (attempt ${i + 1}): ${err.message}`);
            if (i === retries - 1) throw err;
        }
        
        await new Promise(resolve => setTimeout(resolve, backoff * Math.pow(2, i)));
    }
    throw new Error(`Failed to fetch ${sanitizedUrl} after ${retries} attempts`);
}

function createAttribute(name: string, details: any, dictionary: any, types: any, objects: any): OCSFAttribute {
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

export async function fetchOCSFVersions(apiUrl?: string): Promise<any> {
    let baseUrl = sanitizeUrl(apiUrl || DEFAULT_API_URL);
    if (baseUrl.endsWith('/api')) {
        baseUrl = baseUrl.substring(0, baseUrl.length - 4);
    }
    const res = await fetchWithRetry(`${baseUrl}/api/versions`);
    if (!res.ok) {
        throw new Error(`Failed to fetch OCSF versions from ${baseUrl}: ${res.statusText}`);
    }
    const data = await res.json();
    
    // Sanitize URLs in the response to ensure they don't use port 8000
    if (data.versions && Array.isArray(data.versions)) {
        data.versions = data.versions.map((v: any) => ({
            ...v,
            url: v.url ? sanitizeUrl(v.url) : v.url
        }));
    }
    if (data.default && data.default.url) {
        data.default.url = sanitizeUrl(data.default.url);
    }
    
    return data;
}

export async function validateOCSFEvent(data: any, apiUrl: string, missing_recommended: boolean = false): Promise<any> {
    let baseUrl = sanitizeUrl(apiUrl);
    
    // Ensure the URL points to the v2 validation endpoint
    // If it's a versioned URL like https://schema.ocsf.io/1.1.0/api, 
    // it already ends in /api. The endpoint is /api/v2/validate.
    if (!baseUrl.endsWith('/api')) {
        baseUrl += '/api';
    }
    
    const url = `${baseUrl}/v2/validate?missing_recommended=${missing_recommended}`;
    
    const res = await fetchWithRetry(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });
    
    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Validation failed: ${res.status} ${res.statusText} - ${errorText}`);
    }
    
    return await res.json();
}

export async function fetchOCSFSchema(apiUrl?: string): Promise<OCSFSchemaData> {
    const sanitizedApiUrl = apiUrl ? sanitizeUrl(apiUrl) : undefined;
    const isDefaultUrl = !sanitizedApiUrl || sanitizedApiUrl === DEFAULT_API_URL;
    if (isDefaultUrl && cachedSchema && (Date.now() - lastFetchTime < CACHE_TTL)) {
        console.log(`[DEBUG_LOG] Returning cached OCSF schema`);
        return cachedSchema;
    }

    let baseUrl = sanitizedApiUrl || DEFAULT_API_URL;
    
    // The official OCSF API has /api prefix for most endpoints, 
    // but /export/schema is at the root. If the user provided 
    // a URL ending in /api, we strip it to get the root.
    if (baseUrl.endsWith('/api')) {
        baseUrl = baseUrl.substring(0, baseUrl.length - 4);
    }
    
    // Fetch schema, categories, and profiles
    // We do them sequentially or in a way that handles errors better
    let schemaRes: Response;
    let categoriesRes: Response;
    let profilesRes: Response;

    try {
        // Fetching sequentially to reduce peak network load and handle errors more reliably
        schemaRes = await fetchWithRetry(`${baseUrl}/export/schema`);
        categoriesRes = await fetchWithRetry(`${baseUrl}/api/categories`);
        profilesRes = await fetchWithRetry(`${baseUrl}/api/profiles`);
    } catch (fetchError: any) {
        throw new Error(`Network error fetching OCSF data from ${baseUrl}: ${fetchError.message}`);
    }

    if (!schemaRes.ok) {
        throw new Error(`Failed to fetch OCSF schema from ${baseUrl}: ${schemaRes.statusText}`);
    }

    let rawData: any;
    let categoriesJson: any;
    let profiles: any;

    try {
        rawData = await schemaRes.json();
        categoriesJson = categoriesRes.ok ? await categoriesRes.json() : {};
        profiles = profilesRes.ok ? await profilesRes.json() : {};
    } catch (parseError: any) {
        throw new Error(`Error parsing OCSF JSON: ${parseError.message}`);
    }

    const rawCategories = categoriesJson.attributes || categoriesJson.categories || categoriesJson || {};
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

    for (const [name, data] of Object.entries(combinedRaw)) {
        if (name.startsWith('$')) continue;
        const clsData = data as any;
        const attributes: Record<string, OCSFAttribute> = {};
        
        if (clsData.attributes) {
            for (const [attrName, attrDetails] of Object.entries(clsData.attributes)) {
                if (attrName.startsWith('$')) continue;
                attributes[attrName] = createAttribute(attrName, attrDetails, dictionary, types, objects);
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

    const resolvedDictionary: Record<string, OCSFAttribute> = {};
    for (const [name, details] of Object.entries(dictionary)) {
        resolvedDictionary[name] = createAttribute(name, details, dictionary, types, objects);
    }

    console.log(`[DEBUG_LOG] OCSF Schema resolution complete.`);

    const result: OCSFSchemaData = {
        categories,
        classes: resolvedClasses,
        dictionary: resolvedDictionary,
        types,
        profiles
    };

    if (isDefaultUrl) {
        cachedSchema = result;
        lastFetchTime = Date.now();
    }

    return result;
}
