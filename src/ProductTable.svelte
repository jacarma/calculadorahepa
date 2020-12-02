<script>
  import Product from "./Product.svelte";
  export let needCADR;
  export let mobile;
  export let products = [1, 2, 3];

  let showLowCADR = true;
  let showNoHEPA = true;

  $: filtered = products
    .filter(p => {
      if (!showLowCADR && p.CADR < needCADR) return false;
      if (!showNoHEPA && !isHEPA(p)) return false;
      return true;
    })
    .sort((p1, p2) => score(p1) - score(p2))
    .map(p => ({ ...p, score: score(p) }));

  function score(p) {
    const needDevices = Math.ceil(needCADR / p.CADR);
    const filterFactor = isHEPA(p) ? 1 : 3;
    const totalPrice = needDevices * p.price;
    const noiseFactor =
      needDevices === 1 && p.db <= 55
        ? 1
        : needDevices === 1 && p.db > 55
        ? 1.5
        : (needDevices * p.db) / 55;
    const wiredFactor = 1 + (needDevices - 1) * 0.2;
    return totalPrice * filterFactor * noiseFactor * wiredFactor;
    // return needDevices === 1
    //   ? p.price * (p.db > 55 ? 1.5 : 1)
    //   : p.price * Math.pow(1.8, needDevices) * ((p.db * needDevices) / 55);
  }
  function isHEPA(p) {
    return ["HEPA", "HEPA H13", "HEPA H14", "MERV 13", "MERV 13"].includes(
      p.filter
    );
  }
</script>

<div class="bg-white my-4 " id="filtros">
  <div class="lg:mx-auto lg:container md:p-2 xl:p-8" id="filtros">
    <div class="px-2 md:px-0">
      <h1 class="text-3xl lg:text-4xl my-6">
        Purificadores de aire
        {#if mobile === false}
          <span class="text-lg text-purple-600">
            (CADR necesario {needCADR})
          </span>
        {/if}
      </h1>

      <p class="text-xs text-gray-500">
        * Algunos enlaces son de afiliado, un 5% de los beneficios obtenidos por
        estos enlaces será donado a
        <a
          class="text-blue-600 underline"
          href="https://es.gofundme.com/f/medidores-co2-para-espana-y-latinoamerica"
          target="_blank">
          la campaña de reparto de medidores de CO2 de José Luis Jiménez
        </a>
        . ** Los valores indicados en la lista son proporcionados por el
        fabricante
      </p>
      <div class="-mx-4 mt-4">
        <label
          class="text-gray-600 text-sm cursor-pointer m-4 whitespace-no-wrap">
          Ver CADR bajo
          <input
            type="checkbox"
            class="form-checkbox ml-2"
            bind:checked={showLowCADR} />
        </label>
        <label
          class="text-gray-600 text-sm cursor-pointer m-4 whitespace-no-wrap">
          Ver NO HEPA
          <input
            type="checkbox"
            class="form-checkbox ml-2"
            bind:checked={showNoHEPA} />
        </label>
      </div>
    </div>
    <div class="flex flex-wrap -mx-1 md:-mx-4">
      {#each filtered as product}
        <div
          class="px-1 w-full md:my-4 md:px-4 md:w-1/2 xl:my-4 xl:px-4 xl:w-1/3">
          <Product {product} {needCADR} />
        </div>
      {/each}
    </div>
  </div>
</div>
