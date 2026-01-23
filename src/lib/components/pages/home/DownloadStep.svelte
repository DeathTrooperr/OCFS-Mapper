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

<div class="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <div class="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div class="px-8 py-12 flex flex-col items-center text-center space-y-8">
            <div class="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center">
                <svg class="w-10 h-10 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
            </div>
            
            <div class="max-w-md">
                <h2 class="text-2xl font-bold text-white">Your OCSF SDK is ready!</h2>
                <p class="text-slate-400 mt-2">
                    Download the SDK and add it to your project to use the generated mapping code. 
                    Place the <code>ocsf-sdk</code> folder in your project's source directory.
                </p>
            </div>

            <button 
                on:click={handleDownloadSDK}
                class="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl transition-all shadow-xl shadow-emerald-900/20 flex items-center gap-3 text-lg"
            >
                <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download OCSF SDK
            </button>

            <div class="w-full bg-slate-950/50 rounded-xl p-6 border border-slate-800 text-left">
                <h3 class="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">How to use:</h3>
                <ol class="space-y-3 text-sm text-slate-400">
                    <li class="flex gap-3">
                        <span class="flex-none w-5 h-5 bg-slate-800 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-300">1</span>
                        <span>Extract the <code>ocsf-sdk.zip</code> file.</span>
                    </li>
                    <li class="flex gap-3">
                        <span class="flex-none w-5 h-5 bg-slate-800 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-300">2</span>
                        <span>Copy the <code>ocsf-sdk</code> folder into your project's <code>src/lib</code> (or equivalent) directory.</span>
                    </li>
                    <li class="flex gap-3">
                        <span class="flex-none w-5 h-5 bg-slate-800 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-300">3</span>
                        <span>Copy the generated code from the previous step into a new file (e.g., <code>mapping.ts</code>).</span>
                    </li>
                    <li class="flex gap-3">
                        <span class="flex-none w-5 h-5 bg-slate-800 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-300">4</span>
                        <span>Ensure the import path in the generated code matches where you placed the SDK.</span>
                    </li>
                </ol>
            </div>
        </div>
    </div>
</div>
