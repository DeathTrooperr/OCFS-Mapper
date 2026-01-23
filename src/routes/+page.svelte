<script lang="ts">
    import type { PageData } from "./$types";
    import Header from "$lib/components/pages/home/Header.svelte";
    import StepWizard from "$lib/components/pages/home/StepWizard.svelte";
    import JSONInputStep from "$lib/components/pages/home/JSONInputStep.svelte";
    import SourceFieldsStep from "$lib/components/pages/home/SourceFieldsStep.svelte";
    import OCSFMappingStep from "$lib/components/pages/home/OCSFMappingStep.svelte";
    import ExportStep from "$lib/components/pages/home/ExportStep.svelte";
    import AIModal from "$lib/components/pages/home/AIModal.svelte";
    import type { DeterminingField, SchemaField, SavedMap, ClassMapping, OCSFSchemaData, OCSFClass, OCSFCategory } from "$lib/scripts/types/types";
    import { parseSchema, generateCodeSnippet } from "$lib/scripts/pages/home/mapping-utils";
    import { generateOCSFPrompt as createOCSFPrompt, parseAIPrompt } from "$lib/scripts/pages/home/ai-utils";
    import { loadRecentMaps, saveMap, deleteMapFromStorage } from "$lib/scripts/pages/home/persistence";

    import { onMount } from "svelte";

    export let data: PageData;
    $: ocsf = (data as any).ocsf as OCSFSchemaData;

    let jsonInput = '';
    let schemaFields: SchemaField[] = [];
    let selectedCategory = '';
    let selectedClass = '';
    let useConditionalClass = false;
    let activeMappingIndex: { fieldIdx: number, mappingIdx: number } | 'default' = 'default';
    let classDeterminingFields: DeterminingField[] = [];
    let generatedCode = '';

    let currentStep = 0;
    const steps = ["Input", "Schema", "Mapping", "Export"];

    $: ocsfCategories = Object.values(ocsf?.categories || {}).sort((a, b) => a.caption.localeCompare(b.caption));
    $: filteredClasses = (cat: string) => Object.values(ocsf?.classes || {}).filter(c => c.category === cat || (cat === 'other' && c.name === 'base_event'));
    
    $: currentMappingFields = activeMappingIndex === 'default' 
        ? schemaFields 
        : classDeterminingFields[activeMappingIndex.fieldIdx]?.mappings[activeMappingIndex.mappingIdx]?.schemaFields || [];

    $: currentClass = activeMappingIndex === 'default'
        ? ocsf?.classes[selectedClass]
        : (typeof activeMappingIndex === 'object' ? ocsf?.classes[classDeterminingFields[activeMappingIndex.fieldIdx]?.mappings[activeMappingIndex.mappingIdx]?.selectedClass] : undefined);


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
                    schemaFields: JSON.parse(JSON.stringify(schemaFields))
                }))
            }));
            currentStep = 1;
        } catch (e: any) {
            alert(e.message || 'Invalid JSON');
        }
    }

    function handleGenerateCode() {
        generatedCode = generateCodeSnippet(
            schemaFields,
            selectedCategory,
            selectedClass,
            useConditionalClass,
            classDeterminingFields,
            data.ocsf
        );
    }

    // --- Persistence Logic ---

    let recentMaps: SavedMap[] = [];
    let isInitialLoad = true;
    let currentMapName = '';

    onMount(() => {
        recentMaps = loadRecentMaps();
        if (recentMaps.length > 0) {
            loadMap(recentMaps[0]);
        }
        isInitialLoad = false;
    });

    function saveCurrentMap() {
        recentMaps = saveMap({
            name: currentMapName,
            jsonInput,
            schemaFields,
            selectedCategory,
            selectedClass,
            useConditionalClass,
            classDeterminingFields
        });
        
        // Update current name if it was empty
        if (!currentMapName && recentMaps.length > 0) {
            currentMapName = recentMaps[0].name;
        }
    }

    function loadMap(map: SavedMap) {
        if (!map) return;
        currentMapName = map.name;
        jsonInput = map.jsonInput;
        schemaFields = map.schemaFields;
        selectedCategory = map.selectedCategory;
        selectedClass = map.selectedClass;
        useConditionalClass = map.useConditionalClass;
        classDeterminingFields = map.classDeterminingFields;
        
        // Reset state for the loaded map
        activeMappingIndex = 'default';
        if (!isInitialLoad) currentStep = 1;

        // Update timestamp for "recent" sorting
        saveCurrentMap();
    }

    function deleteMap(id: string) {
        if (confirm('Are you sure you want to delete this map?')) {
            recentMaps = deleteMapFromStorage(id);
        }
    }

    function clearCurrentMap() {
        jsonInput = '';
        schemaFields = [];
        selectedCategory = '';
        selectedClass = '';
        useConditionalClass = false;
        classDeterminingFields = [];
        currentMapName = '';
        activeMappingIndex = 'default';
        currentStep = 0;
    }

    function handleImportSchema(event: CustomEvent<string>) {
        jsonInput = event.detail;
        handleParseSchema();
    }

    function handleFieldChange(event: CustomEvent<SchemaField[]>) {
        if (activeMappingIndex === 'default') {
            schemaFields = event.detail;
        } else {
            classDeterminingFields[activeMappingIndex.fieldIdx].mappings[activeMappingIndex.mappingIdx].schemaFields = event.detail;
            classDeterminingFields = [...classDeterminingFields];
        }
    }

    function handleOCSFChange(event: CustomEvent<{category: string, class: string}>) {
        if (activeMappingIndex === 'default') {
            selectedCategory = event.detail.category;
            selectedClass = event.detail.class;
        } else {
            const mapping = classDeterminingFields[activeMappingIndex.fieldIdx].mappings[activeMappingIndex.mappingIdx];
            mapping.selectedCategory = event.detail.category;
            mapping.selectedClass = event.detail.class;
            classDeterminingFields = [...classDeterminingFields];
        }
    }

    let autoSaveTimer: any;
    $: if (!isInitialLoad && typeof window !== 'undefined' && (jsonInput || schemaFields.length > 0)) {
        if (autoSaveTimer) clearTimeout(autoSaveTimer);
        autoSaveTimer = setTimeout(() => {
            saveCurrentMap();
        }, 2000);
    }
</script>

<main class="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-blue-500/30">
    <div class="max-w-[1400px] mx-auto p-4 md:p-8 space-y-8">
        <Header 
            bind:currentMapName 
            {recentMaps} 
            onSave={saveCurrentMap}
            onLoad={loadMap}
            onDelete={deleteMap}
            onShowAI={() => showPromptModal = true}
        />

        <StepWizard 
            {currentStep} 
            {steps} 
            onStepClick={(s) => currentStep = s}
        />

        <div class="min-h-[500px]">
            {#if currentStep === 0}
                <JSONInputStep bind:jsonInput />
            {:else if currentStep === 1}
                <SourceFieldsStep bind:schemaFields />
            {:else if currentStep === 2}
                <OCSFMappingStep 
                    {data}
                    bind:schemaFields
                    bind:useConditionalClass
                    bind:classDeterminingFields
                    bind:selectedCategory
                    bind:selectedClass
                    bind:activeMappingIndex
                />
            {:else if currentStep === 3}
                <ExportStep 
                    bind:generatedCode 
                    onGenerate={handleGenerateCode} 
                />
            {/if}
        </div>

        <div class="flex justify-between items-center pt-8 border-t border-slate-800">
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
                        if (currentStep === 2) handleGenerateCode();
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
</main>

<AIModal 
    bind:show={showPromptModal}
    prompt={generateOCSFPrompt()}
    bind:aiInput={aiPromptInput}
    onApply={parseAIPromptHandler}
    onClose={() => showPromptModal = false}
/>


