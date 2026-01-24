<script lang="ts">
    import type { HierarchicalField } from "$lib/scripts/pages/home/mapping-utils";
    import { OBSERVABLE_TYPE_NAMES } from "$lib/sdk/observables";
    import SourceFieldNode from "./SourceFieldNode.svelte";

    export let node: HierarchicalField;
    export let level = 0;
    
    let expanded = level < 1; // Expand top level by default

    function toggleExpand() {
        if (node.children.length > 0) {
            expanded = !expanded;
        }
    }

    $: currentType = node.field ? node.field.type : node.type;

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
</script>

<div class="border-l border-slate-800 ml-4 my-1">
    <div class="flex items-center gap-2 p-2 hover:bg-slate-900/50 rounded-lg transition-colors group">
        {#if node.children.length > 0}
            <button 
                on:click={toggleExpand}
                class="w-5 h-5 flex items-center justify-center text-slate-500 hover:text-slate-300 transition-transform {expanded ? 'rotate-90' : ''}"
            >
                <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M9 5l7 7-7 7" />
                </svg>
            </button>
        {:else}
            <div class="w-5"></div>
        {/if}

        <div class="w-7 h-7 rounded bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0">
            <span class="{typeColors[currentType] || 'text-slate-400'} text-[9px] font-bold">{typeIcons[currentType] || '{}'}</span>
        </div>

        <div class="min-w-0 flex-1 flex flex-wrap items-center gap-x-2 md:gap-x-3 gap-y-1.5">
            <span class="font-mono text-xs md:text-sm text-slate-200 truncate">{node.label}:</span>
            
            {#if node.field}
                {#if node.children.length > 0}
                    <div class="bg-slate-900/50 border border-slate-800/50 text-slate-500 text-[9px] md:text-[10px] px-2 py-0.5 rounded cursor-not-allowed italic shrink-0">
                        {node.field.type}
                    </div>
                {:else}
                    <div class="relative group/type shrink-0">
                        <select 
                            bind:value={node.field.type}
                            class="appearance-none bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-[9px] md:text-[10px] pl-2 pr-6 py-0.5 rounded outline-none focus:ring-1 focus:ring-blue-500/50 transition-all cursor-pointer"
                        >
                            <option value="string">string</option>
                            <option value="number">number</option>
                            <option value="boolean">boolean</option>
                            <option value="enum">enum</option>
                            <option value="object">object</option>
                            <option value="array">array</option>
                        </select>
                        <div class="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-600 group-hover/type:text-slate-400 transition-colors">
                            <svg class="w-2 md:w-2.5 h-2 md:h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>
                {/if}

                {#if !node.children.length && node.field}
                    <div class="flex items-center gap-2 shrink-0">
                        <label class="flex items-center gap-1 cursor-pointer group/obs" title="Mark as Observable">
                            <input 
                                type="checkbox" 
                                bind:checked={node.field.isObservable}
                                class="w-3 h-3 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500/50"
                            />
                            <span class="text-[8px] md:text-[9px] font-bold uppercase tracking-tighter {node.field.isObservable ? 'text-emerald-400' : 'text-slate-600 group-hover/obs:text-slate-400'} transition-colors">Observables</span>
                        </label>

                        {#if node.field.isObservable}
                            <div class="relative group/obstype">
                                <select 
                                    bind:value={node.field.observableTypeId}
                                    class="appearance-none bg-slate-900 border border-emerald-900/30 hover:border-emerald-500/50 text-emerald-400 text-[8px] md:text-[9px] pl-1.5 pr-5 py-0.5 rounded outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all cursor-pointer font-bold"
                                >
                                    {#each Object.entries(OBSERVABLE_TYPE_NAMES) as [id, name]}
                                        <option value={Number(id)}>{name} ({id})</option>
                                    {/each}
                                </select>
                                <div class="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-700">
                                    <svg class="w-1.5 md:w-2 h-1.5 md:h-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                        {/if}
                    </div>
                {/if}

                {#if node.field.type === 'enum'}
                    <div class="relative group/enum shrink-0">
                        <input 
                            type="text" 
                            bind:value={node.field.enumValues}
                            placeholder="Values (a, b, c)"
                            class="bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-[9px] md:text-[10px] px-2 py-0.5 rounded outline-none focus:ring-1 focus:ring-purple-500/50 w-24 md:w-32 placeholder:text-slate-700 transition-all"
                        />
                    </div>
                {/if}
            {:else}
                <span class="text-[8px] md:text-[9px] uppercase tracking-widest text-slate-500 font-bold shrink-0">{node.type}</span>
            {/if}
            
            {#if node.children.length > 0}
                <span class="text-[8px] md:text-[9px] bg-slate-800/50 text-slate-500 px-1.5 py-0.5 rounded-full font-bold shrink-0">
                    {node.children.length} {node.children.length === 1 ? 'child' : 'children'}
                </span>
            {/if}

            {#if node.field?.example !== undefined}
                <span class="text-[9px] md:text-[10px] text-slate-600 truncate italic max-w-[100px] md:max-w-xs shrink" title="Example: {JSON.stringify(node.field.example)}">
                    Ex: {JSON.stringify(node.field.example)}
                </span>
            {/if}
        </div>
    </div>

    {#if expanded && node.children.length > 0}
        <div class="ml-2">
            {#each node.children as child}
                <SourceFieldNode node={child} level={level + 1} />
            {/each}
        </div>
    {/if}
</div>
