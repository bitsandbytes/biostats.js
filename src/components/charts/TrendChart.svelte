<!--
  D3 multi-line trend chart for PersonDetail.

  Props:
  - `series`: [{ key, label, unit, points: [{ measured_at, value }] }] — the
    lines to draw (already filtered to the selected series and time range).
  - `styles`: key → { axis: 'left'|'right', color, dashed } from
    seriesStyles() in src/lib/chartSeries.js. At most two units, so at most
    two y-axes; each axis is labelled and coloured by its unit.

  Hovering (or touching) shows a crosshair at the nearest measurement date and
  a tooltip listing every drawn series' reading on that date. The chart
  redraws when its container width changes.
-->
<script>
  import * as d3 from 'd3';
  import { formatValue, formatDate } from '../../lib/format.js';

  let { series = [], styles = {}, height = 300, emptyMessage = 'No data to chart.' } = $props();

  let el = $state();
  let width = $state(0);
  let tooltip = $state(null); // { left, top, date, rows: [{ label, value, unit, color }] }

  const margin = { top: 16, right: 56, bottom: 30, left: 56 };
  const parseDate = d3.timeParse('%Y-%m-%d');

  let hasData = $derived(series.some(s => s.points.length > 0));

  $effect(() => {
    if (!el || !width || !hasData) return;
    draw(series, styles, width);
  });

  function draw(series, styles, fullWidth) {
    el.replaceChildren();
    tooltip = null;

    const w = fullWidth - margin.left - margin.right;
    const h = height - margin.top - margin.bottom;
    const lines = series
      .filter(s => s.points.length > 0)
      .map(s => ({ ...s, style: styles[s.key], pts: s.points.map(p => ({ ...p, date: parseDate(p.measured_at), v: +p.value })) }));

    const allPts = lines.flatMap(l => l.pts);
    const [minDate, maxDate] = d3.extent(allPts, d => d.date);
    // Pad a single-date chart so the point isn't pinned to the axis edge.
    const x = d3.scaleTime()
      .domain(+minDate === +maxDate ? [d3.timeDay.offset(minDate, -7), d3.timeDay.offset(maxDate, 7)] : [minDate, maxDate])
      .range([0, w]);

    const yFor = {};
    for (const axis of ['left', 'right']) {
      const pts = lines.filter(l => l.style.axis === axis).flatMap(l => l.pts);
      if (pts.length === 0) continue;
      const [lo, hi] = d3.extent(pts, d => d.v);
      const pad = (hi - lo) * 0.15 || Math.abs(hi) * 0.05 || 1;
      yFor[axis] = d3.scaleLinear().domain([lo - pad, hi + pad]).nice().range([h, 0]);
    }

    const svg = d3.select(el).append('svg')
      .attr('width', fullWidth)
      .attr('height', height)
      .attr('role', 'img')
      .attr('aria-label', `Trend chart: ${lines.map(l => `${l.label} (${l.unit})`).join(', ')}`);
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Horizontal grid from the primary (left, else right) axis.
    const gridScale = yFor.left ?? yFor.right;
    g.append('g').attr('class', 'grid')
      .call(d3.axisLeft(gridScale).ticks(5).tickSize(-w).tickFormat(''))
      .call(sel => sel.select('.domain').remove());

    g.append('g').attr('class', 'axis').attr('transform', `translate(0,${h})`)
      .call(d3.axisBottom(x).ticks(Math.max(2, Math.floor(w / 90))).tickSizeOuter(0));

    for (const axis of ['left', 'right']) {
      if (!yFor[axis]) continue;
      const color = lines.find(l => l.style.axis === axis).style.color;
      const unit = lines.find(l => l.style.axis === axis).unit;
      const ax = g.append('g').attr('class', 'axis y')
        .attr('transform', axis === 'right' ? `translate(${w},0)` : null)
        .call((axis === 'left' ? d3.axisLeft : d3.axisRight)(yFor[axis]).ticks(5).tickSizeOuter(0));
      // Inline style (not the fill attribute) so it beats the stylesheet's muted tick colour.
      ax.selectAll('text').style('fill', color);
      ax.append('text')
        .attr('x', axis === 'left' ? -margin.left + 4 : margin.right - 4)
        .attr('y', -4)
        .attr('text-anchor', axis === 'left' ? 'start' : 'end')
        .style('fill', color)
        .attr('font-weight', 600)
        .text(unit);
    }

    for (const l of lines) {
      const y = yFor[l.style.axis];
      g.append('path')
        .datum(l.pts)
        .attr('fill', 'none')
        .attr('stroke', l.style.color)
        .attr('stroke-width', 2.5)
        .attr('stroke-linejoin', 'round')
        .attr('stroke-dasharray', l.style.dashed ? '6 4' : null)
        .attr('d', d3.line().x(d => x(d.date)).y(d => y(d.v)));
      g.append('g').selectAll('circle').data(l.pts).join('circle')
        .attr('cx', d => x(d.date))
        .attr('cy', d => y(d.v))
        .attr('r', 3.5)
        .attr('fill', 'white')
        .attr('stroke', l.style.color)
        .attr('stroke-width', 2);
    }

    // Hover crosshair + tooltip, snapped to the nearest measurement date.
    const dates = [...new Set(allPts.map(p => p.measured_at))].sort();
    const dateX = dates.map(dstr => x(parseDate(dstr)));
    const crosshair = g.append('line').attr('class', 'crosshair')
      .attr('y1', 0).attr('y2', h).style('display', 'none');
    const markers = g.append('g');

    const overlay = g.append('rect')
      .attr('width', w).attr('height', h)
      .attr('fill', 'transparent')
      .style('touch-action', 'pan-y');

    function show(event) {
      const [mx] = d3.pointer(event);
      let best = 0;
      dateX.forEach((dx, i) => { if (Math.abs(dx - mx) < Math.abs(dateX[best] - mx)) best = i; });
      const dstr = dates[best];
      const cx = dateX[best];
      const hits = lines
        .map(l => ({ l, p: l.pts.find(p => p.measured_at === dstr) }))
        .filter(hit => hit.p);

      crosshair.attr('x1', cx).attr('x2', cx).style('display', null);
      markers.selectAll('circle').data(hits).join('circle')
        .attr('cx', cx)
        .attr('cy', hit => yFor[hit.l.style.axis](hit.p.v))
        .attr('r', 5.5)
        .attr('fill', hit => hit.l.style.color)
        .attr('stroke', 'white')
        .attr('stroke-width', 2);

      const flip = cx > w * 0.65;
      tooltip = {
        left: margin.left + cx + (flip ? -12 : 12),
        top: margin.top + 8,
        flip,
        date: dstr,
        rows: hits.map(hit => ({ label: hit.l.label, value: hit.p.v, unit: hit.l.unit, color: hit.l.style.color })),
      };
    }

    function hide() {
      crosshair.style('display', 'none');
      markers.selectAll('circle').remove();
      tooltip = null;
    }

    overlay.on('pointermove', show).on('pointerdown', show).on('pointerleave', hide);
  }
</script>

<div class="chart" bind:clientWidth={width} style:height="{height}px">
  {#if hasData}
    <div bind:this={el}></div>
    {#if tooltip}
      <div class="tooltip" class:flip={tooltip.flip} style:left="{tooltip.left}px" style:top="{tooltip.top}px">
        <div class="tt-date">{formatDate(tooltip.date)}</div>
        {#each tooltip.rows as row (row.label + row.unit)}
          <div class="tt-row"><span class="swatch" style:background={row.color}></span>{formatValue(row.value)} {row.unit}</div>
        {/each}
      </div>
    {/if}
  {:else}
    <p class="empty">{emptyMessage}</p>
  {/if}
</div>

<style>
  .chart {
    position: relative;
    width: 100%;
  }
  .chart :global(.axis text) {
    font-family: inherit;
    font-size: 11px;
    fill: var(--muted);
  }
  .chart :global(.axis .domain),
  .chart :global(.axis line) {
    stroke: var(--border);
  }
  .chart :global(.grid line) {
    stroke: var(--border-soft);
  }
  .chart :global(.crosshair) {
    stroke: var(--muted);
    stroke-dasharray: 3 3;
  }
  .tooltip {
    position: absolute;
    pointer-events: none;
    background: var(--ink);
    color: white;
    border-radius: var(--radius-sm);
    padding: 8px 12px;
    font-size: 0.85rem;
    white-space: nowrap;
    box-shadow: var(--shadow-overlay);
  }
  .tooltip.flip {
    transform: translateX(-100%);
  }
  .tt-date {
    color: #c9dad8;
    font-size: 0.78rem;
    margin-bottom: 2px;
  }
  .tt-row {
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 600;
  }
  .swatch {
    width: 10px;
    height: 10px;
    border-radius: 2px;
  }
  .empty {
    margin: 0;
    height: 100%;
    display: grid;
    place-items: center;
    color: var(--muted);
  }
</style>
