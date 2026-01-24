<script lang="ts">
    export let generatedCode: string;
    export let onGenerate: () => void;

    function copyCode() {
        navigator.clipboard.writeText(generatedCode);
        alert('Code copied to clipboard!');
    }
</script>

<div class="h-full flex flex-col space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <div class="flex-1 min-h-0 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col">
        <div class="px-6 py-4 border-b border-slate-800 bg-slate-900/50 flex flex-col sm:flex-row justify-between items-center gap-4 flex-none">
            <div>
                <h2 class="text-xl font-bold text-white">Review & Export</h2>
                <p class="text-slate-400 text-sm mt-1">Generate and copy your OCSF mapping code.</p>
            </div>
            <div class="flex gap-3 w-full sm:w-auto">
                <button 
                    on:click={onGenerate}
                    class="flex-1 sm:flex-none px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-900/20"
                >
                    Generate Code
                </button>
                {#if generatedCode}
                    <button 
                        on:click={copyCode}
                        class="flex-1 sm:flex-none px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-all border border-slate-700"
                    >
                        Copy Code
                    </button>
                {/if}
            </div>
        </div>
        
        <div class="p-4 md:p-6 flex-1 min-h-0">
            {#if generatedCode}
                <div class="relative group h-full">
                    <pre class="w-full h-full p-6 bg-slate-950 border border-slate-800 rounded-xl font-mono text-sm text-blue-300 overflow-auto shadow-inner">{generatedCode}</pre>
                </div>
            {:else}
                <div class="h-full flex flex-col items-center justify-center bg-slate-950 border border-slate-800 border-dashed rounded-xl text-slate-500 space-y-4">
                    <svg class="w-16 h-16 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                    <p class="text-sm font-medium">Click "Generate Code" to see the output.</p>
                </div>
            {/if}
        </div>
    </div>
</div>
