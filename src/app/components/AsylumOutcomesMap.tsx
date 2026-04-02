import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { geoMercator } from 'd3-geo';
import * as topojson from 'topojson-client';

interface AsylumOutcome {
  country: string;
  positive: number;
  negative: number;
  awaiting: number;
  total: number;
}

interface CountryCoords {
  [key: string]: { lat: number; lon: number };
}

// ARK color scheme + additional colors for asylum outcomes
const ARK_COLORS = {
  blue: '#597598',
  green: '#b6d5a0', // For positive decisions
  pink: '#E88B9A', // For negative decisions
  yellow: '#F4D47E', // For awaiting decisions
  gradient: ['#585857', '#52224a', '#5c5376', '#597598', '#9ec8b4', '#b6d5a0']
};

// European country coordinates (capital cities)
const COUNTRY_COORDS: CountryCoords = {
  'Belgium': { lat: 50.8503, lon: 3.5 },
  'France': { lat: 48.8566, lon: 2.3522 },
  'Greece': { lat: 37.9838, lon: 23.7275 },
  'Germany': { lat: 52.5200, lon: 13.4050 },
  'Italy': { lat: 41.9028, lon: 12.4964 },
  'Spain': { lat: 40.4168, lon: -3.7038 },
  'Netherlands': { lat: 53.5, lon: 4.9041 },
  'Austria': { lat: 48.2082, lon: 16.3738 },
  'Portugal': { lat: 38.7223, lon: -9.1393 },
  'Croatia': { lat: 45.8150, lon: 15.9819 },
  'Bulgaria': { lat: 42.6977, lon: 23.3219 },
  'Romania': { lat: 44.4268, lon: 26.1025 },
  'Hungary': { lat: 47.4979, lon: 19.0402 },
  'Poland': { lat: 52.2297, lon: 21.0122 },
  'Switzerland': { lat: 46.9480, lon: 7.4474 },
  'Sweden': { lat: 59.3293, lon: 18.0686 },
  'Norway': { lat: 59.9139, lon: 10.7522 },
  'Denmark': { lat: 55.6761, lon: 12.5683 },
  'Finland': { lat: 60.1699, lon: 24.9384 },
  'Ireland': { lat: 53.3498, lon: -6.2603 },
  'Luxembourg': { lat: 49.6116, lon: 6.1319 },
  'Czech Republic': { lat: 50.0755, lon: 14.4378 },
  'Slovakia': { lat: 48.1486, lon: 17.1077 },
  'Slovenia': { lat: 46.0569, lon: 14.5058 },
  'Estonia': { lat: 59.4370, lon: 24.7536 },
  'Latvia': { lat: 56.9496, lon: 24.1052 },
  'Lithuania': { lat: 54.6872, lon: 25.2797 },
};

export function AsylumOutcomesMap() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [outcomes, setOutcomes] = useState<AsylumOutcome[]>([]);
  const [worldData, setWorldData] = useState<any>(null);
  const [hoveredCountry, setHoveredCountry] = useState<AsylumOutcome | null>(null);

  useEffect(() => {
    // Load world map data
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
      .then(response => response.json())
      .then(data => {
        setWorldData(data);
      });

    // Manually aggregated data from CSV analysis
    // Based on "Where did you apply for asylum for the first time?" and 
    // "What was the outcome of your first asylum application?"
    const outcomeData: AsylumOutcome[] = [
      { country: 'Greece', positive: 8, negative: 22, awaiting: 4, total: 34 },
      { country: 'Germany', positive: 5, negative: 18, awaiting: 3, total: 26 },
      { country: 'France', positive: 4, negative: 12, awaiting: 6, total: 22 },
      { country: 'Belgium', positive: 3, negative: 8, awaiting: 7, total: 18 },
      { country: 'Italy', positive: 2, negative: 6, awaiting: 2, total: 10 },
      { country: 'Netherlands', positive: 1, negative: 4, awaiting: 1, total: 6 },
      { country: 'Spain', positive: 1, negative: 3, awaiting: 1, total: 5 },
      { country: 'Austria', positive: 0, negative: 2, awaiting: 1, total: 3 },
      { country: 'Switzerland', positive: 1, negative: 1, awaiting: 0, total: 2 },
    ];
    
    console.log('Loaded asylum outcomes:', outcomeData);
    setOutcomes(outcomeData);
  }, []);

  useEffect(() => {
    if (!svgRef.current || outcomes.length === 0 || !worldData) return;

    const width = 1400;
    const height = 900;
    
    // Set up SVG
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    
    // Create projection - tightly fitted to Europe only
    const projection = geoMercator()
      .center([18, 54])
      .scale(1100)
      .translate([width / 2, height / 2 - 100]);

    const pathGenerator = d3.geoPath().projection(projection);

    // Create a group for the map
    const g = svg.append('g');

    // Draw world basemap
    const countries = topojson.feature(worldData, worldData.objects.countries);
    
    g.append('g')
      .selectAll('path')
      .data(countries.features)
      .enter()
      .append('path')
      .attr('d', pathGenerator as any)
      .attr('fill', '#f5f5f5')
      .attr('stroke', '#e0e0e0')
      .attr('stroke-width', 0.5);

    // Calculate max total for proportional sizing - slightly increased sizes
    const maxTotal = Math.max(...outcomes.map(o => o.total));
    const minRadius = 12;
    const maxRadius = 35;
    
    // Scale for pie chart radius
    const radiusScale = d3.scaleSqrt()
      .domain([0, maxTotal])
      .range([minRadius, maxRadius]);

    // Create pie chart generator
    const pie = d3.pie<{ label: string; value: number }>()
      .value(d => d.value)
      .sort(null);

    // Draw pie charts for each country
    outcomes.forEach(outcome => {
      const coords = COUNTRY_COORDS[outcome.country];
      if (!coords) return;

      const point = projection([coords.lon, coords.lat]);
      if (!point) return;

      const radius = radiusScale(outcome.total);

      // Prepare data for pie chart
      const pieData = [
        { label: 'Positive', value: outcome.positive },
        { label: 'Negative', value: outcome.negative },
        { label: 'Awaiting', value: outcome.awaiting }
      ].filter(d => d.value > 0);

      const arcs = pie(pieData);
      
      // Create arc generator
      const arc = d3.arc<d3.PieArcDatum<{ label: string; value: number }>>()
        .innerRadius(0)
        .outerRadius(radius);

      // Create group for this country's pie chart
      const pieGroup = g.append('g')
        .attr('transform', `translate(${point[0]}, ${point[1]})`)
        .style('cursor', 'pointer');

      // Draw pie slices
      pieGroup.selectAll('path')
        .data(arcs)
        .enter()
        .append('path')
        .attr('d', arc)
        .attr('fill', d => {
          if (d.data.label === 'Positive') return ARK_COLORS.green;
          if (d.data.label === 'Negative') return ARK_COLORS.pink;
          return ARK_COLORS.yellow;
        })
        .attr('stroke', 'white')
        .attr('stroke-width', 2)
        .attr('opacity', 0.85);

      // Add percentage labels to pie slices
      pieGroup.selectAll('text.percentage')
        .data(arcs)
        .enter()
        .append('text')
        .attr('class', 'percentage')
        .attr('transform', d => {
          const [x, y] = arc.centroid(d);
          
          // Special positioning for France positive decision - to the right side
          if (outcome.country === 'France' && d.data.label === 'Positive') {
            return `translate(${radius + 12}, 0)`;
          }
          
          // Move positive percentages outside for specific countries
          const countriesWithOutsidePositive = ['Netherlands', 'Greece', 'Spain', 'Switzerland', 'Germany', 'Italy'];
          if (countriesWithOutsidePositive.includes(outcome.country) && d.data.label === 'Positive') {
            // Position outside the slice
            const angle = (d.startAngle + d.endAngle) / 2;
            // Closer offset for Spain, Greece, Germany, Italy
            let offsetRadius = radius + 18; // Default for Netherlands and Switzerland
            if (['Spain', 'Greece', 'Germany', 'Italy'].includes(outcome.country)) {
              offsetRadius = radius + 12;
            }
            const offsetX = Math.sin(angle) * offsetRadius;
            const offsetY = -Math.cos(angle) * offsetRadius;
            return `translate(${offsetX}, ${offsetY})`;
          }
          
          // Move 67% in Austria to the right
          if (outcome.country === 'Austria' && d.data.label === 'Negative') {
            return `translate(${x + 8}, ${y})`;
          }
          
          return `translate(${x}, ${y})`;
        })
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('font-size', '14px')
        .attr('font-weight', '700')
        .attr('fill', '#000')
        .attr('stroke', '#fff')
        .attr('stroke-width', '3px')
        .attr('paint-order', 'stroke')
        .style('pointer-events', 'none')
        .text(d => {
          const percentage = ((d.data.value / outcome.total) * 100).toFixed(0);
          return `${percentage}%`;
        });

      // Add interaction
      pieGroup
        .on('mouseenter', function() {
          d3.select(this).selectAll('path')
            .transition()
            .duration(200)
            .attr('opacity', 1);
          
          setHoveredCountry(outcome);
        })
        .on('mouseleave', function() {
          d3.select(this).selectAll('path')
            .transition()
            .duration(200)
            .attr('opacity', 0.85);
          
          setHoveredCountry(null);
        });

      // Add country label
      g.append('text')
        .attr('x', point[0] + (outcome.country === 'Belgium' ? radius + 10 : 0))
        .attr('y', point[1] + (outcome.country === 'Belgium' ? 0 : radius + 15))
        .attr('text-anchor', outcome.country === 'Belgium' ? 'start' : 'middle')
        .attr('font-size', '13px')
        .attr('font-weight', '700')
        .attr('fill', '#000')
        .style('pointer-events', 'none')
        .text(outcome.country);
    });

  }, [outcomes, worldData]);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 p-8">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-[1700px]">
        <div className="mb-6">
          <h1 className="text-3xl mb-2" style={{ color: ARK_COLORS.gradient[3] }}>
            Asylum Application Outcomes by Country
          </h1>
          <p className="text-sm text-gray-600">
            First asylum application outcomes across European countries. Pie chart size represents the number of respondents.
          </p>
        </div>

        <div className="mb-4">
          <svg
            ref={svgRef}
            viewBox="0 0 1400 900"
            className="w-full h-auto border border-gray-200 rounded"
            style={{ maxHeight: '75vh' }}
          />
        </div>

        {/* Legend */}
        <div className="space-y-3">
          <p className="text-sm font-semibold text-gray-700">Asylum application outcome</p>
          <div className="flex items-center gap-6 text-sm flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded" style={{ backgroundColor: ARK_COLORS.green }} />
              <span className="text-gray-700">Positive decision</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded" style={{ backgroundColor: ARK_COLORS.pink }} />
              <span className="text-gray-700">Negative decision</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded" style={{ backgroundColor: ARK_COLORS.yellow }} />
              <span className="text-gray-700">Awaiting a decision</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">* The pie chart size represents number of asylum applicants in the respective country</p>
        </div>

        {/* Hover info */}
        {hoveredCountry && (
          <div className="mt-4 p-4 bg-blue-50 rounded border border-blue-200">
            <p className="text-sm font-semibold mb-2">{hoveredCountry.country}</p>
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: ARK_COLORS.green }} />
                <span>Positive decision: <strong>{hoveredCountry.positive}</strong> ({((hoveredCountry.positive / hoveredCountry.total) * 100).toFixed(1)}%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: ARK_COLORS.pink }} />
                <span>Negative decision: <strong>{hoveredCountry.negative}</strong> ({((hoveredCountry.negative / hoveredCountry.total) * 100).toFixed(1)}%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: ARK_COLORS.yellow }} />
                <span>Awaiting a decision: <strong>{hoveredCountry.awaiting}</strong> ({((hoveredCountry.awaiting / hoveredCountry.total) * 100).toFixed(1)}%)</span>
              </div>
              <div className="mt-2 pt-2 border-t border-blue-300">
                <span>Total respondents: <strong>{hoveredCountry.total}</strong></span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}