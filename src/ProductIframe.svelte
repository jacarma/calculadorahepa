<script>
  import { onMount } from "svelte";
  import Inview from "svelte-inview";
  import { getContext } from "svelte";
  let appConfig = getContext("appConfig");

  export let name = "";
  export let ASIN = "";
  let ref;
  let inView;
</script>

<style>
  .fade-in {
    animation: fadein 1s;
  }

  @keyframes fadein {
    0% {
      opacity: 0;
    }
    50% {
      opacity: 0;
    }
    100% {
      opacity: 1;
    }
  }
</style>

<Inview let:inView wrapper={ref}>
  <div bind:this={ref}>
    {#if !$appConfig.adBlock}
      <div style="width:120px;height:240px;">
        {#if inView}
          <iframe
            style="width:120px;height:240px;"
            class="fade-in"
            marginwidth="0"
            marginheight="0"
            scrolling="no"
            frameborder="0"
            title={name}
            src="https://rcm-eu.amazon-adsystem.com/e/cm?ref=tf_til&t=hepa07-21&m=amazon&o=30&p=8&l=as1&IS1=1&asins={ASIN}&bc1=ffffff&lt1=_blank&fc1=333333&lc1=0066c0&bg1=ffffff&f=ifr" />
        {:else}
          <div class="placeholder" />
        {/if}
      </div>
    {/if}
  </div>
</Inview>
