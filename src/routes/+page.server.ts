import { fetchOCSFSchema } from '../lib/server/ocsf/api.js';

export const load = async ({ platform }) => {
    const ocsfData = await fetchOCSFSchema(platform?.env?.OCSF_API_URL);
    
    return {
        ocsf: ocsfData,
        enableAI: platform?.env?.ENABLE_AI_ASSISTANT === 'true'
    };
};
