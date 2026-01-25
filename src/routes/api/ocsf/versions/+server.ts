import { json } from '@sveltejs/kit';
import { fetchOCSFVersions } from '$lib/server/ocsf/api';

export const GET = async ({ platform }) => {
    try {
        const apiUrl = platform?.env?.OCSF_API_URL;
        const versions = await fetchOCSFVersions(apiUrl);
        
        return json(versions);
    } catch (error: any) {
        return json({ error: error.message }, { status: 500 });
    }
};
