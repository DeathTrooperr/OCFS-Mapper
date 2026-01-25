import { json } from '@sveltejs/kit';
import { validateOCSFEvent } from '$lib/server/ocsf/api';

export const POST = async ({ request }) => {
    try {
        const { data, apiUrl, missing_recommended } = await request.json();
        
        if (!data) {
            return json({ error: 'Missing data' }, { status: 400 });
        }
        
        if (!apiUrl) {
            return json({ error: 'Missing apiUrl' }, { status: 400 });
        }

        const result = await validateOCSFEvent(data, apiUrl, missing_recommended);
        return json(result);
    } catch (error: any) {
        return json({ error: error.message }, { status: 500 });
    }
};
