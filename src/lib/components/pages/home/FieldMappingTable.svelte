<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import type { SchemaField, AttributeMapping, OCSFSchemaData } from "$lib/scripts/types/types";
    import { isTypeCompatible, getTsType, groupFields } from "$lib/scripts/pages/home/mapping-utils";
    import { OCSF_TYPE_TO_OBSERVABLE, OBSERVABLE_TYPE_NAMES } from "$lib/sdk/observables";
    export let schemaFields: SchemaField[];
    export let targetClass: any;
    export let title: string;
    export let mappings: Record<string, AttributeMapping>;
    export let defaultMappings: Record<string, AttributeMapping> = {};
    export let isDefault = true;
    export let ocsfData: OCSFSchemaData | undefined = undefined;

    const dispatch = createEventDispatcher();

    let activeAttr: string | null = null;
    let searchQuery = "";
    let instanceCounts: Record<string, number> = {};

    function toggleAttr(name: string) {
        activeAttr = activeAttr === name ? null : name;
    }

    function handleChange() {
        dispatch('change');
    }

    function getInstanceIndices(attrName: string, isArray: boolean) {
        if (!isArray) return [null];
        
        const mappedIndices = new Set<string>();
        Object.keys(allMappings).forEach(k => {
            if (k.startsWith(`${attrName}[`)) {
                // Escape special characters in attrName for Regex
                const escapedName = attrName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const match = k.match(new RegExp(`^${escapedName}\\[(\\d*)\\]`));
                if (match) mappedIndices.add(match[1]);
            }
        });
        
        const indices: (string | null)[] = Array.from(mappedIndices).sort((a, b) => {
            if (a === '') return -1;
            if (b === '') return 1;
            return parseInt(a) - parseInt(b);
        });
        
        if (indices.length === 0) indices.push(''); // Default to []
        
        const count = instanceCounts[attrName] || 0;
        let found = 0;
        let i = 0;
        while (found < count) {
            if (!indices.includes(String(i))) {
                indices.push(String(i));
                found++;
            }
            i++;
            if (i > 20) break; 
        }
        
        return indices.sort((a, b) => {
            if (a === null || b === null) return 0;
            if (a === '') return -1;
            if (b === '') return 1;
            return parseInt(a) - parseInt(b);
        });
    }

    function removeInstance(attrName: string, idx: string) {
        const prefix = `${attrName}[${idx}]`;
        Object.keys(mappings).forEach(k => {
            if (k.startsWith(prefix)) {
                delete mappings[k];
            }
        });
        mappings = { ...mappings };
        if (instanceCounts[attrName] > 0) {
            instanceCounts[attrName]--;
            instanceCounts = instanceCounts;
        }
        handleChange();
    }

    function setSourceType(attrName: string, type: 'none' | 'field' | 'static', attr?: any) {
        if (!mappings[attrName]) mappings[attrName] = { enumMapping: {} };
        
        if (type === 'none') {
            delete mappings[attrName].sourceField;
            delete mappings[attrName].staticValue;
        } else if (type === 'field') {
            delete mappings[attrName].staticValue;
            if (!mappings[attrName].sourceField) {
                const targetAttr = attr || targetClass?.attributes[attrName];
                const compatible = getCompatibleFields(targetAttr);
                mappings[attrName].sourceField = compatible[0]?.name || '';
            }
        } else if (type === 'static') {
            delete mappings[attrName].sourceField;
            if (mappings[attrName].staticValue === undefined) mappings[attrName].staticValue = '';
        }
        mappings = { ...mappings };
        handleChange();
    }

    $: filteredAttributes = targetClass ? Object.values(targetClass.attributes)
        .filter((a: any) => {
            const query = searchQuery.toLowerCase();
            const name = a.name.toLowerCase();
            const caption = a.caption.toLowerCase();
            return name.includes(query) || caption.includes(query) || query.startsWith(name + '.') || query.startsWith(name + '[');
        })
        .sort((a: any, b: any) => {
            const reqOrder: Record<string, number> = { 'required': 0, 'recommended': 1, 'optional': 2 };
            const aReq = reqOrder[a.requirement || 'optional'] ?? 3;
            const bReq = reqOrder[b.requirement || 'optional'] ?? 3;
            if (aReq !== bReq) return aReq - bReq;
            return a.caption.localeCompare(b.caption);
        }) : [];

    $: getEffectiveMapping = (name: string) => {
        const m = mappings[name];
        if (isDefault) return m;
        // If it's explicitly set to something, or explicitly set to "unmapped" (which we handle by absence or empty)
        if (m?.sourceField || m?.staticValue !== undefined) return m;
        return defaultMappings[name];
    };

    $: getSourceFieldInfo = (fieldName: string) => schemaFields.find(f => f.name === fieldName);
    $: getCompatibleFields = (attr: any) => schemaFields.filter(sf => isTypeCompatible(attr, sf));
    $: getObservableTypeName = (typeId: number) => {
        return OBSERVABLE_TYPE_NAMES[typeId] || `ID: ${typeId}`;
    };

    $: allMappings = isDefault ? mappings : { ...defaultMappings, ...mappings };
    $: mappedSourceFields = new Set(Object.values(allMappings).map(m => m.sourceField).filter(Boolean));
    
    const resolveAttr = (path: string): any => {
        if (!ocsfData || !targetClass) return undefined;
        
        const parts = path.split('.');
        let currentClass = targetClass;
        let attr: any;

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

    $: activeObservables = Object.entries(allMappings)
        .map(([path, m]) => {
            const hasMapping = m?.sourceField || m?.staticValue !== undefined;
            if (!hasMapping) return null;
            if (path === 'unmapped' || path.startsWith('unmapped.')) return null;
            if (path === 'raw_data' || path === 'raw_data_hash' || path === 'raw_data_size' || path === 'observables') return null;

            const attr = resolveAttr(path);
            const isOverridden = m?.isObservableOverride;
            const typeId = isOverridden ? m.observableTypeId : (attr?.observable ?? OCSF_TYPE_TO_OBSERVABLE[attr?.type]);
            
            if (typeId === undefined || typeId === null) return null;
            
            return {
                name: path,
                caption: attr?.caption || path,
                typeId,
                isOverridden
            };
        })
        .filter((o): o is { name: string, caption: string, typeId: number, isOverridden: boolean } => !!o)
        .sort((a, b) => a.name.localeCompare(b.name));

    $: unmappedSourceFields = schemaFields.filter(sf => {
        if (sf.type === 'object') return false;
        if (mappedSourceFields.has(sf.name)) return false;
        
        // Check if any parent is mapped
        const parts = sf.name.split('.');
        for (let i = 1; i < parts.length; i++) {
            const parentPath = parts.slice(0, i).join('.');
            if (mappedSourceFields.has(parentPath)) return false;
        }
        return true;
    });

    $: observableTypes = ocsfData?.types ? Object.entries(ocsfData.types)
        .filter(([_, t]: [string, any]) => t.observable !== undefined)
        .sort((a: [string, any], b: [string, any]) => a[1].caption.localeCompare(b[1].caption))
        : [];

    const typeColors: Record<string, string> = {
        string: 'text-blue-400',
        number: 'text-green-400',
        boolean: 'text-yellow-400',
        enum: 'text-purple-400',
        object: 'text-slate-400',
        array: 'text-slate-400'
    };

    const typeIcons: Record<string, string> = {
        string: 'Abc',
        number: '123',
        boolean: 'T/F',
        enum: ':::',
        object: '{}',
        array: '[]'
    };

    function getDisplayType(attr: any) {
        if (attr.is_array) return 'array';
        if (ocsfData?.classes[attr.type]) return 'object';
        if (attr.enum) return 'enum';
        const t = (attr.type || '').toLowerCase();
        if (t.includes('int') || t.includes('float') || t.includes('long') || t.includes('double') || t === 'number') return 'number';
        if (t.includes('bool')) return 'boolean';
        return 'string';
    }
</script>

{#snippet observableConfig(path, attr, m)}
    {@const typeIdFromSchema = attr?.observable ?? OCSF_TYPE_TO_OBSERVABLE[attr?.type]}
    {@const isMapped = m?.sourceField || m?.staticValue !== undefined}
    
    {#if isMapped || m?.isObservableOverride}
        <div class="flex items-center justify-between px-3 py-2 bg-slate-900/50 border border-slate-800/50 rounded-xl">
            <div class="flex items-center gap-2">
                <span class="w-1.5 h-1.5 {typeIdFromSchema !== undefined ? 'bg-emerald-500' : 'bg-blue-500'} rounded-full"></span>
                <span class="text-[10px] text-slate-400 font-medium">
                    {typeIdFromSchema !== undefined ? 'OCSF Observable (Automated)' : 'Dynamic Observable Detection'}
                </span>
            </div>
            <label class="flex items-center gap-2 cursor-pointer group">
                <input 
                    type="checkbox" 
                    checked={m?.isObservableOverride || false}
                    on:change={(e) => {
                        if (!mappings[path]) mappings[path] = { enumMapping: {} };
                        mappings[path].isObservableOverride = e.currentTarget.checked;
                        if (e.currentTarget.checked && mappings[path].observableTypeId === undefined) {
                            mappings[path].observableTypeId = typeIdFromSchema || 0;
                        }
                        mappings = { ...mappings };
                        handleChange();
                    }}
                    class="w-3 h-3 rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-blue-500"
                />
                <span class="text-[9px] text-slate-500 group-hover:text-slate-400 transition-colors">Manual Override</span>
            </label>
        </div>

        {#if m?.isObservableOverride}
            <div class="flex items-center gap-3 bg-slate-900/50 p-3 rounded-xl border border-blue-500/20 animate-in fade-in zoom-in-95 duration-200">
                <div class="flex-1">
                    <div class="text-[10px] text-slate-500 mb-1">Override Type</div>
                    <select 
                        value={m?.observableTypeId}
                        on:change={(e) => {
                            if (!mappings[path]) mappings[path] = { enumMapping: {} };
                            mappings[path].observableTypeId = e.currentTarget.value ? Number(e.currentTarget.value) : undefined;
                            mappings = { ...mappings };
                            handleChange();
                        }}
                        class="w-full bg-slate-950 border border-slate-800 text-xs p-2 rounded-lg outline-none text-slate-300 focus:ring-1 focus:ring-blue-500 transition-all"
                    >
                        <option value="">Disabled / None</option>
                        {#each observableTypes as [_, tInfo]}
                            <option value={tInfo.observable}>{tInfo.caption} ({tInfo.observable})</option>
                        {/each}
                        {#if observableTypes.length === 0 && typeIdFromSchema !== undefined}
                            <option value={typeIdFromSchema}>Default ({typeIdFromSchema})</option>
                        {/if}
                        <option value={99}>Other (99)</option>
                        <option value={0}>Unknown (0)</option>
                    </select>
                </div>
            </div>
        {/if}
    {/if}
{/snippet}

<div class="h-full flex flex-col space-y-4 p-4 md:p-6">
    <div class="flex-none flex flex-col md:flex-row md:items-center justify-between mb-4 px-2 gap-4">
        <h3 class="text-lg font-bold text-white flex items-center gap-3">
            <span class="w-1.5 h-6 bg-blue-500 rounded-full"></span>
            {title}
        </h3>
        <div class="relative w-full md:w-96">
            <input 
                type="text" 
                bind:value={searchQuery}
                placeholder="Search OCSF attributes..."
                class="w-full bg-slate-900 border border-slate-800 text-slate-200 text-xs p-2.5 pl-9 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
            <svg class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
        </div>
    </div>

    {#if activeObservables.length > 0}
        <div class="flex-none mb-2 px-2 animate-in fade-in slide-in-from-top-2 duration-300">
            <div class="bg-slate-900/50 border border-slate-800 rounded-2xl p-4">
                <div class="flex items-center justify-between mb-4">
                    <h4 class="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <svg class="w-3.5 h-3.5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                            <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Active Observable Mappings ({activeObservables.length})
                    </h4>
                </div>
                <div class="flex flex-wrap gap-2">
                    {#each activeObservables as obs}
                        <button 
                            on:click={() => {
                                searchQuery = obs.name;
                                activeAttr = obs.name;
                            }}
                            class="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 flex items-center gap-2 transition-all hover:border-blue-500/50 hover:bg-slate-900 text-left"
                        >
                            <span class="text-[11px] font-bold text-slate-300">{obs.caption}</span>
                            <span class="text-[9px] px-1.5 py-0.5 rounded {obs.isOverridden ? 'bg-purple-900/40 text-purple-400' : 'bg-emerald-900/40 text-emerald-400'} border {obs.isOverridden ? 'border-purple-900/30' : 'border-emerald-900/30'}">
                                {getObservableTypeName(obs.typeId)}
                            </span>
                        </button>
                    {/each}
                </div>
            </div>
        </div>
    {/if}

    <div class="flex-1 overflow-y-auto min-h-0 pr-2 space-y-3">
        {#each filteredAttributes as attr}
            {@const isUnmapped = attr.name === 'unmapped'}
            {@const isRawData = attr.name === 'raw_data' || attr.name === 'raw_data_hash' || attr.name === 'raw_data_size'}
            {@const isObservables = attr.name === 'observables'}
            {@const m = mappings[attr.name]}
            {@const dm = defaultMappings[attr.name]}
            {@const isInherited = !isDefault && !m?.sourceField && m?.staticValue === undefined && dm}
            {@const effective = isInherited ? dm : m}
            {@const isObject = !!(ocsfData?.classes[attr.type])}
            {@const hasMapping = effective?.sourceField || effective?.staticValue !== undefined || isUnmapped || isRawData || isObservables}
            {@const hasMappingForObs = effective?.sourceField || effective?.staticValue !== undefined}
            {@const isEnum = !!attr.enum}
            {@const hasEnumMappings = effective?.enumMapping && Object.keys(effective.enumMapping).length > 0}
            {@const needsEnumMapping = isEnum && effective?.sourceField && !hasEnumMappings}
            {@const typeIdFromSchema = attr.observable ?? OCSF_TYPE_TO_OBSERVABLE[attr.type]}
            {@const effectiveObsId = effective?.isObservableOverride ? effective.observableTypeId : typeIdFromSchema}
            {@const displayType = getDisplayType(attr)}
            
            <div class="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden transition-all {hasMapping ? 'border-blue-500/30 shadow-lg shadow-blue-900/5' : 'hover:border-slate-700'}">
                {#if isObservables}
                    <div class="mx-4 mt-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-xl flex items-start gap-3 animate-in fade-in zoom-in duration-300">
                        <svg class="w-5 h-5 text-blue-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div class="text-[11px] text-blue-300">
                            <p class="font-bold mb-1 text-blue-200">Automated Observables</p>
                            This array is automatically populated based on other mapped fields that have the <span class="text-emerald-400 font-bold">Obs</span> badge. Expand this row to see all automatically included fields.
                        </div>
                    </div>
                {/if}
                <div class="flex flex-col lg:flex-row items-stretch lg:items-center p-3 md:p-4 gap-4">
                    <div class="flex items-center gap-3 flex-1 min-w-0">
                        <div class="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
                            <span class="{typeColors[displayType] || 'text-slate-400'} text-[10px] font-bold">{typeIcons[displayType] || '{}'}</span>
                        </div>
                        
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2 mb-0.5">
                                <span class="font-mono text-sm text-slate-200 font-bold truncate">{attr.caption}</span>
                                {#if attr.requirement === 'required'}
                                    <span class="px-1.5 py-0.5 text-[8px] uppercase font-black bg-red-900/20 text-red-500 rounded border border-red-900/30">Required</span>
                                {:else if attr.requirement === 'recommended'}
                                    <span class="px-1.5 py-0.5 text-[8px] uppercase font-black bg-blue-900/20 text-blue-500 rounded border border-blue-900/30">Recommended</span>
                                {/if}
                                
                                {#if isEnum}
                                    <span 
                                        class="px-2 py-0.5 text-[9px] uppercase font-black rounded border flex items-center gap-1 transition-all
                                        {needsEnumMapping ? 'bg-amber-900/20 text-amber-500 border-amber-900/30 animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.1)]' : 'bg-purple-900/20 text-purple-500 border-purple-900/30'}"
                                        title={needsEnumMapping ? 'Enum values must be mapped to OCSF constants' : 'OCSF Enum Attribute'}
                                    >
                                        <svg class="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                                            <path d="M4 6h16M4 12h16M4 18h16" />
                                        </svg>
                                        Enum {needsEnumMapping ? '(Mapping Required)' : ''}
                                    </span>
                                {/if}
                                 
                                 {#if effectiveObsId !== undefined}
                                    <span 
                                        class="px-2 py-0.5 text-[9px] uppercase font-black rounded border flex items-center gap-1 transition-all
                                        {effective?.isObservableOverride ? 'bg-purple-900/20 text-purple-400 border-purple-900/30' : 'bg-emerald-900/20 text-emerald-500 border-emerald-900/30'}
                                        {!hasMappingForObs ? 'opacity-40 grayscale' : ''}" 
                                        title="{effective?.isObservableOverride ? 'Manual' : 'Automated'} Observable: {getObservableTypeName(effectiveObsId)} (ID: {effectiveObsId}) {!hasMappingForObs ? '- Map this field to activate' : ''}"
                                    >
                                        <svg class="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                                            <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                        Obs
                                    </span>
                                {/if}
                            </div>
                            <div class="flex items-center gap-2">
                                <div class="text-[10px] text-slate-500 font-mono truncate">{attr.name}</div>
                                <span class="text-[9px] text-slate-600 font-bold uppercase tracking-wider">
                                    {attr.type}{attr.is_array ? '[]' : ''}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div class="flex flex-col sm:flex-row items-center gap-3">
                        {#if !isObject}
                            <div class="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
                                <button 
                                    on:click={() => setSourceType(attr.name, 'none')}
                                    class="px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all {!m?.sourceField && m?.staticValue === undefined && !isUnmapped && !isRawData && !isObservables ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'} disabled:opacity-30 disabled:cursor-not-allowed"
                                    disabled={isUnmapped || isRawData || isObservables}
                                >
                                    {isDefault ? 'None' : 'Inherit'}
                                </button>
                                <button 
                                    on:click={() => setSourceType(attr.name, 'field')}
                                    class="px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all {m?.sourceField || isUnmapped || isRawData || isObservables ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'} disabled:opacity-30 disabled:cursor-not-allowed"
                                    disabled={isUnmapped || isRawData || isObservables || isObject || getCompatibleFields(attr).length === 0}
                                    title={isUnmapped || isRawData || isObservables ? "Automatic mapping" : (isObject ? "Map child properties instead" : (getCompatibleFields(attr).length === 0 ? "No compatible fields found in source" : ""))}
                                >
                                    {isUnmapped || isRawData || isObservables ? 'Auto' : 'Field'}
                                </button>
                                <button 
                                    on:click={() => setSourceType(attr.name, 'static')}
                                    class="px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all {m?.staticValue !== undefined ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'} disabled:opacity-30 disabled:cursor-not-allowed"
                                    disabled={isUnmapped || isRawData || isObservables || isObject}
                                    title={isObject ? "Map child properties instead" : ""}
                                >
                                    Static
                                </button>
                            </div>
                        {/if}

                        <div class="w-full sm:w-80 relative">
                            {#if isUnmapped}
                                <div class="w-full bg-blue-900/20 border border-blue-800/50 text-blue-300 text-sm p-2.5 rounded-xl flex justify-between items-center">
                                    <span class="font-bold">Automatic (All Unmapped)</span>
                                    <span class="bg-blue-900/40 px-2 py-0.5 rounded text-[10px]">{unmappedSourceFields.length} fields</span>
                                </div>
                            {:else if isObservables}
                                <div class="w-full bg-blue-900/20 border border-blue-800/50 text-blue-300 text-sm p-2.5 rounded-xl flex justify-between items-center">
                                    <span class="font-bold">Automatic (Observables)</span>
                                    <span class="bg-blue-900/40 px-2 py-0.5 rounded text-[10px]">{activeObservables.length} fields</span>
                                </div>
                            {:else if isRawData}
                                <div class="w-full bg-blue-900/20 border border-blue-800/50 text-blue-300 text-sm p-2.5 rounded-xl font-bold">
                                    {#if attr.name === 'raw_data'}
                                        Automatic (Raw JSON)
                                    {:else if attr.name === 'raw_data_hash'}
                                        Automatic (Hash)
                                    {:else if attr.name === 'raw_data_size'}
                                        Automatic (Size)
                                    {/if}
                                </div>
                            {:else if effective?.sourceField}
                                <div class="space-y-1">
                                    <select 
                                        bind:value={mappings[attr.name].sourceField}
                                        on:change={handleChange}
                                        disabled={isInherited}
                                        class="w-full bg-slate-900 border border-slate-800 text-slate-200 text-sm p-2.5 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none appearance-none transition-all {isInherited ? 'opacity-50' : ''}"
                                    >
                                        <option value="">Select source field...</option>
                                        {#each groupFields(getCompatibleFields(attr)) as group}
                                            <optgroup label={group.label}>
                                                {#each group.fields as sf}
                                                    <option value={sf.name}>
                                                        {sf.name.includes('.') ? '\u00A0\u00A0'.repeat(sf.name.split('.').length - 1) + sf.name.split('.').pop() : sf.name} ({sf.type})
                                                    </option>
                                                {/each}
                                            </optgroup>
                                        {/each}
                                    </select>
                                    {#if getSourceFieldInfo(effective.sourceField)?.example !== undefined}
                                        <div class="px-2 text-[10px] text-slate-500 italic truncate" title="Example: {JSON.stringify(getSourceFieldInfo(effective.sourceField).example)}">
                                            Ex: {JSON.stringify(getSourceFieldInfo(effective.sourceField).example)}
                                        </div>
                                    {/if}
                                </div>
                            {:else if effective?.staticValue !== undefined}
                                <div class="space-y-1">
                                    {#if attr.enum}
                                        <select 
                                            bind:value={mappings[attr.name].staticValue}
                                            on:change={handleChange}
                                            disabled={isInherited}
                                            class="w-full bg-slate-900 border border-slate-800 text-slate-200 text-sm p-2.5 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none appearance-none transition-all {isInherited ? 'opacity-50' : ''}"
                                        >
                                            <option value="">Select OCSF Value...</option>
                                            {#each Object.entries(attr.enum) as [eVal, eMeta]}
                                                <option value={eVal}>{eMeta.caption} ({eVal})</option>
                                            {/each}
                                        </select>
                                        {#if effective?.staticValue && attr.enum[effective.staticValue]?.description}
                                            <div class="px-2 text-[10px] text-slate-500 italic leading-tight">
                                                {attr.enum[effective.staticValue].description}
                                            </div>
                                        {/if}
                                    {:else}
                                        <input 
                                            type="text"
                                            bind:value={mappings[attr.name].staticValue}
                                            on:input={handleChange}
                                            disabled={isInherited}
                                            placeholder="Enter static value..."
                                            class="w-full bg-slate-900 border border-slate-800 text-slate-200 text-sm p-2.5 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all {isInherited ? 'opacity-50' : ''}"
                                        />
                                    {/if}
                                </div>
                            {:else if isObject}
                                <div class="w-full bg-blue-900/10 border border-blue-800/30 text-blue-400 text-xs p-2.5 rounded-xl font-bold flex justify-between items-center">
                                    <span>Nested Object</span>
                                    <span class="text-[9px] opacity-70">Expand to map properties</span>
                                </div>
                            {:else}
                                <div class="w-full bg-slate-900/30 border border-slate-800/50 text-slate-600 text-sm p-2.5 rounded-xl italic">
                                    Not mapped
                                </div>
                            {/if}
                        </div>

                        <button 
                            on:click={() => toggleAttr(attr.name)}
                            class="p-2.5 rounded-xl transition-colors {activeAttr === attr.name ? 'bg-slate-800 text-white' : 'text-slate-600 hover:text-slate-300 hover:bg-slate-900'}"
                        >
                            <svg class="w-5 h-5 transition-transform {activeAttr === attr.name ? 'rotate-180' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                    </div>
                </div>

                {#if activeAttr === attr.name}
                    <div class="px-6 pb-6 border-t border-slate-800/50 bg-slate-900/10 animate-in slide-in-from-top-2 duration-200 pt-5 space-y-4">
                        {#if attr.description}
                            <p class="text-xs text-slate-400 italic leading-relaxed">{attr.description}</p>
                        {/if}

                        {@render observableConfig(attr.name, attr, mappings[attr.name])}

                        {#if ocsfData?.classes[attr.type]}
                            <div class="space-y-4 pt-2">
                                <div class="flex items-center justify-between">
                                    <label class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                        {attr.is_array ? 'Array of Objects' : 'Object Properties'}: {attr.caption}
                                    </label>
                                    {#if attr.is_array}
                                        <button 
                                            on:click={() => { 
                                                instanceCounts[attr.name] = (instanceCounts[attr.name] || 0) + 1; 
                                                instanceCounts = instanceCounts;
                                                handleChange(); 
                                            }}
                                            class="text-[9px] bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 px-2 py-1 rounded border border-blue-500/30 font-bold transition-all"
                                        >
                                            + Add Object Instance
                                        </button>
                                    {/if}
                                </div>

                                {#each getInstanceIndices(attr.name, attr.is_array) as idx}
                                    <div class="bg-slate-900/40 border border-slate-800/50 rounded-xl p-3 space-y-3">
                                        {#if attr.is_array}
                                            <div class="flex items-center justify-between mb-1 border-b border-slate-800/50 pb-2">
                                                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                    <span class="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                                                    Instance {idx === '' ? '(Auto-Loop / All)' : `#${idx}`}
                                                </span>
                                                {#if idx !== ''}
                                                     <button 
                                                        on:click={() => removeInstance(attr.name, idx)}
                                                        class="text-[9px] text-red-500 hover:text-red-400 font-bold uppercase tracking-tighter transition-colors"
                                                     >
                                                        Remove
                                                     </button>
                                                {/if}
                                            </div>
                                        {/if}
                                        <div class="grid grid-cols-1 gap-2">
                                            {#each Object.values(ocsfData.classes[attr.type].attributes).sort((a,b) => (a.requirement === 'required' ? -1 : 1)) as subAttr}
                                                {@const subPath = idx === null ? `${attr.name}.${subAttr.name}` : `${attr.name}[${idx}].${subAttr.name}`}
                                                {@const subM = mappings[subPath]}
                                                {@const subDm = defaultMappings[subPath]}
                                                {@const isSubInherited = !isDefault && !subM?.sourceField && subM?.staticValue === undefined && subDm}
                                                {@const subEffective = isSubInherited ? subDm : subM}
                                                {@const subTypeIdFromSchema = subAttr.observable ?? OCSF_TYPE_TO_OBSERVABLE[subAttr.type]}
                                                {@const subEffectiveObsId = subEffective?.isObservableOverride ? subEffective.observableTypeId : subTypeIdFromSchema}
                                                {@const subDisplayType = getDisplayType(subAttr)}
                                                
                                                <div class="flex flex-col py-2 border-b border-slate-800/50 last:border-0 gap-2">
                                                    <div class="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                                                        <div class="flex items-center gap-3 flex-1 min-w-0">
                                                            <div class="w-7 h-7 rounded bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0">
                                                                <span class="{typeColors[subDisplayType] || 'text-slate-400'} text-[8px] font-bold">{typeIcons[subDisplayType] || '{}'}</span>
                                                            </div>
                                                            <div class="flex-1 min-w-0">
                                                                <div class="flex items-center gap-2">
                                                                    <span class="text-[11px] font-bold text-slate-300 truncate">{subAttr.caption}</span>
                                                                    {#if subAttr.requirement === 'required'}
                                                                        <span class="text-[8px] text-red-500 font-bold uppercase">Req</span>
                                                                    {/if}
                                                                     
                                                                    {#if subEffectiveObsId !== undefined}
                                                                        <span 
                                                                            class="px-1.5 py-0.5 text-[7px] uppercase font-black rounded border flex items-center gap-1
                                                                            {subEffective?.isObservableOverride ? 'bg-purple-900/20 text-purple-400 border-purple-900/30' : 'bg-emerald-900/20 text-emerald-500 border-emerald-900/30'}
                                                                            {!subEffective?.sourceField && subEffective?.staticValue === undefined ? 'opacity-40 grayscale' : ''}" 
                                                                            title="{subEffective?.isObservableOverride ? 'Manual' : 'Automated'} Observable: {getObservableTypeName(subEffectiveObsId)} (ID: {subEffectiveObsId})"
                                                                        >
                                                                            Obs
                                                                        </span>
                                                                    {/if}
                                                                </div>
                                                                <div class="flex items-center gap-2">
                                                                    <div class="text-[9px] text-slate-500 font-mono truncate">{subAttr.name}</div>
                                                                    <span class="text-[8px] text-slate-600 font-bold uppercase tracking-wider">
                                                                        {subAttr.type}{subAttr.is_array ? '[]' : ''}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div class="flex items-center gap-2 w-full sm:w-auto">
                                                            <div class="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                                                                <button 
                                                                    on:click={() => setSourceType(subPath, 'none', subAttr)}
                                                                    class="px-2 py-1 text-[9px] font-bold rounded transition-all {!subM?.sourceField && subM?.staticValue === undefined ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}"
                                                                >
                                                                    {isDefault ? 'None' : 'Inh'}
                                                                </button>
                                                                <button 
                                                                    on:click={() => setSourceType(subPath, 'field', subAttr)}
                                                                    class="px-2 py-1 text-[9px] font-bold rounded transition-all {subM?.sourceField ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'} disabled:opacity-30"
                                                                    disabled={getCompatibleFields(subAttr).length === 0}
                                                                    title={getCompatibleFields(subAttr).length === 0 ? "No compatible fields" : ""}
                                                                >
                                                                    Field
                                                                </button>
                                                                <button 
                                                                    on:click={() => setSourceType(subPath, 'static', subAttr)}
                                                                    class="px-2 py-1 text-[9px] font-bold rounded transition-all {subM?.staticValue !== undefined ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}"
                                                                >
                                                                    Static
                                                                </button>
                                                            </div>

                                                            <div class="w-32">
                                                                {#if subEffective?.sourceField}
                                                                    <select 
                                                                        value={subM?.sourceField || ''}
                                                                        on:change={(e) => {
                                                                            if (!mappings[subPath]) mappings[subPath] = { enumMapping: {} };
                                                                            mappings[subPath].sourceField = e.currentTarget.value;
                                                                            mappings = { ...mappings };
                                                                            handleChange();
                                                                        }}
                                                                        disabled={isSubInherited}
                                                                        class="w-full bg-slate-950 border border-slate-800 text-[10px] p-1.5 rounded-lg outline-none text-slate-300 focus:ring-1 focus:ring-blue-500 {isSubInherited ? 'opacity-50' : ''}"
                                                                    >
                                                                        <option value="">Select field...</option>
                                                                        {#each groupFields(getCompatibleFields(subAttr)) as group}
                                                                            <optgroup label={group.label}>
                                                                                {#each group.fields as sf}
                                                                                    <option value={sf.name}>
                                                                                        {sf.name.includes('.') ? '\u00A0\u00A0'.repeat(sf.name.split('.').length - 1) + sf.name.split('.').pop() : sf.name}
                                                                                    </option>
                                                                                {/each}
                                                                            </optgroup>
                                                                        {/each}
                                                                    </select>
                                                                {:else if subEffective?.staticValue !== undefined}
                                                                    <input 
                                                                        type="text"
                                                                        value={subM?.staticValue || ''}
                                                                        on:input={(e) => {
                                                                            if (!mappings[subPath]) mappings[subPath] = { enumMapping: {} };
                                                                            mappings[subPath].staticValue = e.currentTarget.value;
                                                                            mappings = { ...mappings };
                                                                            handleChange();
                                                                        }}
                                                                        disabled={isSubInherited}
                                                                        placeholder="Static..."
                                                                        class="w-full bg-slate-950 border border-slate-800 text-[10px] p-1.5 rounded-lg outline-none text-slate-300 focus:ring-1 focus:ring-purple-500 {isSubInherited ? 'opacity-50' : ''}"
                                                                    />
                                                                {/if}
                                                            </div>
                                                            
                                                            {#if subEffective?.sourceField && getSourceFieldInfo(subEffective.sourceField)?.example !== undefined}
                                                                <div class="hidden lg:block text-[9px] text-slate-600 italic max-w-[80px] truncate" title="Ex: {JSON.stringify(getSourceFieldInfo(subEffective.sourceField).example)}">
                                                                    Ex: {JSON.stringify(getSourceFieldInfo(subEffective.sourceField).example)}
                                                                </div>
                                                            {/if}
                                                        </div>
                                                    </div>
                                                    {@render observableConfig(subPath, subAttr, mappings[subPath])}
                                                </div>
                                            {/each}
                                        </div>
                                    </div>
                                {/each}
                            </div>
                        {/if}

                        {#if isUnmapped}
                            <div class="space-y-3 pt-2">
                                <div class="flex items-center justify-between">
                                    <label class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Unmapped Source Fields</label>
                                    <span class="text-[10px] text-slate-600 italic">Fields automatically moved to unmapped object</span>
                                </div>
                                <div class="flex flex-wrap gap-2">
                                    {#each unmappedSourceFields as sf}
                                        <span class="px-2 py-1 bg-slate-900 text-slate-300 text-[11px] rounded-lg border border-slate-800 font-mono">{sf.name}</span>
                                    {/each}
                                    {#if unmappedSourceFields.length === 0}
                                        <div class="w-full py-4 flex items-center justify-center bg-slate-900/30 rounded-xl border border-dashed border-slate-800">
                                            <p class="text-[11px] text-slate-600 italic text-center">All source fields have been mapped to OCSF attributes.</p>
                                        </div>
                                    {/if}
                                </div>
                            </div>
                        {:else if isObservables}
                            <div class="space-y-3 pt-2">
                                <div class="flex items-center justify-between">
                                    <label class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Automated Observables</label>
                                    <span class="text-[10px] text-slate-600 italic">Fields automatically included in the observables array</span>
                                </div>
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {#each activeObservables as obs}
                                        <div class="flex items-center justify-between px-3 py-2 bg-slate-900 rounded-xl border border-slate-800">
                                            <div class="flex flex-col">
                                                <span class="text-[11px] font-bold text-slate-300">{obs.caption}</span>
                                                <span class="text-[9px] font-mono text-slate-500">{obs.name}</span>
                                            </div>
                                            <div class="flex items-center gap-2">
                                                <span class="text-[9px] px-1.5 py-0.5 bg-emerald-900/20 text-emerald-500 border border-emerald-900/30 rounded uppercase font-bold">
                                                    {getObservableTypeName(obs.typeId)}
                                                </span>
                                            </div>
                                        </div>
                                    {/each}
                                    {#if activeObservables.length === 0}
                                        <div class="col-span-full py-4 flex items-center justify-center bg-slate-900/30 rounded-xl border border-dashed border-slate-800">
                                            <p class="text-[11px] text-slate-600 italic text-center">No fields are currently mapped as observables.</p>
                                        </div>
                                    {/if}
                                </div>
                            </div>
                        {:else if effective?.sourceField}
                            {@const sf = getSourceFieldInfo(effective.sourceField)}
                            {#if sf?.type === 'enum' || attr.enum}
                                <div class="space-y-4 pt-2">
                                    <div class="flex items-center justify-between">
                                        <label class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Enum Value Mapping</label>
                                        <span class="text-[10px] text-slate-600 italic">Map source values to OCSF constants</span>
                                    </div>
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {#each (sf?.enumValues || '').split(/[,\s]+/).filter(v => v.trim() !== '') as sourceVal}
                                            {@const inheritedEnumVal = isInherited ? dm?.enumMapping[sourceVal] : ''}
                                            <div class="flex items-center gap-3 bg-slate-900/50 p-2.5 rounded-xl border border-slate-800/50">
                                                <span class="text-xs font-mono text-slate-400 w-24 truncate" title={sourceVal}>{sourceVal}</span>
                                                <svg class="w-3 h-3 text-slate-700 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5-5 5M6 7l5 5-5 5" />
                                                </svg>
                                                <div class="flex-1 space-y-1">
                                                    <select 
                                                        bind:value={mappings[attr.name].enumMapping[sourceVal]}
                                                        on:change={handleChange}
                                                        disabled={isInherited}
                                                        class="w-full bg-slate-950 border border-slate-800 text-[11px] p-2 rounded-lg outline-none text-slate-300 focus:ring-1 focus:ring-blue-500 transition-all"
                                                    >
                                                        <option value="">
                                                            {isInherited && inheritedEnumVal ? `Inherit (${inheritedEnumVal})` : '(Ignore)'}
                                                        </option>
                                                        {#if attr.enum}
                                                            {#each Object.entries(attr.enum) as [eVal, eMeta]}
                                                                <option value={eVal}>{eMeta.caption} ({eVal})</option>
                                                            {/each}
                                                        {/if}
                                                    </select>
                                                    {#if mappings[attr.name].enumMapping[sourceVal] && attr.enum?.[mappings[attr.name].enumMapping[sourceVal]]?.description}
                                                        <div class="px-1 text-[9px] text-slate-600 italic leading-tight">
                                                            {attr.enum[mappings[attr.name].enumMapping[sourceVal]].description}
                                                        </div>
                                                    {/if}
                                                </div>
                                            </div>
                                        {/each}

                                        {#if !isInherited}
                                            <div class="flex items-center gap-2 bg-slate-900/30 p-1.5 rounded-xl border border-dashed border-slate-800 focus-within:border-blue-500/50 transition-all">
                                                <input 
                                                    type="text" 
                                                    placeholder="Add source value..."
                                                    class="flex-1 bg-transparent border-none text-[11px] p-1 outline-none text-slate-400 focus:text-slate-200"
                                                    on:keydown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            const val = e.currentTarget.value.trim();
                                                            if (val && sf) {
                                                                const currentValues = (sf.enumValues || '').split(/[,\s]+/).filter(v => v.trim() !== '');
                                                                if (!currentValues.includes(val)) {
                                                                    sf.enumValues = sf.enumValues ? `${sf.enumValues}, ${val}` : val;
                                                                    schemaFields = [...schemaFields];
                                                                }
                                                                e.currentTarget.value = '';
                                                            }
                                                        }
                                                    }}
                                                />
                                                <button 
                                                    class="p-1 text-slate-500 hover:text-blue-400 transition-colors"
                                                    on:click={(e) => {
                                                        const input = e.currentTarget.previousElementSibling;
                                                        const val = input.value.trim();
                                                        if (val && sf) {
                                                            const currentValues = (sf.enumValues || '').split(/[,\s]+/).filter(v => v.trim() !== '');
                                                            if (!currentValues.includes(val)) {
                                                                sf.enumValues = sf.enumValues ? `${sf.enumValues}, ${val}` : val;
                                                                schemaFields = [...schemaFields];
                                                            }
                                                            input.value = '';
                                                        }
                                                    }}
                                                >
                                                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                                                    </svg>
                                                </button>
                                            </div>
                                        {/if}
                                    </div>
                                </div>
                            {/if}
                        {:else if isRawData}
                            <div class="flex items-center justify-center py-4 bg-slate-900/30 rounded-xl border border-dashed border-slate-800">
                                <p class="text-[11px] text-slate-500 italic">The full raw input JSON is automatically mapped to this field.</p>
                            </div>
                        {:else}
                            <div class="flex items-center justify-center py-4 bg-slate-900/30 rounded-xl border border-dashed border-slate-800">
                                <p class="text-xs text-slate-600 italic">No additional configuration required.</p>
                            </div>
                        {/if}
                    </div>
                {/if}
            </div>
        {/each}
    </div>
</div>
