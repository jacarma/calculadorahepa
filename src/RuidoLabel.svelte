<script>
  export let ruido;
  let classes;
  $: classes =
    ruido <= 55
      ? "text-green-600 font-bold text-base"
      : "text-red-600 font-bold text-base";
</script>

<span class={classes}>{ruido === 99 ? '?' : ruido} db</span>
