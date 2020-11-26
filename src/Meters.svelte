<script>
  export let value;
  export let label;
</script>

<div class="flex-1 m-2">
  <label for={label} class="block text-sm font-medium text-gray-700">
    {label}
  </label>
  <div class="mt-1 relative rounded-md shadow-sm">
    <div
      class="absolute inset-y-0 right-0 pr-3 flex items-center
      pointer-events-none">
      <span class="text-gray-500 sm:text-sm">m</span>
    </div>
    <input
      type="number"
      step="0.1"
      id={label}
      bind:value
      class="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-7
      pr-12 sm:text-sm border-gray-300 rounded-md form-input"
      placeholder="0.00" />
  </div>
</div>
