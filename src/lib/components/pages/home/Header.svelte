<script lang="ts">
    export let currentMapName: string;
    export let recentMaps: any[];
    export let onSave: () => void;
    export let onLoad: (map: any) => void;
    export let onDelete: (id: string) => void;
    export let onShowAI: () => void;
</script>

<header class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6 mb-8">
    <div>
        <h1 class="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <span class="bg-blue-600 p-2 rounded-lg">
                <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
            </span>
            OCSF Mapper
        </h1>
        <p class="text-slate-400 text-sm mt-1">Transform JSON logs into OCSF compliant events.</p>
    </div>
    
    <div class="flex flex-col items-end gap-3">
        <div class="flex items-center gap-2">
            <button 
                on:click={onShowAI}
                class="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold rounded-lg transition-all shadow-lg shadow-purple-900/20 flex items-center gap-2"
            >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                AI Assist
            </button>
            <div class="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg p-1">
                <input 
                    type="text" 
                    bind:value={currentMapName}
                    class="bg-transparent border-none text-white text-sm px-3 py-1 focus:outline-none min-w-[200px]"
                    placeholder="Map name..."
                />
                <button 
                    on:click={onSave}
                    class="bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold px-4 py-1.5 rounded-md transition-colors"
                >
                    Save
                </button>
            </div>
        </div>
        
        {#if recentMaps.length > 0}
            <div class="flex items-center gap-2 text-xs">
                <span class="text-slate-500 font-medium">Recent:</span>
                {#each recentMaps as map}
                    <div class="group flex items-center bg-slate-800 hover:bg-slate-700 rounded-md border border-slate-700 overflow-hidden transition-colors">
                        <button 
                            on:click={() => onLoad(map)}
                            class="px-2 py-1 text-slate-300 hover:text-white border-r border-slate-700 max-w-[100px] truncate"
                            title={map.name}
                        >
                            {map.name}
                        </button>
                        <button 
                            on:click={() => onDelete(map.id)}
                            class="px-1.5 py-1 text-slate-500 hover:text-red-400 transition-colors"
                        >
                            <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                {/each}
            </div>
        {/if}
    </div>
</header>
