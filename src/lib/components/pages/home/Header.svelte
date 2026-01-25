<script lang="ts">
    import type { OCSFVersion, OCSFVersionsResponse } from '$lib/scripts/types/types';

    export let currentMapName: string;
    export let currentMapId: string;
    export let recentMaps: any[];
    export let onSave: () => void;
    export let onLoad: (map: any) => void;
    export let onDelete: (id: string) => void;
    export let onClear: () => void;
    export let onShowAI: () => void;
    export let enableAI = false;
    export let versions: OCSFVersionsResponse | null = null;
    export let currentVersion: OCSFVersion | null = null;
    export let onVersionChange: (version: OCSFVersion) => void;

    let showSavedIndicator = false;
    let indicatorTimer: any;
    let showDropdown = false;
    let showVersionDropdown = false;

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

<header class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4 md:pb-6 mb-4 md:mb-6">
    <div class="flex items-center gap-3">
        <div class="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-900/20 shrink-0">
            <svg class="w-5 h-5 md:w-6 md:h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
        </div>
        <div class="min-w-0">
            <h1 class="text-lg md:text-2xl font-black tracking-tight text-white truncate">OCSF Mapper</h1>
            <p class="text-slate-400 text-[10px] md:text-xs font-medium truncate">Transform JSON logs into OCSF compliant events.</p>
        </div>
    </div>
    
    <div class="flex flex-wrap items-center md:justify-end gap-2 md:gap-3">
        {#if enableAI}
            <button 
                on:click={onShowAI}
                class="px-3 md:px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-[11px] md:text-xs font-bold rounded-xl transition-all shadow-lg shadow-purple-900/20 flex items-center gap-2 group"
            >
                <svg class="w-3.5 h-3.5 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span class="hidden sm:inline">AI Assist</span>
                <span class="sm:hidden">AI</span>
            </button>
        {/if}

        {#if versions}
            <div class="relative" use:clickOutside on:click_outside={() => showVersionDropdown = false}>
                <button 
                    on:click={() => showVersionDropdown = !showVersionDropdown}
                    class="px-3 md:px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] md:text-xs font-bold rounded-xl transition-all border border-slate-700 flex items-center gap-2"
                >
                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <span>OCSF {currentVersion?.version || 'Version'}</span>
                    <svg class="w-3 h-3 transition-transform {showVersionDropdown ? 'rotate-180' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                </button>

                {#if showVersionDropdown}
                    <div class="absolute top-full right-0 mt-2 w-48 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-100">
                        {#each versions.versions as v}
                            <button 
                                on:click={() => {
                                    onVersionChange(v);
                                    showVersionDropdown = false;
                                }}
                                class="w-full text-left px-4 py-2 text-xs {currentVersion?.version === v.version ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'} transition-colors flex items-center justify-between"
                            >
                                <span>{v.version}</span>
                                {#if v.version === versions.default.version}
                                    <span class="text-[8px] px-1.5 py-0.5 bg-slate-800 rounded uppercase font-bold text-slate-500">Default</span>
                                {/if}
                            </button>
                        {/each}
                    </div>
                {/if}
            </div>
        {/if}

        <button 
            on:click={onClear}
            class="px-3 md:px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] md:text-xs font-bold rounded-xl transition-all border border-slate-700 flex items-center gap-2"
        >
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            New
        </button>

        <div class="relative flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl p-1 shadow-inner" use:clickOutside on:click_outside={() => showDropdown = false}>
            <input 
                type="text" 
                bind:value={currentMapName}
                class="bg-transparent border-none text-white text-[11px] md:text-xs px-2 md:px-3 py-1 focus:outline-none flex-1 min-w-[100px] md:min-w-[150px]"
                placeholder="Map name..."
            />
            
            {#if recentMaps.length > 0}
                <button 
                    on:click={() => showDropdown = !showDropdown}
                    class="p-1 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800"
                    title="Load Recent Map"
                >
                    <svg class="w-4 h-4 transition-transform {showDropdown ? 'rotate-180' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
            {/if}

            <div class="flex items-center gap-1">
                <button 
                    on:click={handleSave}
                    class="relative bg-blue-600 hover:bg-blue-500 text-white text-[11px] md:text-xs font-bold px-3 md:px-4 py-1.5 rounded-lg transition-all flex items-center gap-2"
                >
                    {#if showSavedIndicator}
                        <span class="absolute -top-10 left-1/2 -translate-x-1/2 bg-green-600 text-white text-[10px] py-1 px-2 rounded shadow-lg animate-bounce whitespace-nowrap font-sans">Saved!</span>
                        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                        </svg>
                    {:else}
                        Save
                    {/if}
                </button>

                {#if currentMapId}
                    <button 
                        on:click={() => onDelete(currentMapId)}
                        class="p-1.5 text-slate-500 hover:text-red-400 transition-colors rounded-lg hover:bg-red-400/10"
                        title="Delete Current Map"
                    >
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                                class="flex-1 text-left px-3 py-2 text-[10px] text-slate-300 group-hover:text-white flex flex-col gap-0.5 min-w-0"
                            >
                                <span class="font-bold truncate">{map.name}</span>
                                {#if map.timestamp}
                                    <span class="text-[8px] text-slate-500">{new Date(map.timestamp).toLocaleString()}</span>
                                {/if}
                            </button>
                            <button 
                                on:click|stopPropagation={() => onDelete(map.id)}
                                class="p-1.5 text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                title="Delete Map"
                            >
                                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        </div>
                    {/each}
                </div>
            {/if}
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
