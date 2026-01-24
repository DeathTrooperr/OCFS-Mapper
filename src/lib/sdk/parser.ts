import type { ParserConfig, AttributeMapping } from './types';
import { detectObservableTypeId, OCSF_TYPE_TO_OBSERVABLE, OBSERVABLE_TYPE_NAMES } from './observables';

export function getNestedValue(obj: any, path: string): any {
    if (!obj) return undefined;
    if (!path) return obj;
    
    const arrayIndex = path.indexOf('[');
    if (arrayIndex !== -1) {
        const closeIndex = path.indexOf(']', arrayIndex);
        if (closeIndex !== -1) {
            const arrayPath = path.slice(0, arrayIndex);
            const indexStr = path.slice(arrayIndex + 1, closeIndex);
            const rest = path.slice(closeIndex + 1);
            
            const arr = getNestedValue(obj, arrayPath.endsWith('.') ? arrayPath.slice(0, -1) : arrayPath);
            if (Array.isArray(arr)) {
                const nextPath = rest.startsWith('.') ? rest.slice(1) : rest;
                if (indexStr === '') {
                    // Return all elements mapped by rest path
                    return arr.map(item => getNestedValue(item, nextPath));
                } else {
                    // Return specific index
                    const i = parseInt(indexStr, 10);
                    return getNestedValue(arr[i], nextPath);
                }
            }
            return undefined;
        }
    }
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}

export function setNestedValue(obj: any, path: string, value: any) {
    if (value === undefined) return;
    
    const arrayIndex = path.indexOf('[');
    if (arrayIndex !== -1) {
        const closeIndex = path.indexOf(']', arrayIndex);
        if (closeIndex !== -1) {
            const arrayPath = path.slice(0, arrayIndex);
            const indexStr = path.slice(arrayIndex + 1, closeIndex);
            const rest = path.slice(closeIndex + 1);

            const arrPath = arrayPath.endsWith('.') ? arrayPath.slice(0, -1) : arrayPath;
            const nextPath = rest.startsWith('.') ? rest.slice(1) : rest;
            
            let arr = getNestedValue(obj, arrPath);
            if (!Array.isArray(arr)) {
                arr = [];
                setNestedValue(obj, arrPath, arr);
            }

            if (indexStr === '') {
                if (Array.isArray(value)) {
                    value.forEach((v, i) => {
                        if (nextPath) {
                            if (arr[i] === undefined || typeof arr[i] !== 'object') arr[i] = {};
                            setNestedValue(arr[i], nextPath, v);
                        } else {
                            arr[i] = v;
                        }
                    });
                } else {
                    // Scalar to array mapping: put in first element or broadcast if it makes sense
                    // For OCSF we usually mean the first element if not specified
                    if (nextPath) {
                        if (arr[0] === undefined || typeof arr[0] !== 'object') arr[0] = {};
                        setNestedValue(arr[0], nextPath, value);
                    } else {
                        arr[0] = value;
                    }
                }
            } else {
                const i = parseInt(indexStr, 10);
                if (nextPath) {
                    if (arr[i] === undefined || typeof arr[i] !== 'object') arr[i] = {};
                    setNestedValue(arr[i], nextPath, value);
                } else {
                    arr[i] = value;
                }
            }
            return;
        }
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
                val = inputStr;
            } else if (ocsfPath === 'raw_data_hash') {
                // Simple hash for demonstration
                let hash = 0;
                for (let i = 0; i < inputStr.length; i++) {
                    hash = ((hash << 5) - hash) + inputStr.charCodeAt(i);
                    hash |= 0;
                }
                const hashVal = Math.abs(hash).toString(16).padStart(8, '0');
                val = {
                    algorithm_id: 99,
                    algorithm: 'Internal Hash',
                    value: hashVal
                };
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
            // Apply enum mapping if exists
            if (m.enumMapping && Object.keys(m.enumMapping).length > 0) {
                if (Array.isArray(val)) {
                    val = val.map(v => {
                        const mapped = m.enumMapping![String(v)];
                        return (mapped !== undefined && mapped !== '') ? mapped : v;
                    });
                } else {
                    const mapped = m.enumMapping[String(val)];
                    val = (mapped !== undefined && mapped !== '') ? mapped : val;
                }
            }

            // Auto-casting based on target type metadata
            if (m.isEnum || m.isNumber) {
                if (Array.isArray(val)) {
                    val = val.map(v => (v !== null && v !== '' && !isNaN(Number(v))) ? Number(v) : v);
                } else {
                    val = (val !== null && val !== '' && !isNaN(Number(val))) ? Number(val) : val;
                }
            }

            setNestedValue(output, ocsfPath, val);

            const addObservable = (v: any, path: string, mapping: AttributeMapping) => {
                if (v === null || v === undefined) return;
                
                // Only pull from raw data (source is present)
                if (mapping.source === undefined) return;

                const typeId = mapping.observableTypeId ?? 
                               (mapping.ocsfType ? OCSF_TYPE_TO_OBSERVABLE[mapping.ocsfType] : null) ??
                               detectObservableTypeId(v, mapping.source);

                if (typeId !== null && typeId !== undefined) {
                    const observable: any = {
                        name: path,
                        type_id: typeId,
                        type: OBSERVABLE_TYPE_NAMES[typeId]
                    };
                    
                    // If it's not an object type, add the value
                    const isObject = (typeId >= 20 && typeId <= 30) || [17, 18, 31, 32, 33, 34, 35, 38, 39, 40, 41, 43, 44, 47, 48].includes(typeId);
                    if (!isObject && typeof v !== 'object') {
                         if (typeof v === 'string' && v === '') return;
                         observable.value = String(v);
                    }
                    
                    observables.push(observable);
                }
            };

            if (Array.isArray(val)) {
                val.forEach(v => addObservable(v, ocsfPath, m));
            } else {
                addObservable(val, ocsfPath, m);
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
