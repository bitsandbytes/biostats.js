<script>
  import { onMount } from 'svelte';
  import { store as peopleStore, loadPeople } from '../stores/people.svelte.js';
  import { loadTypes } from '../stores/measurementTypes.svelte.js';
  import PersonCard from '../components/people/PersonCard.svelte';
  import AddPersonModal from '../components/people/AddPersonModal.svelte';
  import Button from '../components/ui/Button.svelte';
  import EmptyState from '../components/ui/EmptyState.svelte';

  let showAddModal = $state(false);

  onMount(async () => {
    await Promise.all([loadPeople(), loadTypes()]);
  });
</script>

<div class="dashboard">
  <div class="header">
    <h1>Dashboard</h1>
    <Button onclick={() => { showAddModal = true; }}>+ Add Person</Button>
  </div>

  {#if peopleStore.people.length === 0}
    <EmptyState message="No people yet. Add someone to start tracking measurements." />
  {:else}
    <div class="grid">
      {#each peopleStore.people as person (person.id)}
        <PersonCard {person} />
      {/each}
    </div>
  {/if}

  {#if showAddModal}
    <AddPersonModal onclose={() => { showAddModal = false; }} />
  {/if}
</div>

<style>
  .dashboard {
    display: flex;
    flex-direction: column;

    gap: 1.5rem;
  }
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  h1 {
    margin: 0;
    font-size: 1.5rem;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1rem;
  }
</style>
