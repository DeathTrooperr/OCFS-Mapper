import type { SchemaField, DeterminingField } from './types.js';

export function generateOCSFPrompt(ocsfCategories: any[], ocsfClasses: any, ocsfDictionary: any, ocsfProfiles: any) {
    const categoriesStr = ocsfCategories.map(c => `- ${c.caption} (${c.name}): ${c.description}`).join('\n');
    
    const ocsfData = {
        classes: Object.values(ocsfClasses)
            .filter((cls: any) => cls.category !== 'unknown' || cls.name === 'base_event')
            .map((cls: any) => ({
                name: cls.name,
                caption: cls.caption,
                category: cls.category,
                attributes: Object.values(cls.attributes).map((attr: any) => ({
                    name: attr.name,
                    type: attr.type,
                    caption: attr.caption,
                    enum: attr.enum ? Object.keys(attr.enum) : undefined
                }))
            })),
        dictionary: Object.entries(ocsfDictionary).reduce((acc, [name, attr]: [string, any]) => {
            acc[name] = {
                caption: attr.caption,
                type: attr.type,
                enum: attr.enum ? Object.keys(attr.enum) : undefined
            };
            return acc;
        }, {} as Record<string, any>),
        profiles: Object.entries(ocsfProfiles).reduce((acc, [name, profile]: [string, any]) => {
            acc[name] = {
                caption: profile.caption,
                description: profile.description,
                attributes: profile.attributes ? Object.keys(profile.attributes) : []
            };
            return acc;
        }, {} as Record<string, any>)
    };

    return `You are an expert at OCSF (Open Cybersecurity Framework). I need to map a JSON event schema to OCSF.

Current OCSF Categories:
${categoriesStr}

I will provide the OCSF Reference Data (Classes, Dictionary, and Profiles) in a condensed JSON format at the end.

When I provide a JSON schema, please analyze it. 
If the schema represents a single type of event, suggest the most appropriate OCSF Category and Class.
If the schema can represent multiple different event types based on one or more specific fields (e.g., an 'event_type' or 'activity' field), please identify those fields and provide separate mappings for each significant value combination.

Provide the mapping in the following format:

CONDITIONAL_FIELDS: <field_path1>, <field_path2>, ... (or 'none')

--- MAPPING START ---
CONDITION_VALUES: <field1>:<val1>, <field2>:<val2>, ... (or 'default')
CATEGORY: <category_name>
CLASS: <class_name>
MAPPINGS:
- <json_field_path> -> <ocsf_attribute_name> (Type: <type>)
- <json_field_path> -> <ocsf_attribute_name> (Type: <type>, Enum: <optional_enum_mapping>)
--- MAPPING END ---

(Repeat the MAPPING block for each condition if CONDITIONAL_FIELDS is not 'none')

Where <optional_enum_mapping> is a comma-separated list of "source_value:target_value". 
Crucially, ensure you map to the most appropriate OCSF attribute names provided in the reference data.

Example for single class:
CONDITIONAL_FIELDS: none
--- MAPPING START ---
CONDITION_VALUES: default
CATEGORY: iam
CLASS: authentication
MAPPINGS:
- user.name -> user.name (Type: string)
- status -> status_id (Type: enum, Enum: success:1, failure:2)
--- MAPPING END ---

Example for conditional classes with multiple fields:
CONDITIONAL_FIELDS: event_type, status
--- MAPPING START ---
CONDITION_VALUES: event_type:login, status:success
CATEGORY: iam
CLASS: authentication
MAPPINGS:
- user.id -> user.uid (Type: string)
- result -> status_id (Type: enum, Enum: success:1, failure:2)
--- MAPPING END ---
--- MAPPING START ---
CONDITION_VALUES: event_type:file_access, status:success
CATEGORY: system
CLASS: file_activity
MAPPINGS:
- file.path -> file.path (Type: string)
- action -> activity_id (Type: enum, Enum: read:1, write:2)
--- MAPPING END ---

OCSF REFERENCE DATA:
${JSON.stringify(ocsfData)}

Please only respond with the formatted mapping.`;
}

export function parseAIPrompt(
    aiPromptInput: string,
    ocsfCategories: any,
    ocsfClasses: any
) {
    if (!aiPromptInput) return null;

    const sections = aiPromptInput.split('--- MAPPING START ---');
    const headerSection = sections[0];
    const mappingBlocks = sections.slice(1);

    if (mappingBlocks.length === 0) {
        throw new Error("No mapping blocks found. Make sure the AI response contains '--- MAPPING START ---'.");
    }

    const condFieldMatch = headerSection.match(/CONDITIONAL_FIELDS?:\s*(.+)/i);
    const condFields = condFieldMatch ? condFieldMatch[1].split(',').map(f => f.trim()) : ['none'];

    const useConditionalClass = condFields[0].toLowerCase() !== 'none';
    const classDeterminingFields: DeterminingField[] = useConditionalClass 
        ? condFields.map(f => ({ name: f, mappings: [] })) 
        : [];

    let resultSchemaFields: SchemaField[] = [];
    let resultSelectedCategory = '';
    let resultSelectedClass = '';
    let resultActiveMappingIndex: { fieldIdx: number, mappingIdx: number } | 'default' = 'default';

    mappingBlocks.forEach((block, index) => {
        const cleanedBlock = block.split('--- MAPPING END ---')[0];
        const lines = cleanedBlock.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        let conditionValues: Record<string, string> = {};
        let category = '';
        let className = '';
        const mappings: Array<{path: string, target: string, type: string, enumMap: Record<string, string>}> = [];

        lines.forEach(line => {
            const condValueMatch = line.match(/^CONDITION_VALUES?:\s*(.+)$/i);
            const catMatch = line.match(/^CATEGORY:\s*(.+)$/i);
            const classMatch = line.match(/^CLASS:\s*(.+)$/i);
            const mappingMatch = line.match(/^-\s*(.+?)\s*->\s*(.+?)\s*\(Type:\s*(.+?)(?:,\s*Enum:\s*(.+?))?\)$/i);

            if (condValueMatch) {
                const valStr = condValueMatch[1].trim();
                if (valStr.includes(':')) {
                    valStr.split(',').forEach(pair => {
                        const [f, v] = pair.split(':').map(s => s.trim());
                        if (f && v) conditionValues[f] = v;
                    });
                } else {
                    if (classDeterminingFields.length > 0) {
                        conditionValues[classDeterminingFields[0].name] = valStr;
                    } else {
                        conditionValues['default'] = valStr;
                    }
                }
            } else if (catMatch) {
                category = catMatch[1].trim();
            } else if (classMatch) {
                className = classMatch[1].trim();
            } else if (mappingMatch) {
                const path = mappingMatch[1].trim();
                const target = mappingMatch[2].trim();
                const type = mappingMatch[3].trim().toLowerCase();
                const enumStr = mappingMatch[4] ? mappingMatch[4].trim() : '';
                const enumMap: Record<string, string> = {};

                if (enumStr) {
                    enumStr.split(',').forEach(pair => {
                        const colonIndex = pair.indexOf(':');
                        if (colonIndex !== -1) {
                            const source = pair.substring(0, colonIndex).trim();
                            const targetVal = pair.substring(colonIndex + 1).trim();
                            if (source && targetVal) {
                                enumMap[source] = targetVal;
                            }
                        }
                    });
                }
                mappings.push({ path, target, type, enumMap });
            }
        });

        if (!category || !className) {
            if (!category && !className && mappings.length === 0) return;
        }

        const foundCat = Object.values(ocsfCategories).find((c: any) => 
            c.name.toLowerCase() === category.toLowerCase() || 
            c.caption.toLowerCase() === category.toLowerCase()
        ) as any;
        const resolvedCategory = foundCat ? foundCat.name : (category.toLowerCase() === 'other' ? 'other' : category.toLowerCase());

        const foundClass = Object.values(ocsfClasses).find((c: any) => 
            c.name.toLowerCase() === className.toLowerCase() || 
            c.caption.toLowerCase() === className.toLowerCase()
        ) as any;
        const resolvedClass = foundClass ? foundClass.name : className.toLowerCase();

        const fields: SchemaField[] = mappings.map(m => ({
            name: m.path,
            type: (m.type === 'enum' || Object.keys(m.enumMap).length > 0) ? 'enum' : (m.type === 'number' || m.type === 'integer' ? 'number' : 'string'),
            enumValues: Object.keys(m.enumMap).join(', '),
            mappedTo: m.target,
            enumMapping: m.enumMap,
            showEnumMapping: Object.keys(m.enumMap).length > 0
        }));

        const isDefault = !useConditionalClass || (Object.keys(conditionValues).length === 0) || (Object.values(conditionValues)[0] === 'default');

        if (isDefault) {
            resultSelectedCategory = resolvedCategory;
            resultSelectedClass = resolvedClass;
            resultSchemaFields = fields;
            resultActiveMappingIndex = 'default';
        } else {
            Object.entries(conditionValues).forEach(([fName, fVal]) => {
                const field = classDeterminingFields.find(f => f.name === fName);
                if (field) {
                    field.mappings.push({
                        enumValue: fVal,
                        selectedCategory: resolvedCategory,
                        selectedClass: resolvedClass,
                        schemaFields: fields
                    });
                    resultActiveMappingIndex = { 
                        fieldIdx: classDeterminingFields.indexOf(field), 
                        mappingIdx: field.mappings.length - 1 
                    };
                }
            });
        }
    });

    return {
        useConditionalClass,
        classDeterminingFields,
        schemaFields: resultSchemaFields,
        selectedCategory: resultSelectedCategory,
        selectedClass: resultSelectedClass,
        activeMappingIndex: resultActiveMappingIndex
    };
}
