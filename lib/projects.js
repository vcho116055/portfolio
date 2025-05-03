import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm'
import { fetchJSON, renderProjects } from '/portfolio/global.js'

const projectsContainer = document.querySelector('.projects')
const svg = d3.select('#projects-pie-plot')
const legendList = d3.select('.legend')
const searchInput = document.querySelector('.searchBar')
let projects = []
let selectedIndex = -1
let query = ''

init()

async function init() {
  projects = await fetchJSON('/portfolio/projects.json')
  renderProjects(projects, projectsContainer)
  renderPieChart(projects)
}

function renderPieChart(dataSet) {
  svg.selectAll('path').remove()
  legendList.selectAll('li').remove()

  const rolled = d3.rollups(dataSet, v => v.length, d => d.year)
  const data = rolled.map(([year, count]) => ({ value: count, label: year }))

  const colors = d3.scaleOrdinal(d3.schemeTableau10)
  const slice = d3.pie().value(d => d.value)
  const arcGen = d3.arc().innerRadius(0).outerRadius(50)
  const arcs = slice(data).map(a => arcGen(a))

  arcs.forEach((d, i) => {
    svg.append('path')
      .attr('d', d)
      .attr('fill', colors(i))
      .on('click', () => handleSliceClick(i, data))
  })

  data.forEach((d, i) => {
    legendList.append('li')
      .attr('style', `--color:${colors(i)}`)
      .text(`${d.label} (${d.value})`)
      .on('click', () => handleSliceClick(i, data))
  })
}

function handleSliceClick(i, data) {
    selectedIndex = selectedIndex === i ? -1 : i
    svg.selectAll('path').attr('class', (_, idx) => idx === selectedIndex ? 'selected' : '')
    legendList.selectAll('li').attr('class', (_, idx) => idx === selectedIndex ? 'selected' : '')
    const filtered =
      selectedIndex === -1
        ? filterByQuery(projects)
        : filterByQuery(projects.filter(p => p.year === data[selectedIndex].label))
    renderProjects(filtered, projectsContainer)
  }

searchInput.addEventListener('input', e => {
  query = e.target.value.toLowerCase()
  const filtered = filterByQuery(selectedIndex === -1 ? projects : projects.filter(p => p.year === projects[selectedIndex]?.year))
  renderProjects(filtered, projectsContainer)
  renderPieChart(filtered)
})

function filterByQuery(arr) {
  if (!query) return arr
  return arr.filter(p => Object.values(p).join(' ').toLowerCase().includes(query))
}
