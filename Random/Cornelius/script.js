const header = document.querySelector("[data-header]");
const scrollLine = document.querySelector(".scroll-line");

function updatePageChrome() {
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  const progress = maxScroll > 0 ? window.scrollY / maxScroll : 0;

  header.classList.toggle("is-scrolled", window.scrollY > 24);
  scrollLine.style.transform = `scaleX(${Math.min(progress, 1)})`;
}

window.addEventListener("scroll", updatePageChrome, { passive: true });
window.addEventListener("resize", updatePageChrome);
updatePageChrome();
