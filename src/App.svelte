<script>
  import ProductTable from "./ProductTable.svelte";
  import CalculadoraDesktop from "./CalculadoraDesktop.svelte";
  import CalculadoraMobile from "./CalculadoraMobile.svelte";
  import Footer from "./Footer.svelte";
  import RangeSlider from "svelte-range-slider-pips";
  import { onMount, setContext } from "svelte";
  import csv from "./purificadores.csv";
  import { writable } from "svelte/store";

  let appConfig = writable({ adBlock: true, urlParams: "" });
  setContext("appConfig", appConfig);
  let mobile = undefined;

  const p = new URLSearchParams(window.location.search);
  const param = (name, dflt) => parseFloat(p.get(name)) || dflt;

  let w = param("w", 500);
  let l = param("l", 900);
  let h = param("h", 280);
  let vent = param("vent", 0);
  let needCADR;

  const products = csv.map((p, i) => ({
    name: p[0],
    price: +p[1],
    filter: p[2],
    CADR: +p[3],
    db: +(p[4] || 99),
    ASIN: p[5],
    id: i
  }));

  $: {
    if (URLSearchParams) {
      if (("" + l + w + h + vent).length <= 16) {
        const p = new URLSearchParams({ w, l, h, vent });
        $appConfig.urlParams = p.toString();
        window.history.replaceState({}, "", "?" + p.toString());
      }
    }
    gtag("event", "calculate", { w, l, h, vent });
  }

  function size() {
    mobile =
      window.innerHeight >= window.innerWidth || window.innerHeight <= 640;
  }
  let attempts = 0;
  function checkAdBlock() {
    if (window.google_tag_data) {
      $appConfig = { ...$appConfig, adBlock: false };
    } else {
      attempts = attempts + 1;
      if (attempts < 1000) {
        window.setTimeout(checkAdBlock, 100);
      }
    }
  }

  onMount(() => {
    size();
    checkAdBlock();
  });
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

{#if mobile === true}
  <CalculadoraMobile bind:l bind:w bind:h bind:vent bind:needCADR />
{/if}
{#if mobile === false}
  <CalculadoraDesktop bind:l bind:w bind:h bind:vent bind:needCADR />
{/if}
<ProductTable {products} {needCADR} {mobile} />

<Footer />
