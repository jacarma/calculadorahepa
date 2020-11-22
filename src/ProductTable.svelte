<script>
  import Product from "./Product.svelte";
  export let needCADR;
  export let products = [1, 2, 3];
</script>

<div class="bg-white my-4 " id="filtros">
  <div class="lg:mx-auto lg:container p-2 xl:p-8" id="filtros">
    <h1 class="text-3xl lg:text-4xl">Purificadores de aire</h1>
    <div class="-mm-2">
      <label class="text-gray-700 cursor-pointer m-2 whitespace-no-wrap">
        Ocultar por CADR
        <input type="checkbox" class="form-checkbox" />
      </label>
      <label class="text-gray-700 cursor-pointer m-2 whitespace-no-wrap">
        Mostrar filtros no HEPA estándar
        <input type="checkbox" class="form-checkbox" />
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
