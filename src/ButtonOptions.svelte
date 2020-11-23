<script>
  export let options = [];
</script>

<div class="container text-center mx-auto p-4">

  <h3 class="text-xl text-gray-700 mb-2 font-bold">Simple</h3>
  <div class="flex justify-center rounded-lg text-lg mb-4" role="group">
    <button
      class="bg-blue-500 text-white hover:bg-blue-400 rounded-l-lg px-4 py-2
      mx-0 outline-none focus:shadow-outline">
      First
    </button>
    <button
      class="bg-blue-500 text-white hover:bg-blue-400 px-4 py-2 mx-0
      outline-none focus:shadow-outline">
      Second
    </button>
    <button
      class="bg-blue-500 text-white hover:bg-blue-400 rounded-r-lg px-4 py-2
      mx-0 outline-none focus:shadow-outline">
      Third
    </button>
  </div>

  <h3 class="text-xl text-gray-700 mb-2 font-bold">Outline</h3>
  <div class="flex justify-center rounded-lg text-lg" role="group">
    <button
      class="bg-white text-blue-500 hover:bg-blue-500 hover:text-white border
      border-r-0 border-blue-500 rounded-l-lg px-4 py-2 mx-0 outline-none
      focus:shadow-outline">
      First
    </button>
    <button
      class="bg-white text-blue-500 hover:bg-blue-500 hover:text-white border
      border-blue-500 px-4 py-2 mx-0 outline-none focus:shadow-outline">
      Second
    </button>
    <button
      class="bg-white text-blue-500 hover:bg-blue-500 hover:text-white border
      border-l-0 border-blue-500 rounded-r-lg px-4 py-2 mx-0 outline-none
      focus:shadow-outline">
      Third
    </button>
  </div>
</div>
