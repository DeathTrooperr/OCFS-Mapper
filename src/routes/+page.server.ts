import { OCSFSchema } from '../lib/ocsf/loader';

export const load = async () => {
    const rawFiles = import.meta.glob('$lib/ocsf/data/**/*.json', { eager: true });
    
    const files: Record<string, any> = {};
    for (const [path, content] of Object.entries(rawFiles)) {
        // Clean up the path to be relative to $lib/ocsf/data
        const cleanPath = path.replace('/src/lib/ocsf/data/', '');
        files[cleanPath] = content;
    }

    const loader = new OCSFSchema(files);
    return {
        ocsf: loader.getSchemaData()
    };
};
