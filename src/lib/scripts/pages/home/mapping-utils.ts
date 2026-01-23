import type { SchemaField, DeterminingField, OCSFSchemaData, AttributeMapping, OCSFAttribute } from '$lib/scripts/types/types.ts';

export const KNOWN_BASE_TYPES = [
    'integer_t', 'long_t', 'float_t', 'double_t', 'boolean_t', 'timestamp_t',
    'string_t', 'email_t', 'ip_t', 'mac_t', 'url_t', 'hostname_t',
    'file_name_t', 'file_path_t', 'bytestring_t', 'ipv4_t', 'ipv6_t',
    'json_t', 'object_t'
];

export function isTypeCompatible(attr: OCSFAttribute, schemaField: SchemaField): boolean {
    if (attr.is_array) {
        return schemaField.type === 'array';
    }
    
    if (schemaField.type === 'array') {
        return !!attr.is_array;
    }

    // Enum compatibility: Enums can be mapped from enum, string, or number source fields
    if (attr.enum) {
        return schemaField.type === 'enum' || schemaField.type === 'string' || schemaField.type === 'number';
    }

    switch (attr.type) {
        case 'integer_t':
        case 'long_t':
        case 'float_t':
        case 'double_t':
        case 'timestamp_t':
            return schemaField.type === 'number';
        case 'boolean_t':
            return schemaField.type === 'boolean';
        case 'string_t':
        case 'email_t':
        case 'ip_t':
        case 'mac_t':
        case 'url_t':
        case 'hostname_t':
        case 'file_name_t':
        case 'file_path_t':
        case 'bytestring_t':
        case 'ipv4_t':
        case 'ipv6_t':
            // Allow mapping enum to string-like OCSF attributes
            return schemaField.type === 'string' || schemaField.type === 'enum';
        case 'json_t':
            return true; // json_t can be any type
        case 'object_t':
            return schemaField.type === 'object';
        default:
            // For OCSF Classes or other types, we expect an object
            return schemaField.type === 'object';
    }
}

export function getTsType(ocsfType: string, attr?: OCSFAttribute, ocsfData?: OCSFSchemaData) {
    if (attr?.enum) {
        const keys = Object.keys(attr.enum);
        if (keys.length > 0) {
            return keys.map(k => isNaN(Number(k)) ? `"${k}"` : k).join(' | ');
        }
    }

    if (ocsfData?.classes[ocsfType]) {
        return `OCSF${ocsfType.split('_').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('')}`;
    }

    if (KNOWN_BASE_TYPES.includes(ocsfType)) {
        return ocsfType;
    }

    return 'any';
}

export function parseSchema(jsonInput: string): SchemaField[] {
    try {
        const parsed = JSON.parse(jsonInput);
        const fields: SchemaField[] = [];
        function traverse(obj: any, prefix = '') {
            for (const key in obj) {
                const path = prefix ? `${prefix}.${key}` : key;
                const value = obj[key];
                const type = Array.isArray(value) ? 'array' : typeof value;
                fields.push({
                    name: path,
                    type: type,
                    enumValues: ''
                });
                if (type === 'object' && value !== null) {
                    traverse(value, path);
                } else if (type === 'array' && value.length > 0 && typeof value[0] === 'object' && value[0] !== null) {
                    traverse(value[0], path + '[]');
                }
            }
        }
        traverse(parsed);
        return fields;
    } catch (e) {
        throw new Error('Invalid JSON');
    }
}

export function generateCodeSnippet(
    schemaFields: SchemaField[],
    selectedCategory: string,
    selectedClass: string,
    useConditionalClass: boolean,
    classDeterminingFields: DeterminingField[],
    ocsfData: OCSFSchemaData,
    defaultMappings: Record<string, AttributeMapping>
) {
    const getMappingsForClass = (mappings: Record<string, AttributeMapping>, targetClass: any, baseMappings?: Record<string, AttributeMapping>) => {
        const result: Record<string, any> = {};
        if (!targetClass) return result;

        const allPaths = new Set([...Object.keys(mappings), ...Object.keys(baseMappings || {})]);
        const mappedSources = new Set<string>();

        for (const path of allPaths) {
            if (path === 'unmapped' || path === 'raw_data') continue;

            const m = mappings[path];
            const bm = baseMappings?.[path];

            let effectiveSource = m?.sourceField;
            let effectiveStatic = m?.staticValue;
            let effectiveEnumMapping = m?.enumMapping ? { ...m.enumMapping } : undefined;

            if (!effectiveSource && effectiveStatic === undefined && bm) {
                effectiveSource = bm.sourceField;
                effectiveStatic = bm.staticValue;
                effectiveEnumMapping = bm.enumMapping ? { ...bm.enumMapping } : undefined;
            }

            if (effectiveSource || effectiveStatic !== undefined) {
                if (effectiveSource) mappedSources.add(effectiveSource);
                const targetAttr = targetClass.attributes[path];
                const isEnum = !!(targetAttr && targetAttr.enum);
                
                // Use override if specified, otherwise use default from schema
                let observableTypeId = undefined;
                if (m?.isObservableOverride) {
                    observableTypeId = m.observableTypeId;
                } else if (targetAttr?.observable !== undefined) {
                    observableTypeId = targetAttr.observable;
                }

                result[path] = {
                    source: effectiveSource,
                    static: effectiveStatic,
                    enumMapping: effectiveEnumMapping,
                    isEnum: isEnum,
                    observableTypeId: observableTypeId,
                    isObservableOverride: m?.isObservableOverride
                };
            }
        }

        // Add raw_data mapping
        if (targetClass.attributes['raw_data']) {
            result['raw_data'] = {
                source: '',
                isEnum: false
            };
        }

        // Add unmapped fields
        if (targetClass.attributes['unmapped']) {
            const unmappedFields = schemaFields.filter(sf => {
                if (sf.type === 'object') return false;
                if (mappedSources.has(sf.name)) return false;
                
                // Check if any parent is mapped
                const parts = sf.name.split('.');
                for (let i = 1; i < parts.length; i++) {
                    const parentPath = parts.slice(0, i).join('.');
                    if (mappedSources.has(parentPath)) return false;
                }
                return true;
            });
            for (const sf of unmappedFields) {
                result[`unmapped.${sf.name}`] = {
                    source: sf.name,
                    isEnum: false
                };
            }
        }

        return result;
    };

    const generateInterfaces = (classNames: string[], includeAll = true) => {
        const interfaces: string[] = [];
        const processedObjects = new Set<string>();

        const baseTypes = `
/** OCSF Base Types */
export type integer_t = number;
export type long_t = number;
export type float_t = number;
export type double_t = number;
export type boolean_t = boolean;
export type timestamp_t = number;
export type string_t = string;
export type email_t = string;
export type ip_t = string;
export type mac_t = string;
export type url_t = string;
export type hostname_t = string;
export type file_name_t = string;
export type file_path_t = string;
export type bytestring_t = string;
export type ipv4_t = string;
export type ipv6_t = string;
export type json_t = any;
export type object_t = Record<string, any>;
`;
        interfaces.push(baseTypes);

        const getTsTypeInternal = (ocsfType: string, attr?: any) => {
            return getTsType(ocsfType, attr, ocsfData);
        };

        const processClass = (className: string) => {
            const cls = ocsfData.classes[className] as any;
            if (!cls || processedObjects.has(className)) return;
            processedObjects.add(className);

            const interfaceName = `OCSF${className.split('_').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('')}`;
            let interfaceContent = `/** ${cls.caption}: ${(cls.description || '').replace(/\*\//g, '* /')} */\n`;
            interfaceContent += `export interface ${interfaceName} {\n`;
            
            if (cls.category && cls.category !== 'unknown' && cls.category !== 'object') {
                interfaceContent += `    class_name: "${className}";\n`;
                interfaceContent += `    category_name: string;\n`;
            }

            for (const [attrName, attr] of Object.entries(cls.attributes) as [string, any][]) {
                if (attrName.startsWith('$')) continue;
                
                let tsType = getTsTypeInternal(attr.type, attr);
                if (tsType.startsWith('OCSF') && !tsType.includes(' | ')) {
                    const targetClass = attr.type;
                    processClass(targetClass);
                }
                
                if (attr.is_array) {
                    tsType = `Array<${tsType}>`;
                }
                
                if (attr.description) {
                    interfaceContent += `    /** ${attr.description.replace(/\*\//g, '* /')} */\n`;
                }
                interfaceContent += `    ${attrName}${attr.requirement === 'required' ? '' : '?'}: ${tsType};\n`;
            }
            interfaceContent += `}\n`;
            interfaces.push(interfaceContent);
        };

        const generateInputInterface = () => {
            if (schemaFields.length === 0) return 'export type InputSchema = any;';

            // We need to reconstruct the object tree from the flat schemaFields
            const root: any = {};
            for (const field of schemaFields) {
                const parts = field.name.split('.');
                let current = root;
                for (let i = 0; i < parts.length; i++) {
                    let part = parts[i];
                    const isArray = part.endsWith('[]');
                    if (isArray) part = part.slice(0, -2);

                    if (i === parts.length - 1) {
                        current[part] = { ...current[part], type: field.type, isArray };
                    } else {
                        if (!current[part]) current[part] = { type: 'object', properties: {} };
                        if (!current[part].properties) current[part].properties = {};
                        current = current[part].properties;
                    }
                }
            }

            const buildInterface = (obj: any, indent = '    '): string => {
                let result = '{\n';
                for (const [key, info] of Object.entries(obj)) {
                    const fieldInfo = info as any;
                    let typeStr = 'any';
                    if (fieldInfo.properties && Object.keys(fieldInfo.properties).length > 0) {
                        typeStr = buildInterface(fieldInfo.properties, indent + '    ');
                    } else {
                        switch (fieldInfo.type) {
                            case 'string': case 'enum': typeStr = 'string'; break;
                            case 'number': typeStr = 'number'; break;
                            case 'boolean': typeStr = 'boolean'; break;
                            default: typeStr = 'any';
                        }
                    }
                    if (fieldInfo.isArray) typeStr = `Array<${typeStr}>`;
                    result += `${indent}${key}?: ${typeStr};\n`;
                }
                result += `${indent.slice(4)}}`;
                return result;
            };

            return `export interface InputSchema ${buildInterface(root)}`;
        };

        interfaces.push(generateInputInterface());

        if (includeAll) {
            const eventClasses = Object.entries(ocsfData.classes)
                .filter(([_, cls]) => cls.category && cls.category !== 'unknown' && cls.category !== 'object')
                .map(([name, _]) => `OCSF${name.split('_').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('')}`);
            
            if (eventClasses.length > 0) {
                interfaces.push(`/** Union of all OCSF Event types */\nexport type AnyOCSFEvent = ${eventClasses.sort().join(' | ')};\n`);
            }
            Object.keys(ocsfData.classes).sort().forEach(processClass);
        } else {
            classNames.forEach(processClass);
        }
        
        return interfaces.join('\n');
    };

    let classLogic = '';
    let mappingDeclaration = '';
    let typeDefinitions = '';
    let returnType = 'any';

    if (useConditionalClass && classDeterminingFields.length > 0) {
        const allConditionalMappings = classDeterminingFields.flatMap(f => f.mappings);
        const classesToInclude = [selectedClass, ...allConditionalMappings.map(m => m.selectedClass)].filter(Boolean);
        typeDefinitions = generateInterfaces(classesToInclude);
        returnType = classesToInclude.map(c => `OCSF${c.split('_').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('')}`).join(' | ') || 'any';

        const defaultMappingObj = getMappingsForClass(defaultMappings, ocsfData.classes[selectedClass]);
        
        const conditionalMappings = classDeterminingFields.flatMap(f => 
            f.mappings.map(m => ({
                field: f.name,
                value: m.enumValue,
                mapping: getMappingsForClass(m.mappings, ocsfData.classes[m.selectedClass], defaultMappings),
                className: m.selectedClass,
                categoryName: m.selectedCategory
            }))
        );

        mappingDeclaration = `const config: ParserConfig = ${JSON.stringify({ 
            defaultMapping: defaultMappingObj, 
            conditionals: conditionalMappings,
            selectedClass,
            selectedCategory
        }, null, 4)};`;
    } else {
        typeDefinitions = generateInterfaces([selectedClass]);
        returnType = selectedClass ? `OCSF${selectedClass.split('_').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('')}` : 'any';

        const mappingObj = getMappingsForClass(defaultMappings, ocsfData.classes[selectedClass]);
        mappingDeclaration = `const config: ParserConfig = ${JSON.stringify({ 
            defaultMapping: mappingObj,
            selectedClass,
            selectedCategory
        }, null, 4)};`;
    }

    return {
        code: `
import { parseOCSF, type ParserConfig, type InputSchema, type ${returnType.includes('|') ? 'OCSFEvent' : returnType} } from './ocsf-sdk';

${mappingDeclaration}

export function parseToOCSF(input: InputSchema): ${returnType.includes('|') ? 'OCSFEvent' : returnType} {
    return parseOCSF(input, config) as ${returnType.includes('|') ? 'OCSFEvent' : returnType};
}
        `.trim(),
        types: `
${typeDefinitions}
${returnType.includes('|') ? `export type OCSFEvent = ${returnType};` : ''}
        `.trim()
    };
}
