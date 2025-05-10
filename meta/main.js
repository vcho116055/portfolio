import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

async function loadData () {
  return d3.csv('loc.csv', row => ({
    ...row,
    line      : +row.line,
    depth     : +row.depth,
    length    : +row.length,
    date      : new Date(`${row.date}T00:00${row.timezone}`),
    datetime  : new Date(row.datetime)
  }));
}

function processCommits (rows) {
  return d3.groups(rows, d => d.commit).map(([id, lines]) => {
    const {author, datetime} = lines[0];
    const hourFrac = datetime.getHours() + datetime.getMinutes() / 60;
    const commitObj = {
      id,
      url         : `https://github.com/vcho116055/portfolio/commit/${id}`,
      author,
      datetime,
      date        : datetime.toLocaleDateString('en', {dateStyle:'medium'}),
      hourFrac,
      totalLines  : lines.length
    };
    Object.defineProperty(commitObj, 'lines',
      {value: lines, enumerable: false});
    return commitObj;
  });
}

function renderStats (rows, commits) {
  const $ = d3.select('#stats').append('dl').attr('class', 'stats');
  const stat = (label,val) => { $.append('dt').text(label); $.append('dd').text(val); };

  stat('Total LOC', rows.length);
  stat('Total commits', commits.length);
  stat('Unique files', d3.groups(rows, d=>d.file).length);

  const fileLengths = d3.rollups(rows,
    v => d3.max(v, d=>d.line),
    d => d.file);
  stat('Average file length', d3.mean(fileLengths, d=>d[1]).toFixed(1));

  const longestLine = d3.greatest(rows, d=>d.length);
  stat('Longest line (chars)', longestLine.length);
}

function renderScatter (commits) {
  const W = 1000, H = 600, M = {t:10,r:10,b:30,l:40};
  const usable = {x0:M.l, x1:W-M.r, y0:H-M.b, y1:M.t};

  const x = d3.scaleTime()
    .domain(d3.extent(commits, d=>d.datetime)).nice()
    .range([usable.x0, usable.x1]);

  const y = d3.scaleLinear()
    .domain([0,24])
    .range([usable.y0, usable.y1]);

  const r = d3.scaleSqrt()
    .domain(d3.extent(commits, d=>d.totalLines))
    .range([2, 30]);

  const svg = d3.select('#chart')
    .append('svg')
    .attr('viewBox', `0 0 ${W} ${H}`)
    .style('overflow', 'visible');

  svg.append('g')
     .attr('transform', `translate(${usable.x0},0)`)
     .call(d3.axisLeft(y).tickSize(-(usable.x1-usable.x0)).tickFormat(''))
     .attr('class','gridlines');

  const dots = svg.append('g').attr('class','dots').selectAll('circle')
  .data(d3.sort(commits, d=>-d.totalLines))
  .join('circle')
    .attr('cx', d=>x(d.datetime))
    .attr('cy', d=>y(d.hourFrac))
    .attr('r' , d=>r(d.totalLines))
    .attr('fill','steelblue')
    .attr('fill-opacity',0.7)
    .on('mouseenter', (ev,d) => {
      d3.select(ev.currentTarget).attr('fill-opacity',1);
      showTooltip(d, ev.clientX, ev.clientY, true);
    })
    .on('mousemove', (ev,d) => showTooltip(d, ev.clientX, ev.clientY))
    .on('mouseleave', (ev,d) => {
      d3.select(ev.currentTarget).attr('fill-opacity',0.7);
      showTooltip(null);
    })
    .on('click', (ev, d) => {
      window.open(d.url, '_blank');
    });

  svg.append('g')
     .attr('transform',`translate(0,${usable.y0})`)
     .call(d3.axisBottom(x));

  svg.append('g')
     .attr('transform',`translate(${usable.x0},0)`)
     .call(d3.axisLeft(y).tickFormat(d => `${(d%24).toString().padStart(2,'0')}:00`));

  const brush = d3.brush()
      .extent([[usable.x0, usable.y1],[usable.x1, usable.y0]])
      .on('brush end', ({selection}) => highlight(selection));

  svg.call(brush);
  svg.selectAll('.dots, .overlay ~ *').raise();

  function isSelected(sel, d){
    if(!sel) return false;
    const [[x0,y0],[x1,y1]] = sel;
    return x(d.datetime)>=x0 && x(d.datetime)<=x1 &&
           y(d.hourFrac)  >=y0 && y(d.hourFrac)  <=y1;
  }
  function highlight(sel){
    const selected = commits.filter(c => isSelected(sel,c));
    dots.classed('selected', d => selected.includes(d));
    renderCount(selected.length);
    renderLangBreakdown(selected);
  }
}

function renderCount (n){
  d3.select('#selection-count')
    .text(n ? `${n} commit${n>1?'s':''} selected` : 'No commits selected');
}

function renderLangBreakdown (commits){
  const out = d3.select('#language-breakdown').html('');
  if(!commits.length) return;

  const breakdown = d3.rollups(
    commits.flatMap(c=>c.lines),
    v => v.length,
    d => d.type);
  const total = d3.sum(breakdown, d=>d[1]);

  breakdown.sort((a,b)=>d3.descending(a[1],b[1])).forEach(([lang,count])=>{
    out.append('dt').text(lang);
    out.append('dd')
       .text(`${count} lines (${d3.format('.1%')(count/total)})`);
  });
}

function showTooltip (commit,x,y,instant=false){
  const tip = document.getElementById('commit-tooltip');
  if(!commit){ tip.hidden=true; return; }

  tip.querySelector('#commit-link').textContent = commit.id.slice(0,7);
  tip.querySelector('#commit-link').href        = commit.url;
  tip.querySelector('#commit-date').textContent = commit.date;
  tip.querySelector('#commit-time').textContent =
      commit.datetime.toLocaleTimeString('en',{timeStyle:'short'});
  tip.querySelector('#commit-author').textContent = commit.author;
  tip.querySelector('#commit-lines').textContent   = commit.totalLines;

  tip.style.left = x + 12 + 'px';
  tip.style.top  = y + 12 + 'px';
  tip.hidden = false;
  if(instant) tip.style.opacity = 1;
}

const rows    = await loadData();
const commits = processCommits(rows);

renderStats(rows, commits);
renderScatter(commits);
