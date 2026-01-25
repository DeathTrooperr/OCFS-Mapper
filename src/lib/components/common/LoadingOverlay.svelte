<script lang="ts">
    export let message: string = "Loading OCSF Schema...";
</script>

<div class="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm transition-opacity duration-200">
    <div class="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-4 max-w-xs w-full">
        <div class="relative w-12 h-12">
            <div class="absolute inset-0 border-4 border-blue-600/20 rounded-full"></div>
            <div class="absolute inset-0 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <div class="text-center">
            <h3 class="text-slate-100 font-bold">{message}</h3>
            <p class="text-slate-400 text-xs mt-1">Please wait while we prepare the mapper.</p>
        </div>
    </div>
</div>
