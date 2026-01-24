<script lang="ts">
    import { parseOCSF } from '$lib/sdk/parser';
    import type { ParserConfig } from '$lib/sdk/types';

    export let config: ParserConfig;
    
    let testLog = '';
    let parsedResult: any = null;
    let error: string | null = null;

    function handleTest() {
        error = null;
        try {
            const input = JSON.parse(testLog);
            parsedResult = parseOCSF(input, config);
        } catch (e: any) {
            error = e.message;
            parsedResult = null;
        }
    }

    $: if (config) {
        if (testLog) handleTest();
    }
</script>

<div class="h-full flex flex-col space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <div class="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Input Area -->
        <div class="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col">
            <div class="px-6 py-4 border-b border-slate-800 bg-slate-900/50 flex-none">
                <h2 class="text-xl font-bold text-white">Live Log Input</h2>
                <p class="text-slate-400 text-sm mt-1">Paste a single log event to test your mappings.</p>
            </div>
            <div class="p-4 md:p-6 flex-1 min-h-0">
                <textarea 
                    bind:value={testLog}
                    on:input={handleTest}
                    class="w-full h-full p-4 bg-slate-950 border border-slate-800 rounded-xl font-mono text-sm text-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none shadow-inner" 
                    placeholder="Paste JSON here..."
                ></textarea>
            </div>
        </div>

        <!-- Output Area -->
        <div class="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col">
            <div class="px-6 py-4 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center flex-none">
                <div>
                    <h2 class="text-xl font-bold text-white">Parsed OCSF Event</h2>
                    <p class="text-slate-400 text-sm mt-1">Real-time result of the parsing logic.</p>
                </div>
                {#if parsedResult}
                    <span class="px-3 py-1 bg-green-900/30 text-green-400 text-xs font-bold rounded-full border border-green-800/50">
                        Valid
                    </span>
                {/if}
            </div>
            <div class="p-4 md:p-6 flex-1 bg-slate-950 min-h-0">
                {#if error}
                    <div class="h-full flex items-center justify-center p-8 text-red-400 font-mono text-sm bg-red-900/10 rounded-xl border border-red-900/20">
                        Error: {error}
                    </div>
                {:else if parsedResult}
                    <pre class="h-full overflow-auto p-4 font-mono text-sm text-blue-300">
                        {JSON.stringify(parsedResult, null, 2)}
                    </pre>
                {:else}
                    <div class="h-full flex items-center justify-center p-8 text-slate-500 font-medium">
                        Paste a log to see results
                    </div>
                {/if}
            </div>
        </div>
    </div>

    <div class="flex-none bg-blue-900/10 border border-blue-800/50 p-6 rounded-2xl">
        <div class="flex gap-4">
            <div class="w-12 h-12 bg-blue-900/30 text-blue-400 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </div>
            <div>
                <h3 class="text-white font-bold mb-1">Testing Tip</h3>
                <p class="text-slate-400 text-sm leading-relaxed">
                    If you are using <strong>Conditional Mappings</strong>, try pasting logs that match different conditions to verify that the <code>class_name</code> and mappings change correctly.
                </p>
            </div>
        </div>
    </div>
</div>
