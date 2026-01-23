<script lang="ts">
    export let currentStep: number;
    export let steps: string[];
    export let onStepClick: (step: number) => void;
</script>

<div class="relative flex justify-between items-center max-w-4xl mx-auto mb-12 px-4">
    <!-- Progress Line -->
    <div class="absolute top-5 left-0 w-full h-0.5 bg-slate-800 z-0"></div>
    <div 
        class="absolute top-5 left-0 h-0.5 bg-blue-600 z-0 transition-all duration-500"
        style="width: {(currentStep / (steps.length - 1)) * 100}%"
    ></div>

    {#each steps as step, i}
        <button 
            on:click={() => onStepClick(i)}
            class="relative z-10 flex flex-col items-center gap-2 group focus:outline-none"
        >
            <div 
                class="w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300
                {i <= currentStep ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-900/40' : 'bg-slate-900 border-slate-700 text-slate-500 group-hover:border-slate-500'}"
            >
                {#if i < currentStep}
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                    </svg>
                {:else}
                    <span class="text-sm font-bold">{i + 1}</span>
                {/if}
            </div>
            <span class="text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-colors duration-300 whitespace-nowrap
                {i <= currentStep ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-400'}">
                {step}
            </span>
        </button>
    {/each}
</div>
