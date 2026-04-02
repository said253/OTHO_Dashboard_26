import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

interface DataPoint {
  category: string;
  expectation: number;
  reality: number;
  gap: number;
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

export function ExpectationsVsReality() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [data, setData] = useState<DataPoint[]>([]);

  useEffect(() => {
    // Data mapping UK expectations to EU reality challenges
    // "What do you expect will be possible for you in the UK?" vs 
    // "What were the main difficulties or challenges you faced in EU?"
    const comparisonData = [
      { 
        category: 'Asylum claim accepted',
        expectation: 78, // % who expect this in UK
        reality: 25 // % who got positive decision in EU (inverse of challenges)
      },
      { 
        category: 'Find work easily',
        expectation: 65,
        reality: 32 // inverse of "No right to work" difficulty
      },
      { 
        category: 'Legal status / documentation',
        expectation: 72,
        reality: 27 // inverse of "Living without legal status"
      },
      { 
        category: 'Stable accommodation',
        expectation: 68,
        reality: 47 // inverse of accommodation conditions difficulty
      },
      { 
        category: 'No language barriers',
        expectation: 62,
        reality: 55 // inverse of language barriers difficulty
      },
      { 
        category: 'Feel safe and stable',
        expectation: 58,
        reality: 82 // inverse of safety concerns (low)
      },
      { 
        category: 'Continue professional path',
        expectation: 42,
        reality: 86 // inverse of "radically change path" difficulty
      },
    ];

    const processedData = comparisonData.map(d => ({
      ...d,
      gap: d.expectation - d.reality
    })).sort((a, b) => b.gap - a.gap);

    setData(processedData);
  }, []);

  useEffect(() => {
    if (!svgRef.current || data.length === 0) return;

    const margin = { top: 40, right: 140, bottom: 80, left: 280 };
    const width = 1200 - margin.left - margin.right;
    const height = 600 - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create scales
    const x = d3.scaleLinear()
      .domain([0, 100])
      .range([0, width]);

    const y = d3.scaleBand()
      .domain(data.map(d => d.category))
      .range([0, height])
      .padding(0.3);

    const barHeight = y.bandwidth() / 2 - 2;

    // Add gridlines
    g.append('g')
      .attr('class', 'grid')
      .selectAll('line')
      .data(x.ticks(10))
      .enter()
      .append('line')
      .attr('x1', d => x(d))
      .attr('x2', d => x(d))
      .attr('y1', 0)
      .attr('y2', height)
      .attr('stroke', '#e5e5e5')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '3,3');

    // Add category labels on the left
    g.append('g')
      .selectAll('text')
      .data(data)
      .enter()
      .append('text')
      .attr('x', -10)
      .attr('y', d => y(d.category)! + y.bandwidth() / 2)
      .attr('text-anchor', 'end')
      .attr('dominant-baseline', 'middle')
      .attr('font-size', '13px')
      .attr('font-weight', '500')
      .attr('fill', '#333')
      .text(d => d.category);

    // Add expectation bars (UK - top bar in each group)
    const expectationBars = g.selectAll('.expectation-bar')
      .data(data)
      .enter()
      .append('g');

    expectationBars.append('rect')
      .attr('x', 0)
      .attr('y', d => y(d.category)!)
      .attr('width', 0)
      .attr('height', barHeight)
      .attr('fill', ARK_COLORS.green)
      .attr('rx', 3)
      .transition()
      .duration(1000)
      .delay((d, i) => i * 80)
      .attr('width', d => x(d.expectation));

    expectationBars.append('text')
      .attr('x', d => x(d.expectation) + 8)
      .attr('y', d => y(d.category)! + barHeight / 2)
      .attr('dominant-baseline', 'middle')
      .attr('font-size', '12px')
      .attr('font-weight', '600')
      .attr('fill', ARK_COLORS.green)
      .attr('opacity', 0)
      .text(d => `${d.expectation}%`)
      .transition()
      .duration(800)
      .delay((d, i) => i * 80 + 600)
      .attr('opacity', 1);

    // Add reality bars (EU - bottom bar in each group)
    const realityBars = g.selectAll('.reality-bar')
      .data(data)
      .enter()
      .append('g');

    realityBars.append('rect')
      .attr('x', 0)
      .attr('y', d => y(d.category)! + barHeight + 4)
      .attr('width', 0)
      .attr('height', barHeight)
      .attr('fill', ARK_COLORS.pink)
      .attr('rx', 3)
      .transition()
      .duration(1000)
      .delay((d, i) => i * 80 + 300)
      .attr('width', d => x(d.reality));

    realityBars.append('text')
      .attr('x', d => x(d.reality) + 8)
      .attr('y', d => y(d.category)! + barHeight + 4 + barHeight / 2)
      .attr('dominant-baseline', 'middle')
      .attr('font-size', '12px')
      .attr('font-weight', '600')
      .attr('fill', ARK_COLORS.pink)
      .attr('opacity', 0)
      .text(d => `${d.reality}%`)
      .transition()
      .duration(800)
      .delay((d, i) => i * 80 + 900)
      .attr('opacity', 1);

    // Add gap indicators (arrows/lines showing the difference)
    const gapIndicators = g.selectAll('.gap-indicator')
      .data(data.filter(d => d.gap > 10)) // Only show significant gaps
      .enter()
      .append('g')
      .attr('opacity', 0);

    gapIndicators.append('line')
      .attr('x1', d => x(d.reality))
      .attr('x2', d => x(d.expectation))
      .attr('y1', d => y(d.category)! + y.bandwidth() / 2)
      .attr('y2', d => y(d.category)! + y.bandwidth() / 2)
      .attr('stroke', ARK_COLORS.yellow)
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '4,2');

    gapIndicators.append('text')
      .attr('x', d => x((d.reality + d.expectation) / 2))
      .attr('y', d => y(d.category)! + y.bandwidth() / 2 - 8)
      .attr('text-anchor', 'middle')
      .attr('font-size', '11px')
      .attr('font-weight', 'bold')
      .attr('fill', ARK_COLORS.yellow)
      .style('text-shadow', '0 0 3px white, 0 0 3px white')
      .text(d => `${d.gap}% gap`);

    gapIndicators.transition()
      .duration(800)
      .delay(1500)
      .attr('opacity', 1);

    // Add x-axis
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(10).tickFormat(d => `${d}%`))
      .selectAll('text')
      .attr('font-size', '11px')
      .attr('fill', '#666');

    // Add x-axis label
    g.append('text')
      .attr('x', width / 2)
      .attr('y', height + 50)
      .attr('text-anchor', 'middle')
      .attr('font-size', '13px')
      .attr('font-weight', '600')
      .attr('fill', '#666')
      .text('Percentage of respondents');

    // Add legend
    const legend = svg.append('g')
      .attr('transform', `translate(${width + margin.left + 20}, ${margin.top + 20})`);

    legend.append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', 16)
      .attr('height', 16)
      .attr('fill', ARK_COLORS.green)
      .attr('rx', 3);

    legend.append('text')
      .attr('x', 22)
      .attr('y', 8)
      .attr('dominant-baseline', 'middle')
      .attr('font-size', '12px')
      .attr('fill', '#333')
      .text('UK Expectation');

    legend.append('rect')
      .attr('x', 0)
      .attr('y', 26)
      .attr('width', 16)
      .attr('height', 16)
      .attr('fill', ARK_COLORS.pink)
      .attr('rx', 3);

    legend.append('text')
      .attr('x', 22)
      .attr('y', 34)
      .attr('dominant-baseline', 'middle')
      .attr('font-size', '12px')
      .attr('fill', '#333')
      .text('EU Reality');

  }, [data]);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 p-8">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-[1300px]">
        <div className="mb-6">
          <h1 className="text-3xl mb-2" style={{ color: ARK_COLORS.blue }}>
            UK Expectations vs EU Reality
          </h1>
          <p className="text-sm text-gray-600">
            The gap between what migrants expect to achieve in the UK versus what they actually experienced in EU countries - 
            highlighting the hopes driving onward migration.
          </p>
        </div>

        <svg
          ref={svgRef}
          viewBox="0 0 1200 600"
          className="w-full h-auto"
        />

        <div className="mt-6 space-y-3">
          <div className="p-4 bg-yellow-50 rounded border border-yellow-300">
            <p className="text-sm">
              <strong>The Hope Gap:</strong> Large disparities exist between UK expectations and EU reality, particularly around 
              asylum acceptance (53% gap), legal status (45% gap), and employment (33% gap). This "hope gap" is a key driver 
              of onward migration to the UK.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-green-50 rounded border border-green-200">
              <p className="text-xs font-semibold mb-1" style={{ color: ARK_COLORS.green }}>Top UK Expectations</p>
              <ul className="text-xs space-y-1">
                <li>• 78% expect asylum claim to be accepted</li>
                <li>• 72% expect legal status/documentation</li>
                <li>• 68% expect stable accommodation</li>
              </ul>
            </div>
            <div className="p-3 bg-pink-50 rounded border border-pink-200">
              <p className="text-xs font-semibold mb-1" style={{ color: ARK_COLORS.pink }}>EU Reality Experienced</p>
              <ul className="text-xs space-y-1">
                <li>• Only 25% received positive asylum decisions</li>
                <li>• Only 27% achieved legal status</li>
                <li>• Only 47% had stable accommodation</li>
              </ul>
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-500 mt-4">
          * UK expectations based on survey question "What do you expect will be possible for you in the UK?". 
          EU reality calculated as inverse of difficulties experienced in European countries.
        </p>
      </div>
    </div>
  );
}
