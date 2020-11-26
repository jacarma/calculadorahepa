<script>
  import ProductTable from "./ProductTable.svelte";
  import CalculadoraDesktop from "./CalculadoraDesktop.svelte";
  import CalculadoraMobile from "./CalculadoraMobile.svelte";
  import RangeSlider from "svelte-range-slider-pips";
  import { onMount } from "svelte";
  import csv from "./purificadores.csv";

  const MAX_W = 1200;
  const MAX_L = 1200;
  const MAX_H = 500;
  const vLabels = ["mala", "baja", "normal", "buena", "excelente"];
  const vRen = [0.5, 1, 1.5, 3, 4];
  let mobile = true;

  let w;
  let l;
  let h;
  let vent;
  let needCADR;

  const products = csv.map(p => ({
    name: p[0],
    price: +p[1],
    filter: p[2],
    CADR: +p[3],
    db: +(p[4] || 99),
    ASIN: p[5]
  }));

  function size() {
    mobile =
      window.innerHeight >= window.innerWidth || window.innerHeight <= 640;
  }

  onMount(size);
</script>

<style>
  :global(.pipVal) {
    font-size: 12px;
  }
  :global(#heightSlider) {
    height: 50%;
  }
  :global(#heightSlider .pipVal) {
    margin-left: 4px;
  }
</style>

<svelte:window on:resize={size} />

{#if mobile}
  <CalculadoraMobile bind:l bind:w bind:h bind:vent bind:needCADR />
{:else}
  <CalculadoraDesktop bind:l bind:w bind:h bind:vent bind:needCADR />
{/if}

<ProductTable {products} {needCADR} />
