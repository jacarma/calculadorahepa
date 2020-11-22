<script>
  export let CADR;
  export let needCADR;
  let classes;
  $: classes =
    CADR > needCADR
      ? "text-green-600 font-bold text-base"
      : Math.ceil(needCADR / CADR) === 2
      ? "text-orange-600 font-bold text-base"
      : "text-red-600 font-bold text-base";
</script>

<span class={classes}>{CADR} m³/h</span>
