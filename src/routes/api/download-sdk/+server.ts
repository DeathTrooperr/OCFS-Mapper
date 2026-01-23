import type { RequestHandler } from './$types';
import JSZip from 'jszip';

// @ts-ignore
import indexTs from '$lib/server/sdk/index.ts?raw';
// @ts-ignore
import parserTs from '$lib/server/sdk/parser.ts?raw';
// @ts-ignore
import typesTs from '$lib/server/sdk/types.ts?raw';

export const POST: RequestHandler = async ({ request }) => {
    try {
        const { dynamicTypes } = await request.json();

        const zip = new JSZip();
        
        zip.file('ocsf-sdk/index.ts', indexTs);
        zip.file('ocsf-sdk/parser.ts', parserTs);
        zip.file('ocsf-sdk/types.ts', `${typesTs}\n\n${dynamicTypes}`);

        const content = await zip.generateAsync({ type: 'uint8array' });

        return new Response(content, {
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': 'attachment; filename=ocsf-sdk.zip'
            }
        });
    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
