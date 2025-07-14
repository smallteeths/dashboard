<template>
  <div
    ref="container"
    class="chart-wrapper"
  >
    <svg
      ref="svgRef"
      :width="width"
      :height="height"
    />
    <div
      v-show="showTooltip"
      ref="tooltipRef"
      class="tooltip"
      :style="{ top: tooltipY + 'px', left: tooltipX + 'px' }"
    >
      {{ tooltipText }}
    </div>
  </div>
</template>

<script>
import * as d3 from 'd3';

export default {
  name:  'PartialDonutChart',
  props: {
    values: {
      type:    Array,
      default: () => [100, 30, 10],
    },
    labels: {
      type:    Array,
      default: () => [{ key: 'remain', value: '' }, { key: 'distribution', value: '' }, { key: 'use', value: '' }],
    },
    colors: {
      type:    Array,
      default: () => ['#eee', '#52c41a', '#DAC342'],
    },
    width: {
      type:    Number,
      default: 300,
    },
    height: {
      type:    Number,
      default: 300,
    },
    innerRadius: {
      type:    Number,
      default: 100,
    },
    outerRadius: {
      type:    Number,
      default: 130,
    },
    nameText: {
      type:    String,
      default: '',
    },
    totalText: {
      type:    String,
      default: '',
    },
    remainText: {
      type:    String,
      default: '',
    },
    cornerRadius: {
      type:    Number,
      default: 8,
    },
  },
  data() {
    return {
      showTooltip:     false,
      tooltipText:     '',
      tooltipX:        0,
      tooltipY:        0,
      arcGroup:        null,
      textGroupCenter: null,
      textBottomEl:    null,
    };
  },
  mounted() {
    this.draw();
  },
  watch: {
    values: {
      handler() {
        this.update();
      },
      deep: true,
    },
  },
  methods: {
    draw() {
      const svg = d3.select(this.$refs.svgRef);

      svg.selectAll('*').remove();

      const w = this.width;
      const h = this.height;
      // 270° = 3/2π
      const fullAngle = (3 / 2) * Math.PI;
      // (–3/4π)
      const startAngle = -3 / 4 * Math.PI;

      const backgroundArc = d3.arc()
        .innerRadius(this.innerRadius)
        .outerRadius(this.outerRadius)
        .startAngle(startAngle)
        .endAngle(startAngle + fullAngle)
        .cornerRadius(this.cornerRadius);

      svg
        .append('path')
        .attr('d', backgroundArc())
        .attr('fill', '#eee')
        .attr('transform', `translate(${ w / 2 }, ${ h / 2 })`);

      const arcGen = d3.arc()
        .innerRadius(this.innerRadius)
        .outerRadius(this.outerRadius)
        .cornerRadius(this.cornerRadius);

      const sectors = this.values.map((v, i) => {
        const angle = fullAngle * (v / 100);

        return {
          startAngle,
          endAngle: startAngle + angle,
          label:    `${ this.labels[i].key }：${ this.labels[i].value }`,
          value:    v,
          color:    this.colors[i],
        };
      });

      const g = svg
        .append('g')
        .attr('transform', `translate(${ w / 2 }, ${ h / 2 })`);

      this.arcGroup = g.selectAll('path.data-arc')
        .data(sectors)
        .enter()
        .append('path')
        .classed('data-arc', true)
        .attr('d', (d) => arcGen(d))
        .attr('fill', (d) => d.color)
        .on('mouseover', (event, d) => this.showTip(event, d))
        .on('mousemove', (event) => this.moveTip(event))
        .on('mouseout', () => this.hideTip());

      this.renderTexts();
    },
    renderTexts() {
      const svg = d3.select(this.$refs.svgRef);
      const w = this.width;
      const h = this.height;

      if (this.textGroupCenter) this.textGroupCenter.remove();
      if (this.textBottomEl) this.textBottomEl.remove();

      this.textGroupCenter = svg.append('g')
        .attr('transform', `translate(${ w / 2 }, ${ h / 2 })`);

      this.textGroupCenter.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '-0.6em')
        .attr('font-size', 17)
        .text(this.nameText);

      this.textGroupCenter.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '1.0em')
        .attr('font-size', 13)
        .text(this.totalText);

      this.textBottomEl = svg.append('text')
        .attr('x', w / 2)
        .attr('y', h - 70)
        .attr('text-anchor', 'middle')
        .attr('font-size', 13)
        .attr('fill', '#3497DA')
        .text(this.remainText);
    },
    showTip(event, d) {
      this.tooltipText = d.label;
      this.showTooltip = true;
      this.moveTip(event);
    },
    moveTip(event) {
      const containerRect = this.$refs.container.getBoundingClientRect();

      this.tooltipX = event.clientX - containerRect.x + 10;
      this.tooltipY = event.clientY - containerRect.y + 10;
    },
    hideTip() {
      this.showTooltip = false;
    },
    update() {
      const fullAngle = (3 / 2) * Math.PI;
      const startAngle = -3 / 4 * Math.PI;
      const arcGen = d3.arc()
        .innerRadius(this.innerRadius)
        .outerRadius(this.outerRadius)
        .cornerRadius(this.cornerRadius);

      const newSectors = this.values.map((v, i) => {
        const angle = fullAngle * (v / 100);

        return {
          startAngle,
          endAngle: startAngle + angle,
          label:    `${ this.labels[i].key }：${ this.labels[i].value }`,
          color:    this.colors[i],
        };
      });
      const paths = this.arcGroup
        .data(newSectors);

      paths
        .attr('d', (d) => {
          return arcGen(d);
        })
        .attr('fill', (d) => d.color);

      this.renderTexts();
    }
  },
};
</script>

<style scoped>
.chart-wrapper {
  position: relative;
  display: inline-block;
}
.tooltip {
  position: absolute;
  pointer-events: none;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  padding: 4px 8px;
  font-size: 12px;
  border-radius: 3px;
  white-space: nowrap;
}
</style>
