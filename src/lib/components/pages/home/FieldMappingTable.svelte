<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import type { SchemaField, AttributeMapping, OCSFSchemaData } from "$lib/scripts/types/types";
    import { isTypeCompatible, getTsType, groupFields } from "$lib/scripts/pages/home/mapping-utils";
    import { OBSERVABLE_TYPE_NAMES } from "$lib/sdk/observables";
    import FieldMappingRow from "./FieldMappingRow.svelte";
    export let schemaFields: SchemaField[];
    export let targetClass: any;
    export let title: string;
    export let mappings: Record<string, AttributeMapping>;
    export let defaultMappings: Record<string, AttributeMapping> = {};
    export let isDefault = true;
    export let ocsfData: OCSFSchemaData | undefined = undefined;

    const dispatch = createEventDispatcher();

    let searchQuery = "";
    let instanceCounts: Record<string, number> = {};

    function handleChange() {
        dispatch('change');
    }

    $: filteredAttributes = targetClass ? Object.values(targetClass.attributes)
        .filter((a: any) => {
            const query = searchQuery.toLowerCase();
            const name = a.name.toLowerCase();
            const caption = a.caption.toLowerCase();
            return name.includes(query) || caption.includes(query) || query.startsWith(name + '.') || query.startsWith(name + '[');
        })
        .sort((a: any, b: any) => {
            const reqOrder: Record<string, number> = { 'required': 0, 'recommended': 1, 'optional': 2 };
            const aReq = reqOrder[a.requirement || 'optional'] ?? 3;
            const bReq = reqOrder[b.requirement || 'optional'] ?? 3;
            if (aReq !== bReq) return aReq - bReq;
            return a.caption.localeCompare(b.caption);
        }) : [];

    $: getCompatibleFields = (attr: any) => schemaFields.filter(sf => isTypeCompatible(attr, sf));
    $: getObservableTypeName = (typeId: number) => {
        return OBSERVABLE_TYPE_NAMES[typeId] || `ID: ${typeId}`;
    };

    $: allMappings = isDefault ? mappings : { ...defaultMappings, ...mappings };
    $: mappedSourceFields = new Set(Object.values(allMappings).map(m => m.sourceField).filter(Boolean));
    
    const resolveAttr = (path: string): any => {
        if (!ocsfData || !targetClass) return undefined;
        
        const parts = path.split('.');
        let currentClass = targetClass;
        let attr: any;

        for (let i = 0; i < parts.length; i++) {
            let partName = parts[i].replace(/\[\d*\]$/, '');
            
            attr = currentClass.attributes[partName];
            if (i < parts.length - 1) {
                if (!attr || !ocsfData.classes[attr.type]) return undefined;
                currentClass = ocsfData.classes[attr.type];
            }
        }
        return attr;
    };

    $: activeObservables = schemaFields
        .filter(sf => sf.isObservable)
        .map(sf => {
            // Find if this source field is mapped to any OCSF attribute
            const mapping = Object.entries(allMappings).find(([_, m]) => m.sourceField === sf.name);
            const path = mapping ? mapping[0] : `unmapped.${sf.name}`;
            
            return {
                name: path,
                caption: sf.name,
                typeId: sf.observableTypeId!,
                isFromSource: true
            };
        })
        .sort((a, b) => a.caption.localeCompare(b.caption));

    $: unmappedSourceFields = schemaFields.filter(sf => {
        if (sf.type === 'object') return false;
        if (mappedSourceFields.has(sf.name)) return false;
        
        // Check if any parent is mapped
        const parts = sf.name.split('.');
        for (let i = 1; i < parts.length; i++) {
            const parentPath = parts.slice(0, i).join('.');
            if (mappedSourceFields.has(parentPath)) return false;
        }
        return true;
    });

    $: observableTypes = ocsfData?.types ? Object.entries(ocsfData.types)
        .filter(([_, t]: [string, any]) => t.observable !== undefined)
        .sort((a: [string, any], b: [string, any]) => a[1].caption.localeCompare(b[1].caption))
        : [];

    const typeColors: Record<string, string> = {
        string: 'text-blue-400',
        number: 'text-green-400',
        boolean: 'text-yellow-400',
        enum: 'text-purple-400',
        object: 'text-slate-400',
        array: 'text-slate-400'
    };

    const typeIcons: Record<string, string> = {
        string: 'Abc',
        number: '123',
        boolean: 'T/F',
        enum: ':::',
        object: '{}',
        array: '[]'
    };

    function getDisplayType(attr: any) {
        if (attr.is_array) return 'array';
        if (ocsfData?.classes[attr.type]) return 'object';
        if (attr.enum) return 'enum';
        const t = (attr.type || '').toLowerCase();
        if (t.includes('int') || t.includes('float') || t.includes('long') || t.includes('double') || t === 'number') return 'number';
        if (t.includes('bool')) return 'boolean';
        return 'string';
    }
</script>


<div class="h-full flex flex-col space-y-3 p-2 md:p-6">
    <div class="flex-none flex flex-col md:flex-row md:items-center justify-between mb-2 md:mb-4 px-1 md:px-2 gap-3 md:gap-4">
        <h3 class="text-base md:text-lg font-bold text-white flex items-center gap-2 md:gap-3">
            <span class="w-1 h-5 md:w-1.5 md:h-6 bg-blue-500 rounded-full"></span>
            {title}
        </h3>
        <div class="relative w-full md:w-96">
            <input 
                type="text" 
                bind:value={searchQuery}
                placeholder="Search OCSF attributes..."
                class="w-full bg-slate-900 border border-slate-800 text-slate-200 text-[11px] md:text-xs p-2 md:p-2.5 pl-8 md:pl-9 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
            <svg class="w-3.5 h-3.5 md:w-4 md:h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
        </div>
    </div>


    <div class="flex-1 overflow-y-auto min-h-0 pr-1 md:pr-2 space-y-2 md:space-y-3">
        {#each filteredAttributes as attr (attr.name)}
            <FieldMappingRow 
                {attr}
                path={attr.name}
                {schemaFields}
                {mappings}
                {defaultMappings}
                {isDefault}
                {ocsfData}
                {instanceCounts}
                on:change={handleChange}
            />
        {/each}
    </div>
</div>
