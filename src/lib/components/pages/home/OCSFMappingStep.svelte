<script lang="ts">
    import FieldMappingTable from "./FieldMappingTable.svelte";
    import type { DeterminingField, SchemaField, AttributeMapping } from "$lib/scripts/types/types";
    import { groupFields } from "$lib/scripts/pages/home/mapping-utils";
    
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

<div class="h-full flex flex-col space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <div class="flex-1 min-h-0 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col">
        <div class="px-6 py-4 border-b border-slate-800 bg-slate-900/50 flex-none flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
                <h2 class="text-xl font-bold text-white">Map to OCSF</h2>
                <p class="text-slate-400 text-sm mt-1">Define target classes and map source fields to OCSF attributes.</p>
            </div>
            <label class="flex items-center gap-3 cursor-pointer group bg-slate-800/30 px-4 py-2 rounded-xl border border-slate-700 hover:border-blue-500/50 transition-all">
                <input type="checkbox" bind:checked={useConditionalClass} class="w-5 h-5 rounded border-slate-600 bg-slate-950 text-blue-600 focus:ring-blue-500" />
                <span class="text-sm font-bold text-slate-300 group-hover:text-white">Conditional Mapping</span>
            </label>
        </div>
        
        <div class="flex-1 flex flex-col lg:flex-row overflow-hidden">
            <!-- Sidebar for Configuration -->
            <div class="w-full lg:w-80 flex-none border-b lg:border-b-0 lg:border-r border-slate-800 bg-slate-950/30 flex flex-col overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6 h-64 lg:h-full">
                <div class="space-y-4">
                    <h3 class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Target Configuration</h3>
                    
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
                        <div class="space-y-1.5">
                            <label class="text-[10px] font-bold text-slate-600 uppercase tracking-widest block">{useConditionalClass ? 'Default Category' : 'Category'}</label>
                            <select 
                                bind:value={selectedCategory} 
                                on:change={() => { selectedClass = ''; handleMappingChange(); }}
                                class="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-xs text-white focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                            >
                                <option value="">Select Category</option>
                                {#each ocsfCategories as cat}
                                    <option value={cat.name}>{cat.caption}</option>
                                {/each}
                                <option value="other">Base Event / Other</option>
                            </select>
                        </div>
                        <div class="space-y-1.5">
                            <label class="text-[10px] font-bold text-slate-600 uppercase tracking-widest block">{useConditionalClass ? 'Default Class' : 'Class'}</label>
                            <select bind:value={selectedClass} on:change={handleMappingChange} class="w-full bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-xs text-white focus:ring-2 focus:ring-blue-500 outline-none appearance-none">
                                <option value="">Select Class</option>
                                {#each filteredClasses(selectedCategory).sort((a,b) => a.caption.localeCompare(b.caption)) as cls}
                                    <option value={cls.name}>{cls.caption}</option>
                                {/each}
                            </select>
                        </div>
                    </div>

                    {#if useConditionalClass}
                        <div class="pt-6 border-t border-slate-800 space-y-4">
                            <div class="flex items-center justify-between">
                                <h3 class="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Conditional Logic</h3>
                                <button on:click={addDeterminingField} class="text-[10px] bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded-lg font-bold transition-all shadow-lg shadow-blue-900/20">
                                    + Add Field
                                </button>
                            </div>
                            
                            <div class="space-y-4">
                                {#each classDeterminingFields as field, idx}
                                    <div class="space-y-2 bg-slate-900/50 p-3 rounded-xl border border-slate-800">
                                        <div class="flex gap-2">
                                            <div class="flex-1 relative">
                                                <select bind:value={field.name} class="w-full bg-slate-950 border border-slate-800 p-2 rounded-lg text-[10px] text-slate-300 focus:ring-1 focus:ring-blue-500 outline-none appearance-none">
                                                    <option value="">Select Field...</option>
                                                    {#each groupFields(schemaFields.filter(f => ['enum', 'string', 'number', 'boolean'].includes(f.type))) as group}
                                                        <optgroup label={group.label}>
                                                            {#each group.fields as sField}
                                                                <option value={sField.name}>
                                                                    {sField.name.includes('.') ? '\u00A0\u00A0'.repeat(sField.name.split('.').length - 1) + sField.name.split('.').pop() : sField.name}
                                                                </option>
                                                            {/each}
                                                        </optgroup>
                                                    {/each}
                                                </select>
                                            </div>
                                            <button on:click={() => removeDeterminingField(idx)} class="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
                                                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>

                                        {#if field.name}
                                            <div class="space-y-2">
                                                <div class="flex items-center justify-between">
                                                    <span class="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Mappings</span>
                                                    <button on:click={() => addMapping(idx)} class="text-[8px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded font-bold transition-all border border-slate-700">
                                                        + Add
                                                    </button>
                                                </div>
                                                
                                                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
                                                    {#each field.mappings as mapping, mappingIdx}
                                                        {@const determiningField = schemaFields.find(f => f.name === field.name)}
                                                        <div class="bg-slate-950 border border-slate-800 p-2 rounded-lg relative group { (typeof activeMappingIndex === 'object' && activeMappingIndex.fieldIdx === idx && activeMappingIndex.mappingIdx === mappingIdx) ? 'ring-1 ring-blue-500 shadow-lg' : ''}">
                                                            <button on:click={() => removeMapping(idx, mappingIdx)} class="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                                <svg class="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                                                                </svg>
                                                            </button>
                                                            
                                                            <div class="space-y-2">
                                                                <div>
                                                                    <label class="text-[8px] font-bold text-slate-600 uppercase tracking-widest block mb-0.5">Value</label>
                                                                    {#if determiningField?.type === 'enum' && determiningField.enumValues}
                                                                        <select bind:value={mapping.enumValue} class="w-full bg-slate-900 border border-slate-800 text-[9px] p-1 rounded-md outline-none text-slate-300">
                                                                            <option value="">Select...</option>
                                                                            {#each determiningField.enumValues.split(/[,\s]+/).filter(v => v.trim() !== '') as val}
                                                                                <option value={val}>{val}</option>
                                                                            {/each}
                                                                        </select>
                                                                    {:else}
                                                                        <input type="text" bind:value={mapping.enumValue} class="w-full bg-slate-900 border border-slate-800 text-[9px] p-1 rounded-md outline-none text-slate-300" placeholder="Value" />
                                                                    {/if}
                                                                </div>

                                                                <div class="grid grid-cols-2 gap-1.5">
                                                                    <div>
                                                                        <label class="text-[8px] font-bold text-slate-600 uppercase tracking-widest block mb-0.5">Cat</label>
                                                                        <select 
                                                                            bind:value={mapping.selectedCategory} 
                                                                            on:change={() => { mapping.selectedClass = ''; handleMappingChange(); }}
                                                                            class="w-full bg-slate-900 border border-slate-800 text-[8px] p-1 rounded-md outline-none text-slate-300"
                                                                        >
                                                                            <option value="">Category</option>
                                                                            {#each ocsfCategories as cat}
                                                                                <option value={cat.name}>{cat.caption}</option>
                                                                            {/each}
                                                                            <option value="other">Base</option>
                                                                        </select>
                                                                    </div>
                                                                    <div>
                                                                        <label class="text-[8px] font-bold text-slate-600 uppercase tracking-widest block mb-0.5">Class</label>
                                                                        <select 
                                                                            bind:value={mapping.selectedClass} 
                                                                            on:change={handleMappingChange}
                                                                            class="w-full bg-slate-900 border border-slate-800 text-[8px] p-1 rounded-md outline-none text-slate-300"
                                                                        >
                                                                            <option value="">Class</option>
                                                                            {#each filteredClasses(mapping.selectedCategory).sort((a,b) => a.caption.localeCompare(b.caption)) as cls}
                                                                                <option value={cls.name}>{cls.caption}</option>
                                                                            {/each}
                                                                        </select>
                                                                    </div>
                                                                </div>

                                                                <button 
                                                                    on:click={() => activeMappingIndex = { fieldIdx: idx, mappingIdx }}
                                                                    class="w-full py-1 rounded-md text-[9px] font-bold transition-all
                                                                    { (typeof activeMappingIndex === 'object' && activeMappingIndex.fieldIdx === idx && activeMappingIndex.mappingIdx === mappingIdx) 
                                                                        ? 'bg-blue-600 text-white' 
                                                                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700' }"
                                                                >
                                                                    { (typeof activeMappingIndex === 'object' && activeMappingIndex.fieldIdx === idx && activeMappingIndex.mappingIdx === mappingIdx) ? 'Editing' : 'Edit'}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    {/each}
                                                </div>
                                            </div>
                                        {/if}
                                    </div>
                                {/each}
                            </div>

                            <button 
                                on:click={() => activeMappingIndex = 'default'}
                                class="w-full py-2 rounded-xl text-xs font-bold transition-all
                                { activeMappingIndex === 'default' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'bg-slate-800 text-slate-400 hover:bg-slate-700' }"
                            >
                                {activeMappingIndex === 'default' ? 'Editing Default Mapping' : 'Edit Default Mapping'}
                            </button>
                        </div>
                    {/if}
                </div>
            </div>

            <!-- Main Mapping Area -->
            <div class="flex-1 min-w-0 bg-slate-950/50 flex flex-col overflow-hidden">
                {#if currentClass}
                    <div class="flex-1 min-h-0">
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
                    </div>
                {:else}
                    <div class="h-full flex flex-col items-center justify-center p-8 md:p-12 text-center animate-in fade-in zoom-in-95 duration-500">
                        <div class="w-12 h-12 md:w-16 md:h-16 bg-slate-900 rounded-2xl flex items-center justify-center mb-4 border border-slate-800 shadow-xl">
                            <svg class="w-6 h-6 md:w-8 md:h-8 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                            </svg>
                        </div>
                        <h3 class="text-base md:text-lg font-bold text-white mb-2">No Target Class Selected</h3>
                        <p class="text-slate-400 max-w-xs text-xs md:text-sm mx-auto">Select an OCSF category and class from the sidebar to begin mapping your fields.</p>
                    </div>
                {/if}
            </div>
        </div>
    </div>
</div>
