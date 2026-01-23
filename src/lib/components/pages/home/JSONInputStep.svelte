<script lang="ts">
    export let jsonInput: string;
    export let enableAI = false;
</script>

<div class="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <div class="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div class="px-8 py-6 border-b border-slate-800 bg-slate-900/50">
            <div>
                <h2 class="text-xl font-bold text-white">Input JSON Schema</h2>
                <p class="text-slate-400 text-sm mt-1">Paste a sample JSON event to extract fields.</p>
            </div>
        </div>
        <div class="p-8">
            <textarea 
                bind:value={jsonInput} 
                class="w-full h-80 p-6 bg-slate-950 border border-slate-800 rounded-xl font-mono text-sm text-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none shadow-inner" 
                placeholder={JSON.stringify({"event_type": "login", "user": {"name": "alice", "id": 123}, "status": "success"}, null, 2)}
            ></textarea>
        </div>
    </div>
    
    <div class="grid grid-cols-1 {enableAI ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-6">
        <div class="bg-slate-900/50 border border-slate-800 p-6 rounded-xl">
            <div class="w-10 h-10 bg-blue-900/30 text-blue-400 rounded-lg flex items-center justify-center mb-4">
                <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            </div>
            <h3 class="text-white font-bold mb-2">Auto-Extraction</h3>
            <p class="text-slate-400 text-xs leading-relaxed">Simply paste any JSON object. The tool will automatically flatten nested structures and detect data types.</p>
        </div>
        {#if enableAI}
            <div class="bg-slate-900/50 border border-slate-800 p-6 rounded-xl">
                <div class="w-10 h-10 bg-purple-900/30 text-purple-400 rounded-lg flex items-center justify-center mb-4">
                    <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                </div>
                <h3 class="text-white font-bold mb-2">AI-Ready</h3>
                <p class="text-slate-400 text-xs leading-relaxed">Once processed, you can use the AI Assist to automatically map these fields to the OCSF schema.</p>
            </div>
        {/if}
        <div class="bg-slate-900/50 border border-slate-800 p-6 rounded-xl">
            <div class="w-10 h-10 bg-green-900/30 text-green-400 rounded-lg flex items-center justify-center mb-4">
                <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
            </div>
            <h3 class="text-white font-bold mb-2">Privacy First</h3>
            <p class="text-slate-400 text-xs leading-relaxed">Your data remains in your browser. Mappings are saved locally to your browser's storage.</p>
        </div>
    </div>
</div>
