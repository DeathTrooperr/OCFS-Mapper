import { fetchOCSFSchema, fetchOCSFVersions } from '../lib/server/ocsf/api.js';

export const load = async ({ platform }) => {
    const apiUrl = platform?.env?.OCSF_API_URL;
    
    // 1. Fetch versions first
    const versions = await fetchOCSFVersions(apiUrl).catch(err => {
        console.warn('Failed to fetch OCSF versions:', err);
        return null;
    });

    // 2. Determine which URL to use for the initial schema
    // Use OCSF_API_URL if provided, otherwise use the default version's URL
    const schemaUrl = apiUrl || versions?.default?.url;
    
    // 3. Fetch schema
    let ocsfData = null;
    try {
        ocsfData = await fetchOCSFSchema(schemaUrl);
    } catch (err) {
        console.error('Failed to fetch OCSF schema:', err);
        // Fallback or empty schema to avoid total failure
        ocsfData = {
            categories: {},
            classes: {},
            dictionary: {},
            types: {},
            profiles: {}
        };
    }
    
    return {
        ocsf: ocsfData,
        versions: versions,
        enableAI: platform?.env?.ENABLE_AI_ASSISTANT === 'true'
    };
};
