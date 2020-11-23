<script>
  import Product from "./Product.svelte";
  export let needCADR;
  export let products = [1, 2, 3];

  let hideCADR = false;
  let showNoHEPA = true;
</script>

<div class="bg-white my-4 " id="filtros">
  <div class="lg:mx-auto lg:container p-2 xl:p-8" id="filtros">
    <h1 class="text-3xl lg:text-4xl">Purificadores de aire</h1>
    <div class="-mx-4 mt-4">
      <label class="text-gray-700 cursor-pointer m-4 whitespace-no-wrap">
        Ocultar CADR bajo
        <input
          type="checkbox"
          class="form-checkbox w-5 h-5 ml-2"
          bind:checked={hideCADR} />
      </label>
      <label class="text-gray-700 cursor-pointer m-4 whitespace-no-wrap">
        Mostrar no HEPA estándar
        <input
          type="checkbox"
          class="form-checkbox w-5 h-5 ml-2"
          bind:checked={showNoHEPA} />
      </label>
    </div>
    <div class="flex flex-wrap -mx-1 md:-mx-4">
      {#each products as product}
        <div
          class="px-1 w-full md:my-4 md:px-4 md:w-1/2 xl:my-4 xl:px-4 xl:w-1/3">
          <Product {product} {needCADR} />
        </div>
      {/each}
    </div>
  </div>
</div>
