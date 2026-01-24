<script lang="ts">
    import type { PageData } from "./$types";
    import Header from "$lib/components/pages/home/Header.svelte";
    import StepWizard from "$lib/components/pages/home/StepWizard.svelte";
    import JSONInputStep from "$lib/components/pages/home/JSONInputStep.svelte";
    import SourceFieldsStep from "$lib/components/pages/home/SourceFieldsStep.svelte";
    import OCSFMappingStep from "$lib/components/pages/home/OCSFMappingStep.svelte";
    import TestingStep from "$lib/components/pages/home/TestingStep.svelte";
    import ExportStep from "$lib/components/pages/home/ExportStep.svelte";
    import DownloadStep from "$lib/components/pages/home/DownloadStep.svelte";
    import AIModal from "$lib/components/pages/home/AIModal.svelte";
    import type { DeterminingField, SchemaField, SavedMap, ClassMapping, OCSFSchemaData, OCSFClass, OCSFCategory, AttributeMapping } from "$lib/scripts/types/types";
    import { parseSchema, generateCodeSnippet, prepareParserConfig } from "$lib/scripts/pages/home/mapping-utils";
    import { generateOCSFPrompt as createOCSFPrompt, parseAIPrompt } from "$lib/scripts/pages/home/ai-utils";
    import { loadRecentMaps, saveMap, deleteMapFromStorage } from "$lib/scripts/pages/home/persistence";

    import { onMount } from "svelte";

    export let data: PageData;
    $: ocsf = (data as any).ocsf as OCSFSchemaData;

    $: ENABLE_AI_ASSISTANT = data.enableAI;

    let jsonInput = '';
    let schemaFields: SchemaField[] = [];
    let selectedCategory = '';
    let selectedClass = '';
    let useConditionalClass = false;
    let mappings: Record<string, AttributeMapping> = {};
    let activeMappingIndex: { fieldIdx: number, mappingIdx: number } | 'default' = 'default';
    let classDeterminingFields: DeterminingField[] = [];
    let generatedCode = '';
    let generatedTypes = '';

    let currentStep = 0;
    const steps = ["Input", "Schema", "Mapping", "Testing", "Export", "Download"];

    $: parserConfig = prepareParserConfig(
        schemaFields,
        selectedCategory,
        selectedClass,
        useConditionalClass,
        classDeterminingFields,
        data.ocsf,
        mappings
    );

    $: ocsfCategories = Object.values(ocsf?.categories || {}).sort((a, b) => a.caption.localeCompare(b.caption));
    $: filteredClasses = (cat: string) => Object.values(ocsf?.classes || {}).filter(c => c.category === cat || (cat === 'other' && c.name === 'base_event'));
    

    let showPromptModal = false;
    let aiPromptInput = '';

    function generateOCSFPrompt() {
        return createOCSFPrompt(ocsfCategories, data.ocsf.classes, data.ocsf.dictionary, data.ocsf.profiles);
    }

    function parseAIPromptHandler() {
        try {
            const result = parseAIPrompt(aiPromptInput, data.ocsf.categories, data.ocsf.classes);
            if (result) {
                useConditionalClass = result.useConditionalClass;
                classDeterminingFields = result.classDeterminingFields;
                schemaFields = result.schemaFields;
                selectedCategory = result.selectedCategory;
                selectedClass = result.selectedClass;
                activeMappingIndex = result.activeMappingIndex;

                showPromptModal = false;
                aiPromptInput = '';
                currentStep = 2; // Jump to mapping step
            }
        } catch (error: any) {
            console.error("[DEBUG_LOG] Error in parseAIPromptHandler:", error);
            alert(error.message || "An error occurred while parsing the AI prompt.");
        }
    }

    function handleParseSchema() {
        try {
            schemaFields = parseSchema(jsonInput);
            
            classDeterminingFields = classDeterminingFields.map(field => ({
                ...field,
                mappings: field.mappings.map((m: ClassMapping) => ({
                    ...m,
                    mappings: m.mappings || {}
                }))
            }));
            currentStep = 1;
        } catch (e: any) {
            alert(e.message || 'Invalid JSON');
        }
    }

    function handleGenerateCode() {
        const result = generateCodeSnippet(
            schemaFields,
            selectedCategory,
            selectedClass,
            useConditionalClass,
            classDeterminingFields,
            data.ocsf,
            mappings
        );
        generatedCode = result.code;
        generatedTypes = result.types;
    }

    // --- Persistence Logic ---
    let recentMaps: SavedMap[] = [];
    let isInitialLoad = true;
    let currentMapName = '';
    let currentMapId = '';

    onMount(() => {
        recentMaps = loadRecentMaps();
        if (recentMaps.length > 0) {
            loadMap(recentMaps[0]);
        }
        isInitialLoad = false;
    });

    function saveCurrentMap() {
        recentMaps = saveMap({
            id: currentMapId,
            name: currentMapName,
            jsonInput,
            schemaFields,
            selectedCategory,
            selectedClass,
            useConditionalClass,
            mappings,
            classDeterminingFields,
            currentStep,
            activeMappingIndex
        });
        
        // Update current name and ID from the saved map (it might have been auto-named or assigned a new ID)
        if (recentMaps.length > 0) {
            // Find the map we just saved in the recent list
            const savedMap = currentMapId 
                ? recentMaps.find(m => m.id === currentMapId) 
                : recentMaps[0]; // If it was new, it will be at the top

            if (savedMap) {
                currentMapName = savedMap.name;
                currentMapId = savedMap.id;
            }
        }
    }

    function loadMap(map: SavedMap) {
        if (!map) return;
        currentMapId = map.id;
        currentMapName = map.name;
        jsonInput = map.jsonInput;
        schemaFields = map.schemaFields;
        selectedCategory = map.selectedCategory;
        selectedClass = map.selectedClass;
        useConditionalClass = map.useConditionalClass;
        mappings = map.mappings || {};
        classDeterminingFields = map.classDeterminingFields;
        
        // Restore state for the loaded map
        activeMappingIndex = map.activeMappingIndex || 'default';
        if (map.currentStep !== undefined) {
            currentStep = map.currentStep;
        } else if (!isInitialLoad) {
            currentStep = schemaFields.length > 0 ? 1 : 0;
        }

        // Update timestamp for "recent" sorting
        saveCurrentMap();
    }

    function deleteMap(id: string) {
        if (confirm('Are you sure you want to delete this map?')) {
            recentMaps = deleteMapFromStorage(id);
            if (currentMapId === id) {
                clearCurrentMap();
            }
        }
    }

    function clearCurrentMap() {
        jsonInput = '';
        schemaFields = [];
        selectedCategory = '';
        selectedClass = '';
        useConditionalClass = false;
        mappings = {};
        classDeterminingFields = [];
        currentMapName = '';
        currentMapId = '';
        activeMappingIndex = 'default';
        currentStep = 0;
    }

    function handleImportSchema(event: CustomEvent<string>) {
        jsonInput = event.detail;
        handleParseSchema();
    }

    let autoSaveTimer: any;
    $: if (!isInitialLoad && typeof window !== 'undefined' && currentStep >= 1 && (jsonInput || schemaFields.length > 0)) {
        // Dependency tracking for auto-save
        jsonInput; schemaFields; selectedCategory; selectedClass; useConditionalClass; classDeterminingFields; mappings; currentStep; activeMappingIndex;
        
        if (autoSaveTimer) clearTimeout(autoSaveTimer);
        autoSaveTimer = setTimeout(() => {
            saveCurrentMap();
        }, 2000);
    }
</script>

<main class="h-dvh w-full bg-slate-950 text-slate-200 font-sans selection:bg-blue-500/30 flex flex-col overflow-hidden">
    <div class="flex-1 flex flex-col min-h-0 max-w-7xl w-full mx-auto overflow-hidden">
        <div class="flex-none p-4 md:p-8 pb-0">
            <Header 
                bind:currentMapName 
                {currentMapId}
                {recentMaps} 
                onSave={saveCurrentMap}
                onLoad={loadMap}
                onDelete={deleteMap}
                onClear={clearCurrentMap}
                onShowAI={() => showPromptModal = true}
                enableAI={ENABLE_AI_ASSISTANT}
            />

            <StepWizard 
                {currentStep} 
                {steps} 
                onStepClick={(s) => currentStep = s}
            />
        </div>

        <div class="flex-1 overflow-hidden p-4 md:p-8 pt-2 md:pt-4 min-h-0">
            <div class="w-full h-full flex flex-col">
                <div class="flex-1 min-h-0">
                    {#if currentStep === 0}
                        <JSONInputStep bind:jsonInput enableAI={ENABLE_AI_ASSISTANT} />
                    {:else if currentStep === 1}
                        <SourceFieldsStep bind:schemaFields />
                    {:else if currentStep === 2}
                        <OCSFMappingStep 
                            {data}
                            bind:schemaFields
                            bind:useConditionalClass
                            bind:classDeterminingFields
                            bind:mappings
                            bind:selectedCategory
                            bind:selectedClass
                            bind:activeMappingIndex
                        />
                    {:else if currentStep === 3}
                        <TestingStep config={parserConfig} />
                    {:else if currentStep === 4}
                        <ExportStep 
                            bind:generatedCode 
                            onGenerate={handleGenerateCode} 
                        />
                    {:else if currentStep === 5}
                        <DownloadStep 
                            {generatedCode}
                            {generatedTypes}
                        />
                    {/if}
                </div>
            </div>
        </div>

        <div class="flex-none p-4 md:p-6 border-t border-slate-800 bg-slate-950/50 backdrop-blur-sm">
            <div class="flex justify-between items-center max-w-full">
                <button 
                    on:click={() => currentStep = Math.max(0, currentStep - 1)}
                    class="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-400 font-bold rounded-xl transition-all disabled:opacity-0"
                    disabled={currentStep === 0}
                >
                    Back
                </button>
                
                <button 
                    on:click={() => {
                        if (currentStep === 0) {
                            handleParseSchema();
                        } else {
                            if (currentStep === 3) handleGenerateCode();
                            currentStep = Math.min(steps.length - 1, currentStep + 1);
                        }
                    }}
                    class="px-10 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-900/20 disabled:opacity-0"
                    disabled={currentStep === steps.length - 1 || (currentStep === 0 && !jsonInput.trim())}
                >
                    {currentStep === 0 ? 'Process JSON' : (currentStep === steps.length - 2 ? 'Finish & Export' : 'Next Step')}
                </button>
            </div>
        </div>
    </div>
</main>

{#if ENABLE_AI_ASSISTANT}
    <AIModal 
        bind:show={showPromptModal}
        prompt={generateOCSFPrompt()}
        bind:aiInput={aiPromptInput}
        onApply={parseAIPromptHandler}
        onClose={() => showPromptModal = false}
    />
{/if}