(() => {
  const stage = document.getElementById("stage");
  const player = document.getElementById("player");
  const prompt = document.getElementById("prompt");
  const hudHint = document.getElementById("hudHint");

  const frames = Array.from(document.querySelectorAll(".frame"));

  const leftBtn = document.getElementById("leftBtn");
  const rightBtn = document.getElementById("rightBtn");
  const actionBtn = document.getElementById("actionBtn");

  const modal = document.getElementById("modal");
  const modalBg = document.getElementById("modalBg");
  const modalClose = document.getElementById("modalClose");
  const modalTitle = document.getElementById("modalTitle");
  const modalMeta = document.getElementById("modalMeta");
  const modalLink = document.getElementById("modalLink");

  // Projects mapping (you can change anytime)
  const projectData = {
    p1: { title: "Aris Kavalariou", meta: "Graphic • Football", link: "/projects/project-1.html" },
    p2: { title: "Domain Tsantekides", meta: "Brand • Winery", link: "/projects/project-2.html" },
    p5: { title: "CGS Works", meta: "Brand • Identity", link: "/projects/project-5.html" },
    p3: { title: "Raw Frequencies", meta: "Design • Music", link: "/projects/project-3.html" },
  };

  // Player state
  let x = 20;              // px (left)
  let dir = 1;             // 1 right, -1 left
  let vx = 0;              // velocity
  const speed = 2.7;       // movement speed
  let walking = false;

  // Near frame state
  let near = null;

  // Helpers
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function stageBounds(){
    const w = stage.clientWidth;
    const pw = player.clientWidth;
    return { min: 8, max: w - pw - 8 };
  }

  function setPlayer(){
    player.style.left = `${x}px`;

    // face direction by flipping horizontally
    player.style.transform = `scaleX(${dir})`;

    // walking class for bob animation
    if (walking) player.classList.add("is-walking");
    else player.classList.remove("is-walking");
  }

  function frameCenters(){
    const sRect = stage.getBoundingClientRect();
    return frames.map(f => {
      const r = f.getBoundingClientRect();
      const cx = (r.left - sRect.left) + (r.width / 2);
      return { el: f, cx };
    });
  }

  function updateNear(){
    const sRect = stage.getBoundingClientRect();
    const pRect = player.getBoundingClientRect();
    const px = (pRect.left - sRect.left) + (pRect.width / 2);

    let best = null;
    let bestDist = 999999;

    const list = frameCenters();
    list.forEach(({ el, cx }) => {
      const d = Math.abs(cx - px);
      if (d < bestDist){
        bestDist = d;
        best = el;
      }
    });

    // threshold in pixels
    const threshold = 90;

    frames.forEach(f => f.classList.remove("is-near"));

    if (best && bestDist <= threshold){
      near = best;
      near.classList.add("is-near");

      // prompt position above player
      prompt.classList.add("is-show");
      prompt.setAttribute("aria-hidden", "false");

      const promptX = clamp(px - 40, 10, stage.clientWidth - 160);
      prompt.style.transform = `translateX(${promptX}px)`;

      const id = near.getAttribute("data-id");
      const data = projectData[id];
      hudHint.textContent = data ? `Near: ${data.title} — press E / View` : "Press E / View";
      actionBtn.disabled = false;
    } else {
      near = null;
      prompt.classList.remove("is-show");
      prompt.setAttribute("aria-hidden", "true");
      prompt.style.transform = `translateX(-9999px)`;
      hudHint.textContent = "Find a frame.";
      actionBtn.disabled = true;
    }
  }

  function openModal(){
    if (!near) return;
    const id = near.getAttribute("data-id");
    const data = projectData[id] || { title: "Project", meta: "", link: "/index.html" };

    modalTitle.textContent = data.title;
    modalMeta.textContent = data.meta;
    modalLink.href = data.link;

    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("no-scroll");
  }

  function closeModal(){
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("no-scroll");
  }

  // Desktop keys
  const keys = new Set();

  function updateFromKeys(){
    const left = keys.has("ArrowLeft") || keys.has("a") || keys.has("A");
    const right = keys.has("ArrowRight") || keys.has("d") || keys.has("D");

    if (left && !right){
      vx = -speed;
      dir = -1;
      walking = true;
    } else if (right && !left){
      vx = speed;
      dir = 1;
      walking = true;
    } else {
      vx = 0;
      walking = false;
    }
  }

  window.addEventListener("keydown", (e) => {
    if (modal.classList.contains("is-open")) {
      if (e.key === "Escape") closeModal();
      return;
    }

    keys.add(e.key);
    updateFromKeys();

    if (e.key === "e" || e.key === "E") openModal();
  });

  window.addEventListener("keyup", (e) => {
    keys.delete(e.key);
    updateFromKeys();
  });

  // Mobile buttons (hold to move)
  let holdLeft = false;
  let holdRight = false;

  function updateFromHold(){
    if (holdLeft && !holdRight){
      vx = -speed;
      dir = -1;
      walking = true;
    } else if (holdRight && !holdLeft){
      vx = speed;
      dir = 1;
      walking = true;
    } else {
      vx = 0;
      walking = false;
    }
  }

  const press = (btn, fnDown, fnUp) => {
    btn?.addEventListener("pointerdown", (e) => { e.preventDefault(); fnDown(); });
    btn?.addEventListener("pointerup", (e) => { e.preventDefault(); fnUp(); });
    btn?.addEventListener("pointercancel", (e) => { e.preventDefault(); fnUp(); });
    btn?.addEventListener("pointerleave", (e) => { e.preventDefault(); fnUp(); });
  };

  press(leftBtn,
    () => { holdLeft = true; updateFromHold(); },
    () => { holdLeft = false; updateFromHold(); }
  );

  press(rightBtn,
    () => { holdRight = true; updateFromHold(); },
    () => { holdRight = false; updateFromHold(); }
  );

  actionBtn?.addEventListener("click", openModal);

  // Modal close
  modalBg?.addEventListener("click", closeModal);
  modalClose?.addEventListener("click", closeModal);

  // Main loop
  function tick(){
    const { min, max } = stageBounds();

    x = clamp(x + vx, min, max);

    setPlayer();
    updateNear();

    requestAnimationFrame(tick);
  }

  // Init
  actionBtn.disabled = true;
  setPlayer();
  updateNear();
  tick();

  // Recompute near on resize
  window.addEventListener("resize", () => updateNear());
})();
