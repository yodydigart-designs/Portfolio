(() => {
  const track = document.getElementById("gTrack");
  const items = Array.from(document.querySelectorAll(".g-item"));

  const lb = document.getElementById("lb");
  const lbImg = document.getElementById("lbImg");
  const lbTitle = document.getElementById("lbTitle");
  const lbClose = document.getElementById("lbClose");
  const lbX = document.getElementById("lbX");
  const lbPrev = document.getElementById("lbPrev");
  const lbNext = document.getElementById("lbNext");

  let index = 0;

  // Smooth horizontal wheel -> horizontal scroll
  if (track) {
    track.addEventListener("wheel", (e) => {
      // if shift or trackpad horizontal exists, let it be
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      e.preventDefault();
      track.scrollLeft += e.deltaY * 1.15;
    }, { passive: false });
  }

  function openLB(i){
    index = i;
    const it = items[index];
    const src = it?.dataset?.src;
    const title = it?.dataset?.title || "Preview";

    if (!src) return;

    lbImg.src = src;
    lbImg.alt = title;
    lbTitle.textContent = title;

    lb.classList.add("is-open");
    lb.setAttribute("aria-hidden","false");
    document.body.classList.add("no-scroll");
  }

  function closeLB(){
    lb.classList.remove("is-open");
    lb.setAttribute("aria-hidden","true");
    document.body.classList.remove("no-scroll");
    // stop image flash on slow devices
    lbImg.src = "";
  }

  function prev(){
    const n = items.length;
    if (!n) return;
    index = (index - 1 + n) % n;
    openLB(index);
  }

  function next(){
    const n = items.length;
    if (!n) return;
    index = (index + 1) % n;
    openLB(index);
  }

  // Click items
  items.forEach((it, i) => {
    it.addEventListener("click", () => openLB(i));
  });

  // Close actions
  lbClose?.addEventListener("click", closeLB);
  lbX?.addEventListener("click", closeLB);

  // Nav
  lbPrev?.addEventListener("click", prev);
  lbNext?.addEventListener("click", next);

  // Keyboard
  document.addEventListener("keydown", (e) => {
    const open = lb.classList.contains("is-open");
    if (!open) return;

    if (e.key === "Escape") closeLB();
    if (e.key === "ArrowLeft") prev();
    if (e.key === "ArrowRight") next();
  });

  // Focus: if user tabs into track, allow arrow keys to scroll
  track?.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") track.scrollLeft += 120;
    if (e.key === "ArrowLeft") track.scrollLeft -= 120;
  });
})();
