
export interface OCSFAttribute {
    name: string;
    caption: string;
    description: string;
    type: string;
    is_array?: boolean;
    enum?: Record<string, { caption: string; description?: string }>;
}

export interface OCSFClass {
    name: string;
    caption: string;
    description: string;
    category: string;
    attributes: Record<string, OCSFAttribute>;
}

export interface OCSFCategory {
    name: string;
    caption: string;
    description: string;
}

export class OCSFSchema {
    categories: Record<string, OCSFCategory> = {};
    classes: Record<string, OCSFClass> = {};
    dictionary: Record<string, any> = {};

    constructor(files: Record<string, any>) {
        this.loadDictionary(files);
        this.loadCategories(files);
        this.loadClasses(files);
    }

    private loadDictionary(files: Record<string, any>) {
        const data = files['/dictionary.json'] || files['dictionary.json'];
        if (data) {
            this.dictionary = data.attributes || {};
        }
    }

    private loadCategories(files: Record<string, any>) {
        const data = files['/categories.json'] || files['categories.json'];
        if (data) {
            const attrs = data.attributes || data.categories || {};
            for (const [key, value] of Object.entries(attrs)) {
                const val = value as any;
                this.categories[key] = {
                    name: key,
                    caption: val.caption,
                    description: val.description
                };
            }
        }
    }

    private loadClasses(files: Record<string, any>) {
        for (const [path, data] of Object.entries(files)) {
            const cleanPath = path.startsWith('/') ? path : '/' + path;
            if (cleanPath.includes('/events/') && cleanPath.endsWith('.json')) {
                const isBaseEvent = cleanPath.endsWith('base_event.json');
                if (isBaseEvent) {
                    this.processClassData(data);
                }
            }
        }
        
        for (const [path, data] of Object.entries(files)) {
            const cleanPath = path.startsWith('/') ? path : '/' + path;
            if (cleanPath.includes('/events/') && cleanPath.endsWith('.json') && !cleanPath.endsWith('base_event.json')) {
                this.processClassData(data);
            }
        }
    }

    private processClassData(data: any) {
        try {
            if (data.name && data.caption && (data.category || data.extends === 'base_event' || data.name === 'base_event')) {
                const className = data.name;
                const attributes: Record<string, OCSFAttribute> = {};

                // In a real loader, we would handle 'extends' and '$include' profiles.
                // For this project, we'll do a simplified version that pulls from dictionary
                // and local attribute overrides.
                
                const baseAttributes = data.extends === 'base_event' ? this.classes['base_event']?.attributes || {} : {};
                
                if (data.attributes) {
                    for (const [attrName, attrDetails] of Object.entries(data.attributes)) {
                        if (attrName.startsWith('$')) continue;
                        
                        const dictAttr = this.dictionary[attrName] || {};
                        const merged = { ...dictAttr, ...(attrDetails as any) };
                        
                        // Handle enum if it exists in dictionary or local overrides
                        let enumData = merged.enum || dictAttr.enum;

                        attributes[attrName] = {
                            name: attrName,
                            caption: merged.caption || attrName,
                            description: merged.description || '',
                            type: merged.type || 'string_t',
                            is_array: merged.is_array,
                            enum: enumData
                        };
                    }
                }

                // Merge with base attributes if it's not base_event itself
                const mergedAttributes = className === 'base_event' ? attributes : { ...baseAttributes, ...attributes };

                this.classes[className] = {
                    name: className,
                    caption: data.caption,
                    description: data.description || '',
                    category: data.category || (data.extends === 'base_event' || className === 'base_event' ? 'other' : 'unknown'),
                    attributes: mergedAttributes
                };
            }
        } catch (e) {
            console.error(`Error processing class data:`, e);
        }
    }
    
    getSchemaData() {
        return {
            categories: this.categories,
            classes: this.classes
        };
    }
}
