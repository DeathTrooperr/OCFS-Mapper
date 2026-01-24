<script lang="ts">
    import { downloadSDK } from '$lib/scripts/pages/home/sdk-utils';

    export let generatedCode: string;
    export let generatedTypes: string;

    async function handleDownloadSDK() {
        try {
            await downloadSDK(generatedTypes);
        } catch (error) {
            console.error('Error downloading SDK:', error);
            alert('Failed to download SDK. Please try again.');
        }
    }
</script>

<div class="h-full flex flex-col space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <div class="flex-1 min-h-0 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-y-auto">
        <div class="min-h-full flex flex-col justify-center items-center px-4 md:px-8 py-8 md:py-12 space-y-6 md:space-y-8">
            <div class="w-16 h-16 md:w-20 md:h-20 bg-emerald-500/10 rounded-full flex items-center justify-center shrink-0">
                <svg class="w-8 h-8 md:w-10 md:h-10 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
            </div>
            
            <div class="max-w-2xl px-2 text-center">
                <h2 class="text-xl md:text-2xl font-bold text-white">Your OCSF SDK is ready!</h2>
                <p class="text-slate-400 mt-2 text-sm md:text-base">
                    Download the SDK and add it to your project to use the generated mapping code. 
                    Place the <code>ocsf-sdk</code> folder in your project's source directory.
                </p>
            </div>

            <button 
                on:click={handleDownloadSDK}
                class="w-full sm:w-auto px-6 md:px-8 py-3 md:py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl transition-all shadow-xl shadow-emerald-900/20 flex items-center justify-center gap-3 text-base md:text-lg"
            >
                <svg class="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download OCSF SDK
            </button>

            <div class="w-full max-w-xl bg-slate-950/50 rounded-xl p-4 md:p-6 border border-slate-800">
                <h3 class="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">How to use:</h3>
                <ol class="space-y-3 text-xs md:text-sm text-slate-400">
                    <li class="flex items-start gap-3">
                        <span class="flex-none w-5 h-5 bg-slate-800 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-300">1</span>
                        <span>Extract the <code>ocsf-sdk.zip</code> file.</span>
                    </li>
                    <li class="flex items-start gap-3">
                        <span class="flex-none w-5 h-5 bg-slate-800 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-300">2</span>
                        <span>Copy the <code>ocsf-sdk</code> folder into your project's <code>src/lib</code> (or equivalent) directory.</span>
                    </li>
                    <li class="flex items-start gap-3">
                        <span class="flex-none w-5 h-5 bg-slate-800 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-300">3</span>
                        <span>Copy the generated code from the previous step into a new file (e.g., <code>mapping.ts</code>).</span>
                    </li>
                    <li class="flex items-start gap-3">
                        <span class="flex-none w-5 h-5 bg-slate-800 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-300">4</span>
                        <span>Ensure the import path in the generated code matches where you placed the SDK.</span>
                    </li>
                </ol>
            </div>
        </div>
    </div>
</div>
