<script>
  import { onMount } from 'svelte';
  import * as d3 from 'd3';

  let { measurements = [] } = $props();

  let el = $state();

  $effect(() => {
    if (!el || measurements.length === 0) return;
    draw(measurements);
  });

  function draw(data) {
    el.innerHTML = '';

    const margin = { top: 20, right: 60, bottom: 40, left: 60 };
    const width = el.clientWidth - margin.left - margin.right;
    const height = 320 - margin.top - margin.bottom;

    const svg = d3.select(el)
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const types = [...new Set(data.map(d => d.type))];
    const color = d3.scaleOrdinal(d3.schemeTableau10).domain(types);

    const parseDate = d3.timeParse('%Y-%m-%d');
    const parsed = data.map(d => ({ ...d, date: parseDate(d.measured_at), v: +d.value }));

    const xScale = d3.scaleTime()
      .domain(d3.extent(parsed, d => d.date))
      .range([0, width]);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(parsed, d => d.v) * 1.1])
      .range([height, 0]);

    svg.append('g').attr('transform', `translate(0,${height})`).call(d3.axisBottom(xScale));
    svg.append('g').call(d3.axisLeft(yScale));

    const line = d3.line().x(d => xScale(d.date)).y(d => yScale(d.v));

    for (const type of types) {
      const series = parsed.filter(d => d.type === type).sort((a, b) => a.date - b.date);
      svg.append('path')
        .datum(series)
        .attr('fill', 'none')
        .attr('stroke', color(type))
        .attr('stroke-width', 2)
        .attr('d', line);

      svg.selectAll(`.dot-${type}`)
        .data(series)
        .enter()
        .append('circle')
        .attr('cx', d => xScale(d.date))
        .attr('cy', d => yScale(d.v))
        .attr('r', 4)
        .attr('fill', color(type));
    }

    // Legend
    const legend = svg.append('g').attr('transform', `translate(0, ${height + 30})`);
    types.forEach((t, i) => {
      const g = legend.append('g').attr('transform', `translate(${i * 120}, 0)`);
      g.append('circle').attr('r', 5).attr('fill', color(t));
      g.append('text').attr('x', 10).attr('y', 5).text(t).style('font-size', '12px');
    });
  }
</script>

<div class="chart" bind:this={el}>
  {#if measurements.length === 0}
    <p class="empty">No data to chart.</p>
  {/if}
</div>

<style>
  .chart {
    width: 100%;
    min-height: 320px;
  }
  .empty {
    color: #9ca3af;
    text-align: center;
    padding: 3rem 0;
  }
</style>
