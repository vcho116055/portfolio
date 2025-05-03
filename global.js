import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

console.log("IT’S ALIVE!");

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

const pages = [
  { url: '', title: 'Home' },
  { url: 'projects/', title: 'Projects' },
  { url: 'contact/', title: 'Contact' },
  { url: 'cv/', title: 'Resume' },
  { url: 'https://github.com/vcho116055', title: 'Profile', target: "_blank" }
];

const BASE_PATH = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
  ? "/"
  : "/portfolio/";

window.addEventListener("DOMContentLoaded", () => {
  const nav = document.createElement("nav");
  document.body.prepend(nav);

  for (let p of pages) {
    const isExternal = p.url.startsWith("http");
    const url = isExternal ? p.url : BASE_PATH + p.url;

    const a = document.createElement("a");
    a.href = url;
    a.textContent = p.title;

    a.classList.toggle(
      "current",
      a.host === location.host && a.pathname === location.pathname
    );

    if (isExternal || p.target === "_blank") {
      a.target = "_blank";
      a.rel = "noopener";
    }

    nav.appendChild(a);
  }

  const label = document.createElement("label");
  label.className = "color-scheme";
  label.textContent = "Theme: ";

  const select = document.createElement("select");
  select.id = "color-scheme";

  const options = [
    { value: "light dark", label: "Light Dark" },
    { value: "light", label: "Light" },
    { value: "dark", label: "Dark" }
  ];

  for (let opt of options) {
    const option = document.createElement("option");
    option.value = opt.value;
    option.textContent = opt.label;
    select.appendChild(option);
  }

  label.appendChild(select);
  document.body.insertBefore(label, document.body.firstChild);

  const setColorScheme = (value) => {
    document.documentElement.style.setProperty("color-scheme", value);
    localStorage.colorScheme = value;
    select.value = value;
  };

  if ("colorScheme" in localStorage) {
    setColorScheme(localStorage.colorScheme);
  }

  select.addEventListener("input", (e) => {
    setColorScheme(e.target.value);
    console.log("color scheme changed to", e.target.value);
  });
});

export async function fetchJSON(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching or parsing JSON data:', error);
  }
}

export function renderProjects(projects, containerElement) {
  containerElement.innerHTML = '';
  for (const project of projects) {
    const article = document.createElement('article');
    article.innerHTML = `
      <h3>${project.title}</h3>
      <img src="${project.image}" alt="${project.title}">
      <p>${project.description}</p>
      <p class="year">${project.year ?? ''}</p>
    `;
    containerElement.appendChild(article);
  }
}

export async function fetchGitHubData(username) {
  return fetchJSON(`https://api.github.com/users/${username}`);
}

const svg = d3.select("#projects-pie-plot");
const legend = d3.select(".legend");
const searchInput = document.querySelector(".searchBar");
const projectContainer = document.querySelector(".projects");

let selectedIndex = -1;
let query = '';

fetchJSON("/portfolio/projects.json").then(projects => {
  projects.forEach(p => p.year = "2023");

  function filterProjects() {
    return projects.filter((project) => {
      const text = Object.values(project).join('\n').toLowerCase();
      return text.includes(query.toLowerCase());
    });
  }

  function renderPieChart(projectsGiven) {
    svg.selectAll("path").remove();
    legend.selectAll("li").remove();

    let data = d3.rollups(projectsGiven, v => v.length, d => d.year)
      .map(([year, count]) => ({ label: year, value: count }));

    const arcGen = d3.arc().innerRadius(0).outerRadius(50);
    const sliceGen = d3.pie().value(d => d.value);
    const arcData = sliceGen(data);
    const colors = d3.scaleOrdinal(d3.schemeTableau10);

    arcData.forEach((d, i) => {
      svg.append("path")
        .attr("d", arcGen(d))
        .attr("fill", colors(i))
        .attr("class", selectedIndex === i ? 'selected' : null)
        .style("cursor", "pointer")
        .on("click", () => {
          selectedIndex = selectedIndex === i ? -1 : i;
          svg.selectAll("path").attr("class", (_, idx) => idx === selectedIndex ? 'selected' : null);
          legend.selectAll("li").attr("class", (_, idx) => idx === selectedIndex ? 'selected' : null);
          rerender();
        });

      legend.append("li")
        .attr("style", `--color:${colors(i)}`)
        .attr("class", selectedIndex === i ? 'selected' : null)
        .html(`<span class="swatch"></span> ${data[i].label} <em>(${data[i].value})</em>`)
        .on("click", () => {
          selectedIndex = selectedIndex === i ? -1 : i;
          svg.selectAll("path").attr("class", (_, idx) => idx === selectedIndex ? 'selected' : null);
          legend.selectAll("li").attr("class", (_, idx) => idx === selectedIndex ? 'selected' : null);
          rerender();
        });
    });
  }

  function rerender() {
    const filtered = filterProjects();
    const visible = selectedIndex === -1
      ? filtered
      : filtered.filter(p => p.year === d3.selectAll(".legend li").data()[selectedIndex]?.label);
    renderProjects(visible, projectContainer);
    renderPieChart(filtered);
  }

  renderProjects(projects, projectContainer);
  renderPieChart(projects);

  searchInput.addEventListener("input", (e) => {
    query = e.target.value;
    rerender();
  });
});
