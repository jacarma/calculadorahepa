<script>
  import Isomer, { Point, Path, Shape, Vector, Color } from "isomer";
  import { onMount } from "svelte";
  import { watchResize } from "svelte-watch-resize";

  let canvas;
  let canvasW;
  let canvasH;
  export let w;
  export let l;
  export let h;
  export let vent;

  // onMount(() => setTimeout(() => draw(canvasW, canvasH)))

  $: if (canvas && l && w && h && canvasW) {
    draw(canvasW, canvasH, vent);
  }

  function draw(cW, cH, vent) {
    canvasW = cW;
    canvasH = cH;
    // console.log(cW, cH)
    if (!canvas) return;
    canvas.width = cW * 2;
    canvas.height = cH * 2;
    const scale = (Math.min(cW, cH) * 2.3) / (w + l);
    // console.log(scale)
    var iso = new Isomer(canvas, {
      scale,
      originX: cW - ((l - w) * scale) / 2,
      originY: cH * 2
    });
    iso.canvas.clear();
    var red = new Color(160, 60, 50);
    var trans = new Color(200, 200, 200, 0.1);
    var win = new Color(100, 150, 250, 0.2);
    var wall = new Color(230, 230, 230);
    var door = new Color(210, 210, 210);
    var wallSize = 20;

    var length = l + 2 * wallSize;
    var width = w + 2 * wallSize;

    // back walls
    iso.add(
      Shape.Prism(Point(length - wallSize, 0, 0), wallSize, width, h),
      wall
    );
    iso.add(
      Shape.Prism(Point(0, width - wallSize, 0), length - wallSize, 20, h),
      wall
    );

    // back windows
    const ventP = Math.max(0, 2 - vent);
    const backWindows = Math.round(l / (135 + ventP * 90));
    const backWindowGap = (l - backWindows * 110) / (backWindows + 1);
    // console.log({ backWindows, backWindowGap });
    for (let i = 0; i < backWindows; i++) {
      ww(i * (110 + backWindowGap) + backWindowGap, width - wallSize, iso, win);
    }

    // front walls
    iso.add(Shape.Prism(Point(0, 0, 0), length, wallSize, h), trans);
    iso.add(Shape.Prism(Point(0, 0, 0), wallSize, width, h), trans);

    // door
    if (length >= 220 && h >= 210) {
      iso.add(
        new Path([
          Point(length - 200, 0, 0),
          Point(length - 110, 0, 0),
          Point(length - 110, 0, 200),
          Point(length - 200, 0, 200)
        ]),
        door
      );
    }

    // front windows
    if (vent >= 3) {
      const lDoor = l - 220;
      const frontWindows = Math.round(lDoor / 155);
      const frontWindowGap = Math.max(
        0,
        (lDoor - frontWindows * 110) / (frontWindows + 1)
      );
      // console.log({ frontWindows, frontWindowGap });
      for (let i = 0; i < frontWindows; i++) {
        ww(i * (110 + frontWindowGap) + frontWindowGap + wallSize, 0, iso, win);
      }
    }
  }
  function ww(x, y, iso, color) {
    let currZ = 100;
    while (currZ + 80 <= h) {
      iso.add(
        new Path([
          Point(x, y, currZ),
          Point(x + 50, y, currZ),
          Point(x + 50, y, currZ + 50),
          Point(x, y, currZ + 50)
        ]),
        color
      );

      iso.add(
        new Path([
          Point(x + 60, y, currZ),
          Point(x + 110, y, currZ),
          Point(x + 110, y, currZ + 50),
          Point(x + 60, y, currZ + 50)
        ]),
        color
      );

      currZ = currZ + 60;
    }
  }
</script>

<style>
  div {
    width: 100%;
    height: 100%;
  }
</style>

<div
  class="w-full h-full"
  use:watchResize={n => draw(n.clientWidth, n.clientHeight)}>
  <canvas
    bind:this={canvas}
    class="absolute"
    style="width: {canvasW}px; height: {canvasH}px" />
</div>
