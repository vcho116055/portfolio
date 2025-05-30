import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import scrollama from "https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm";

const commits = await d3.json("./commits.json");
processCommits(commits);
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

let xScale, yScale;

function renderScatterPlot(data) {}
function updateScatterPlot(data) {}

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

scrollama()
  .setup({ container: "#scrolly-1", step: "#scrolly-1 .step" })
  .onStepEnter((r) => {
    const thisCommit = r.element.__data__;
    slider.node().value = timeScale(thisCommit.datetime);
    onTimeSliderChange();
  });
