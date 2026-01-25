<script lang="ts">
    import type { OCSFVersion, OCSFVersionsResponse } from '$lib/scripts/types/types';

    export let versions: OCSFVersionsResponse;
    export let onSelect: (version: OCSFVersion) => void;

    let selectedVersion: OCSFVersion | null = null;
</script>

<div class="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-md transition-opacity duration-300">
    <div class="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-6 max-w-md w-full animate-in fade-in zoom-in duration-300">
        <div class="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-900/20">
            <svg class="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
        </div>
        
        <div class="text-center">
            <h2 class="text-2xl font-black text-white tracking-tight">Welcome to OCSF Mapper</h2>
            <p class="text-slate-400 text-sm mt-2">Please select an OCSF version to get started.</p>
        </div>

        <div class="w-full grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
            {#each versions.versions as v}
                <button 
                    on:click={() => selectedVersion = v}
                    class="w-full text-left px-4 py-3 rounded-xl border transition-all flex items-center justify-between group
                           {selectedVersion?.version === v.version 
                               ? 'bg-blue-600/20 border-blue-500 text-blue-100' 
                               : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:border-slate-500 hover:bg-slate-800'}"
                >
                    <div class="flex items-center gap-3">
                        <div class="w-2 h-2 rounded-full {selectedVersion?.version === v.version ? 'bg-blue-400 animate-pulse' : 'bg-slate-600 group-hover:bg-slate-400'}"></div>
                        <span class="font-bold">OCSF {v.version}</span>
                    </div>
                    {#if v.version === versions.default.version}
                        <span class="text-[10px] px-2 py-0.5 bg-slate-800 rounded uppercase font-bold text-slate-500 group-hover:text-slate-400">Default</span>
                    {/if}
                </button>
            {/each}
        </div>

        <button 
            disabled={!selectedVersion}
            on:click={() => selectedVersion && onSelect(selectedVersion)}
            class="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2"
        >
            Continue to Mapper
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
        </button>
    </div>
</div>

<style>
    .custom-scrollbar::-webkit-scrollbar {
        width: 6px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
        background: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
        background: #1e293b;
        border-radius: 10px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: #334155;
    }
</style>
