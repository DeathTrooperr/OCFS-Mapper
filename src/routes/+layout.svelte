<script lang="ts">
	import './layout.css';

	const { children } = $props();
</script>

<div class="min-h-screen bg-slate-950 text-slate-200 selection:bg-blue-500/30 selection:text-blue-200">
    {@render children()}
</div>
