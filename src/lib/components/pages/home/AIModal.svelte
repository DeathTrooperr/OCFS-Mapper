<script lang="ts">
    export let show: boolean;
    export let prompt: string;
    export let aiInput: string;
    export let onApply: () => void;
    export let onClose: () => void;

    function copyPrompt() {
        navigator.clipboard.writeText(prompt);
        alert('Prompt copied to clipboard!');
    }
</script>

{#if show}
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
        <div class="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col scale-in-center">
            <div class="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                <h3 class="text-xl font-bold text-white flex items-center gap-2">
                    <svg class="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    AI-Assisted Mapping
                </h3>
                <button on:click={onClose} class="text-slate-500 hover:text-white transition-colors">
                    <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            
            <div class="p-6 overflow-y-auto space-y-6">
                <div class="bg-slate-800/30 p-4 rounded-lg border border-purple-500/20">
                    <p class="text-sm text-slate-300 mb-4">
                        Use AI to jumpstart your mapping. Copy the prompt below, paste it into an LLM (like ChatGPT or Claude), and then paste the result back here.
                    </p>
                    <div class="space-y-3">
                        <div class="flex justify-between items-end">
                            <label class="text-xs font-bold text-slate-500 uppercase tracking-wider">Step 1: Copy Prompt</label>
                            <button 
                                on:click={copyPrompt}
                                class="text-[10px] bg-purple-600 hover:bg-purple-500 text-white px-3 py-1 rounded-md font-bold transition-colors"
                            >
                                Copy Prompt
                            </button>
                        </div>
                        <div class="bg-slate-950 p-4 rounded-lg border border-slate-800 font-mono text-[10px] text-slate-400 h-32 overflow-y-auto whitespace-pre-wrap">
                            {prompt}
                        </div>
                    </div>
                </div>

                <div class="space-y-3">
                    <label class="text-xs font-bold text-slate-500 uppercase tracking-wider">Step 2: Paste AI Output</label>
                    <textarea 
                        bind:value={aiInput}
                        placeholder="CATEGORY: iam&#10;CLASS: authentication&#10;MAPPINGS:&#10;- user.id -> user.uid (Type: string)..."
                        class="w-full h-48 p-4 bg-slate-950 border border-slate-800 rounded-lg font-mono text-sm text-slate-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                    ></textarea>
                </div>
            </div>

            <div class="p-6 border-t border-slate-800 bg-slate-900/50 flex gap-3">
                <button 
                    on:click={onClose}
                    class="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-all"
                >
                    Cancel
                </button>
                <button 
                    on:click={onApply}
                    class="flex-[2] py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-purple-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!aiInput}
                >
                    Apply AI Mapping
                </button>
            </div>
        </div>
    </div>
{/if}
