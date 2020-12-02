<script>
  import Filter from "./FilterLabel.svelte";
  import Ruido from "./RuidoLabel.svelte";
  import CADR from "./CADRLabel.svelte";
  import NumDevices from "./NumDevicesLabel.svelte";
  import { onMount } from "svelte";

  export let product = {};
  export let needCADR = 450;
  $: numDevices = Math.ceil(needCADR / product.CADR);

  let failedIframe = false;
  onMount(async () => {
    const isBrave =
      (navigator.brave && (await navigator.brave.isBrave())) || false;
    if (isBrave) failedIframe = true;
  });
</script>

<div
  class="flex bg-white border-b-2 py-2 md:py-0 md:border-b-0 md:shadow
  md:rounded-lg overflow-hidden">
  {#if !failedIframe}
    <div class="pt-4 pl-4">
      <iframe
        style="width:120px;height:240px;"
        marginwidth="0"
        marginheight="0"
        scrolling="no"
        frameborder="0"
        title={product.name}
        on:load={i => {
          const frame = i.target;
          let success = true;
          try {
            success = !!frame.offsetParent;
          } catch (err) {
            success = false;
          }
          if (!success) failedIframe = true;
        }}
        src="https://rcm-eu.amazon-adsystem.com/e/cm?ref=tf_til&t=hepa07-21&m=amazon&o=30&p=8&l=as1&IS1=1&asins={product.ASIN}&bc1=ffffff&lt1=_blank&fc1=333333&lc1=0066c0&bg1=ffffff&f=ifr" />
    </div>
  {/if}
  <div class="flex-1 p-4">
    <h1 class="text-gray-900 font-bold text-lg mb-4">{product.name}</h1>
    <div class="flex flex-row">
      <div class="flex-1">
        <p class="{failedIframe ? 'my-1' : 'my-3'} text-gray-600 text-sm">
          Filtro
          <Filter filter={product.filter} />
        </p>
        <p class="{failedIframe ? 'my-1' : 'my-3'} text-gray-600 text-sm">
          Ruido
          <Ruido ruido={product.db} />
        </p>
        <p class="{failedIframe ? 'my-1' : 'my-3'} text-gray-600 text-sm">
          CADR
          <CADR CADR={product.CADR} {needCADR} />
        </p>
        <p class="{failedIframe ? 'my-1' : 'my-3'} text-gray-600 text-sm">
          Dispositivos necesarios
          <NumDevices {numDevices} />
        </p>
      </div>
      {#if failedIframe}
        <div class="flex items-end">
          <a
            class="px-4 py-2 bg-yellow-500 rounded text-center
            hover:bg-yellow-400"
            target="_blank"
            href="https://www.amazon.es/gp/product/{product.ASIN}/ref=as_li_tl?ie=UTF8&camp=3638&creative=24630&creativeASIN=B08155YBQH&linkCode=as2&tag=hepa07-21&linkId=c058ecb116876da7f44482426d4cfd88">
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
