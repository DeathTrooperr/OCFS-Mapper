<script lang="ts">
    export let currentMapName: string;
    export let currentMapId: string;
    export let recentMaps: any[];
    export let onSave: () => void;
    export let onLoad: (map: any) => void;
    export let onDelete: (id: string) => void;
    export let onClear: () => void;
    export let onShowAI: () => void;
    export let enableAI = false;

    let showSavedIndicator = false;
    let indicatorTimer: any;
    let showDropdown = false;

    function handleSave() {
        onSave();
        showSavedIndicator = true;
        if (indicatorTimer) clearTimeout(indicatorTimer);
        indicatorTimer = setTimeout(() => {
            showSavedIndicator = false;
        }, 2000);
    }

    function selectMap(map: any) {
        onLoad(map);
        showDropdown = false;
    }

    function clickOutside(node: HTMLElement) {
        const handleClick = (event: MouseEvent) => {
            if (node && !node.contains(event.target as Node) && !event.defaultPrevented) {
                node.dispatchEvent(new CustomEvent('click_outside', { detail: node }));
            }
        };

        document.addEventListener('click', handleClick, true);

        return {
            destroy() {
                document.removeEventListener('click', handleClick, true);
            }
        };
    }
</script>

<header class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-6 border-b border-slate-800 pb-4 lg:pb-8 mb-4 lg:mb-10">
    <div class="flex items-center gap-3 lg:gap-4">
        <div class="bg-blue-600 p-2 lg:p-3 rounded-xl lg:rounded-2xl shadow-lg shadow-blue-900/20">
            <svg class="w-6 h-6 lg:w-8 lg:h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
        </div>
        <div>
            <h1 class="text-xl lg:text-3xl font-black tracking-tight text-white">OCSF Mapper</h1>
            <p class="text-slate-400 text-xs lg:text-sm font-medium">Transform JSON logs into OCSF compliant events.</p>
        </div>
    </div>
    
    <div class="flex flex-col gap-4 min-w-0">
        <div class="flex flex-wrap items-center lg:justify-end gap-3">
            {#if enableAI}
                <button 
                    on:click={onShowAI}
                    class="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-purple-900/20 flex items-center gap-2 group"
                >
                    <svg class="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    AI Assist
                </button>
            {/if}

            <button 
                on:click={onClear}
                class="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-bold rounded-xl transition-all border border-slate-700 flex items-center gap-2"
            >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
                New
            </button>

            <div class="relative flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl p-1 shadow-inner" use:clickOutside on:click_outside={() => showDropdown = false}>
                <input 
                    type="text" 
                    bind:value={currentMapName}
                    class="bg-transparent border-none text-white text-sm px-4 py-1.5 focus:outline-none flex-1 min-w-[150px]"
                    placeholder="Map name..."
                />
                
                {#if recentMaps.length > 0}
                    <button 
                        on:click={() => showDropdown = !showDropdown}
                        class="p-1.5 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800"
                        title="Load Recent Map"
                    >
                        <svg class="w-5 h-5 transition-transform {showDropdown ? 'rotate-180' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                {/if}

                <div class="flex items-center gap-1">
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

                    {#if currentMapId}
                        <button 
                            on:click={() => onDelete(currentMapId)}
                            class="p-2 text-slate-500 hover:text-red-400 transition-colors rounded-lg hover:bg-red-400/10"
                            title="Delete Current Map"
                        >
                            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    {/if}
                </div>

                {#if showDropdown}
                    <div class="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-100">
                        {#each recentMaps as map}
                            <div class="group flex items-center px-2 hover:bg-slate-800 transition-colors">
                                <button 
                                    on:click={() => selectMap(map)}
                                    class="flex-1 text-left px-3 py-2.5 text-xs text-slate-300 group-hover:text-white flex flex-col gap-0.5 min-w-0"
                                >
                                    <span class="font-bold truncate">{map.name}</span>
                                    {#if map.timestamp}
                                        <span class="text-[10px] text-slate-500">{new Date(map.timestamp).toLocaleString()}</span>
                                    {/if}
                                </button>
                                <button 
                                    on:click|stopPropagation={() => onDelete(map.id)}
                                    class="p-2 text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                    title="Delete Map"
                                >
                                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>
        </div>
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
