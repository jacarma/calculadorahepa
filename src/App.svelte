<script>
  import ProductTable from "./ProductTable.svelte";
  import CalculadoraDesktop from "./CalculadoraDesktop.svelte";
  import CalculadoraMobile from "./CalculadoraMobile.svelte";
  import RangeSlider from "svelte-range-slider-pips";

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

  const products = [
    {
      name: "Inventor Quality QLT-700",
      price: 449.99,
      filter: "HEPA H13",
      CADR: 700,
      db: 54,
      ASIN: "B081568TVM"
    },
    {
      name: "Inventor Quality QLT-550",
      price: 420.0,
      filter: "HEPA H13",
      CADR: 550,
      db: 54,
      ASIN: "B08155YBQH"
    },
    {
      name: "Inventor Quality QLT-700",
      price: 449.99,
      filter: "HEPA H13",
      CADR: 700,
      db: 54,
      ASIN: "B081568TVM"
    },
    {
      name: "Inventor Quality QLT-550",
      price: 420.0,
      filter: "HEPA H13",
      CADR: 550,
      db: 54,
      ASIN: "B08155YBQH"
    },
    {
      name: "Inventor Quality QLT-700",
      price: 449.99,
      filter: "HEPA H13",
      CADR: 700,
      db: 54,
      ASIN: "B081568TVM"
    },
    {
      name: "Inventor Quality QLT-550",
      price: 420.0,
      filter: "HEPA H13",
      CADR: 550,
      db: 54,
      ASIN: "B08155YBQH"
    }
  ];
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

<svelte:window
  on:resize={e => {
    mobile = e.target.innerHeight >= e.target.innerWidth || e.target.innerHeight <= 640;
  }} />

{#if mobile}
  <CalculadoraMobile bind:l bind:w bind:h bind:vent bind:needCADR />
{:else}
  <CalculadoraDesktop bind:l bind:w bind:h bind:vent bind:needCADR />
{/if}

<ProductTable {products} {needCADR} />
