<script lang="ts">
    import type { SchemaField } from "$lib/scripts/types/types";
    import { buildFieldTree } from "$lib/scripts/pages/home/mapping-utils";
    import SourceFieldNode from "./SourceFieldNode.svelte";

    export let schemaFields: SchemaField[];
    
    $: fieldTree = buildFieldTree(schemaFields);
</script>

<div class="h-full flex flex-col space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <div class="flex-1 min-h-0 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col">
        <div class="px-6 py-4 border-b border-slate-800 bg-slate-900/50 flex-none">
            <div class="flex flex-col md:flex-row justify-between gap-4">
                <div class="flex-1">
                    <h2 class="text-xl font-bold text-white">Refine Source Fields</h2>
                    <p class="text-slate-400 text-sm mt-1">Review detected fields and adjust types if necessary. Nested fields are grouped for clarity.</p>
                </div>
                <div class="flex-1 max-w-2xl grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div class="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                        <h3 class="text-blue-400 text-xs font-bold uppercase tracking-wider mb-1">Building your Schema</h3>
                        <p class="text-slate-400 text-[11px] leading-relaxed">
                            This schema is automatically derived from your sample JSON. To add more fields to the schema, return to the <b>Input</b> step and include them in your sample data.
                        </p>
                    </div>
                    <div class="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
                        <div class="flex items-center gap-2 mb-1">
                            <h3 class="text-emerald-400 text-xs font-bold uppercase tracking-wider">Automated Observables</h3>
                            <span class="px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-[9px] font-bold uppercase tracking-tighter border border-emerald-500/30">Beta</span>
                        </div>
                        <p class="text-slate-400 text-[11px] leading-relaxed">
                            Fields marked with <span class="text-emerald-400 font-bold">OBS</span> will be automatically extracted into the OCSF <code>observables</code> array. The engine auto-detects common types, but you can override them here.
                        </p>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="p-4 md:p-6 flex-1 overflow-y-auto min-h-0 h-full">
            <div class="bg-slate-950/50 border border-slate-800 rounded-xl p-4 h-full">
                {#each fieldTree as node}
                    <SourceFieldNode {node} level={0} />
                {/each}

                {#if fieldTree.length === 0}
                    <div class="flex items-center justify-center py-12 h-full w-full">
                        <p class="text-slate-500">No fields detected. Go back to the Input step and provide valid JSON.</p>
                    </div>
                {/if}
            </div>
        </div>
    </div>
</div>
