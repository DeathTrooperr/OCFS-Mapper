<script lang="ts">
    import type { PageData } from './$types';

    export let data: PageData;

    let jsonInput = '';
    let schemaFields: Array<{
        name: string;
        type: string;
        enumValues: string;
        mappedTo: string;
        enumMapping: Record<string, string>;
        showEnumMapping?: boolean;
    }> = [];
    let selectedCategory = '';
    let selectedClass = '';
    let classMappings: Array<{
        enumValue: string;
        selectedCategory: string;
        selectedClass: string;
        schemaFields: typeof schemaFields;
    }> = [];
    let useConditionalClass = false;
    let activeMappingIndex: number | 'default' = 'default';
    let classDeterminingField = '';
    let generatedCode = '';

    $: ocsfCategories = Object.values(data.ocsf.categories);
    $: filteredClasses = (cat: string) => Object.values(data.ocsf.classes).filter(c => c.category === cat || (cat === 'other' && c.name === 'base_event'));
    
    $: currentMappingFields = activeMappingIndex === 'default' 
        ? schemaFields 
        : classMappings[activeMappingIndex]?.schemaFields || [];

    $: currentClass = activeMappingIndex === 'default'
        ? data.ocsf.classes[selectedClass]
        : (typeof activeMappingIndex === 'number' ? data.ocsf.classes[classMappings[activeMappingIndex]?.selectedClass] : undefined);


    let stickyHeader = false;

    function parseSchema() {
        try {
            const parsed = JSON.parse(jsonInput);
            const fields: typeof schemaFields = [];

            function traverse(obj: any, prefix = '') {
                for (const key in obj) {
                    const path = prefix ? `${prefix}.${key}` : key;
                    const value = obj[key];
                    const type = Array.isArray(value) ? 'array' : typeof value;

                    fields.push({
                        name: path,
                        type: type,
                        enumValues: '',
                        mappedTo: 'unmapped',
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
            schemaFields = fields;
            classMappings = classMappings.map(m => ({
                ...m,
                schemaFields: JSON.parse(JSON.stringify(fields))
            }));
            activeField = null;
        } catch (e) {
            alert('Invalid JSON');
        }
    }

    function generateCodeSnippet() {
        const getMappingForFields = (fields: typeof schemaFields, targetClass: any) => {
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

        let classLogic = '';
        let mappingDeclaration = '';

        if (useConditionalClass && classDeterminingField) {
            const defaultMapping = getMappingForFields(schemaFields, data.ocsf.classes[selectedClass]);
            const conditionalMappings = classMappings.reduce((acc, m) => {
                acc[m.enumValue] = getMappingForFields(m.schemaFields, data.ocsf.classes[m.selectedClass]);
                return acc;
            }, {} as Record<string, any>);

            mappingDeclaration = `const mappings = ${JSON.stringify({ default: defaultMapping, ...conditionalMappings }, null, 4)};`;

            classLogic = `
    const determiningValue = String(getNestedValue(input, "${classDeterminingField}"));
    let selectedClass = "${selectedClass}";
    let selectedCategory = "${selectedCategory}";
    let activeMapping = mappings.default;
    
    switch (determiningValue) {
        ${classMappings.map(m => `case "${m.enumValue}":
            selectedClass = "${m.selectedClass}";
            selectedCategory = "${m.selectedCategory}";
            activeMapping = mappings["${m.enumValue}"];
            break;`).join('\n        ')}
    }
    
    output.class_name = selectedClass;
    output.category_name = selectedCategory;
    const mapping = activeMapping;`;
        } else {
            const mappingObj = getMappingForFields(schemaFields, data.ocsf.classes[selectedClass]);
            mappingDeclaration = `const mapping = ${JSON.stringify(mappingObj, null, 4)};`;
            classLogic = `
    output.class_name = "${selectedClass}";
    output.category_name = "${selectedCategory}";`;
        }

        generatedCode = `
export function parseToOCSF(input: any): any {
    const output: any = {};
    ${mappingDeclaration}
    ${classLogic}
    
    function getNestedValue(obj: any, path: string): any {
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
            if (fieldMapping.enumMapping && Object.keys(fieldMapping.enumMapping).length > 0) {
                if (Array.isArray(val)) {
                    val = val.map(v => {
                        const mapped = fieldMapping.enumMapping[String(v)];
                        return (mapped !== undefined && mapped !== '') ? (fieldMapping.isEnum ? Number(mapped) : mapped) : v;
                    });
                } else {
                    const mapped = fieldMapping.enumMapping[String(val)];
                    val = (mapped !== undefined && mapped !== '') ? (fieldMapping.isEnum ? Number(mapped) : mapped) : val;
                }
            }
            setNestedValue(output, fieldMapping.target, val);
        }
    }
    
    return output;
}
        `.trim();
    }
    let activeField: string | null = null;

    function toggleField(name: string) {
        if (activeField === name) {
            activeField = null;
        } else {
            activeField = name;
        }
    }
</script>

<main class="p-4 md:p-8 max-w-[1600px] mx-auto space-y-8 md:space-y-12">
    <header class="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
            <h1 class="text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-2">OCSF Mapper</h1>
            <p class="text-slate-400 text-base md:text-lg">Transform your JSON logs into OCSF compliant events with ease.</p>
        </div>
    </header>

    <!-- 1. Paste JSON Schema -->
    <section class="bg-slate-900 border border-slate-800 rounded-xl shadow-xl overflow-hidden">
        <div class="px-6 py-4 border-b border-slate-800 bg-slate-900/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 class="text-lg font-semibold text-white">1. Paste JSON Schema</h2>
            <div class="flex items-center gap-4 w-full sm:w-auto">
                <span class="text-xs font-mono text-slate-500 hidden xs:inline">JSON Input</span>
                <button 
                    on:click={parseSchema}
                    class="w-full sm:w-auto px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-blue-900/20"
                >
                    Parse Schema
                </button>
            </div>
        </div>
        <div class="p-4 md:p-6">
            <textarea 
                bind:value={jsonInput} 
                class="w-full h-48 md:h-64 p-4 bg-slate-950 border border-slate-800 rounded-lg font-mono text-sm text-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" 
                placeholder={JSON.stringify({"field1": "value", "field2": 123}, null, 2)}
            ></textarea>
        </div>
    </section>

    {#if schemaFields.length > 0}
        <div class="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <!-- 2. Configure Fields -->
            <section class="bg-slate-900 border border-slate-800 rounded-xl shadow-xl flex flex-col min-w-0 h-fit xl:max-h-[1000px]">
                <div class="px-6 py-4 border-b border-slate-800 bg-slate-900/50">
                    <h2 class="text-lg font-semibold text-white">2. Configure Source Fields</h2>
                </div>
                <div class="p-4 md:p-6 space-y-3 overflow-y-auto">
                    {#each schemaFields as field}
                        <div class="bg-slate-950 border border-slate-800 rounded-lg overflow-hidden transition-all {activeField === field.name ? 'ring-1 ring-blue-500/50' : ''}">
                            <button 
                                on:click={() => toggleField(field.name)}
                                class="flex items-center justify-between w-full p-4 text-left hover:bg-slate-900/50 transition-colors"
                            >
                                <div class="flex items-center gap-3 min-w-0">
                                    <span class="font-mono text-blue-400 font-medium truncate">{field.name}</span>
                                    <span class="px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold bg-slate-800 text-slate-400 rounded-full border border-slate-700 shrink-0">{field.type}</span>
                                </div>
                                <svg class="w-5 h-5 text-slate-500 shrink-0 transition-transform {activeField === field.name ? 'rotate-180' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                            
                            {#if activeField === field.name}
                                <div class="p-4 border-t border-slate-800 bg-slate-900/30 space-y-4">
                                    <div>
                                        <label class="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Source Type</label>
                                        <select 
                                            bind:value={field.type} 
                                            class="w-full bg-slate-950 border border-slate-800 text-slate-300 p-2 rounded-md focus:ring-1 focus:ring-blue-500 outline-none appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
                                            disabled={field.type === 'object' || field.type === 'array'}
                                        >
                                            <option value="string">String</option>
                                            <option value="number">Number</option>
                                            <option value="boolean">Boolean</option>
                                            <option value="enum">Enum</option>
                                            <option value="object">Object</option>
                                            <option value="array">Array</option>
                                        </select>
                                        {#if field.type === 'object' || field.type === 'array'}
                                            <p class="text-[10px] text-slate-500 mt-1">Structural types cannot be changed.</p>
                                        {/if}
                                    </div>

                                    {#if field.type === 'enum'}
                                        <div class="animate-in fade-in slide-in-from-top-1 duration-200">
                                            <label class="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Enum Values</label>
                                            <input 
                                                type="text" 
                                                bind:value={field.enumValues} 
                                                class="w-full bg-slate-950 border border-slate-800 text-slate-300 p-2 rounded-md focus:ring-1 focus:ring-blue-500 outline-none"
                                                placeholder="val1, val2, val3"
                                            />
                                            <p class="text-[10px] text-slate-500 mt-1">Separate values with commas or spaces.</p>
                                        </div>
                                    {/if}
                                </div>
                            {/if}
                        </div>
                    {/each}
                </div>
            </section>

            <!-- 3 & 4. Target Mapping -->
            <div class="space-y-8 min-w-0">
                <section class="bg-slate-900 border border-slate-800 rounded-xl shadow-xl overflow-hidden">
                    <div class="px-6 py-4 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
                        <h2 class="text-lg font-semibold text-white">3. Select OCSF Target</h2>
                        <label class="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" bind:checked={useConditionalClass} class="w-4 h-4 rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-blue-500" />
                            <span class="text-xs font-medium text-slate-400">Conditional Class</span>
                        </label>
                    </div>
                    <div class="p-4 md:p-6 space-y-6">
                        {#if useConditionalClass}
                            <div class="p-4 bg-blue-950/20 border border-blue-900/30 rounded-lg space-y-4">
                                <div class="space-y-1.5">
                                    <label class="text-xs font-bold text-slate-500 uppercase tracking-wider block">Class Determining Field</label>
                                    <select bind:value={classDeterminingField} class="w-full bg-slate-950 border border-slate-800 p-2 rounded-md focus:ring-1 focus:ring-blue-500 outline-none appearance-none text-sm text-slate-300">
                                        <option value="">Select Field</option>
                                        {#each schemaFields.filter(f => f.type === 'enum' || f.type === 'string' || f.type === 'number') as field}
                                            <option value={field.name}>{field.name}</option>
                                        {/each}
                                    </select>
                                </div>

                                {#if classDeterminingField}
                                    {@const determiningField = schemaFields.find(f => f.name === classDeterminingField)}
                                    <div class="space-y-3">
                                        <div class="flex items-center justify-between">
                                            <label class="text-xs font-bold text-slate-500 uppercase tracking-wider block">Class Mappings</label>
                                            <button 
                                                on:click={() => {
                                                    const newMapping = { 
                                                        enumValue: '', 
                                                        selectedCategory: '', 
                                                        selectedClass: '',
                                                        schemaFields: JSON.parse(JSON.stringify(schemaFields))
                                                    };
                                                    classMappings = [...classMappings, newMapping];
                                                    activeMappingIndex = classMappings.length - 1;
                                                }}
                                                class="text-[10px] px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold transition-colors"
                                            >
                                                + Add Mapping
                                            </button>
                                        </div>

                                        {#each classMappings as mapping, i}
                                            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 bg-slate-950 rounded-lg border border-slate-800 relative group">
                                                <button 
                                                    on:click={() => {
                                                        const wasActive = activeMappingIndex === i;
                                                        classMappings = classMappings.filter((_, j) => i !== j);
                                                        if (wasActive) activeMappingIndex = 'default';
                                                        else if (typeof activeMappingIndex === 'number' && activeMappingIndex > i) activeMappingIndex--;
                                                    }}
                                                    class="absolute -top-2 -right-2 w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    &times;
                                                </button>
                                                <div class="space-y-1">
                                                    <label class="text-[9px] font-bold text-slate-600 uppercase">Value</label>
                                                    {#if determiningField?.type === 'enum' && determiningField.enumValues}
                                                        <select bind:value={mapping.enumValue} class="w-full bg-slate-900 border border-slate-800 text-[11px] p-1.5 rounded outline-none text-slate-300">
                                                            <option value="">Select Value</option>
                                                            {#each determiningField.enumValues.split(/[,\s]+/).filter(v => v.trim() !== '') as val}
                                                                <option value={val}>{val}</option>
                                                            {/each}
                                                        </select>
                                                    {:else}
                                                        <input type="text" bind:value={mapping.enumValue} class="w-full bg-slate-900 border border-slate-800 text-[11px] p-1.5 rounded outline-none text-slate-300" placeholder="Value" />
                                                    {/if}
                                                </div>
                                                <div class="space-y-1">
                                                    <label class="text-[9px] font-bold text-slate-600 uppercase">Category</label>
                                                    <select 
                                                        bind:value={mapping.selectedCategory} 
                                                        on:change={() => mapping.selectedClass = ''}
                                                        class="w-full bg-slate-900 border border-slate-800 text-[11px] p-1.5 rounded outline-none text-slate-300"
                                                    >
                                                        <option value="">Category</option>
                                                        {#each ocsfCategories as cat}
                                                            <option value={cat.name}>{cat.caption}</option>
                                                        {/each}
                                                        <option value="other">Base / Other</option>
                                                    </select>
                                                </div>
                                                <div class="space-y-1">
                                                    <label class="text-[9px] font-bold text-slate-600 uppercase">Class</label>
                                                    <select bind:value={mapping.selectedClass} class="w-full bg-slate-900 border border-slate-800 text-[11px] p-1.5 rounded outline-none text-slate-300">
                                                        <option value="">Class</option>
                                                        {#each filteredClasses(mapping.selectedCategory).sort((a,b) => a.caption.localeCompare(b.caption)) as cls}
                                                            <option value={cls.name}>{cls.caption}</option>
                                                        {/each}
                                                    </select>
                                                </div>
                                                <button 
                                                    on:click={() => activeMappingIndex = i}
                                                    class="sm:col-span-3 text-[10px] py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition-colors {activeMappingIndex === i ? 'ring-1 ring-blue-500' : ''}"
                                                >
                                                    {activeMappingIndex === i ? 'Editing This Mapping' : 'Edit This Mapping'}
                                                </button>
                                            </div>
                                        {/each}
                                    </div>
                                {/if}
                            </div>
                        {/if}

                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-slate-300">
                            <div class="space-y-1.5">
                                <label class="text-xs font-bold text-slate-500 uppercase tracking-wider block">{useConditionalClass ? 'Default Category' : 'Category'}</label>
                                <select 
                                    bind:value={selectedCategory} 
                                    on:change={() => selectedClass = ''}
                                    class="w-full bg-slate-950 border border-slate-800 p-2 rounded-md focus:ring-1 focus:ring-blue-500 outline-none appearance-none text-sm"
                                >
                                    <option value="">Select Category</option>
                                    {#each ocsfCategories as cat}
                                        <option value={cat.name}>{cat.caption}</option>
                                    {/each}
                                    <option value="other">Base Event / Other</option>
                                </select>
                            </div>
                            <div class="space-y-1.5">
                                <label class="text-xs font-bold text-slate-500 uppercase tracking-wider block">{useConditionalClass ? 'Default Class' : 'Class'}</label>
                                <select bind:value={selectedClass} class="w-full bg-slate-950 border border-slate-800 p-2 rounded-md focus:ring-1 focus:ring-blue-500 outline-none appearance-none text-sm">
                                    <option value="">Select Class</option>
                                    {#each filteredClasses(selectedCategory).sort((a,b) => a.caption.localeCompare(b.caption)) as cls}
                                        <option value={cls.name}>{cls.caption}</option>
                                    {/each}
                                </select>
                            </div>
                        </div>
                        {#if useConditionalClass}
                            <button 
                                on:click={() => activeMappingIndex = 'default'}
                                class="w-full text-[10px] py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition-colors {activeMappingIndex === 'default' ? 'ring-1 ring-blue-500' : ''}"
                            >
                                {activeMappingIndex === 'default' ? 'Editing Default Mapping' : 'Edit Default Mapping'}
                            </button>
                        {/if}
                    </div>
                </section>

                {#if selectedClass && currentClass}
                    <section class="bg-slate-900 border border-slate-800 rounded-xl shadow-xl overflow-hidden animate-in fade-in duration-300 h-fit xl:max-h-[1000px] flex flex-col">
                        <div class="px-6 py-4 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
                            <h2 class="text-lg font-semibold text-white truncate">
                                4. Map to {currentClass.caption} 
                                {#if useConditionalClass}
                                    <span class="text-blue-400 ml-2">
                                        ({activeMappingIndex === 'default' ? 'Default' : 'Value: ' + (classMappings[activeMappingIndex]?.enumValue || '?')})
                                    </span>
                                {/if}
                            </h2>
                        </div>
                        <div class="p-4 md:p-6 space-y-4 overflow-y-auto">
                            {#each currentMappingFields as field}
                                <div class="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-3">
                                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div class="min-w-0 flex-1">
                                            <div class="font-mono text-sm text-blue-400 truncate">{field.name}</div>
                                            <div class="text-[10px] text-slate-500 uppercase font-bold">{field.type}</div>
                                        </div>
                                        <div class="flex items-center gap-2 w-full sm:w-2/3">
                                            {#if useConditionalClass && field.name === classDeterminingField}
                                                <div class="px-2 py-1 bg-blue-600/20 border border-blue-500/50 rounded text-[10px] text-blue-400 font-bold uppercase whitespace-nowrap">Class Switch</div>
                                            {/if}
                                            <select bind:value={field.mappedTo} class="bg-slate-900 border border-slate-800 text-xs text-slate-300 p-2 rounded focus:ring-1 focus:ring-blue-500 outline-none w-full">
                                                <option value="unmapped">Unmapped Data</option>
                                                <option value="">Do not map</option>
                                                {#each Object.values(currentClass.attributes).filter(a => a.name !== 'unmapped').sort((a,b) => a.caption.localeCompare(b.caption)) as attr}
                                                    <option value={attr.name}>{attr.caption} ({attr.name})</option>
                                                {/each}
                                            </select>
                                        </div>
                                    </div>

                                    {#if field.mappedTo && field.mappedTo !== 'unmapped'}
                                        {@const targetAttr = currentClass.attributes[field.mappedTo]}
                                        {#if targetAttr && targetAttr.enum}
                                            <div class="mt-2 p-3 bg-blue-950/20 border border-blue-900/30 rounded-md">
                                                <div class="flex items-center justify-between mb-3">
                                                    <div>
                                                        <h4 class="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Enum Mapping</h4>
                                                        <p class="text-[9px] text-slate-500 mt-0.5">Map source values to OCSF {targetAttr.caption} enum</p>
                                                    </div>
                                                    <button 
                                                        class="text-[10px] px-2 py-1 bg-blue-900/50 hover:bg-blue-800/50 text-blue-300 rounded border border-blue-800/50 transition-colors"
                                                        on:click={() => {
                                                            field.showEnumMapping = !field.showEnumMapping;
                                                            if (activeMappingIndex === 'default') {
                                                                schemaFields = schemaFields;
                                                            } else {
                                                                classMappings = classMappings;
                                                            }
                                                        }}
                                                    >
                                                        {field.showEnumMapping ? 'Hide' : 'Configure'}
                                                    </button>
                                                </div>

                                                {#if field.showEnumMapping}
                                                    {@const sourceValues = field.enumValues ? field.enumValues.split(/[,\s]+/).filter(v => v.trim() !== '') : []}
                                                    <div class="space-y-3 max-h-60 overflow-y-auto pr-1">
                                                        
                                                        {#each Object.entries(field.enumMapping) as [sourceVal, targetVal]}
                                                            {#if !sourceValues.includes(sourceVal)}
                                                                <div class="flex flex-col sm:flex-row sm:items-center gap-2">
                                                                    <div class="flex items-center gap-2 w-full sm:w-1/3">
                                                                        <button 
                                                                            on:click={() => {
                                                                                delete field.enumMapping[sourceVal];
                                                                                if (activeMappingIndex === 'default') {
                                                                                    schemaFields = schemaFields;
                                                                                } else {
                                                                                    classMappings = classMappings;
                                                                                }
                                                                            }}
                                                                            class="text-red-500 hover:text-red-400 text-xs"
                                                                        >&times;</button>
                                                                        <span class="text-[11px] font-mono text-slate-400 truncate" title={sourceVal}>{sourceVal}</span>
                                                                    </div>
                                                                    <span class="text-slate-600 hidden sm:inline">&rarr;</span>
                                                                    <select 
                                                                        bind:value={field.enumMapping[sourceVal]} 
                                                                        class="text-[11px] bg-slate-950 border border-slate-800 text-slate-300 p-1.5 rounded w-full sm:flex-1 outline-none"
                                                                    >
                                                                        <option value="">Select Target</option>
                                                                        {#each Object.entries(targetAttr.enum) as [id, e]}
                                                                            <option value={id}>{e.caption} ({id})</option>
                                                                        {/each}
                                                                    </select>
                                                                </div>
                                                            {/if}
                                                        {/each}

                                                        {#each sourceValues as enumVal}
                                                            <div class="flex flex-col sm:flex-row sm:items-center gap-2">
                                                                <span class="text-[11px] font-mono text-slate-400 w-full sm:w-1/3 truncate pl-5" title={enumVal}>{enumVal}</span>
                                                                <span class="text-slate-600 hidden sm:inline">&rarr;</span>
                                                                <select 
                                                                    bind:value={field.enumMapping[enumVal]} 
                                                                    class="text-[11px] bg-slate-950 border border-slate-800 text-slate-300 p-1.5 rounded w-full sm:flex-1 outline-none"
                                                                >
                                                                    <option value="">Select Target</option>
                                                                    {#each Object.entries(targetAttr.enum) as [id, e]}
                                                                        <option value={id}>{e.caption} ({id})</option>
                                                                    {/each}
                                                                </select>
                                                            </div>
                                                        {/each}

                                                        <div class="pt-2 border-t border-blue-900/30">
                                                            <div class="flex gap-2">
                                                                <input 
                                                                    type="text" 
                                                                    placeholder="Add custom source value..." 
                                                                    class="text-[11px] bg-slate-950 border border-slate-800 text-slate-300 p-1.5 rounded flex-1 outline-none"
                                                                    on:keydown={(e) => {
                                                                        if (e.key === 'Enter') {
                                                                            const val = e.currentTarget.value.trim();
                                                                            if (val && !field.enumMapping[val]) {
                                                                                field.enumMapping[val] = '';
                                                                                e.currentTarget.value = '';
                                                                                if (activeMappingIndex === 'default') {
                                                                                    schemaFields = schemaFields;
                                                                                } else {
                                                                                    classMappings = classMappings;
                                                                                }
                                                                            }
                                                                        }
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                {/if}
                                            </div>
                                        {/if}
                                        
                                        {#if targetAttr && targetAttr.type === 'object_t' && field.type === 'object'}
                                             <div class="mt-2 p-2 bg-slate-900/50 rounded text-[10px] text-slate-400 border border-slate-800">
                                                Mapped to object type. Nested fields will be automatically handled if their paths match.
                                             </div>
                                        {/if}
                                    {/if}
                                </div>
                            {/each}
                        </div>
                        <div class="p-4 md:p-6 bg-slate-900/50 border-t border-slate-800 mt-auto">
                            <button 
                                on:click={generateCodeSnippet}
                                class="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-all shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2"
                            >
                                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                </svg>
                                Generate parseToOCSF
                            </button>
                        </div>
                    </section>
                {/if}
            </div>
        </div>
    {/if}

    {#if generatedCode}
        <section class="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div class="px-6 py-4 border-b border-slate-800 bg-slate-900/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 class="text-lg font-semibold text-white">5. Generated TypeScript Code</h2>
                <button 
                    on:click={() => {
                        navigator.clipboard.writeText(generatedCode);
                        alert('Copied to clipboard!');
                    }}
                    class="w-full sm:w-auto text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded border border-slate-700 transition-colors"
                >
                    Copy to Clipboard
                </button>
            </div>
            <div class="p-0 bg-slate-950">
                <pre class="p-4 md:p-6 text-emerald-400 font-mono text-sm leading-relaxed overflow-x-auto"><code>{generatedCode}</code></pre>
            </div>
        </section>
    {/if}
</main>
