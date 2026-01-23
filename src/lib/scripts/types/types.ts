export interface SchemaField {
    name: string;
    type: string;
    enumValues: string;
    mappedTo: string;
    enumMapping: Record<string, string>;
    showEnumMapping?: boolean;
}

export interface ClassMapping {
    enumValue: string;
    selectedCategory: string;
    selectedClass: string;
    schemaFields: SchemaField[];
}

export interface DeterminingField {
    name: string;
    mappings: ClassMapping[];
}

export interface SavedMap {
    id: string;
    name: string;
    timestamp: number;
    jsonInput: string;
    schemaFields: SchemaField[];
    selectedCategory: string;
    selectedClass: string;
    useConditionalClass: boolean;
    classDeterminingFields: DeterminingField[];
    // Legacy fields for migration
    classMappings?: any[];
    classDeterminingField?: string;
}

export interface OCSFAttribute {
    name: string;
    caption: string;
    type: string;
    description?: string;
    is_array?: boolean;
    enum?: Record<string, { caption: string; description?: string }>;
}

export interface OCSFClass {
    name: string;
    caption: string;
    category: string;
    description?: string;
    attributes: Record<string, OCSFAttribute>;
}

export interface OCSFCategory {
    name: string;
    caption: string;
    description: string;
}

export interface OCSFSchemaData {
    categories: Record<string, OCSFCategory>;
    classes: Record<string, OCSFClass>;
    dictionary: Record<string, OCSFAttribute>;
    profiles: Record<string, any>;
}
