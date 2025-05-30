import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import scrollama from "https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm";

const commits = await d3.json("./commits.json");

function processCommits(list) {
  for (const d of list) {
    d.datetime = new Date(d.datetime);
    d.hourFrac = d.datetime.getHours() + d.datetime.getMinutes() / 60;
    d.id = d.sha;
  }
}

processCommits(commits);

let xScale, yScale, rScale;

function renderScatterPlot(data) {
  const width = 1000;
  const height = 600;
  const margin = { top: 10, right: 10, bottom: 30, left: 40 };
  const usable = {
    left: margin.left,
    top: margin.top,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
    bottom: height - margin.bottom,
  };

  const svg = d3
    .select("#chart")
    .selectAll("svg")
    .data([null])
    .join("svg")
    .attr("viewBox", `0 0 ${width} ${height}`);

  xScale = d3
    .scaleTime()
    .domain(d3.extent(commits, (d) => d.datetime))
    .range([usable.left, usable.left + usable.width]);

  yScale = d3
    .scaleLinear()
    .domain([0, 24])
    .range([usable.top + usable.height, usable.top]);

  const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
  rScale = d3
    .scaleSqrt()
    .domain([Math.max(1, minLines), Math.max(1, maxLines)])
    .range([2, 30]);

  svg
    .selectAll("g.x-axis")
    .data([null])
    .join("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0, ${usable.top + usable.height})`)
    .call(d3.axisBottom(xScale));

  svg
    .selectAll("g.y-axis")
    .data([null])
    .join("g")
    .attr("class", "y-axis")
    .attr("transform", `translate(${usable.left},0)`)
    .call(d3.axisLeft(yScale).ticks(6));

  const dotsGroup = svg
    .selectAll("g.dots")
    .data([null])
    .join("g")
    .attr("class", "dots");

  const sorted = d3.sort(data, (d) => -d.totalLines);

  dotsGroup
    .selectAll("circle")
    .data(sorted, (d) => d.id)
    .join(
      (enter) =>
        enter
          .append("circle")
          .attr("cx", (d) => xScale(d.datetime))
          .attr("cy", (d) => yScale(d.hourFrac))
          .attr("r", (d) => rScale(d.totalLines))
          .attr("fill", "steelblue")
          .style("fill-opacity", 0.7),
      (update) =>
        update
          .transition()
          .duration(200)
          .attr("cx", (d) => xScale(d.datetime))
          .attr("cy", (d) => yScale(d.hourFrac))
          .attr("r", (d) => rScale(d.totalLines)),
      (exit) => exit.remove()
    );
}

function updateScatterPlot(filtered) {
  const svg = d3.select("#chart svg");
  if (!svg.size()) return;
  xScale.domain(
    d3.extent(filtered.length ? filtered : commits, (d) => d.datetime)
  );
  svg.select("g.x-axis").call(d3.axisBottom(xScale));
  const sorted = d3.sort(filtered, (d) => -d.totalLines);
  svg
    .select("g.dots")
    .selectAll("circle")
    .data(sorted, (d) => d.id)
    .join(
      (enter) =>
        enter
          .append("circle")
          .attr("cx", (d) => xScale(d.datetime))
          .attr("cy", (d) => yScale(d.hourFrac))
          .attr("r", 0)
          .attr("fill", "steelblue")
          .style("fill-opacity", 0.7)
          .transition()
          .duration(200)
          .attr("r", (d) => rScale(d.totalLines)),
      (update) =>
        update
          .transition()
          .duration(200)
          .attr("cx", (d) => xScale(d.datetime))
          .attr("cy", (d) => yScale(d.hourFrac))
          .attr("r", (d) => rScale(d.totalLines)),
      (exit) => exit.transition().duration(200).attr("r", 0).remove()
    );
}

function renderCommitInfo(list) {
  const total = list.length;
  const earliest = d3.min(list, (d) => d.datetime);
  const latest = d3.max(list, (d) => d.datetime);
  d3.select("#stats").html(
    `Commits: ${total} | Range: ${earliest.toLocaleDateString()} – ${latest.toLocaleDateString()}`
  );
}

renderScatterPlot(commits);
renderCommitInfo(commits);

const slider = d3.select("#commit-progress").on("input", onTimeSliderChange);
const timeLabel = d3.select("#commit-time");

const timeScale = d3
  .scaleTime()
  .domain(d3.extent(commits, (d) => d.datetime))
  .range([0, 100]);

let commitProgress = 100;
let commitMaxTime = timeScale.invert(commitProgress);

timeLabel.text(
  commitMaxTime.toLocaleString("en", { dateStyle: "long", timeStyle: "short" })
);

function onTimeSliderChange() {
  commitProgress = +slider.node().value;
  commitMaxTime = timeScale.invert(commitProgress);
  timeLabel.text(
    commitMaxTime.toLocaleString("en", {
      dateStyle: "long",
      timeStyle: "short",
    })
  );
  const filtered = commits.filter((d) => d.datetime <= commitMaxTime);
  updateScatterPlot(filtered);
  updateFileDisplay(filtered);
  renderCommitInfo(filtered);
}

function updateFileDisplay(filtered) {
  const lines = filtered.flatMap((d) => d.lines);
  const files = d3
    .groups(lines, (d) => d.file)
    .map(([name, l]) => ({ name, lines: l }))
    .sort((a, b) => b.lines.length - a.lines.length);

  const fileDivs = d3
    .select("#files")
    .selectAll("div")
    .data(files, (d) => d.name)
    .join((enter) =>
      enter.append("div").call((div) => {
        div.append("dt").append("code");
        div.append("dd");
      })
    );

  fileDivs.select("dt>code").text((d) => d.name);
  fileDivs
    .select("dd")
    .html((d) => `${d.lines.length} lines`)
    .selectAll("div")
    .data((d) => d.lines)
    .join("div")
    .attr("class", "loc");
}

updateFileDisplay(commits);

const scroller = scrollama();

d3.select("#scatter-story")
  .selectAll(".step")
  .data(commits)
  .join("div")
  .attr("class", "step")
  .html(
    (d) =>
      `On ${d.datetime.toLocaleDateString()} I made <a href="${
        d.url
      }" target="_blank">a commit</a> touching ${d.totalLines} lines.`
  );

scroller
  .setup({ container: "#scrolly-1", step: "#scrolly-1 .step" })
  .onStepEnter((r) => {
    const thisCommit = r.element.__data__;
    slider.node().value = timeScale(thisCommit.datetime);
    onTimeSliderChange();
  });
