(() => {
  const demo = document.querySelector(".demo");
  const audio = demo.querySelector("audio");
  const scene = demo.querySelector(".scene");
  const stack = demo.querySelector(".lines");
  const lines = [...stack.children];
  const controls = demo.querySelector(".player-controls");
  const play = demo.querySelector(".play");
  const seek = demo.querySelector(".seek");
  const elapsed = demo.querySelector(".elapsed");
  const duration = demo.querySelector(".duration");
  const error = demo.querySelector(".playback-error");
  const cues = [0, 6, 12, 18, 24, 30, 36, 42];
  const modes = [...demo.querySelectorAll("button[data-mode]")];
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let activeLine = -1;
  let frame = 0;

  function format(seconds) {
    const whole = Math.floor(seconds || 0);
    return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
  }

  function alignLine(snap = false) {
    if (activeLine < 0 || scene.dataset.mode === "ambient") return;
    const line = lines[activeLine];
    stack.classList.toggle("snap", snap || motion.matches);
    stack.style.setProperty("--lyric-offset", `${-(line.offsetTop + line.offsetHeight / 2)}px`);
  }

  function render() {
    const position = audio.currentTime;
    const nextLine = cues.findLastIndex(cue => cue <= position);
    if (nextLine !== activeLine) {
      const snap = activeLine < 0 || Math.abs(nextLine - activeLine) > 1 || audio.seeking;
      activeLine = nextLine;
      lines.forEach((line, index) => {
        line.classList.toggle("is-current", index === activeLine);
        line.classList.toggle("is-far", Math.abs(index - activeLine) > 2);
      });
      alignLine(snap);
    }
    seek.value = position;
    elapsed.textContent = format(position);
    seek.setAttribute("aria-valuetext", `${format(position)} of ${duration.textContent}`);
  }

  function tick() {
    render();
    if (!audio.paused && !audio.ended) frame = requestAnimationFrame(tick);
  }

  function updatePlayback() {
    const playing = !audio.paused && !audio.ended;
    play.classList.toggle("is-playing", playing);
    play.setAttribute("aria-label", playing ? "Pause demo" : "Play demo");
    scene.classList.toggle("is-playing", playing);
    cancelAnimationFrame(frame);
    if (playing) tick();
    else render();
  }

  play.addEventListener("click", async () => {
    error.hidden = true;
    if (!audio.paused) {
      audio.pause();
      return;
    }
    if (audio.ended) audio.currentTime = 0;
    try {
      await audio.play();
    } catch {
      error.textContent = "The demo audio couldn’t start. Try playing it again.";
      error.hidden = false;
    }
  });

  seek.addEventListener("input", () => {
    if (Number.isFinite(audio.duration)) audio.currentTime = Number(seek.value);
    render();
  });

  audio.addEventListener("loadedmetadata", () => {
    seek.max = audio.duration;
    duration.textContent = format(audio.duration);
    render();
  });
  audio.addEventListener("play", updatePlayback);
  audio.addEventListener("pause", updatePlayback);
  audio.addEventListener("ended", updatePlayback);
  audio.addEventListener("seeked", render);
  audio.addEventListener("error", () => {
    error.textContent = "The demo recording couldn’t be loaded.";
    error.hidden = false;
  });

  modes.forEach(button => button.addEventListener("click", () => {
    scene.dataset.mode = button.dataset.mode;
    modes.forEach(mode => mode.setAttribute("aria-pressed", String(mode === button)));
    alignLine(true);
  }));

  new ResizeObserver(() => alignLine(true)).observe(scene);
  audio.hidden = true;
  controls.hidden = false;
  modes[0].parentElement.hidden = false;
  render();
})();
