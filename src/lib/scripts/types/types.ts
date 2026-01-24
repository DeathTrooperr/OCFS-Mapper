export interface SchemaField {
    name: string;
    type: string;
    enumValues: string;
    example?: any;
    isObservable?: boolean;
    observableTypeId?: number;
}

export interface AttributeMapping {
    sourceField?: string;
    staticValue?: string;
    enumMapping: Record<string, string>;
    observableTypeId?: number;
}

export interface ClassMapping {
    enumValue: string;
    selectedCategory: string;
    selectedClass: string;
    mappings: Record<string, AttributeMapping>;
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
    mappings: Record<string, AttributeMapping>;
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
    requirement?: string;
    enum?: Record<string, { caption: string; description?: string }>;
    observable?: number;
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
    types: Record<string, any>;
    profiles: Record<string, any>;
}
