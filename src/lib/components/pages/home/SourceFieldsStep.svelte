<script lang="ts">
    import type { SchemaField } from "$lib/types";
    export let schemaFields: SchemaField[];
    let activeField: string | null = null;

    function toggleField(name: string) {
        activeField = activeField === name ? null : name;
    }
</script>

<div class="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <div class="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div class="px-8 py-6 border-b border-slate-800 bg-slate-900/50">
            <h2 class="text-xl font-bold text-white">Refine Source Fields</h2>
            <p class="text-slate-400 text-sm mt-1">Review detected fields and adjust types if necessary.</p>
        </div>
        
        <div class="p-8">
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {#each schemaFields as field}
                    <div class="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden transition-all {activeField === field.name ? 'ring-2 ring-blue-500' : 'hover:border-slate-700'}">
                        <button 
                            on:click={() => toggleField(field.name)}
                            class="flex items-center justify-between w-full p-4 text-left transition-colors"
                        >
                            <div class="flex items-center gap-3 min-w-0">
                                <div class="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center shrink-0">
                                    {#if field.type === 'string'}
                                        <span class="text-blue-400 text-[10px] font-bold">Abc</span>
                                    {:else if field.type === 'number'}
                                        <span class="text-green-400 text-[10px] font-bold">123</span>
                                    {:else if field.type === 'boolean'}
                                        <span class="text-yellow-400 text-[10px] font-bold">T/F</span>
                                    {:else if field.type === 'enum'}
                                        <span class="text-purple-400 text-[10px] font-bold">:::</span>
                                    {:else}
                                        <span class="text-slate-400 text-[10px] font-bold">{"{}"}</span>
                                    {/if}
                                </div>
                                <div class="min-w-0">
                                    <div class="font-mono text-sm text-slate-200 truncate">{field.name}</div>
                                    <div class="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{field.type}</div>
                                </div>
                            </div>
                            <svg class="w-4 h-4 text-slate-600 transition-transform {activeField === field.name ? 'rotate-180' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                        
                        {#if activeField === field.name}
                            <div class="px-4 pb-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
                                <div>
                                    <label class="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Data Type</label>
                                    <select 
                                        bind:value={field.type} 
                                        class="w-full bg-slate-900 border border-slate-800 text-slate-300 text-xs p-2 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none appearance-none disabled:opacity-50"
                                        disabled={field.type === 'object' || field.type === 'array'}
                                    >
                                        <option value="string">String</option>
                                        <option value="number">Number</option>
                                        <option value="boolean">Boolean</option>
                                        <option value="enum">Enum</option>
                                        <option value="object">Object</option>
                                        <option value="array">Array</option>
                                    </select>
                                </div>

                                {#if field.type === 'enum'}
                                    <div>
                                        <label class="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Possible Values</label>
                                        <input 
                                            type="text" 
                                            bind:value={field.enumValues} 
                                            class="w-full bg-slate-900 border border-slate-800 text-slate-300 text-xs p-2 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none"
                                            placeholder="success, failure, pending"
                                        />
                                        <p class="text-[9px] text-slate-600 mt-1">Comma-separated values for mapping.</p>
                                    </div>
                                {/if}
                            </div>
                        {/if}
                    </div>
                {/each}
            </div>
        </div>
    </div>
</div>
