<script lang="ts">
    export let currentMapName: string;
    export let recentMaps: any[];
    export let onSave: () => void;
    export let onLoad: (map: any) => void;
    export let onDelete: (id: string) => void;
    export let onClear: () => void;
    export let onShowAI: () => void;

    let showSavedIndicator = false;
    let indicatorTimer: any;

    function handleSave() {
        onSave();
        showSavedIndicator = true;
        if (indicatorTimer) clearTimeout(indicatorTimer);
        indicatorTimer = setTimeout(() => {
            showSavedIndicator = false;
        }, 2000);
    }
</script>

<header class="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-800 pb-8 mb-10">
    <div class="flex items-center gap-4">
        <div class="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-900/20">
            <svg class="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
        </div>
        <div>
            <h1 class="text-3xl font-black tracking-tight text-white">OCSF Mapper</h1>
            <p class="text-slate-400 text-sm font-medium">Transform JSON logs into OCSF compliant events.</p>
        </div>
    </div>
    
    <div class="flex flex-col gap-4 min-w-0">
        <div class="flex flex-wrap items-center lg:justify-end gap-3">
            <button 
                on:click={onShowAI}
                class="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-purple-900/20 flex items-center gap-2 group"
            >
                <svg class="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                AI Assist
            </button>

            <button 
                on:click={onClear}
                class="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-bold rounded-xl transition-all border border-slate-700 flex items-center gap-2"
            >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
                New
            </button>

            <div class="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl p-1 shadow-inner">
                <input 
                    type="text" 
                    bind:value={currentMapName}
                    class="bg-transparent border-none text-white text-sm px-4 py-1.5 focus:outline-none min-w-[180px] sm:min-w-[240px]"
                    placeholder="Map name..."
                />
                <button 
                    on:click={handleSave}
                    class="relative bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold px-6 py-2 rounded-lg transition-all flex items-center gap-2"
                >
                    {#if showSavedIndicator}
                        <span class="absolute -top-10 left-1/2 -translate-x-1/2 bg-green-600 text-white text-[10px] py-1 px-2 rounded shadow-lg animate-bounce whitespace-nowrap">Saved!</span>
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                        </svg>
                    {:else}
                        Save
                    {/if}
                </button>
            </div>
        </div>
        
        {#if recentMaps.length > 0}
            <div class="flex items-center gap-3 text-xs overflow-x-auto pb-1 no-scrollbar lg:justify-end">
                <span class="text-slate-500 font-bold uppercase tracking-wider whitespace-nowrap">Recent Maps:</span>
                <div class="flex items-center gap-2">
                    {#each recentMaps as map}
                        <div class="group flex items-center bg-slate-900/50 hover:bg-slate-800 rounded-lg border border-slate-800 overflow-hidden transition-all hover:border-slate-600">
                            <button 
                                on:click={() => onLoad(map)}
                                class="px-3 py-1.5 text-slate-400 hover:text-blue-400 border-r border-slate-800 max-w-[120px] truncate transition-colors font-medium"
                                title={map.name}
                            >
                                {map.name}
                            </button>
                            <button 
                                on:click={() => onDelete(map.id)}
                                class="px-2 py-1.5 text-slate-600 hover:text-red-400 hover:bg-red-400/10 transition-all"
                                title="Delete"
                            >
                                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    {/each}
                </div>
            </div>
        {/if}
    </div>
</header>

<style>
    .no-scrollbar::-webkit-scrollbar {
        display: none;
    }
    .no-scrollbar {
        -ms-overflow-style: none;
        scrollbar-width: none;
    }
</style>
