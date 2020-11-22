<script>
  import RangeSlider from "svelte-range-slider-pips";
  import Room from "./Room.svelte";

  const MAX_W = 1200;
  const MAX_L = 1200;
  const MAX_H = 500;
  const vLabels = ["mala", "baja", "normal", "buena", "excelente"];
  const vRen = [0.5, 1, 1.5, 3, 4];

  let ws = [MAX_W - 600];
  let ls = [900];
  let hs = [MAX_H - 280];

  let vs = [0];

  export let w;
  export let l;
  export let h;
  export let vent;
  export let needCADR;

  $: w = ws[0];
  $: l = ls[0];
  $: h = hs[0];
  $: vent = vs[0];
  $: needCADR = Math.round(
    (5 - vRen[vent]) * (l / 100) * (w / 100) * (h / 100)
  );
</script>

<div class="w-full">
  <div class="bg-purple-800 text-white">
    <h1 class="text-center text-xl p-2 shadow">Calculadora de filtros HEPA</h1>
  </div>
  <div style="height: 80vw">
    <Room {l} {w} {h} {vent} />
  </div>

  <div class="ml-3 pt-3">ancho {w / 100} m</div>
  <div>
    <RangeSlider
      bind:values={ws}
      step={10}
      min={0}
      max={MAX_W}
      range="min"
      pips
      all="label"
      formatter={v => (('' + v).endsWith('50') ? '' : v / 100)}
      pipstep={5} />
  </div>

  <div class="ml-3 pt-3">largo {l / 100} m</div>
  <div>
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

  <div class="ml-3 pt-3">alto {h / 100} m</div>
  <div>
    <RangeSlider
      bind:values={hs}
      step={10}
      min={0}
      max={MAX_H}
      range="min"
      pips
      all="label"
      formatter={v => (('' + v).endsWith('50') ? '' : v / 100)}
      pipstep={5} />
  </div>

  <div class="ml-3 pt-3">Ventilación existente {vRen[vent]} renovaciones/h</div>
  <div class="mb-4">
    <RangeSlider
      bind:values={vs}
      step={1}
      min={0}
      max={4}
      pips
      all="label"
      formatter={v => vLabels[v]} />
  </div>

  <div class="text-xl bg-purple-700 text-white text-center p-4 mt-4">
    CADR necesario: {needCADR} m³/h
  </div>

</div>
