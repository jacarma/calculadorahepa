<script>
  import ProductIframe from "./ProductIframe.svelte";
  import Filter from "./FilterLabel.svelte";
  import Ruido from "./RuidoLabel.svelte";
  import CADR from "./CADRLabel.svelte";
  import NumDevices from "./NumDevicesLabel.svelte";
  import { getContext } from "svelte";
  let appConfig = getContext("appConfig");

  export let product = {};
  export let needCADR = 450;
  $: numDevices = Math.ceil(needCADR / product.CADR);

  function safeName(name) {
    return name.replace(/\W+/g, "_");
  }
</script>

<div class="px-1 w-full md:my-4 md:px-4 md:w-1/2 xl:my-4 xl:px-4 xl:w-1/3">
  <div
    class="flex bg-white border-b-2 py-2 md:py-0 md:border-b-0 md:shadow
    md:rounded-lg overflow-hidden"
    on:click={() => {
      window.gtag('event', 'view-item', {
        ...product,
        event_label: product.name
      });
    }}>
    <div class="pt-4 pl-4">
      <ProductIframe name={product.name} ASIN={product.ASIN} />
    </div>
    <div class="flex-1 p-4 pb-1 flex flex-col">
      <h1 class="text-gray-900 font-bold text-lg mb-4">{product.name}</h1>
      <div class="flex flex-row flex-1">
        <div class="flex-1 relative">
          <p
            class="{$appConfig.adBlock ? 'my-1' : 'my-2'} text-gray-600 text-sm">
            Filtro
            <Filter filter={product.filter} />
          </p>
          <p
            class="{$appConfig.adBlock ? 'my-1' : 'my-2'} text-gray-600 text-sm">
            Ruido
            <Ruido ruido={product.db} />
          </p>
          <p
            class="{$appConfig.adBlock ? 'my-1' : 'my-2'} text-gray-600 text-sm">
            CADR
            <CADR CADR={product.CADR} {needCADR} />
          </p>
          <p
            class="{$appConfig.adBlock ? 'my-1' : 'my-2'} text-gray-600 text-sm">
            Dispositivos necesarios
            <NumDevices {numDevices} />
          </p>
          <a
            class=" text-purple-700 text-sm absolute right-0 bottom-0"
            class:absolute={$appConfig.adBlock === false}
            href="/purificador/{safeName(product.name)}?{$appConfig.urlParams}">
            Ver más detalles
          </a>
        </div>
        {#if $appConfig.adBlock}
          <div class="flex items-end">
            <a
              class="px-4 py-2 bg-yellow-500 rounded text-center
              hover:bg-yellow-400"
              target="_blank"
              href="https://www.amazon.es/gp/product/{product.ASIN}/ref=as_li_tl?ie=UTF8&camp=3638&creative=24630&creativeASIN=B08155YBQH&linkCode=as2&tag=hepa04-21&linkId=c058ecb116876da7f44482426d4cfd88">
              Comprar
              <br />
              en Amazon
            </a>
          </div>
        {/if}
      </div>
      <!-- <p class="my-3 text-gray-600 text-sm">score {product.score}</p> -->

      <!-- <div class="flex item-center justify-between mt-3">
        <button
          class="px-3 py-2 bg-gray-800 text-white text-xs font-bold uppercase
          rounded">
          Add to Card
        </button>
      </div> -->
    </div>
  </div>
</div>
