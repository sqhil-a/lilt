(() => {
  const stage = document.querySelector(".sculpture");
  const canvas = stage?.querySelector("canvas");
  if (!canvas || getComputedStyle(canvas).position !== "absolute") return;
  const context = canvas.getContext("2d");
  if (!context) return;

  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const segments = 132;
  const strips = 17;
  const vertices = [];
  const panels = [];
  let frame = 0;
  let previousScroll = NaN;
  let width = 0;
  let height = 0;

  for (let step = 0; step <= segments; step++) {
    const angle = step / segments * Math.PI * 2;
    const radius = 1.39 + .19 * Math.sin(3 * angle + .35);
    const roll = angle * 1.5 + .34;
    for (let strip = 0; strip <= strips; strip++) {
      const side = (strip / strips * 2 - 1) * .43;
      const curl = .13 * (side / .43) ** 3;
      const radial = radius + side * Math.cos(roll) - curl * Math.sin(roll);
      vertices.push([
        radial * Math.cos(angle),
        radial * Math.sin(angle),
        .32 * Math.cos(2 * angle + .7) + side * Math.sin(roll) + curl * Math.cos(roll)
      ]);
      if (step < segments && strip < strips) {
        const at = step * (strips + 1) + strip;
        panels.push([at, at + strips + 1, at + strips + 2, at + 1, strip]);
      }
    }
  }

  function resize() {
    const rect = stage.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    // Keep the backing buffer bounded and independent of the canvas's layout size.
    const ratio = Math.min(devicePixelRatio || 1, 1.75, 1536 / Math.max(rect.width, rect.height));
    const bufferWidth = Math.max(1, Math.round(rect.width * ratio));
    const bufferHeight = Math.max(1, Math.round(rect.height * ratio));
    width = rect.width;
    height = rect.height;
    if (canvas.width !== bufferWidth) canvas.width = bufferWidth;
    if (canvas.height !== bufferHeight) canvas.height = bufferHeight;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    previousScroll = NaN;
    schedule();
  }

  function draw() {
    frame = 0;
    const scroll = reducedMotion.matches ? 0 : window.scrollY;
    if (scroll === previousScroll || !width || !height) return;
    previousScroll = scroll;
    const span = Math.max(innerHeight, 1);
    const progress = Math.min(scroll / span, 1.25);

    const stageBounds = stage.getBoundingClientRect();
    if (stageBounds.bottom < 0 || stageBounds.top > innerHeight) return;
    const angleX = .45 + progress * .52;
    const angleY = -.35 + progress * .92;
    const angleZ = -.17 + progress * .31;
    const cx = Math.cos(angleX), sx = Math.sin(angleX);
    const cy = Math.cos(angleY), sy = Math.sin(angleY);
    const cz = Math.cos(angleZ), sz = Math.sin(angleZ);
    const scale = Math.min(width, height) * .245;

    const points = vertices.map(([x, y, z]) => {
      const yy = y * cx - z * sx;
      const zz = y * sx + z * cx;
      const xx = x * cy + zz * sy;
      const depth = zz * cy - x * sy;
      const perspective = 5.9 / (5.9 - depth);
      const rx = xx * cz - yy * sz;
      const ry = xx * sz + yy * cz;
      return [rx, ry, depth, width / 2 + rx * scale * perspective, height / 2 + ry * scale * perspective];
    });

    const visible = panels.map(([a, b, c, d, strip]) => {
      const first = points[a], next = points[b], edge = points[d];
      const ux = next[0] - first[0], uy = next[1] - first[1], uz = next[2] - first[2];
      const vx = edge[0] - first[0], vy = edge[1] - first[1], vz = edge[2] - first[2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const norm = Math.hypot(nx, ny, nz) || 1;
      const light = Math.abs((-.45 * nx - .55 * ny + .69 * nz) / norm);
      const sheen = light ** 11;
      const lip = strip === 0 || strip === strips - 1 ? 14 : 0;
      const depth = (first[2] + next[2] + points[c][2] + edge[2]) / 4;
      const red = 34 + 70 * light + 80 * sheen + lip;
      const green = 45 + 83 * light + 79 * sheen + lip;
      const blue = 72 + 111 * light + 67 * sheen + lip;
      return { corners: [first, next, points[c], edge], depth, colour: `rgb(${red},${green},${blue})` };
    }).sort((a, b) => a.depth - b.depth);

    context.clearRect(0, 0, width, height);
    context.lineJoin = "round";
    context.lineWidth = .65;
    for (const { corners, colour } of visible) {
      context.beginPath();
      context.moveTo(corners[0][3], corners[0][4]);
      for (let i = 1; i < corners.length; i++) context.lineTo(corners[i][3], corners[i][4]);
      context.closePath();
      context.fillStyle = colour;
      context.strokeStyle = colour;
      context.fill();
      context.stroke();
    }
    canvas.hidden = false;
    stage.classList.add("is-rendered");
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(draw);
  }

  resize();
  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(stage);
  else addEventListener("resize", resize);
  addEventListener("scroll", schedule, { passive: true });
  reducedMotion.addEventListener("change", () => {
    previousScroll = NaN;
    schedule();
  });
})();
