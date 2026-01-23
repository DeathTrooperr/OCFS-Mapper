import type { ParserConfig, AttributeMapping } from './types';

export function getNestedValue(obj: any, path: string): any {
    if (!obj) return undefined;
    if (!path) return obj;
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

export function setNestedValue(obj: any, path: string, value: any) {
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

export function parseOCSF(input: any, config: ParserConfig): any {
    const output: any = {};
    
    const inputStr = JSON.stringify(input);
    const inputSize = new TextEncoder().encode(inputStr).length;

    let selectedClass = config.selectedClass;
    let selectedCategory = config.selectedCategory;
    let activeMapping = config.defaultMapping;
    
    if (config.conditionals) {
        for (const cond of config.conditionals) {
            const actualValue = String(getNestedValue(input, cond.field));
            if (actualValue === cond.value) {
                selectedClass = cond.className;
                selectedCategory = cond.categoryName;
                activeMapping = cond.mapping;
                break;
            }
        }
    }
    
    output.class_name = selectedClass;
    output.category_name = selectedCategory;

    const observables: any[] = [];

    for (const [ocsfPath, fieldMapping] of Object.entries(activeMapping)) {
        let val: any;
        const m = fieldMapping as AttributeMapping;
        
        // Handle automatic mappings
        if (m.source === '' && m.static === undefined) {
            if (ocsfPath === 'raw_data') {
                val = input;
            } else if (ocsfPath === 'raw_data_hash') {
                // Simple hash for demonstration, replace with SHA-256 in production if needed
                let hash = 0;
                for (let i = 0; i < inputStr.length; i++) {
                    hash = ((hash << 5) - hash) + inputStr.charCodeAt(i);
                    hash |= 0;
                }
                val = Math.abs(hash).toString(16).padStart(8, '0');
            } else if (ocsfPath === 'raw_data_size') {
                val = inputSize;
            } else if (ocsfPath === 'observables') {
                val = undefined; // Handled by automated observables logic
            } else {
                val = input; // Default behavior for empty source
            }
        } else if (m.static !== undefined && m.static !== null) {
            val = m.static;
        } else if (m.source !== undefined && m.source !== null) {
            val = getNestedValue(input, m.source);
        }

        if (val !== undefined && val !== null) {
            if (m.enumMapping && Object.keys(m.enumMapping).length > 0) {
                if (Array.isArray(val)) {
                    val = val.map(v => {
                        const mapped = m.enumMapping![String(v)];
                        return (mapped !== undefined && mapped !== '') ? (m.isEnum ? Number(mapped) : mapped) : v;
                    });
                } else {
                    const mapped = m.enumMapping[String(val)];
                    val = (mapped !== undefined && mapped !== '') ? (m.isEnum ? Number(mapped) : mapped) : val;
                }
            }
            setNestedValue(output, ocsfPath, val);

            if (m.observableTypeId !== undefined && m.observableTypeId !== null) {
                if (Array.isArray(val)) {
                    val.forEach(v => {
                        observables.push({
                            name: ocsfPath,
                            type_id: m.observableTypeId,
                            value: v
                        });
                    });
                } else {
                    observables.push({
                        name: ocsfPath,
                        type_id: m.observableTypeId,
                        value: val
                    });
                }
            }
        }
    }

    if (observables.length > 0) {
        if (!output.observables) {
            output.observables = observables;
        } else if (Array.isArray(output.observables)) {
            // Append automated observables if they aren't already there (by name)
            const existingNames = new Set(output.observables.map((o: any) => o.name));
            observables.forEach(o => {
                if (!existingNames.has(o.name)) {
                    output.observables.push(o);
                }
            });
        }
    }
    
    return output;
}
