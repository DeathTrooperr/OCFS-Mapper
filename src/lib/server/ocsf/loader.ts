
export interface OCSFAttribute {
    name: string;
    caption: string;
    description: string;
    type: string;
    is_array?: boolean;
    requirement?: string;
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
    profiles: Record<string, any> = {};

    constructor(files: Record<string, any>) {
        this.loadDictionary(files);
        this.loadCategories(files);
        this.loadProfiles(files);
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

    private loadProfiles(files: Record<string, any>) {
        for (const [path, data] of Object.entries(files)) {
            const cleanPath = path.startsWith('/') ? path : '/' + path;
            if (cleanPath.includes('/profiles/') && cleanPath.endsWith('.json')) {
                if (data && data.name) {
                    this.profiles[data.name] = data;
                }
            }
        }
    }

    private loadClasses(files: Record<string, any>) {
        const classDataMap: Record<string, { data: any; category?: string }> = {};
        
        // First, collect all potential class data
        for (const [path, data] of Object.entries(files)) {
            const cleanPath = path.startsWith('/') ? path : '/' + path;
            if (cleanPath.endsWith('.json') && (cleanPath.includes('/events/') || cleanPath.includes('/objects/'))) {
                if (data && data.name) {
                    let category: string | undefined;
                    
                    // Extract category from folder structure if it's under events/
                    if (cleanPath.includes('/events/')) {
                        const parts = cleanPath.split('/');
                        const eventsIndex = parts.indexOf('events');
                        if (eventsIndex !== -1 && eventsIndex < parts.length - 2) {
                            // The category is the folder directly under events/
                            category = parts[eventsIndex + 1];
                        }
                    }
                    
                    classDataMap[data.name] = { data, category };
                }
            }
        }

        // Keep track of what's been processed to handle dependencies
        const processed = new Set<string>();
        
        const processWithDependencies = (className: string) => {
            if (processed.has(className)) return;
            
            const entry = classDataMap[className];
            if (!entry) return;

            const { data, category } = entry;

            // If it extends something, process the parent first
            if (data.extends && classDataMap[data.extends]) {
                processWithDependencies(data.extends);
            }

            this.processClassData(data, category);
            processed.add(className);
        };

        // Process all classes, dependencies will be handled automatically
        for (const className of Object.keys(classDataMap)) {
            processWithDependencies(className);
        }
    }

    private processClassData(data: any, categoryFromPath?: string) {
        try {
            // Simplified check: if it has a name and caption, it's likely a class or object
            if (data.name && data.caption) {
                const className = data.name;
                const attributes: Record<string, OCSFAttribute> = {};

                // 1. Get base attributes from parent if it exists
                const parentName = data.extends;
                const baseAttributes = parentName && this.classes[parentName] 
                    ? { ...this.classes[parentName].attributes } 
                    : {};
                
                // 2. Process profiles if they exist
                const profileAttributes: Record<string, OCSFAttribute> = {};
                const profilesToProcess = data.profiles || [];
                
                // Also check for profiles in attributes.$include
                if (data.attributes && data.attributes.$include) {
                    for (const include of data.attributes.$include) {
                        const profileName = include.split('/').pop().replace('.json', '');
                        if (!profilesToProcess.includes(profileName)) {
                            profilesToProcess.push(profileName);
                        }
                    }
                }

                for (const profileName of profilesToProcess) {
                    const profile = this.profiles[profileName];
                    if (profile && profile.attributes) {
                        for (const [attrName, attrDetails] of Object.entries(profile.attributes)) {
                            if (attrName.startsWith('$')) continue;
                            profileAttributes[attrName] = this.createAttribute(attrName, attrDetails);
                        }
                    }
                }

                // 3. Process local attributes
                const localAttributes: Record<string, OCSFAttribute> = {};
                if (data.attributes) {
                    for (const [attrName, attrDetails] of Object.entries(data.attributes)) {
                        if (attrName.startsWith('$')) continue;
                        localAttributes[attrName] = this.createAttribute(attrName, attrDetails);
                    }
                }

                // Merge: parent <- profiles <- local
                const mergedAttributes = { ...baseAttributes, ...profileAttributes, ...localAttributes };

                this.classes[className] = {
                    name: className,
                    caption: data.caption,
                    description: data.description || '',
                    category: data.category || categoryFromPath || (parentName && this.classes[parentName]?.category) || 'unknown',
                    attributes: mergedAttributes
                };
            }
        } catch (e) {
            console.error(`Error processing class data for ${data.name}:`, e);
        }
    }

    private createAttribute(attrName: string, attrDetails: any): OCSFAttribute {
        const dictAttr = this.dictionary[attrName] || {};
        const merged = { ...dictAttr, ...(attrDetails as any) };
        
        // Handle enum if it exists in dictionary or local overrides
        let enumData = merged.enum || dictAttr.enum;

        return {
            name: attrName,
            caption: merged.caption || attrName,
            description: merged.description || '',
            type: merged.type || 'string_t',
            is_array: merged.is_array,
            requirement: merged.requirement,
            enum: enumData
        };
    }
    
    getSchemaData() {
        return {
            categories: this.categories,
            classes: this.classes,
            dictionary: this.dictionary,
            profiles: this.profiles
        };
    }
}
