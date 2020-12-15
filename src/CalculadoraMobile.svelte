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

  async function share() {
    if (!navigator.share) return;
    const shareData = {
      title: document.title,
      text: `Acabo de usar calculadorahepa.com
Volumen: ${ww} * ${ll} * ${hh} m³, 
ventilacion: ${vLabels[vent]} (${vRen[vent]} ACH). 
CADR necesario: ${needCADR}
`,
      url: window.location.href
    };
    try {
      await navigator.share(shareData);
      gtag("event", "share", { ...shareData, success: true });
    } catch (err) {
      gtag("event", "share", { ...shareData, success: false });
    }
  }
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

  <div class="flex mx-2">
    <Meters bind:value={hh} label="Alto" />
    {#if navigator.share}
      <div class="w-1/2 flex items-end justify-end">
        <button
          on:click={share}
          title="Compartir"
          class="rounded-full bg-purple-700 shadow text-white w-10 h-10 flex
          items-center justify-center">
          <svg
            class="w-6 h-6 -ml-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M8.684 13.342C8.886 12.938 9 12.482 9
              12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0
              2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3
              0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0
              00-5.368-2.684z" />
          </svg>
        </button>
      </div>
    {/if}
  </div>

  <div class="ml-3 pt-3">
    Ventilación existente {vRen[vent]} ACH
    <button
      type="button"
      title="Información sobre la ventilación"
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
