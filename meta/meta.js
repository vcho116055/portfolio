import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import scrollama from "https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm";

const repoURL = "https://github.com/vcho116055/portfolio";
const commits = await d3.json("./commits.json");

for (const d of commits) {
  d.datetime = new Date(d.datetime);
  d.hourFrac = d.datetime.getHours() + d.datetime.getMinutes() / 60;
  d.id = d.sha;
  if (!d.totalLines) d.totalLines = d.lines.length;
  d.url = `${repoURL}/commit/${d.sha}`;
}

const width = 1000;
const height = 600;
const margin = { t: 10, r: 10, b: 30, l: 40 };
const innerW = width - margin.l - margin.r;
const innerH = height - margin.t - margin.b;

const x = d3
  .scaleTime()
  .domain(d3.extent(commits, (d) => d.datetime))
  .range([margin.l, margin.l + innerW]);
const y = d3
  .scaleLinear()
  .domain([0, 24])
  .range([margin.t + innerH, margin.t]);
const r = d3
  .scaleSqrt()
  .domain(d3.extent(commits, (d) => d.totalLines))
  .range([2, 30]);

const svg = d3
  .select("#chart")
  .selectAll("svg")
  .data([null])
  .join("svg")
  .attr("viewBox", `0 0 ${width} ${height}`);
svg
  .append("g")
  .attr("class", "x-axis")
  .attr("transform", `translate(0,${margin.t + innerH})`)
  .call(d3.axisBottom(x));
svg
  .append("g")
  .attr("class", "y-axis")
  .attr("transform", `translate(${margin.l},0)`)
  .call(d3.axisLeft(y).ticks(6));
svg
  .append("g")
  .attr("class", "y-grid")
  .attr("transform", `translate(${margin.l},0)`)
  .call(d3.axisLeft(y).tickSize(-innerW).tickFormat(""));
const dotsG = svg.append("g").attr("class", "dots");

function draw(list) {
  dotsG
    .selectAll("circle")
    .data(
      d3.sort(list, (d) => -d.totalLines),
      (d) => d.id
    )
    .join(
      (enter) =>
        enter
          .append("circle")
          .attr("cx", (d) => x(d.datetime))
          .attr("cy", (d) => y(d.hourFrac))
          .attr("r", 0)
          .attr("fill", "steelblue")
          .style("fill-opacity", 0.7)
          .transition()
          .attr("r", (d) => r(d.totalLines)),
      (update) =>
        update
          .transition()
          .attr("cx", (d) => x(d.datetime))
          .attr("cy", (d) => y(d.hourFrac))
          .attr("r", (d) => r(d.totalLines)),
      (exit) => exit.transition().attr("r", 0).remove()
    );
}

function updateStats(list) {
  const allLines = list.flatMap((d) => d.lines);
  const data = [
    ["COMMITS", list.length],
    ["FILES", new Set(allLines.map((l) => l.file)).size],
    ["TOTAL LOC", allLines.length],
    ["MAX LINES", d3.max(list, (d) => d.totalLines)],
  ];
  d3.select("#stats")
    .selectAll("div")
    .data(data)
    .join("div")
    .html((d) => `<strong>${d[0]}</strong><br>${d[1]}`);
}

function updateFileDisplay(list) {
  const lines = list.flatMap((d) => d.lines);
  const files = d3
    .groups(lines, (l) => l.file)
    .map(([name, arr]) => ({ name, lines: arr }))
    .sort((a, b) => b.lines.length - a.lines.length)
    .slice(0, 40);

  const rows = d3
    .select("#files")
    .selectAll("div")
    .data(files, (d) => d.name)
    .join((enter) =>
      enter.append("div").call((div) => {
        div.append("dt");
        div.append("dd");
      })
    );

  rows.select("dt").text((d) => d.name);

  rows
    .select("dd")
    .html((d) => `${d.lines.length} lines`)
    .selectAll(".loc")
    .data((d) => d.lines)
    .join("div")
    .attr("class", "loc")
    .style("--clr", (l, i, arr) => d3.schemeTableau10[i % 10]);
}

function refresh(view) {
  svg
    .select(".x-axis")
    .call(d3.axisBottom(x.domain(d3.extent(view, (d) => d.datetime))));
  draw(view);
  updateStats(view);
  updateFileDisplay(view);
}

draw(commits);
updateStats(commits);
updateFileDisplay(commits);

const slider = d3.select("#commit-progress").on("input", onSlide);
const label = d3.select("#commit-time");
const tScale = d3
  .scaleTime()
  .domain(d3.extent(commits, (d) => d.datetime))
  .range([0, 100]);
label.text(commits[commits.length - 1].datetime.toLocaleString());

function onSlide() {
  const subset = commits.filter(
    (d) => d.datetime <= tScale.invert(+slider.node().value)
  );
  label.text(
    tScale
      .invert(+slider.node().value)
      .toLocaleString("en", { dateStyle: "long", timeStyle: "short" })
  );
  refresh(subset);
}

d3.select("#scatter-story")
  .selectAll(".step")
  .data(commits)
  .join("div")
  .attr("class", "step")
  .html(
    (d) =>
      `On ${d.datetime.toLocaleDateString()} I made a commit touching ${
        d.totalLines
      } lines. <a href="${d.url}" target="_blank">→ view</a>`
  );

const scroller = scrollama();

scroller
  .setup({ container: "#scrolly-1", step: "#scrolly-1 .step", offset: 0.6 })
  .onStepEnter((s) => {
    slider.node().value = tScale(s.element.__data__.datetime);
    onSlide();
  });
