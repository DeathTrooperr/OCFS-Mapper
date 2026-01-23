<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import type { SchemaField, AttributeMapping } from "$lib/scripts/types/types";
    export let schemaFields: SchemaField[];
    export let targetClass: any;
    export let title: string;
    export let mappings: Record<string, AttributeMapping>;
    export let defaultMappings: Record<string, AttributeMapping> = {};
    export let isDefault = true;

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
            if (!mappings[attrName].sourceField) mappings[attrName].sourceField = schemaFields[0]?.name || '';
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

    <div class="grid grid-cols-1 gap-3">
        {#each filteredAttributes as attr}
            {@const m = mappings[attr.name]}
            {@const dm = defaultMappings[attr.name]}
            {@const isInherited = !isDefault && !m?.sourceField && m?.staticValue === undefined && dm}
            {@const effective = isInherited ? dm : m}
            {@const hasMapping = effective?.sourceField || effective?.staticValue !== undefined}
            
            <div class="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden transition-all {hasMapping ? 'border-blue-500/30 shadow-lg shadow-blue-900/5' : 'hover:border-slate-700'}">
                <div class="flex flex-col lg:flex-row items-stretch lg:items-center p-4 gap-4">
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 mb-1">
                            <span class="font-mono text-sm text-slate-200 font-bold truncate">{attr.caption}</span>
                            {#if attr.requirement === 'required'}
                                <span class="px-1.5 py-0.5 text-[8px] uppercase font-black bg-red-900/20 text-red-500 rounded border border-red-900/30">Required</span>
                            {:else if attr.requirement === 'recommended'}
                                <span class="px-1.5 py-0.5 text-[8px] uppercase font-black bg-blue-900/20 text-blue-500 rounded border border-blue-900/30">Recommended</span>
                            {/if}
                            <span class="px-2 py-0.5 text-[9px] uppercase font-bold bg-slate-900 text-slate-500 rounded border border-slate-800">{attr.type}</span>
                        </div>
                        <div class="text-[10px] text-slate-500 font-mono truncate">{attr.name}</div>
                    </div>

                    <div class="flex flex-col sm:flex-row items-center gap-3">
                        <div class="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
                            <button 
                                on:click={() => setSourceType(attr.name, 'none')}
                                class="px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all {!m?.sourceField && m?.staticValue === undefined ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}"
                            >
                                {isDefault ? 'None' : 'Inherit'}
                            </button>
                            <button 
                                on:click={() => setSourceType(attr.name, 'field')}
                                class="px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all {m?.sourceField ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}"
                            >
                                Field
                            </button>
                            <button 
                                on:click={() => setSourceType(attr.name, 'static')}
                                class="px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all {m?.staticValue !== undefined ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}"
                            >
                                Static
                            </button>
                        </div>

                        <div class="w-full sm:w-64 relative">
                            {#if effective?.sourceField}
                                <select 
                                    bind:value={mappings[attr.name].sourceField}
                                    on:change={handleChange}
                                    disabled={isInherited}
                                    class="w-full bg-slate-900 border border-slate-800 text-slate-200 text-sm p-2.5 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none appearance-none transition-all {isInherited ? 'opacity-50' : ''}"
                                >
                                    {#each schemaFields as sf}
                                        <option value={sf.name}>{sf.name} ({sf.type})</option>
                                    {/each}
                                </select>
                            {:else if effective?.staticValue !== undefined}
                                <input 
                                    type="text"
                                    bind:value={mappings[attr.name].staticValue}
                                    on:input={handleChange}
                                    disabled={isInherited}
                                    placeholder="Enter static value..."
                                    class="w-full bg-slate-900 border border-slate-800 text-slate-200 text-sm p-2.5 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all {isInherited ? 'opacity-50' : ''}"
                                />
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

                        {#if effective?.sourceField}
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
                                    </div>
                                </div>
                            {/if}
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
