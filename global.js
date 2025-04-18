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
  // Build nav
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

  // Build theme switcher
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