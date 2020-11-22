<script>
  export let filter;
  let classes;
  $: classes = ["HEPA H13", "HEPA H14", "MERV 13", "MERV 13"].includes(filter)
    ? "text-green-600 font-bold text-base"
    : "text-red-600 font-bold text-base";
</script>

<span class={classes}>{filter}</span>
