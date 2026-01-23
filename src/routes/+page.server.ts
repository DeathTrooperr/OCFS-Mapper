import { OCSFSchema } from '../lib/server/ocsf/loader.js';

export const load = async () => {
    const rawFiles = import.meta.glob('../lib/server/ocsf/data/**/*.json', { eager: true });
    
    const files: Record<string, any> = {};
    for (const [path, content] of Object.entries(rawFiles)) {
        const cleanPath = path.split('/data/').pop() || path;
        files[cleanPath] = (content as any).default || content;
    }

    const loader = new OCSFSchema(files);
    return {
        ocsf: loader.getSchemaData()
    };
};
