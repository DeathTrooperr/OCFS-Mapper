import { json } from '@sveltejs/kit';
import { fetchOCSFSchema } from '$lib/server/ocsf/api';

export const GET = async ({ url }) => {
    try {
        const apiUrl = url.searchParams.get('apiUrl') || undefined;
        const schema = await fetchOCSFSchema(apiUrl);
        return json(schema);
    } catch (error: any) {
        return json({ error: error.message }, { status: 500 });
    }
};
