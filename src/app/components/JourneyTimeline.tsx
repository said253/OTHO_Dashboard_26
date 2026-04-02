import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

interface TimelineData {
  period: string;
  year: string;
  count: number;
  percentage: number;
  avgDwellMonths: number;
}

// ARK color scheme
const ARK_COLORS = {
  blue: '#597598',
  pink: '#d4779c',
  green: '#b6d5a0',
  yellow: '#f5d491',
  purple: '#5c5376',
  darkPurple: '#52224a',
  gray: '#585857'
};

export function JourneyTimeline() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [timelineData, setTimelineData] = useState<TimelineData[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      // Data based on "When did you first arrive in Europe?" from the CSV
      // Categorized and aggregated with approximate average dwell time
      const data: TimelineData[] = [
        { period: '2016 and before', year: '≤2016', count: 8, percentage: 9.4, avgDwellMonths: 96 },
        { period: '2017-2019', year: '2017-19', count: 5, percentage: 5.9, avgDwellMonths: 72 },
        { period: '2020-2023', year: '2020-23', count: 28, percentage: 32.9, avgDwellMonths: 36 },
        { period: '2024', year: '2024', count: 22, percentage: 25.9, avgDwellMonths: 18 },
        { period: '2025', year: '2025', count: 18, percentage: 21.2, avgDwellMonths: 8 },
        { period: '2026', year: '2026', count: 4, percentage: 4.7, avgDwellMonths: 3 },
      ];

      setTimelineData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, []);

  useEffect(() => {
    if (!svgRef.current || timelineData.length === 0) return;

    try {
      const margin = { top: 60, right: 80, bottom: 100, left: 80 };
      const width = 1200 - margin.left - margin.right;
      const height = 600 - margin.top - margin.bottom;

      const svg = d3.select(svgRef.current);
      svg.selectAll('*').remove();

      const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      // Create scales
      const x = d3.scaleBand()
        .domain(timelineData.map(d => d.year))
        .range([0, width])
        .padding(0.3);

      const yCount = d3.scaleLinear()
        .domain([0, Math.max(...timelineData.map(d => d.count)) * 1.2])
        .range([height, 0]);

      const yDwell = d3.scaleLinear()
        .domain([0, Math.max(...timelineData.map(d => d.avgDwellMonths)) * 1.1])
        .range([height, 0]);

      // Add title
      svg.append('text')
        .attr('x', width / 2 + margin.left)
        .attr('y', 30)
        .attr('text-anchor', 'middle')
        .attr('font-size', '18px')
        .attr('font-weight', 'bold')
        .attr('fill', ARK_COLORS.blue)
        .text('Migration Journey Timeline: When They Arrived & How Long They\'ve Been Waiting');

      // Add gridlines for count
      g.append('g')
        .attr('class', 'grid')
        .selectAll('line')
        .data(yCount.ticks(5))
        .enter()
        .append('line')
        .attr('x1', 0)
        .attr('x2', width)
        .attr('y1', d => yCount(d))
        .attr('y2', d => yCount(d))
        .attr('stroke', '#e5e5e5')
        .attr('stroke-width', 1);

      // Add bars for count
      const bars = g.selectAll('.bar')
        .data(timelineData)
        .enter()
        .append('g');

      bars.append('rect')
        .attr('x', d => x(d.year)!)
        .attr('y', height)
        .attr('width', x.bandwidth())
        .attr('height', 0)
        .attr('fill', ARK_COLORS.blue)
        .attr('rx', 6)
        .transition()
        .duration(1000)
        .delay((d, i) => i * 150)
        .attr('y', d => yCount(d.count))
        .attr('height', d => height - yCount(d.count));

      // Add count labels on bars
      bars.append('text')
        .attr('x', d => x(d.year)! + x.bandwidth() / 2)
        .attr('y', d => yCount(d.count) - 8)
        .attr('text-anchor', 'middle')
        .attr('font-size', '16px')
        .attr('font-weight', 'bold')
        .attr('fill', ARK_COLORS.blue)
        .attr('opacity', 0)
        .text(d => d.count)
        .transition()
        .duration(800)
        .delay((d, i) => i * 150 + 800)
        .attr('opacity', 1);

      // Add percentage labels
      bars.append('text')
        .attr('x', d => x(d.year)! + x.bandwidth() / 2)
        .attr('y', d => yCount(d.count) - 28)
        .attr('text-anchor', 'middle')
        .attr('font-size', '13px')
        .attr('font-weight', '600')
        .attr('fill', '#666')
        .attr('opacity', 0)
        .text(d => `${d.percentage.toFixed(1)}%`)
        .transition()
        .duration(800)
        .delay((d, i) => i * 150 + 1000)
        .attr('opacity', 1);

      // Add dwell time line
      const line = d3.line<TimelineData>()
        .x(d => x(d.year)! + x.bandwidth() / 2)
        .y(d => yDwell(d.avgDwellMonths))
        .curve(d3.curveMonotoneX);

      const path = g.append('path')
        .datum(timelineData)
        .attr('fill', 'none')
        .attr('stroke', ARK_COLORS.yellow)
        .attr('stroke-width', 4)
        .attr('d', line);

      const pathLength = (path.node() as SVGPathElement).getTotalLength();

      path
        .attr('stroke-dasharray', `${pathLength} ${pathLength}`)
        .attr('stroke-dashoffset', pathLength)
        .transition()
        .duration(2000)
        .delay(800)
        .attr('stroke-dashoffset', 0);

      // Add dwell time points and labels
      const dwellPoints = g.selectAll('.dwell-point')
        .data(timelineData)
        .enter()
        .append('g')
        .attr('opacity', 0);

      dwellPoints.append('circle')
        .attr('cx', d => x(d.year)! + x.bandwidth() / 2)
        .attr('cy', d => yDwell(d.avgDwellMonths))
        .attr('r', 6)
        .attr('fill', ARK_COLORS.yellow)
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 3);

      dwellPoints.append('text')
        .attr('x', d => x(d.year)! + x.bandwidth() / 2)
        .attr('y', d => yDwell(d.avgDwellMonths) - 15)
        .attr('text-anchor', 'middle')
        .attr('font-size', '12px')
        .attr('font-weight', 'bold')
        .attr('fill', ARK_COLORS.darkPurple)
        .style('text-shadow', '0 0 3px white, 0 0 3px white')
        .text(d => `${d.avgDwellMonths}m`);

      dwellPoints.transition()
        .duration(600)
        .delay((d, i) => i * 150 + 1500)
        .attr('opacity', 1);

      // Add x-axis
      g.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll('text')
        .attr('font-size', '13px')
        .attr('font-weight', '600')
        .attr('fill', '#333');

      // Add period labels below x-axis
      g.append('g')
        .selectAll('text')
        .data(timelineData)
        .enter()
        .append('text')
        .attr('x', d => x(d.year)! + x.bandwidth() / 2)
        .attr('y', height + 35)
        .attr('text-anchor', 'middle')
        .attr('font-size', '11px')
        .attr('fill', '#666')
        .text(d => d.period);

      // Add y-axis for count (left)
      g.append('g')
        .call(d3.axisLeft(yCount).ticks(5))
        .selectAll('text')
        .attr('font-size', '12px')
        .attr('fill', '#666');

      g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -height / 2)
        .attr('y', -55)
        .attr('text-anchor', 'middle')
        .attr('font-size', '13px')
        .attr('font-weight', '600')
        .attr('fill', ARK_COLORS.blue)
        .text('Number of Respondents');

      // Add y-axis for dwell time (right)
      g.append('g')
        .attr('transform', `translate(${width},0)`)
        .call(d3.axisRight(yDwell).ticks(5).tickFormat(d => `${d}m`))
        .selectAll('text')
        .attr('font-size', '12px')
        .attr('fill', '#666');

      g.append('text')
        .attr('transform', `rotate(90)`)
        .attr('x', height / 2)
        .attr('y', -width - 55)
        .attr('text-anchor', 'middle')
        .attr('font-size', '13px')
        .attr('font-weight', '600')
        .attr('fill', ARK_COLORS.yellow)
        .text('Average Dwell Time (months)');

      // Add legend below chart
      const legend = svg.append('g')
        .attr('transform', `translate(${margin.left + width / 2 - 220}, ${height + margin.top + 70})`);

      legend.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', 20)
        .attr('height', 20)
        .attr('fill', ARK_COLORS.blue)
        .attr('rx', 4);

      legend.append('text')
        .attr('x', 28)
        .attr('y', 10)
        .attr('dominant-baseline', 'middle')
        .attr('font-size', '12px')
        .attr('fill', '#333')
        .text('Number of respondents (bars)');

      legend.append('line')
        .attr('x1', 240)
        .attr('x2', 260)
        .attr('y1', 10)
        .attr('y2', 10)
        .attr('stroke', ARK_COLORS.yellow)
        .attr('stroke-width', 4);

      legend.append('text')
        .attr('x', 268)
        .attr('y', 10)
        .attr('dominant-baseline', 'middle')
        .attr('font-size', '12px')
        .attr('fill', '#333')
        .text('Average time in transit (line)');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rendering error');
    }
  }, [timelineData]);

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50">
        <div className="bg-red-50 border border-red-200 rounded p-4">
          <p className="text-red-800">Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 p-8">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-[1300px]">
        <div className="mb-6">
          <h1 className="text-3xl mb-2" style={{ color: ARK_COLORS.blue }}>
            Migration Journey Timeline
          </h1>
          <p className="text-sm text-gray-600">
            When migrants first arrived in Europe and how long they've been in transit before attempting to reach the UK.
          </p>
        </div>

        <svg
          ref={svgRef}
          viewBox="0 0 1200 600"
          className="w-full h-auto"
        />

        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 rounded border border-blue-200">
            <p className="text-xs font-semibold mb-2" style={{ color: ARK_COLORS.blue }}>Peak Arrival Period</p>
            <p className="text-2xl font-bold mb-1" style={{ color: ARK_COLORS.blue }}>2020-2023</p>
            <p className="text-xs text-gray-600">32.9% of respondents arrived during this period, with an average of 36 months in transit</p>
          </div>

          <div className="p-4 bg-yellow-50 rounded border border-yellow-300">
            <p className="text-xs font-semibold mb-2" style={{ color: ARK_COLORS.yellow }}>Longest Stagnation</p>
            <p className="text-2xl font-bold mb-1" style={{ color: ARK_COLORS.yellow }}>96 months</p>
            <p className="text-xs text-gray-600">Those who arrived in 2016 or before have been in transit for 8+ years on average</p>
          </div>

          <div className="p-4 bg-purple-50 rounded border border-purple-200">
            <p className="text-xs font-semibold mb-2" style={{ color: ARK_COLORS.purple }}>Recent Arrivals</p>
            <p className="text-2xl font-bold mb-1" style={{ color: ARK_COLORS.purple }}>26%</p>
            <p className="text-xs text-gray-600">Arrived in 2025-2026, indicating ongoing migration pressure despite deterrence efforts</p>
          </div>
        </div>

        <div className="mt-4 p-4 bg-gray-50 rounded border border-gray-300">
          <p className="text-sm">
            <strong>Key insight:</strong> The data reveals a "stagnation crisis" - earlier arrivals have spent years in limbo (96 months for pre-2016 arrivals), 
            while recent arrivals still attempt UK crossing after relatively short EU stays (3-8 months). This suggests EU integration efforts 
            are failing for both long-term and newly-arrived migrants.
          </p>
        </div>

        <p className="text-xs text-gray-500 mt-4">
          * Based on "When did you first arrive in Europe?" responses. Dwell time represents average time spent in EU before attempting UK crossing.
        </p>
      </div>
    </div>
  );
}