<script lang="ts">
    import type { SchemaField } from "$lib/types";
    export let fields: SchemaField[];
    export let targetClass: any;
    export let title: string;

    let activeField: string | null = null;
    function toggleField(name: string) {
        activeField = activeField === name ? null : name;
    }

    $: attributes = targetClass ? Object.values(targetClass.attributes).sort((a: any, b: any) => a.caption.localeCompare(b.caption)) : [];
</script>

<div class="space-y-4">
    <div class="flex items-center justify-between mb-4 px-2">
        <h3 class="text-lg font-bold text-white flex items-center gap-3">
            <span class="w-1.5 h-6 bg-blue-500 rounded-full"></span>
            {title}
        </h3>
        {#if targetClass}
            <div class="text-[10px] bg-blue-900/30 text-blue-400 px-3 py-1 rounded-full border border-blue-900/30 font-bold uppercase tracking-wider">
                {targetClass.caption} ({targetClass.name})
            </div>
        {/if}
    </div>

    <div class="grid grid-cols-1 gap-3">
        {#each fields as field}
            <div class="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden transition-all {field.mappedTo ? 'border-blue-500/30 shadow-lg shadow-blue-900/5' : 'hover:border-slate-700'}">
                <div class="flex flex-col lg:flex-row items-stretch lg:items-center p-4 gap-4">
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 mb-1">
                            <span class="font-mono text-sm text-slate-200 font-bold truncate">{field.name}</span>
                            <span class="px-2 py-0.5 text-[9px] uppercase font-bold bg-slate-900 text-slate-500 rounded border border-slate-800">{field.type}</span>
                        </div>
                    </div>

                    <div class="flex flex-col sm:flex-row items-center gap-3">
                        <svg class="w-5 h-5 text-slate-800 hidden lg:block rotate-90 lg:rotate-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                        
                        <div class="w-full sm:w-72 relative group">
                            <select 
                                bind:value={field.mappedTo}
                                class="w-full bg-slate-900 border border-slate-800 text-slate-200 text-sm p-2.5 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none appearance-none transition-all {field.mappedTo ? 'border-blue-500/50 bg-blue-500/5 ring-1 ring-blue-500/20' : ''}"
                            >
                                <option value="">-- No Mapping --</option>
                                {#each attributes as attr}
                                    <option value={attr.name}>{attr.caption} ({attr.name})</option>
                                {/each}
                            </select>
                            <div class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-600">
                                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>

                        <button 
                            on:click={() => toggleField(field.name)}
                            class="p-2.5 rounded-xl transition-colors {activeField === field.name ? 'bg-slate-800 text-white' : 'text-slate-600 hover:text-slate-300 hover:bg-slate-900'}"
                        >
                            <svg class="w-5 h-5 transition-transform {activeField === field.name ? 'rotate-180' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                    </div>
                </div>

                {#if activeField === field.name}
                    <div class="px-6 pb-6 border-t border-slate-800/50 bg-slate-900/10 animate-in slide-in-from-top-2 duration-200 pt-5">
                         {#if field.type === 'enum' || (targetClass?.attributes[field.mappedTo]?.type === 'enum' || targetClass?.attributes[field.mappedTo]?.enum)}
                            <div class="space-y-4">
                                <div class="flex items-center justify-between">
                                    <label class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Enum Value Mapping</label>
                                    <span class="text-[10px] text-slate-600 italic">Map source values to OCSF constants</span>
                                </div>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {#each (field.enumValues || '').split(/[,\s]+/).filter(v => v.trim() !== '') as sourceVal}
                                        <div class="flex items-center gap-3 bg-slate-900/50 p-2.5 rounded-xl border border-slate-800/50">
                                            <span class="text-xs font-mono text-slate-400 w-24 truncate" title={sourceVal}>{sourceVal}</span>
                                            <svg class="w-3 h-3 text-slate-700 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5-5 5M6 7l5 5-5 5" />
                                            </svg>
                                            <select 
                                                bind:value={field.enumMapping[sourceVal]}
                                                class="flex-1 bg-slate-950 border border-slate-800 text-[11px] p-2 rounded-lg outline-none text-slate-300 focus:ring-1 focus:ring-blue-500 transition-all"
                                            >
                                                <option value="">(Ignore)</option>
                                                {#if targetClass?.attributes[field.mappedTo]?.enum}
                                                    {#each Object.entries(targetClass.attributes[field.mappedTo].enum) as [eVal, eMeta]}
                                                        <option value={eVal}>{eMeta.caption} ({eVal})</option>
                                                    {/each}
                                                {/if}
                                            </select>
                                        </div>
                                    {/each}
                                </div>
                            </div>
                         {:else}
                            <div class="flex items-center justify-center py-4 bg-slate-900/30 rounded-xl border border-dashed border-slate-800">
                                <p class="text-xs text-slate-600 italic">No additional configuration required for this type.</p>
                            </div>
                         {/if}
                    </div>
                {/if}
            </div>
        {/each}
    </div>
</div>
