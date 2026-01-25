
<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import type { SchemaField, AttributeMapping, OCSFSchemaData } from "$lib/scripts/types/types";
    import { isTypeCompatible, groupFields } from "$lib/scripts/pages/home/mapping-utils";
    import { OBSERVABLE_TYPE_NAMES } from "$lib/sdk/observables";

    export let attr: any;
    export let path: string;
    export let schemaFields: SchemaField[];
    export let mappings: Record<string, AttributeMapping>;
    export let defaultMappings: Record<string, AttributeMapping> = {};
    export let isDefault = true;
    export let ocsfData: OCSFSchemaData | undefined = undefined;
    export let level = 0;
    export let instanceCounts: Record<string, number> = {};

    let expanded = false;
    const dispatch = createEventDispatcher();

    $: m = mappings[path];
    $: dm = defaultMappings[path];
    $: isInherited = !isDefault && !m?.sourceField && m?.staticValue === undefined && dm;
    
    $: enumOptions = attr.enum ? Object.keys(attr.enum) : [];
    $: isSingleEnum = enumOptions.length === 1;

    $: effectiveMapping = (() => {
        const base = isInherited ? dm : m;
        let typeId = undefined;
        let isFromSource = false;
        
        if (base?.sourceField) {
            const sf = schemaFields.find(f => f.name === base.sourceField);
            if (sf?.isObservable) {
                typeId = sf.observableTypeId;
                isFromSource = true;
            }
        }

        if (!base?.sourceField && base?.staticValue === undefined && isSingleEnum) {
            return {
                staticValue: enumOptions[0],
                isLocked: true,
                typeId,
                isFromSource
            };
        }
        
        return {
            ...base,
            typeId,
            isFromSource
        };
    })();

    $: isObject = !!(ocsfData?.classes[attr.type]);
    $: subAttributes = isObject && expanded && ocsfData ? Object.values(ocsfData.classes[attr.type].attributes).sort((a: any, b: any) => (a.requirement === 'required' ? -1 : 1)) : [];
    $: indices = getInstanceIndices(path, attr.is_array, mappings, instanceCounts);

    $: isUnmapped = path === 'unmapped';
    $: isRawData = path === 'raw_data' || path === 'raw_data_hash' || path === 'raw_data_size';
    $: isObservables = path === 'observables';
    
    $: hasMapping = effectiveMapping?.sourceField || effectiveMapping?.staticValue !== undefined || isUnmapped || isRawData || isObservables;
    $: isEnum = !!attr.enum;
    $: hasEnumMappings = effectiveMapping?.enumMapping && Object.keys(effectiveMapping.enumMapping).length > 0;
    $: needsEnumMapping = isEnum && effectiveMapping?.sourceField && !hasEnumMappings;

    function handleChange() {
        dispatch('change');
    }

    function setSourceType(type: 'none' | 'field' | 'static') {
        if (!mappings[path]) mappings[path] = { enumMapping: {} };
        
        if (type === 'none') {
            delete mappings[path].sourceField;
            delete mappings[path].staticValue;
        } else if (type === 'field') {
            delete mappings[path].staticValue;
            if (!mappings[path].sourceField) {
                const compatible = getCompatibleFields(attr);
                mappings[path].sourceField = compatible[0]?.name || '';
            }
        } else if (type === 'static') {
            delete mappings[path].sourceField;
            if (mappings[path].staticValue === undefined) mappings[path].staticValue = '';
        }
        mappings = { ...mappings };
        handleChange();
    }

    $: getSourceFieldInfo = (fieldName: string) => schemaFields.find(f => f.name === fieldName);
    $: getCompatibleFields = (a: any) => schemaFields.filter(sf => isTypeCompatible(a, sf));

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

    function getDisplayType(a: any) {
        if (a.enum) return 'enum';
        if (a.type === 'integer_t' || a.type === 'long_t' || a.type === 'float_t' || a.type === 'double_t' || a.type === 'timestamp_t') return 'number';
        if (a.type === 'boolean_t') return 'boolean';
        if (ocsfData?.classes[a.type]) return 'object';
        if (a.is_array) return 'array';
        return 'string';
    }

    $: displayType = getDisplayType(attr);

    function toggleExpand() {
        expanded = !expanded;
    }

    function getInstanceIndices(attrName: string, isArray: boolean, _mappings: any, _counts: any) {
        if (!isArray) return [null];
        const mappedIndices = new Set<string>();
        Object.keys(_mappings).forEach(k => {
            if (k.startsWith(`${attrName}[`)) {
                const escapedName = attrName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const match = k.match(new RegExp(`^${escapedName}\\[(\\d*)\\]`));
                if (match) mappedIndices.add(match[1]);
            }
        });
        const idxList: (string | null)[] = Array.from(mappedIndices).sort((a, b) => {
            if (a === '') return -1;
            if (b === '') return 1;
            return parseInt(a) - parseInt(b);
        });
        if (idxList.length === 0) idxList.push('');
        const count = _counts[attrName] || 0;
        let found = 0; let i = 0;
        while (found < count) {
            if (!idxList.includes(String(i))) { idxList.push(String(i)); found++; }
            i++; if (i > 20) break; 
        }
        return idxList.sort((a, b) => {
            if (a === null || b === null) return 0;
            if (a === '') return -1;
            if (b === '') return 1;
            return parseInt(a) - parseInt(b);
        });
    }

    function removeInstance(attrName: string, idx: string) {
        const prefix = `${attrName}[${idx}]`;
        Object.keys(mappings).forEach(k => { if (k.startsWith(prefix)) delete mappings[k]; });
        mappings = { ...mappings };
        if (instanceCounts[attrName] > 0) { instanceCounts[attrName]--; instanceCounts = instanceCounts; }
        handleChange();
    }
</script>

<div class="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden transition-all {hasMapping ? 'border-blue-500/30 shadow-lg shadow-blue-900/5' : 'hover:border-slate-700'} {level > 0 ? 'ml-4 md:ml-6 mt-2' : ''}">
    <div class="flex flex-col lg:flex-row items-stretch lg:items-center p-3 md:p-4 gap-3 md:gap-4">
        <div class="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
            <div class="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
                <span class="{typeColors[displayType] || 'text-slate-400'} text-[9px] md:text-[10px] font-bold">{typeIcons[displayType] || '{}'}</span>
            </div>
            
            <div class="flex-1 min-w-0">
                <div class="flex flex-wrap items-center gap-1.5 md:gap-2 mb-0.5">
                    <span class="font-mono text-xs md:text-sm text-slate-200 font-bold truncate">{attr.caption}</span>
                    {#if attr.requirement === 'required'}
                        <span class="px-1.5 py-0.5 text-[7px] md:text-[8px] uppercase font-black bg-red-900/20 text-red-500 rounded border border-red-900/30">Req</span>
                    {:else if attr.requirement === 'recommended'}
                        <span class="px-1.5 py-0.5 text-[7px] md:text-[8px] uppercase font-black bg-blue-900/20 text-blue-500 rounded border border-blue-900/30">Rec</span>
                    {/if}
                    
                    {#if isEnum}
                        <span class="px-1.5 py-0.5 text-[7px] md:text-[9px] uppercase font-black rounded border flex items-center gap-1 transition-all {needsEnumMapping ? 'bg-amber-900/20 text-amber-500 border-amber-900/30 animate-pulse' : 'bg-purple-900/20 text-purple-500 border-purple-900/30'}" title={needsEnumMapping ? 'Enum values must be mapped to OCSF constants' : 'OCSF Enum Attribute'}>
                            <svg class="w-2 md:w-2.5 h-2 md:h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
                            <span class="hidden xs:inline">Enum</span> {needsEnumMapping ? '(!)' : ''}
                        </span>
                    {/if}
                </div>
                <div class="flex items-center gap-2">
                    <div class="text-[9px] md:text-[10px] text-slate-500 font-mono truncate">{path}</div>
                    <span class="text-[8px] md:text-[9px] text-slate-600 font-bold uppercase tracking-wider">{attr.type}{attr.is_array ? '[]' : ''}</span>
                </div>
            </div>
        </div>

        <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 md:gap-3">
            {#if !isUnmapped && !isRawData && !isObservables}
                <div class="flex bg-slate-900 p-1 rounded-xl border border-slate-800 shrink-0">
                    <button on:click={() => setSourceType('none')} class="flex-1 sm:flex-none px-2.5 md:px-3 py-1 md:py-1.5 text-[9px] md:text-[10px] font-bold rounded-lg transition-all {!m?.sourceField && m?.staticValue === undefined ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}">{isDefault ? 'None' : 'Inherit'}</button>
                    <button on:click={() => setSourceType('field')} class="flex-1 sm:flex-none px-2.5 md:px-3 py-1 md:py-1.5 text-[9px] md:text-[10px] font-bold rounded-lg transition-all {m?.sourceField ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}" disabled={getCompatibleFields(attr).length === 0}>Field</button>
                    <button on:click={() => setSourceType('static')} class="flex-1 sm:flex-none px-2.5 md:px-3 py-1 md:py-1.5 text-[9px] md:text-[10px] font-bold rounded-lg transition-all {m?.staticValue !== undefined ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}" disabled={effectiveMapping?.isLocked}>Static</button>
                </div>
            {/if}

            <div class="w-full sm:w-64 md:w-80 relative shrink-0">
                {#if isUnmapped}
                    <div class="w-full bg-blue-900/20 border border-blue-800/50 text-blue-300 text-sm p-2.5 rounded-xl font-bold">Automatic (All Unmapped)</div>
                {:else if isObservables}
                    <div class="w-full bg-blue-900/20 border border-blue-800/50 text-blue-300 text-sm p-2.5 rounded-xl font-bold">Automatic (Observables)</div>
                {:else if isRawData}
                    <div class="w-full bg-blue-900/20 border border-blue-800/50 text-blue-300 text-sm p-2.5 rounded-xl font-bold">Automatic (Raw Data)</div>
                {:else if effectiveMapping?.sourceField}
                    <select bind:value={mappings[path].sourceField} on:change={handleChange} disabled={isInherited} class="w-full bg-slate-900 border border-slate-800 text-slate-200 text-sm p-2.5 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none appearance-none transition-all {isInherited ? 'opacity-50' : ''}">
                        <option value="">Select source field...</option>
                        {#each groupFields(getCompatibleFields(attr)) as group}
                            <optgroup label={group.label}>
                                {#each group.fields as sf}<option value={sf.name}>{sf.name} ({sf.type})</option>{/each}
                            </optgroup>
                        {/each}
                    </select>
                {:else if effectiveMapping?.staticValue !== undefined}
                    <div class="space-y-1">
                        {#if attr.enum}
                            <select 
                                value={effectiveMapping.staticValue} 
                                on:change={(e) => { 
                                    if (!effectiveMapping.isLocked && !isInherited) { 
                                        if (!mappings[path]) mappings[path] = { enumMapping: {} };
                                        mappings[path].staticValue = e.currentTarget.value; 
                                        mappings = { ...mappings };
                                        handleChange(); 
                                    } 
                                }} 
                                disabled={isInherited || effectiveMapping?.isLocked} 
                                class="w-full bg-slate-900 border border-slate-800 text-slate-200 text-sm p-2.5 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none appearance-none transition-all {isInherited || effectiveMapping?.isLocked ? 'opacity-50' : ''}"
                            >
                                {#if !effectiveMapping?.isLocked}<option value="">Select OCSF Value...</option>{/if}
                                {#each Object.entries(attr.enum) as [eVal, eMeta]}<option value={eVal}>{eMeta.caption} ({eVal})</option>{/each}
                            </select>
                            {#if effectiveMapping?.isLocked}<div class="px-2 text-[9px] text-blue-500 font-bold uppercase tracking-tighter">Locked: Single OCSF option</div>{/if}
                        {:else}
                            <input 
                                type="text" 
                                value={mappings[path]?.staticValue || ''} 
                                on:input={(e) => {
                                    if (!isInherited) {
                                        if (!mappings[path]) mappings[path] = { enumMapping: {} };
                                        mappings[path].staticValue = e.currentTarget.value;
                                        handleChange();
                                    }
                                }}
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
                    <div class="w-full bg-slate-900/30 border border-slate-800/50 text-slate-600 text-sm p-2.5 rounded-xl italic">Not mapped</div>
                {/if}
            </div>

            <button on:click={toggleExpand} class="p-2.5 rounded-xl transition-colors {expanded ? 'bg-slate-800 text-white' : 'text-slate-600 hover:text-slate-300 hover:bg-slate-900'}">
                <svg class="w-5 h-5 transition-transform {expanded ? 'rotate-180' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
            </button>
        </div>
    </div>

    {#if expanded}
        <div class="px-4 md:px-6 pb-4 md:pb-6 border-t border-slate-800/50 bg-slate-900/10 animate-in slide-in-from-top-2 duration-200 pt-5 space-y-4">
            {#if attr.description}<p class="text-xs text-slate-400 italic leading-relaxed">{attr.description}</p>{/if}

            {#if effectiveMapping?.sourceField}
                {@const sf = getSourceFieldInfo(effectiveMapping.sourceField)}
                {#if (sf?.type === 'enum' || attr.enum) && (sf?.enumValues || '').split(/[,\s]+/).filter(v => v.trim() !== '').length > 0}
                    <div class="space-y-4 pt-2">
                        <div class="flex items-center justify-between">
                            <label class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Enum Value Mapping</label>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {#each (sf?.enumValues || '').split(/[,\s]+/).filter(v => v.trim() !== '') as sourceVal (sourceVal)}
                                {@const inheritedEnumVal = isInherited ? dm?.enumMapping?.[sourceVal] : ''}
                                <div class="flex items-center gap-3 bg-slate-900/50 p-2.5 rounded-xl border border-slate-800/50">
                                    <span class="text-xs font-mono text-slate-400 w-24 truncate" title={sourceVal}>{sourceVal}</span>
                                    <svg class="w-3 h-3 text-slate-700 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5-5 5M6 7l5 5-5 5" /></svg>
                                    <div class="flex-1">
                                        <select bind:value={mappings[path].enumMapping[sourceVal]} on:change={handleChange} disabled={isInherited} class="w-full bg-slate-950 border border-slate-800 text-[11px] p-2 rounded-lg outline-none text-slate-300 focus:ring-1 focus:ring-blue-500 transition-all">
                                            <option value="">{isInherited && inheritedEnumVal ? `Inherit (${inheritedEnumVal})` : '(Ignore)'}</option>
                                            {#if attr.enum}{#each Object.entries(attr.enum) as [eVal, eMeta]}<option value={eVal}>{eMeta.caption} ({eVal})</option>{/each}{/if}
                                        </select>
                                    </div>
                                </div>
                            {/each}
                        </div>
                    </div>
                {/if}
            {/if}

            {#if isObject}
                <div class="space-y-4 pt-2">
                    <div class="flex items-center justify-between">
                        <label class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{attr.is_array ? 'Array Instances' : 'Object Properties'}</label>
                        {#if attr.is_array}
                            <button on:click={() => { instanceCounts[path] = (instanceCounts[path] || 0) + 1; instanceCounts = instanceCounts; handleChange(); }} class="text-[9px] bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 px-2 py-1 rounded border border-blue-500/30 font-bold transition-all">+ Add Instance</button>
                        {/if}
                    </div>
                    {#each indices as idx (idx)}
                        <div class="bg-slate-900/40 border border-slate-800/50 rounded-xl p-3 space-y-3">
                            {#if attr.is_array}
                                <div class="flex items-center justify-between mb-1 border-b border-slate-800/50 pb-2">
                                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">Instance {idx === '' ? '(Auto-Loop)' : `#${idx}`}</span>
                                    {#if idx !== '' && idx !== null}<button on:click={() => removeInstance(path, idx)} class="text-[9px] text-red-500 hover:text-red-400 font-bold uppercase tracking-tighter transition-colors">Remove</button>{/if}
                                </div>
                            {/if}
                            <div class="space-y-2">
                                {#each subAttributes as subAttr (subAttr.name)}
                                    <svelte:self attr={subAttr} path={idx === null ? `${path}.${subAttr.name}` : `${path}[${idx}].${subAttr.name}`} {schemaFields} {mappings} {defaultMappings} {isDefault} {ocsfData} {instanceCounts} level={level + 1} on:change />
                                {/each}
                            </div>
                        </div>
                    {/each}
                </div>
            {/if}
        </div>
    {/if}
</div>
