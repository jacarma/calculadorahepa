<script>
  import RangeSlider from "svelte-range-slider-pips";
  import Room from "./Room.svelte";
  import Meters from "./Meters.svelte";
  import WindowInfo from "./WindowInfo.svelte";

  export let w = 500;
  export let l = 900;
  export let h = 280;
  export let vent = 0;
  export let needCADR;

  const MAX_W = 1200;
  const MAX_L = 1200;
  const MAX_H = 500;
  const vLabels = ["mala", "baja", "normal", "buena", "excelente"];
  const vRen = [0.5, 1, 1.5, 3, 4];

  let ww = w / 100;
  let ll = l / 100;
  let hh = h / 100;
  let vs = [vent];

  $: w = ww * 100;
  $: l = ll * 100;
  $: h = hh * 100;
  $: vent = vs[0];
  $: needCADR = Math.round(
    (5 - vRen[vent]) * (l / 100) * (w / 100) * (h / 100)
  );

  let windowInfo = false;
</script>

<div class="w-full">
  <div class="bg-purple-800 text-white flex shadow">
    <h1 class="text-left text-xl p-2 pl-4 flex-1">
      Calculadora de filtros HEPA
    </h1>
    <div class="flex justify-center items-center">
      <a
        href="/informacion.html"
        class="border border-purple-600 text-purple-200 uppercase text-xs
        rounded px-4 py-2 mx-2 hover:bg-purple-600 ">
        Ayuda
      </a>
    </div>
  </div>

  <div class="flex mx-2 relative z-10">
    <Meters bind:value={ww} label="Ancho" />
    <Meters bind:value={ll} label="Largo" />
  </div>

  <div style="height: 80vw; margin-top: -50px">
    <Room {l} {w} {h} {vent} />
  </div>

  <div class="mx-2">
    <Meters bind:value={hh} label="Alto" />
  </div>

  <div class="ml-3 pt-3">
    Ventilación existente {vRen[vent]} ACH
    <button
      type="button"
      class=" rounded-full bg-blue-500 text-white font-bold w-6 h-6 ml-3 shadow
      hover:bg-blue-400"
      on:click={() => (windowInfo = true)}>
      i
    </button>
  </div>
  <div class="flex">
    <div class="flex-1">
      <RangeSlider
        bind:values={vs}
        step={1}
        min={0}
        max={4}
        pips
        all="label"
        formatter={v => vLabels[v]} />
    </div>
  </div>

  <div class="text-xl bg-purple-700 text-white text-center py-6 mt-4">
    CADR necesario: {needCADR} m³/h
  </div>

</div>

{#if windowInfo}
  <div class="fixed overflow-y-scroll inset-0 bg-white p-6 md:p-12 z-10">
    <WindowInfo on:close={() => (windowInfo = false)} />
  </div>
{/if}
