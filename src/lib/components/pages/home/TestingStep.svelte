<script lang="ts">
    import { parseOCSF } from '$lib/sdk/parser';
    import type { ParserConfig } from '$lib/sdk/types';
    import type { OCSFValidationResponse } from '$lib/scripts/types/types';

    export let config: ParserConfig;
    export let apiUrl: string | undefined;
    
    let testLog = '';
    let parsedResult: any = null;
    let error: string | null = null;
    let validationResult: OCSFValidationResponse | null = null;
    let validating = false;
    let missingRecommended = false;

    function handleTest() {
        error = null;
        validationResult = null;
        try {
            const input = JSON.parse(testLog);
            parsedResult = parseOCSF(input, config);
        } catch (e: any) {
            error = e.message;
            parsedResult = null;
        }
    }

    async function handleValidate() {
        if (!parsedResult || !apiUrl) return;
        
        validating = true;
        try {
            const res = await fetch('/api/ocsf/validate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    data: parsedResult,
                    apiUrl,
                    missing_recommended: missingRecommended
                })
            });
            
            if (res.ok) {
                validationResult = await res.json();
            } else {
                const errData = await res.json();
                error = errData.error || 'Validation failed';
            }
        } catch (e: any) {
            error = e.message;
        } finally {
            validating = false;
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
                <div class="flex items-center gap-3">
                    {#if parsedResult && apiUrl}
                        <label class="flex items-center gap-2 cursor-pointer group">
                            <input 
                                type="checkbox" 
                                bind:checked={missingRecommended} 
                                on:change={handleValidate}
                                class="w-4 h-4 rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900"
                            />
                            <span class="text-xs text-slate-400 group-hover:text-slate-300 transition-colors">Missing Rec.</span>
                        </label>

                        <button 
                            on:click={handleValidate}
                            disabled={validating}
                            class="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white text-xs font-bold rounded-lg transition-all shadow-lg shadow-blue-900/20 flex items-center gap-2"
                        >
                            {#if validating}
                                <svg class="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Validating...
                            {:else}
                                Validate
                            {/if}
                        </button>
                    {/if}

                    {#if validationResult}
                        {#if validationResult.error_count === 0 && validationResult.warning_count === 0}
                            <span class="px-3 py-1 bg-green-900/30 text-green-400 text-xs font-bold rounded-full border border-green-800/50">
                                Valid
                            </span>
                        {:else if validationResult.error_count > 0}
                            <span class="px-3 py-1 bg-red-900/30 text-red-400 text-xs font-bold rounded-full border border-red-900/50">
                                {validationResult.error_count} Errors
                            </span>
                        {:else}
                            <span class="px-3 py-1 bg-yellow-900/30 text-yellow-400 text-xs font-bold rounded-full border border-yellow-800/50">
                                {validationResult.warning_count} Warnings
                            </span>
                        {/if}
                    {/if}
                </div>
            </div>
            <div class="p-0 flex-1 bg-slate-950 min-h-0 flex flex-col">
                <div class="flex-1 overflow-auto p-4 md:p-6">
                    {#if error}
                        <div class="h-full flex items-center justify-center p-8 text-red-400 font-mono text-sm bg-red-900/10 rounded-xl border border-red-900/20">
                            Error: {error}
                        </div>
                    {:else if parsedResult}
                        <pre class="font-mono text-sm text-blue-300 whitespace-pre">
                            {JSON.stringify(parsedResult, null, 2)}
                        </pre>
                    {:else}
                        <div class="h-full flex items-center justify-center p-8 text-slate-500 font-medium">
                            Paste a log to see results
                        </div>
                    {/if}
                </div>

                {#if validationResult && (validationResult.errors?.length > 0 || validationResult.warnings?.length > 0)}
                    <div class="flex-none border-t border-slate-800 bg-slate-900/50 max-h-48 overflow-y-auto p-4">
                        {#if validationResult.errors?.length > 0}
                            <div class="space-y-2 mb-4">
                                <h4 class="text-red-400 text-xs font-bold uppercase tracking-wider">Errors ({validationResult.error_count})</h4>
                                {#each validationResult.errors as err}
                                    <div class="bg-red-900/20 border border-red-900/30 rounded-lg p-3 text-xs">
                                        <div class="text-red-300 font-bold mb-1">{err.error}</div>
                                        <div class="text-slate-400">{err.message}</div>
                                    </div>
                                {/each}
                            </div>
                        {/if}

                        {#if validationResult.warnings?.length > 0}
                            <div class="space-y-2">
                                <h4 class="text-yellow-400 text-xs font-bold uppercase tracking-wider">Warnings ({validationResult.warning_count})</h4>
                                {#each validationResult.warnings as warn}
                                    <div class="bg-yellow-900/20 border border-yellow-900/30 rounded-lg p-3 text-xs">
                                        <div class="text-yellow-300 font-bold mb-1">{warn.error}</div>
                                        <div class="text-slate-400">{warn.message}</div>
                                    </div>
                                {/each}
                            </div>
                        {/if}
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
