const panels = document.querySelector(".panels");
const navLinks = document.querySelectorAll(".nav-link");
const panelItems = document.querySelectorAll("[data-panel]");

function setActive(targetId) {
  navLinks.forEach((link) => {
    link.classList.toggle("is-active", link.dataset.target === targetId);
  });
}

navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    const target = document.querySelector(`[data-panel="${link.dataset.target}"]`);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", inline: "start" });
      setActive(link.dataset.target);
    }
  });
});

let isTicking = false;
function onScroll() {
  if (isTicking) return;
  isTicking = true;
  requestAnimationFrame(() => {
    const midpoint = panels.scrollLeft + panels.clientWidth * 0.35;
    let currentId = panelItems[0]?.dataset.panel;
    panelItems.forEach((panel) => {
      if (panel.offsetLeft <= midpoint) {
        currentId = panel.dataset.panel;
      }
    });
    if (currentId) setActive(currentId);
    isTicking = false;
  });
}

if (panels) {
  panels.addEventListener("scroll", onScroll);

  panels.addEventListener("wheel", (event) => {
    if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
      event.preventDefault();
      panels.scrollLeft += event.deltaY * 1.2;
    }
  }, { passive: false });
}

setActive("hero");

const introTarget = document.querySelector("[data-panel=\"intro\"]");
if (introTarget) {
  introTarget.scrollIntoView({ behavior: "auto", inline: "start" });
  setActive("intro");
}
