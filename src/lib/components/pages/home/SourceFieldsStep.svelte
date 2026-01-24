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
            <h2 class="text-xl font-bold text-white">Refine Source Fields</h2>
            <p class="text-slate-400 text-sm mt-1">Review detected fields and adjust types if necessary. Nested fields are grouped for clarity.</p>
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
