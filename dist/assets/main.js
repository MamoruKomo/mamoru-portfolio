const panels = document.querySelector(".panels");
const navLinks = document.querySelectorAll(".nav-link");
const panelItems = document.querySelectorAll("[data-panel]");
const projectPoints = document.querySelectorAll(".timeline-point");
const projectDetail = document.querySelector("#project-detail");

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

function updateProjectDetail(point) {
  if (!projectDetail || !point) return;
  const { ticker, name, sector, thesis, result, year, url } = point.dataset;
  projectDetail.innerHTML = `
    <div>
      <span class="tag">${ticker} / ${year}</span>
      <h4>${name}</h4>
      <p class="sector">${sector}</p>
      <p class="thesis">${thesis}</p>
    </div>
    <div class="detail-meta">
      <p class="result">${result}</p>
      <a class="detail-link" href="${url}">View Case →</a>
    </div>
  `;
  projectPoints.forEach((node) => node.classList.remove("is-active"));
  point.classList.add("is-active");
}

if (projectPoints.length) {
  updateProjectDetail(projectPoints[0]);
  projectPoints.forEach((point) => {
    point.addEventListener("click", () => updateProjectDetail(point));
  });
}
