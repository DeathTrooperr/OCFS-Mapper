<script lang="ts">
    import FieldMappingTable from "./FieldMappingTable.svelte";
    import type { DeterminingField, SchemaField, AttributeMapping } from "$lib/scripts/types/types";
    
    export let data: any;
    export let schemaFields: SchemaField[];
    export let useConditionalClass: boolean;
    export let classDeterminingFields: DeterminingField[];
    export let mappings: Record<string, AttributeMapping>;
    export let selectedCategory: string;
    export let selectedClass: string;
    export let activeMappingIndex: { fieldIdx: number, mappingIdx: number } | 'default';

    $: ocsfCategories = Object.values(data.ocsf.categories).sort((a: any, b: any) => a.caption.localeCompare(b.caption));
    $: filteredClasses = (cat: string) => Object.values(data.ocsf.classes).filter((c: any) => c.category === cat || (cat === 'other' && c.name === 'base_event'));
    
    $: currentMappings = activeMappingIndex === 'default' 
        ? mappings 
        : classDeterminingFields[activeMappingIndex.fieldIdx]?.mappings[activeMappingIndex.mappingIdx]?.mappings || {};

    $: currentClass = activeMappingIndex === 'default'
        ? data.ocsf.classes[selectedClass]
        : (typeof activeMappingIndex === 'object' ? data.ocsf.classes[classDeterminingFields[activeMappingIndex.fieldIdx]?.mappings[activeMappingIndex.mappingIdx]?.selectedClass] : undefined);

    $: if (!useConditionalClass && activeMappingIndex !== 'default') {
        activeMappingIndex = 'default';
    }

    function addDeterminingField() {
        classDeterminingFields = [...classDeterminingFields, { name: '', mappings: [] }];
    }

    function removeDeterminingField(idx: number) {
        classDeterminingFields = classDeterminingFields.filter((_, i) => i !== idx);
        if (typeof activeMappingIndex === 'object') {
            if (activeMappingIndex.fieldIdx === idx) {
                activeMappingIndex = 'default';
            } else if (activeMappingIndex.fieldIdx > idx) {
                activeMappingIndex = { ...activeMappingIndex, fieldIdx: activeMappingIndex.fieldIdx - 1 };
            }
        }
    }

    function addMapping(fieldIdx: number) {
        const newMapping = { 
            enumValue: '', 
            selectedCategory: '', 
            selectedClass: '',
            mappings: {}
        };
        classDeterminingFields[fieldIdx].mappings = [...classDeterminingFields[fieldIdx].mappings, newMapping];
        classDeterminingFields = [...classDeterminingFields];
        activeMappingIndex = { fieldIdx, mappingIdx: classDeterminingFields[fieldIdx].mappings.length - 1 };
    }

    function removeMapping(fieldIdx: number, mappingIdx: number) {
        const isActive = typeof activeMappingIndex === 'object' && activeMappingIndex.fieldIdx === fieldIdx && activeMappingIndex.mappingIdx === mappingIdx;
        
        classDeterminingFields[fieldIdx].mappings = classDeterminingFields[fieldIdx].mappings.filter((_, j) => mappingIdx !== j);
        classDeterminingFields = [...classDeterminingFields];

        if (isActive) {
            activeMappingIndex = 'default';
        } else if (typeof activeMappingIndex === 'object' && activeMappingIndex.fieldIdx === fieldIdx && activeMappingIndex.mappingIdx > mappingIdx) {
            activeMappingIndex = { ...activeMappingIndex, mappingIdx: activeMappingIndex.mappingIdx - 1 };
        }
    }

    function handleMappingChange() {
        if (activeMappingIndex === 'default') {
            mappings = { ...mappings };
        } else {
            classDeterminingFields = [...classDeterminingFields];
        }
    }
</script>

<div class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <section class="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div class="px-8 py-6 border-b border-slate-800 bg-slate-900/50 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
                <h2 class="text-xl font-bold text-white">Select OCSF Target</h2>
                <p class="text-slate-400 text-sm mt-1">Define which OCSF class(es) to map your data to.</p>
            </div>
            <label class="flex items-center gap-3 cursor-pointer group bg-slate-800/30 px-4 py-2 rounded-xl border border-slate-700 hover:border-blue-500/50 transition-all">
                <input type="checkbox" bind:checked={useConditionalClass} class="w-5 h-5 rounded border-slate-600 bg-slate-950 text-blue-600 focus:ring-blue-500" />
                <span class="text-sm font-bold text-slate-300 group-hover:text-white">Conditional Mapping</span>
            </label>
        </div>

        <div class="p-8 space-y-8">
            {#if useConditionalClass}
                <div class="space-y-6">
                    <div class="bg-blue-900/10 border border-blue-500/20 p-6 rounded-2xl space-y-4">
                        <div class="flex items-center justify-between">
                            <h3 class="text-sm font-bold text-blue-400 uppercase tracking-widest">Determining Fields</h3>
                            <button on:click={addDeterminingField} class="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg font-bold transition-all shadow-lg shadow-blue-900/20">
                                + Add Field
                            </button>
                        </div>
                        
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {#each classDeterminingFields as field, idx}
                                <div class="flex gap-2">
                                    <div class="flex-1 relative">
                                        <select bind:value={field.name} class="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-sm text-slate-300 focus:ring-1 focus:ring-blue-500 outline-none appearance-none">
                                            <option value="">Select Field...</option>
                                            {#each schemaFields.filter(f => ['enum', 'string', 'number', 'boolean'].includes(f.type)) as sField}
                                                <option value={sField.name}>{sField.name}</option>
                                            {/each}
                                        </select>
                                    </div>
                                    <button on:click={() => removeDeterminingField(idx)} class="p-2.5 text-red-500 hover:bg-red-500/10 rounded-xl transition-colors">
                                        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            {/each}
                        </div>
                    </div>

                    {#each classDeterminingFields as field, fieldIdx}
                        {#if field.name}
                            <div class="space-y-4">
                                <div class="flex items-center justify-between px-2">
                                    <div class="flex items-center gap-3">
                                        <span class="text-[10px] bg-blue-900/30 text-blue-400 px-2 py-0.5 rounded font-bold uppercase tracking-widest">Field</span>
                                        <span class="text-white font-bold">{field.name} Mappings</span>
                                    </div>
                                    <button on:click={() => addMapping(fieldIdx)} class="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg font-bold transition-all border border-slate-700">
                                        + Add Value Mapping
                                    </button>
                                </div>

                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {#each field.mappings as mapping, mappingIdx}
                                        {@const determiningField = schemaFields.find(f => f.name === field.name)}
                                        <div class="bg-slate-950 border border-slate-800 p-5 rounded-2xl relative group hover:border-blue-500/30 transition-all { (typeof activeMappingIndex === 'object' && activeMappingIndex.fieldIdx === fieldIdx && activeMappingIndex.mappingIdx === mappingIdx) ? 'ring-2 ring-blue-500 shadow-xl shadow-blue-900/10' : ''}">
                                            <button on:click={() => removeMapping(fieldIdx, mappingIdx)} class="absolute -top-2 -right-2 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-lg">
                                                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                            
                                            <div class="space-y-4">
                                                <div>
                                                    <label class="text-[9px] font-bold text-slate-600 uppercase tracking-widest block mb-1.5">Value</label>
                                                    {#if determiningField?.type === 'enum' && determiningField.enumValues}
                                                        <select bind:value={mapping.enumValue} class="w-full bg-slate-900 border border-slate-800 text-xs p-2 rounded-lg outline-none text-slate-300">
                                                            <option value="">Select Value...</option>
                                                            {#each determiningField.enumValues.split(/[,\s]+/).filter(v => v.trim() !== '') as val}
                                                                <option value={val}>{val}</option>
                                                            {/each}
                                                        </select>
                                                    {:else}
                                                        <input type="text" bind:value={mapping.enumValue} class="w-full bg-slate-900 border border-slate-800 text-xs p-2 rounded-lg outline-none text-slate-300" placeholder="Source Value" />
                                                    {/if}
                                                </div>

                                                <div class="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label class="text-[9px] font-bold text-slate-600 uppercase tracking-widest block mb-1.5">Category</label>
                                                        <select 
                                                            bind:value={mapping.selectedCategory} 
                                                            on:change={() => { mapping.selectedClass = ''; handleMappingChange(); }}
                                                            class="w-full bg-slate-900 border border-slate-800 text-[11px] p-2 rounded-lg outline-none text-slate-300"
                                                        >
                                                            <option value="">Category</option>
                                                            {#each ocsfCategories as cat}
                                                                <option value={cat.name}>{cat.caption}</option>
                                                            {/each}
                                                            <option value="other">Base / Other</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label class="text-[9px] font-bold text-slate-600 uppercase tracking-widest block mb-1.5">Class</label>
                                                        <select 
                                                            bind:value={mapping.selectedClass} 
                                                            on:change={handleMappingChange}
                                                            class="w-full bg-slate-900 border border-slate-800 text-[11px] p-2 rounded-lg outline-none text-slate-300"
                                                        >
                                                            <option value="">Class</option>
                                                            {#each filteredClasses(mapping.selectedCategory).sort((a,b) => a.caption.localeCompare(b.caption)) as cls}
                                                                <option value={cls.name}>{cls.caption}</option>
                                                            {/each}
                                                        </select>
                                                    </div>
                                                </div>

                                                <button 
                                                    on:click={() => activeMappingIndex = { fieldIdx, mappingIdx }}
                                                    class="w-full py-2 rounded-xl text-xs font-bold transition-all
                                                    { (typeof activeMappingIndex === 'object' && activeMappingIndex.fieldIdx === fieldIdx && activeMappingIndex.mappingIdx === mappingIdx) 
                                                        ? 'bg-blue-600 text-white' 
                                                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200' }"
                                                >
                                                    { (typeof activeMappingIndex === 'object' && activeMappingIndex.fieldIdx === fieldIdx && activeMappingIndex.mappingIdx === mappingIdx) ? 'Editing Mapping' : 'Edit This Mapping'}
                                                </button>
                                            </div>
                                        </div>
                                    {/each}
                                </div>
                            </div>
                        {/if}
                    {/each}
                </div>
            {/if}

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div class="space-y-2">
                    <label class="text-xs font-bold text-slate-500 uppercase tracking-widest block">{useConditionalClass ? 'Default Category' : 'Category'}</label>
                    <select 
                        bind:value={selectedCategory} 
                        on:change={() => selectedClass = ''}
                        class="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                    >
                        <option value="">Select Category</option>
                        {#each ocsfCategories as cat}
                            <option value={cat.name}>{cat.caption}</option>
                        {/each}
                        <option value="other">Base Event / Other</option>
                    </select>
                </div>
                <div class="space-y-2">
                    <label class="text-xs font-bold text-slate-500 uppercase tracking-widest block">{useConditionalClass ? 'Default Class' : 'Class'}</label>
                    <select bind:value={selectedClass} class="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none appearance-none">
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
                    class="w-full py-3 rounded-xl text-sm font-bold transition-all
                    { activeMappingIndex === 'default' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'bg-slate-800 text-slate-400 hover:bg-slate-700' }"
                >
                    {activeMappingIndex === 'default' ? 'Editing Default Mapping' : 'Edit Default Mapping'}
                </button>
            {/if}
        </div>
    </section>
    
    {#if currentClass}
        <section class="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden p-8 animate-in slide-in-from-top-4 duration-500">
            <FieldMappingTable 
                bind:schemaFields
                targetClass={currentClass}
                title={useConditionalClass && activeMappingIndex !== 'default' ? 'Conditional Mapping' : 'Default Mapping'}
                mappings={currentMappings}
                defaultMappings={mappings}
                isDefault={activeMappingIndex === 'default'}
                ocsfData={data.ocsf}
                on:change={handleMappingChange}
            />
        </section>
    {/if}
</div>
