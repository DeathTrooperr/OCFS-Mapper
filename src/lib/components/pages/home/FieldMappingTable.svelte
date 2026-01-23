<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import type { SchemaField, AttributeMapping, OCSFSchemaData } from "$lib/scripts/types/types";
    import { isTypeCompatible, getTsType } from "$lib/scripts/pages/home/mapping-utils";
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

    function toggleAttr(name: string) {
        activeAttr = activeAttr === name ? null : name;
    }

    function handleChange() {
        dispatch('change');
    }

    function setSourceType(attrName: string, type: 'none' | 'field' | 'static') {
        if (!mappings[attrName]) mappings[attrName] = { enumMapping: {} };
        
        if (type === 'none') {
            delete mappings[attrName].sourceField;
            delete mappings[attrName].staticValue;
        } else if (type === 'field') {
            delete mappings[attrName].staticValue;
            if (!mappings[attrName].sourceField) {
                const attr = targetClass?.attributes[attrName];
                const compatible = getCompatibleFields(attr);
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
        .filter((a: any) => 
            a.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
            a.caption.toLowerCase().includes(searchQuery.toLowerCase())
        )
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
        if (!ocsfData?.types) return `ID: ${typeId}`;
        const typeEntry = Object.entries(ocsfData.types).find(([_, t]) => (t as any).observable === typeId);
        return typeEntry ? (typeEntry[1] as any).caption : `ID: ${typeId}`;
    };

    $: allMappings = isDefault ? mappings : { ...defaultMappings, ...mappings };
    $: mappedSourceFields = new Set(Object.values(allMappings).map(m => m.sourceField).filter(Boolean));
    
    $: activeObservables = targetClass ? Object.values(targetClass.attributes)
        .map((attr: any) => {
            const m = getEffectiveMapping(attr.name);
            const hasMapping = m?.sourceField || m?.staticValue !== undefined;
            if (!hasMapping) return null;
            
            const isOverridden = m?.isObservableOverride;
            const typeId = isOverridden ? m.observableTypeId : attr.observable;
            
            if (typeId === undefined || typeId === null) return null;
            
            return {
                name: attr.name,
                caption: attr.caption,
                typeId,
                isOverridden
            };
        })
        .filter(Boolean) : [];

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
</script>

<div class="space-y-4">
    <div class="flex flex-col md:flex-row md:items-center justify-between mb-4 px-2 gap-4">
        <h3 class="text-lg font-bold text-white flex items-center gap-3">
            <span class="w-1.5 h-6 bg-blue-500 rounded-full"></span>
            {title}
        </h3>
        <div class="relative w-full md:w-64">
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
        <div class="mb-6 px-2 animate-in fade-in slide-in-from-top-2 duration-300">
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

    <div class="grid grid-cols-1 gap-3">
        {#each filteredAttributes as attr}
            {@const isUnmapped = attr.name === 'unmapped'}
            {@const isRawData = attr.name === 'raw_data'}
            {@const m = mappings[attr.name]}
            {@const dm = defaultMappings[attr.name]}
            {@const isInherited = !isDefault && !m?.sourceField && m?.staticValue === undefined && dm}
            {@const effective = isInherited ? dm : m}
            {@const hasMapping = effective?.sourceField || effective?.staticValue !== undefined || isUnmapped || isRawData}
            {@const effectiveObservable = effective?.isObservableOverride ? effective.observableTypeId : attr.observable}
            {@const hasMappingForObs = effective?.sourceField || effective?.staticValue !== undefined}
            
            <div class="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden transition-all {hasMapping ? 'border-blue-500/30 shadow-lg shadow-blue-900/5' : 'hover:border-slate-700'}">
                {#if attr.name === 'observables'}
                    <div class="mx-4 mt-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-xl flex items-start gap-3 animate-in fade-in zoom-in duration-300">
                        <svg class="w-5 h-5 text-blue-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div class="text-[11px] text-blue-300">
                            <p class="font-bold mb-1 text-blue-200">Automated Observables</p>
                            This array is automatically populated based on other mapped fields that have the <span class="text-emerald-400 font-bold">Obs</span> badge. Manual mapping here will be merged with the automated results.
                        </div>
                    </div>
                {/if}
                <div class="flex flex-col lg:flex-row items-stretch lg:items-center p-4 gap-4">
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 mb-1">
                            <span class="font-mono text-sm text-slate-200 font-bold truncate">{attr.caption}</span>
                            {#if attr.requirement === 'required'}
                                <span class="px-1.5 py-0.5 text-[8px] uppercase font-black bg-red-900/20 text-red-500 rounded border border-red-900/30">Required</span>
                            {:else if attr.requirement === 'recommended'}
                                <span class="px-1.5 py-0.5 text-[8px] uppercase font-black bg-blue-900/20 text-blue-500 rounded border border-blue-900/30">Recommended</span>
                            {/if}
                            <span class="px-2 py-0.5 text-[9px] uppercase font-bold bg-slate-900 text-slate-500 rounded border border-slate-800">
                                {attr.type}{attr.is_array ? '[]' : ''}
                                {#if attr.enum} (Enum){/if}
                            </span>
                            
                            {#if effectiveObservable !== undefined}
                                <span 
                                    class="px-2 py-0.5 text-[9px] uppercase font-black rounded border flex items-center gap-1 transition-all
                                    {effective?.isObservableOverride ? 'bg-purple-900/20 text-purple-400 border-purple-900/30' : 'bg-emerald-900/20 text-emerald-500 border-emerald-900/30'}
                                    {!hasMappingForObs ? 'opacity-40 grayscale' : ''}" 
                                    title="{effective?.isObservableOverride ? 'Manual' : 'Automated'} Observable: {getObservableTypeName(effectiveObservable)} (ID: {effectiveObservable}) {!hasMappingForObs ? '- Map this field to activate' : ''}"
                                >
                                    <svg class="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                                        <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                    Obs
                                </span>
                            {/if}
                        </div>
                        <div class="text-[10px] text-slate-500 font-mono truncate">{attr.name}</div>
                    </div>

                    <div class="flex flex-col sm:flex-row items-center gap-3">
                        <div class="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
                            <button 
                                on:click={() => setSourceType(attr.name, 'none')}
                                class="px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all {!m?.sourceField && m?.staticValue === undefined && !isUnmapped && !isRawData ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'} disabled:opacity-30 disabled:cursor-not-allowed"
                                disabled={isUnmapped || isRawData}
                            >
                                {isDefault ? 'None' : 'Inherit'}
                            </button>
                            <button 
                                on:click={() => setSourceType(attr.name, 'field')}
                                class="px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all {m?.sourceField || isUnmapped || isRawData ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'} disabled:opacity-30 disabled:cursor-not-allowed"
                                disabled={isUnmapped || isRawData || getCompatibleFields(attr).length === 0}
                                title={isUnmapped || isRawData ? "Automatic mapping" : (getCompatibleFields(attr).length === 0 ? "No compatible fields found in source" : "")}
                            >
                                {isUnmapped || isRawData ? 'Auto' : 'Field'}
                            </button>
                            <button 
                                on:click={() => setSourceType(attr.name, 'static')}
                                class="px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all {m?.staticValue !== undefined ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'} disabled:opacity-30 disabled:cursor-not-allowed"
                                disabled={isUnmapped || isRawData}
                            >
                                Static
                            </button>
                        </div>

                        <div class="w-full sm:w-64 relative">
                            {#if isUnmapped}
                                <div class="w-full bg-blue-900/20 border border-blue-800/50 text-blue-300 text-sm p-2.5 rounded-xl flex justify-between items-center">
                                    <span class="font-bold">Automatic (All Unmapped)</span>
                                    <span class="bg-blue-900/40 px-2 py-0.5 rounded text-[10px]">{unmappedSourceFields.length} fields</span>
                                </div>
                            {:else if isRawData}
                                <div class="w-full bg-blue-900/20 border border-blue-800/50 text-blue-300 text-sm p-2.5 rounded-xl font-bold">
                                    Automatic (Raw JSON)
                                </div>
                            {:else if effective?.sourceField}
                                <select 
                                    bind:value={mappings[attr.name].sourceField}
                                    on:change={handleChange}
                                    disabled={isInherited}
                                    class="w-full bg-slate-900 border border-slate-800 text-slate-200 text-sm p-2.5 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none appearance-none transition-all {isInherited ? 'opacity-50' : ''}"
                                >
                                    {#each getCompatibleFields(attr) as sf}
                                        <option value={sf.name}>{sf.name} ({sf.type})</option>
                                    {/each}
                                </select>
                            {:else if effective?.staticValue !== undefined}
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

                        {#if attr.observable !== undefined || mappings[attr.name]?.isObservableOverride}
                            <div class="space-y-3 pt-2">
                                <div class="flex items-center justify-between">
                                    <label class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Observable Configuration</label>
                                    <label class="flex items-center gap-2 cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            checked={mappings[attr.name]?.isObservableOverride || false}
                                            on:change={(e) => {
                                                if (!mappings[attr.name]) mappings[attr.name] = { enumMapping: {} };
                                                mappings[attr.name].isObservableOverride = e.currentTarget.checked;
                                                if (e.currentTarget.checked && mappings[attr.name].observableTypeId === undefined) {
                                                    mappings[attr.name].observableTypeId = attr.observable;
                                                }
                                                mappings = { ...mappings };
                                                handleChange();
                                            }}
                                            class="w-3.5 h-3.5 rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span class="text-[10px] text-slate-400">Override Automated Observable</span>
                                    </label>
                                </div>
                                <div class="flex items-center gap-3 bg-slate-900/50 p-3 rounded-xl border border-slate-800/50">
                                    <div class="flex-1">
                                        <div class="text-[10px] text-slate-500 mb-1">Observable Type</div>
                                        <select 
                                            value={mappings[attr.name]?.observableTypeId}
                                            on:change={(e) => {
                                                if (!mappings[attr.name]) mappings[attr.name] = { enumMapping: {} };
                                                mappings[attr.name].observableTypeId = e.currentTarget.value ? Number(e.currentTarget.value) : undefined;
                                                mappings = { ...mappings };
                                                handleChange();
                                            }}
                                            disabled={!mappings[attr.name]?.isObservableOverride}
                                            class="w-full bg-slate-950 border border-slate-800 text-xs p-2 rounded-lg outline-none text-slate-300 focus:ring-1 focus:ring-blue-500 transition-all disabled:opacity-50"
                                        >
                                            <option value="">Disabled / None</option>
                                            {#if ocsfData?.types}
                                                {#each Object.entries(ocsfData.types).filter(([_, t]) => t.observable !== undefined).sort((a,b) => a[1].caption.localeCompare(b[1].caption)) as [tName, tInfo]}
                                                    <option value={tInfo.observable}>{tInfo.caption} ({tInfo.observable})</option>
                                                {/each}
                                            {:else if attr.observable !== undefined}
                                                 <option value={attr.observable}>Default ({attr.observable})</option>
                                            {/if}
                                            <option value={99}>Other (99)</option>
                                            <option value={0}>Unknown (0)</option>
                                        </select>
                                    </div>
                                    <div class="bg-slate-950 px-4 py-2 rounded-lg border border-slate-800">
                                        <div class="text-[9px] text-slate-600 uppercase font-bold mb-1">Status</div>
                                        <div class="text-[11px] font-mono {(mappings[attr.name]?.isObservableOverride ? (mappings[attr.name]?.observableTypeId !== undefined) : (attr.observable !== undefined)) ? 'text-emerald-500' : 'text-slate-500'}">
                                            {(mappings[attr.name]?.isObservableOverride ? (mappings[attr.name]?.observableTypeId !== undefined ? 'Overridden' : 'Disabled') : (attr.observable !== undefined ? 'Automated' : 'None'))}
                                        </div>
                                    </div>
                                </div>
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
                                                <select 
                                                    bind:value={mappings[attr.name].enumMapping[sourceVal]}
                                                    on:change={handleChange}
                                                    disabled={isInherited}
                                                    class="flex-1 bg-slate-950 border border-slate-800 text-[11px] p-2 rounded-lg outline-none text-slate-300 focus:ring-1 focus:ring-blue-500 transition-all"
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
