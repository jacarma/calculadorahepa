<script>
  import RangeSlider from "svelte-range-slider-pips";
  import Room from "./Room.svelte";
  import WindowInfo from "./WindowInfo.svelte";

  const MAX_W = 1200;
  const MAX_L = 1200;
  const MAX_H = 500;
  const vLabels = ["mala", "baja", "normal", "buena", "excelente"];
  const vRen = [0.5, 1, 1.5, 3, 4];

  let ws = [MAX_W - 600];
  let ls = [900];
  let hs = [MAX_H - 280];
  let vs = [0];
  let windowInfo = false;

  export let w;
  export let l;
  export let h;
  export let vent;
  export let needCADR;

  $: w = Math.max(0, MAX_W - ws[0]);
  $: l = Math.max(0, ls[0]);
  $: h = Math.max(0, MAX_H - hs[0]);
  $: vent = vs[0];
  $: needCADR = Math.round(
    (5 - vRen[vent]) * (l / 100) * (w / 100) * (h / 100)
  );
</script>

<div class="w-full h-full flex flex-col">
  <div class="bg-purple-800 text-white">
    <h1 class="text-center text-xl p-2 shadow">
      Calculadora de caudal de filtros HEPA
    </h1>
  </div>
  <div class="flex-1 flex relative">
    <div class="flex-1 flex flex-row">
      <div class="flex flex-column items-end">
        <RangeSlider
          bind:values={hs}
          step={10}
          min={0}
          max={MAX_H}
          range="max"
          pips
          all="label"
          formatter={v => (('' + v).endsWith('50') ? '' : (MAX_H - v) / 100)}
          pipstep={5}
          vertical
          id="heightSlider" />
      </div>
      <div class="relative w-8">

        <div
          class="transform -rotate-90 origin-bottom-left translate-x-6 absolute
          bottom-0 mb-3"
          style="width: {window.innerHeight / 2}px">
          alto {h / 100} m
        </div>
      </div>
      <div class="flex-1">
        <Room {l} {w} {h} {vent} />
      </div>
    </div>
    <div class="absolute top-0 left-0 ml-4 mt-4 w-1/3 z-10">

      <div class="ml-3">
        Ventilación existente
        <button
          type="button"
          class=" rounded-full bg-blue-500 text-white font-bold w-6 h-6 ml-3
          shadow hover:bg-blue-400"
          on:click={() => (windowInfo = true)}>
          i
        </button>
      </div>
      <RangeSlider
        bind:values={vs}
        step={1}
        min={0}
        max={4}
        pips
        all="label"
        formatter={v => vLabels[v]} />
      <div class="ml-3">{vRen[vent]} renovaciones por hora</div>
      {#if windowInfo}
        <div class=" p-6 bg-white rounded shadow z-10" style="width: 150%">
          <WindowInfo on:close={() => (windowInfo = false)} />
        </div>
      {/if}

    </div>
    <div class="absolute top-0 right-0 mt-4 mr-4 w-1/3 text-right">
      <div>volumen: {l / 100} * {w / 100} * {h / 100} m³</div>
      <div>ventilación: {vLabels[vent]} {vRen[vent]} ACH</div>
      <div class="text-xl text-purple-700">CADR necesario: {needCADR} m³/h</div>
      <div>
        <a href="#filtros" class="text-blue-600 underline">ver filtros</a>
      </div>
    </div>
  </div>

  <div class="flex flex-row">
    <div class="flex-1 mr-2">
      <div class="text-right mr-3">ancho {w / 100} m</div>

      <RangeSlider
        bind:values={ws}
        step={10}
        min={0}
        max={MAX_W}
        range="max"
        pips
        all="label"
        formatter={v => (('' + v).endsWith('50') ? '' : (MAX_W - v) / 100)}
        pipstep={5} />

    </div>
    <div class="flex-1">
      <div class="ml-3">largo {l / 100} m</div>
      <RangeSlider
        bind:values={ls}
        step={10}
        min={0}
        max={MAX_L}
        range="min"
        pips
        all="label"
        formatter={v => (('' + v).endsWith('50') ? '' : v / 100)}
        pipstep={5} />

    </div>

  </div>

</div>
