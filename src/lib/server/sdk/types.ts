export interface AttributeMapping {
    source?: string;
    static?: any;
    enumMapping?: Record<string, string>;
    isEnum?: boolean;
}

export interface ConditionalMapping {
    field: string;
    value: string;
    className: string;
    categoryName: string;
    mapping: Record<string, AttributeMapping>;
}

export interface ParserConfig {
    defaultMapping: Record<string, AttributeMapping>;
    conditionals?: ConditionalMapping[];
    selectedClass: string;
    selectedCategory: string;
}
