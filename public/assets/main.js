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
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      setActive(link.dataset.target);
    }
  });
});

if (panelItems.length) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActive(entry.target.dataset.panel);
        }
      });
    },
    { root: null, rootMargin: "-45% 0px -45% 0px", threshold: 0 }
  );
  panelItems.forEach((panel) => observer.observe(panel));
}

setActive("intro");

const filterButtons = document.querySelectorAll("[data-filter-tag]");
const projectCards = document.querySelectorAll("[data-project-card]");
const filterStatus = document.querySelector("[data-filter-status]");
const filterReset = document.querySelector("[data-filter-reset]");
const chartLinks = document.querySelectorAll(".chart-link[data-year]");
const activitiesPanel = document.querySelector('[data-panel="process"]');
const timelineBoard = document.querySelector("[data-timeline-board]");
const timelineTrack = document.querySelector("[data-timeline-track]");
const timelinePolyline = document.querySelector(".timeline-polyline");
const timelineDots = document.querySelectorAll(".timeline-dot");
const timelineScrollbar = document.querySelector("[data-timeline-scrollbar]");
const timelineThumb = document.querySelector(".timeline-scrollbar-thumb");
const params = new URLSearchParams(window.location.search);
let activeTag = params.get("tag") || "all";
let activeYear = params.get("year");


function applyFilters() {
  const yearLabel = activeYear ? `${activeYear}年の活動` : "";
  const tagLabel = activeTag !== "all" ? `#${activeTag}` : "";
  if (filterStatus) {
    const parts = [yearLabel, tagLabel].filter(Boolean);
    filterStatus.textContent = parts.length ? `表示中: ${parts.join(" / ")}` : "表示中: 全件";
  }
  projectCards.forEach((card) => {
    const cardYear = card.dataset.year;
    const cardTags = (card.dataset.tags || "").split(",").filter(Boolean);
    const matchYear = !activeYear || cardYear === activeYear;
    const matchTag = activeTag === "all" || cardTags.includes(activeTag);
    card.style.display = matchYear && matchTag ? "grid" : "none";
  });
  filterButtons.forEach((button) => {
    const isActive = button.dataset.filterTag === activeTag;
    button.classList.toggle("is-active", isActive);
  });
}

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeTag = button.dataset.filterTag;
    applyFilters();
  });
});

if (filterReset) {
  filterReset.addEventListener("click", () => {
    activeTag = "all";
    activeYear = null;
    applyFilters();
    const url = new URL(window.location.href);
    url.searchParams.delete("year");
    history.replaceState(null, "", url.pathname + url.search + url.hash);
  });
}

chartLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    activeYear = link.dataset.year;
    activeTag = "all";
    applyFilters();
    const url = new URL(window.location.href);
    url.searchParams.set("year", activeYear);
    url.hash = "process";
    history.replaceState(null, "", url.pathname + url.search + url.hash);
    if (activitiesPanel) {
      activitiesPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
});

applyFilters();

function updateTimelineLine() {
  if (!timelineTrack || !timelinePolyline || !timelineDots.length) return;
  const trackRect = timelineTrack.getBoundingClientRect();
  const points = Array.from(timelineDots).map((dot) => {
    const rect = dot.getBoundingClientRect();
    const x = rect.left - trackRect.left + rect.width / 2;
    const y = rect.top - trackRect.top + rect.height / 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  timelinePolyline.setAttribute("points", points.join(" "));
  const width = Math.max(timelineTrack.scrollWidth, timelineTrack.clientWidth);
  const height = timelineTrack.scrollHeight;
  timelinePolyline.parentElement?.setAttribute("viewBox", `0 0 ${width} ${height}`);
}

if (timelineBoard && timelineTrack) {
  const resizeObserver = new ResizeObserver(() => {
    requestAnimationFrame(updateTimelineLine);
  });
  resizeObserver.observe(timelineTrack);
  window.addEventListener("resize", () => requestAnimationFrame(updateTimelineLine));
  requestAnimationFrame(updateTimelineLine);
}

function updateTimelineScrollbar() {
  if (!timelineBoard || !timelineScrollbar || !timelineThumb) return;
  const maxScroll = timelineBoard.scrollWidth - timelineBoard.clientWidth;
  const ratio = maxScroll > 0 ? timelineBoard.clientWidth / timelineBoard.scrollWidth : 1;
  const thumbScale = 0.6;
  const thumbWidth = Math.max(16, Math.floor(ratio * timelineScrollbar.clientWidth * thumbScale));
  const progress = maxScroll > 0 ? timelineBoard.scrollLeft / maxScroll : 0;
  timelineThumb.style.width = `${thumbWidth}px`;
  timelineThumb.style.transform = `translateX(${(timelineScrollbar.clientWidth - thumbWidth) * progress}px)`;
}

if (timelineBoard) {
  timelineBoard.addEventListener("scroll", updateTimelineScrollbar);
  window.addEventListener("resize", updateTimelineScrollbar);
  requestAnimationFrame(updateTimelineScrollbar);
}
