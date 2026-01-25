import type { SchemaField, DeterminingField, OCSFSchemaData, AttributeMapping, OCSFAttribute } from '$lib/scripts/types/types.ts';
import { detectObservableTypeId } from '$lib/sdk/observables';

export const KNOWN_BASE_TYPES = [
    'integer_t', 'long_t', 'float_t', 'double_t', 'boolean_t', 'timestamp_t',
    'string_t', 'email_t', 'ip_t', 'mac_t', 'url_t', 'hostname_t',
    'file_name_t', 'file_path_t', 'bytestring_t', 'ipv4_t', 'ipv6_t',
    'json_t', 'object_t'
];

export function isTypeCompatible(attr: OCSFAttribute, schemaField: SchemaField): boolean {
    const isAttrArray = !!attr.is_array;
    const isSourceArray = schemaField.type === 'array';
    const isAttrObject = attr.type === 'object_t' || (attr.type !== 'json_t' && !KNOWN_BASE_TYPES.includes(attr.type));
    const isSourceObject = schemaField.type === 'object';

    // json_t can take anything
    if (attr.type === 'json_t') return true;

    // Don't allow mapping array to scalar
    if (isSourceArray && !isAttrArray) return false;
    
    // Don't allow mapping object to scalar or vice-versa
    if (isSourceObject !== isAttrObject) return false;

    // For arrays of objects, we allow top-level mapping now.
    // This satisfies the requirement: "unless the value is some form of array or sub object or array allow any value to be selected"
    return true;
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
            if (obj === null || typeof obj !== 'object') return;
            
            for (const key in obj) {
                const path = prefix ? `${prefix}.${key}` : key;
                const value = obj[key];
                const type = Array.isArray(value) ? 'array' : typeof value;
                const example = type !== 'object' && type !== 'array' ? value : undefined;
                const observableTypeId = detectObservableTypeId(example, path);
                
                fields.push({
                    name: path,
                    type: type,
                    enumValues: '',
                    example: example,
                    isObservable: observableTypeId !== null,
                    observableTypeId: observableTypeId !== null ? observableTypeId : undefined
                });

                if (type === 'object' && value !== null) {
                    traverse(value, path);
                } else if (type === 'array' && value.length > 0) {
                    if (typeof value[0] === 'object' && value[0] !== null) {
                        traverse(value[0], path + '[]');
                    }
                }
            }
        }
        traverse(parsed);
        return fields;
    } catch (e) {
        throw new Error('Invalid JSON');
    }
}

export interface HierarchicalField {
    name: string;
    label: string;
    type: string;
    field?: SchemaField;
    children: HierarchicalField[];
}

export function buildFieldTree(fields: SchemaField[]): HierarchicalField[] {
    const root: HierarchicalField[] = [];
    const map = new Map<string, HierarchicalField>();

    // First pass: create all nodes
    for (const field of fields) {
        const node: HierarchicalField = {
            name: field.name,
            label: field.name.split('.').pop()?.replace(/\[\]$/, '') || field.name,
            type: field.type,
            field: field,
            children: []
        };
        map.set(field.name, node);
    }

    // Second pass: connect children to parents
    for (const field of fields) {
        const node = map.get(field.name)!;
        const lastDotIndex = field.name.lastIndexOf('.');
        if (lastDotIndex === -1) {
            root.push(node);
        } else {
            let parentName = field.name.substring(0, lastDotIndex);
            // Handle array parents by stripping []
            if (parentName.endsWith('[]')) {
                parentName = parentName.slice(0, -2);
            }
            
            const parent = map.get(parentName);
            if (parent) {
                parent.children.push(node);
            } else {
                // If parent not found (shouldn't happen with current parseSchema), treat as root
                root.push(node);
            }
        }
    }

    return root;
}

export interface FieldGroup {
    label: string;
    fields: SchemaField[];
}

export function groupFields(fields: SchemaField[]): FieldGroup[] {
    const groups: Record<string, SchemaField[]> = {};
    const topLevelFields: SchemaField[] = [];

    for (const field of fields) {
        const firstDotIndex = field.name.indexOf('.');
        if (firstDotIndex === -1) {
            topLevelFields.push(field);
        } else {
            const rootName = field.name.substring(0, firstDotIndex);
            if (!groups[rootName]) groups[rootName] = [];
            groups[rootName].push(field);
        }
    }

    const result: FieldGroup[] = [];
    
    // Add ungrouped top-level fields first (if they are not parents)
    const pureTopLevel = topLevelFields.filter(f => !groups[f.name]);
    if (pureTopLevel.length > 0) {
        result.push({ label: 'Top Level', fields: pureTopLevel });
    }

    // Add grouped fields
    for (const rootName in groups) {
        const parentField = topLevelFields.find(f => f.name === rootName);
        result.push({ 
            label: rootName + (parentField ? ` (${parentField.type})` : ''), 
            fields: groups[rootName] 
        });
    }

    return result;
}

export function getMappingsForClass(
    mappings: Record<string, AttributeMapping>, 
    targetClass: any, 
    schemaFields: SchemaField[],
    ocsfData?: OCSFSchemaData,
    baseMappings?: Record<string, AttributeMapping>
) {
    const result: Record<string, any> = {};
    if (!targetClass) return result;

    const allPaths = new Set([...Object.keys(mappings), ...Object.keys(baseMappings || {})]);

    const addPathsRecursively = (cls: any, prefix = '') => {
        if (!cls || !cls.attributes) return;
        Object.keys(cls.attributes).forEach(attrName => {
            if (attrName.startsWith('$')) return;
            const path = prefix ? `${prefix}.${attrName}` : attrName;
            allPaths.add(path);
            const attr = cls.attributes[attrName];
            if (ocsfData?.classes[attr.type]) {
                // To prevent infinite recursion in case of circular references (rare in OCSF but possible)
                if (!prefix.includes(attrName)) {
                    addPathsRecursively(ocsfData.classes[attr.type], path);
                }
            }
        });
    };
    addPathsRecursively(targetClass);

    const mappedSources = new Set<string>();

    const resolveAttr = (path: string): OCSFAttribute | undefined => {
        if (!ocsfData) return targetClass.attributes[path];
        
        const parts = path.split('.');
        let currentClass = targetClass;
        let attr: OCSFAttribute | undefined;

        for (let i = 0; i < parts.length; i++) {
            let partName = parts[i].replace(/\[\d*\]$/, '');
            
            attr = currentClass.attributes[partName];
            if (i < parts.length - 1) {
                if (!attr || !ocsfData.classes[attr.type]) return undefined;
                currentClass = ocsfData.classes[attr.type];
            }
        }
        return attr;
    };

    for (const path of allPaths) {
        if (path === 'unmapped' || path === 'raw_data' || path === 'raw_data_hash' || path === 'raw_data_size' || path === 'observables') continue;

        const m = mappings[path];
        const bm = baseMappings?.[path];

        let effectiveSource = m?.sourceField;
        let effectiveStatic = m?.staticValue;
        let effectiveEnumMapping = m?.enumMapping ? { ...m.enumMapping } : undefined;

        const targetAttr = resolveAttr(path);
        const enumOptions = targetAttr?.enum ? Object.keys(targetAttr.enum) : [];
        
        if (!effectiveSource && effectiveStatic === undefined && enumOptions.length === 1) {
            effectiveStatic = enumOptions[0];
        }

        if (!effectiveSource && effectiveStatic === undefined && bm) {
            effectiveSource = bm.sourceField;
            effectiveStatic = bm.staticValue;
            effectiveEnumMapping = bm.enumMapping ? { ...bm.enumMapping } : undefined;
        }

        if (effectiveSource || effectiveStatic !== undefined) {
            if (effectiveSource) mappedSources.add(effectiveSource);
            const isEnum = !!(targetAttr && targetAttr.enum);
            const isNumber = !!(targetAttr && ['integer_t', 'long_t', 'float_t', 'double_t', 'timestamp_t'].includes(targetAttr.type));
            
            // Look up observable info from source field if mapped
            let observableTypeId = undefined;
            if (effectiveSource) {
                const sf = schemaFields.find(f => f.name === effectiveSource);
                if (sf?.isObservable) {
                    observableTypeId = sf.observableTypeId;
                }
            }

            // Fallback to schema default if not explicitly tagged at source
            if (observableTypeId === undefined && targetAttr?.observable !== undefined) {
                observableTypeId = targetAttr.observable;
            }

            result[path] = {
                source: effectiveSource,
                static: effectiveStatic,
                enumMapping: effectiveEnumMapping,
                isEnum: isEnum,
                isNumber: isNumber,
                observableTypeId: observableTypeId,
                ocsfType: targetAttr?.type
            };
        }
    }

    // Add raw_data mappings
    if (targetClass.attributes['raw_data']) {
        result['raw_data'] = {
            source: '',
            isEnum: false
        };
    }
    if (targetClass.attributes['raw_data_hash']) {
        result['raw_data_hash'] = {
            source: '',
            isEnum: false
        };
    }
    if (targetClass.attributes['raw_data_size']) {
        result['raw_data_size'] = {
            source: '',
            isEnum: false
        };
    }
    if (targetClass.attributes['observables']) {
        result['observables'] = {
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
                isEnum: false,
                observableTypeId: sf.isObservable ? sf.observableTypeId : undefined
            };
        }
    }

    return result;
}

export function prepareParserConfig(
    schemaFields: SchemaField[],
    selectedCategory: string,
    selectedClass: string,
    useConditionalClass: boolean,
    classDeterminingFields: DeterminingField[],
    ocsfData: OCSFSchemaData,
    defaultMappings: Record<string, AttributeMapping>
) {
    if (useConditionalClass && classDeterminingFields.length > 0) {
        const defaultMappingObj = getMappingsForClass(defaultMappings, ocsfData.classes[selectedClass], schemaFields, ocsfData);
        
        const conditionalMappings = classDeterminingFields.flatMap(f => 
            f.mappings.map(m => ({
                field: f.name,
                value: m.enumValue,
                mapping: getMappingsForClass(m.mappings, ocsfData.classes[m.selectedClass], schemaFields, ocsfData, defaultMappings),
                className: m.selectedClass,
                categoryName: m.selectedCategory
            }))
        );

        return { 
            defaultMapping: defaultMappingObj, 
            conditionals: conditionalMappings,
            selectedClass,
            selectedCategory
        };
    } else {
        const mappingObj = getMappingsForClass(defaultMappings, ocsfData.classes[selectedClass], schemaFields, ocsfData);
        return { 
            defaultMapping: mappingObj,
            selectedClass,
            selectedCategory
        };
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

    let typeDefinitions = '';
    let returnType = 'any';

    const config = prepareParserConfig(
        schemaFields,
        selectedCategory,
        selectedClass,
        useConditionalClass,
        classDeterminingFields,
        ocsfData,
        defaultMappings
    );

    if (useConditionalClass && classDeterminingFields.length > 0) {
        const allConditionalMappings = classDeterminingFields.flatMap(f => f.mappings);
        const classesToInclude = [selectedClass, ...allConditionalMappings.map(m => m.selectedClass)].filter(Boolean);
        typeDefinitions = generateInterfaces(classesToInclude);
        returnType = classesToInclude.map(c => `OCSF${c.split('_').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('')}`).join(' | ') || 'any';
    } else {
        typeDefinitions = generateInterfaces([selectedClass]);
        returnType = selectedClass ? `OCSF${selectedClass.split('_').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('')}` : 'any';
    }

    const mappingDeclaration = `const config: ParserConfig = ${JSON.stringify(config, null, 4)};`;

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
