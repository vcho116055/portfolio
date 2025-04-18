console.log('IT’S ALIVE!');

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

let pages = [
  { url: '', title: 'Home' },
  { url: 'projects/', title: 'Projects' },
  { url: 'contact/', title: 'Contact' }, 
  { url: 'cv/', title: 'Resume' },
  { url: 'https://github.com/vcho116055', title: 'Profile', target: "_blank" }
];

const BASE_PATH = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
  ? "/"                     // Local dev
  : "/portfolio/";          // GitHub Pages

let nav = document.createElement('nav');
document.body.prepend(nav);

for (let p of pages) {
  let isExternal = p.url.startsWith('http');
  let url = isExternal ? p.url : BASE_PATH + p.url;
  let title = p.title;
  let a = document.createElement('a');
  a.href = url;
  a.textContent = title;
  a.classList.toggle(
    'current',
    a.host === location.host && a.pathname === location.pathname
  );
  if (isExternal) {
    a.target = '_blank';
    a.rel = 'noopener';
  }
  nav.append(a);
}

document.body.insertAdjacentHTML(
  'afterbegin',
  `
	<label class="color-scheme">
		Theme:
		<select>
			<option value = "light dark">Light Dark</option>
      <option value = "light">Light</option>
      <option value = "dark">Dark</option>
		</select>
	</label>`,
);

let select = document.querySelector("select");
select.addEventListener('input', function (event) {
  console.log('color scheme changed to', event.target.value);
  document.documentElement.style.setProperty('color-scheme', select.value);
  localStorage.colorScheme = select.value
});

if ('colorScheme' in localStorage) {
  document.documentElement.style.setProperty('color-scheme', localStorage.colorScheme);
}