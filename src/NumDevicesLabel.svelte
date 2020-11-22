<script>
  export let numDevices;
  let classes;
  $: classes =
    numDevices == 1
      ? "text-green-600 font-bold text-base"
      : numDevices == 2
      ? "text-orange-600 font-bold text-base"
      : "text-red-600 font-bold text-base";
</script>

<span class={classes}>{numDevices}</span>
