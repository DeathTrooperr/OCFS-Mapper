import type { SchemaField, DeterminingField, OCSFSchemaData } from './types.js';

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
                    enumValues: '',
                    mappedTo: '',
                    enumMapping: {},
                    showEnumMapping: false
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
    ocsfData: OCSFSchemaData
) {
    const getMappingForFields = (fields: SchemaField[], targetClass: any) => {
        return fields.reduce((acc, field) => {
            if (field.mappedTo) {
                const targetAttr = (field.mappedTo === 'unmapped' || !targetClass)
                    ? { enum: false } 
                    : targetClass.attributes[field.mappedTo];
                const isEnum = !!(targetAttr && targetAttr.enum);
                acc[field.name] = {
                    target: field.mappedTo,
                    enumMapping: field.enumMapping,
                    isEnum: isEnum
                };
            }
            return acc;
        }, {} as Record<string, any>);
    };

    const generateInterfaces = (classNames: string[]) => {
        const interfaces: string[] = [];
        const processedObjects = new Set<string>();

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

        const getTsType = (ocsfType: string) => {
            switch (ocsfType) {
                case 'integer_t':
                case 'long_t':
                case 'float_t':
                case 'double_t':
                    return 'number';
                case 'boolean_t':
                    return 'boolean';
                case 'timestamp_t':
                    return 'number'; // OCSF timestamps are often Unix epochs
                case 'string_t':
                case 'email_t':
                case 'ip_t':
                case 'mac_t':
                case 'url_t':
                case 'hostname_t':
                case 'file_name_t':
                case 'file_path_t':
                case 'bytestring_t':
                    return 'string';
                case 'json_t':
                    return 'any';
                case 'object_t':
                    return 'Record<string, any>';
                default:
                    // If it's a known class or object
                    if (ocsfData.classes[ocsfType]) {
                        return `OCSF${ocsfType.split('_').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('')}`;
                    }
                    return 'any';
            }
        };

        const processClass = (className: string) => {
            const cls = ocsfData.classes[className] as any;
            if (!cls || processedObjects.has(className)) return;
            processedObjects.add(className);

            const interfaceName = `OCSF${className.split('_').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('')}`;
            let interfaceContent = `export interface ${interfaceName} {\n`;
            if (cls.category !== 'unknown') {
                interfaceContent += `    class_name: "${className}";\n`;
                interfaceContent += `    category_name: string;\n`;
            }

            for (const [attrName, attr] of Object.entries(cls.attributes) as [string, any][]) {
                if (attrName === 'unmapped') continue;
                
                let tsType = getTsType(attr.type);
                if (tsType === 'any' && ocsfData.classes[attr.type]) {
                    tsType = `OCSF${attr.type.split('_').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('')}`;
                    processClass(attr.type);
                }
                
                if (attr.is_array) {
                    tsType = `${tsType}[]`;
                }
                
                interfaceContent += `    ${attrName}?: ${tsType};\n`;
            }
            interfaceContent += `}\n`;
            interfaces.push(interfaceContent);
        };

        classNames.forEach(processClass);
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

        const defaultMapping = getMappingForFields(schemaFields, ocsfData.classes[selectedClass]);
        
        const conditionalMappings = classDeterminingFields.flatMap(f => 
            f.mappings.map(m => ({
                field: f.name,
                value: m.enumValue,
                mapping: getMappingForFields(m.schemaFields, ocsfData.classes[m.selectedClass]),
                className: m.selectedClass,
                categoryName: m.selectedCategory
            }))
        );

        mappingDeclaration = `const mappings = ${JSON.stringify({ default: defaultMapping, conditionals: conditionalMappings }, null, 4)};`;

        classLogic = `
    let selectedClass = "${selectedClass}";
    let selectedCategory = "${selectedCategory}";
    let activeMapping = mappings.default;
    
    for (const cond of mappings.conditionals) {
        const actualValue = String(getNestedValue(input, cond.field));
        if (actualValue === cond.value) {
            selectedClass = cond.className;
            selectedCategory = cond.categoryName;
            activeMapping = cond.mapping;
            break;
        }
    }
    
    output.class_name = selectedClass;
    output.category_name = selectedCategory;
    const mapping = activeMapping;`;
    } else {
        typeDefinitions = generateInterfaces([selectedClass]);
        returnType = selectedClass ? `OCSF${selectedClass.split('_').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('')}` : 'any';

        const mappingObj = getMappingForFields(schemaFields, ocsfData.classes[selectedClass]);
        mappingDeclaration = `const mapping = ${JSON.stringify(mappingObj, null, 4)};`;
        classLogic = `
    output.class_name = "${selectedClass}";
    output.category_name = "${selectedCategory}";`;
    }

    return `
${typeDefinitions}

export function parseToOCSF(input: InputSchema): ${returnType} {
    const output: any = {};
    ${mappingDeclaration}
    ${classLogic}
    
    function getNestedValue(obj: any, path: string): any {
        if (!obj) return undefined;
        if (path.includes('[]')) {
            const [arrayPath, elementPath] = path.split('[]');
            const arr = getNestedValue(obj, arrayPath.endsWith('.') ? arrayPath.slice(0, -1) : arrayPath);
            if (Array.isArray(arr)) {
                return arr.map(item => getNestedValue(item, elementPath.startsWith('.') ? elementPath.slice(1) : elementPath));
            }
            return undefined;
        }
        return path.split('.').reduce((acc, part) => acc && acc[part], obj);
    }

    function setNestedValue(obj: any, path: string, value: any) {
        if (value === undefined) return;
        
        if (path.includes('[]')) {
            const [arrayPath, elementPath] = path.split('[]');
            const arrPath = arrayPath.endsWith('.') ? arrayPath.slice(0, -1) : arrayPath;
            const elemPath = elementPath.startsWith('.') ? elementPath.slice(1) : elementPath;
            
            let arr = getNestedValue(obj, arrPath);
            if (!Array.isArray(arr)) {
                arr = [];
                setNestedValue(obj, arrPath, arr);
            }
            
            if (Array.isArray(value)) {
                value.forEach((v, i) => {
                    if (!arr[i]) arr[i] = {};
                    setNestedValue(arr[i], elemPath, v);
                });
            }
            return;
        }

        const parts = path.split('.');
        const last = parts.pop()!;
        const target = parts.reduce((acc, part) => {
            if (!acc[part]) acc[part] = {};
            return acc[part];
        }, obj);
        target[last] = value;
    }
    
    for (const [path, fieldMapping] of Object.entries(mapping)) {
        const value = getNestedValue(input, path);
        if (value !== undefined && value !== null) {
            let val = value;
            if ((fieldMapping as any).enumMapping && Object.keys((fieldMapping as any).enumMapping).length > 0) {
                if (Array.isArray(val)) {
                    val = val.map(v => {
                        const mapped = (fieldMapping as any).enumMapping[String(v)];
                        return (mapped !== undefined && mapped !== '') ? ((fieldMapping as any).isEnum ? Number(mapped) : mapped) : v;
                    });
                } else {
                    const mapped = (fieldMapping as any).enumMapping[String(val)];
                    val = (mapped !== undefined && mapped !== '') ? ((fieldMapping as any).isEnum ? Number(mapped) : mapped) : val;
                }
            }
            setNestedValue(output, (fieldMapping as any).target, val);
        }
    }
    
    return output as ${returnType};
}
    `.trim();
}
