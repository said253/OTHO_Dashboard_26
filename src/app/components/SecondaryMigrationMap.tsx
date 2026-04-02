import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { geoMercator } from 'd3-geo';
import * as topojson from 'topojson-client';

interface TrajectoryData {
  birthCountry: string;
  asylumCountry: string;
  destinationCountry: string;
  count: number;
}

interface CountryCoords {
  [key: string]: { lat: number; lon: number };
}

// ARK color scheme
const ARK_COLORS = {
  blue: '#597598',
  green: '#b6d5a0',
  gradient: ['#585857', '#52224a', '#5c5376', '#597598', '#9ec8b4', '#b6d5a0']
};

// Country coordinates (capital cities)
const COUNTRY_COORDS: CountryCoords = {
  'Afghanistan': { lat: 34.5553, lon: 69.2075 },
  'Iraq': { lat: 33.3128, lon: 44.3615 },
  'Syria': { lat: 33.5138, lon: 36.2765 },
  'Sudan': { lat: 15.5007, lon: 32.5599 },
  'Ethiopia': { lat: 9.0320, lon: 38.7469 },
  'Eritrea': { lat: 15.3229, lon: 38.9251 },
  'Iran': { lat: 35.6892, lon: 51.3890 },
  'Morocco': { lat: 33.9716, lon: -6.8498 },
  'Maroco': { lat: 33.9716, lon: -6.8498 }, // Alternate spelling
  'Morrkco': { lat: 33.9716, lon: -6.8498 }, // Typo in data
  'Belgium': { lat: 50.8503, lon: 4.3517 },
  'France': { lat: 48.8566, lon: 2.3522 },
  'Greece': { lat: 37.9838, lon: 23.7275 },
  'United Kingdom': { lat: 51.5074, lon: -0.1278 },
  'UK': { lat: 51.5074, lon: -0.1278 },
  'Italy': { lat: 41.9028, lon: 12.4964 },
  'Other': { lat: 9.0320, lon: 38.7469 } // Default to Ethiopia as "Other"
};

export function SecondaryMigrationMap() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [trajectories, setTrajectories] = useState<TrajectoryData[]>([]);
  const [hoveredTraj, setHoveredTraj] = useState<TrajectoryData | null>(null);
  const [worldData, setWorldData] = useState<any>(null);

  useEffect(() => {
    // Load world map data
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
      .then(response => response.json())
      .then(data => {
        setWorldData(data);
      });

    // Hardcoded parsed data from the CSV (Birth Country, Asylum Country, Destination, Count)
    const rawData = [
      { birthCountry: 'Afghanistan', asylumCountry: 'Belgium', destinationCountry: 'United Kingdom', count: 7 },
      { birthCountry: 'Iraq', asylumCountry: 'Belgium', destinationCountry: 'United Kingdom', count: 12 },
      { birthCountry: 'Syria', asylumCountry: 'Belgium', destinationCountry: 'United Kingdom', count: 8 },
      { birthCountry: 'Syria', asylumCountry: 'France', destinationCountry: 'United Kingdom', count: 5 },
      { birthCountry: 'Morocco', asylumCountry: 'Belgium', destinationCountry: 'United Kingdom', count: 2 },
      { birthCountry: 'Morocco', asylumCountry: 'France', destinationCountry: 'United Kingdom', count: 3 },
      { birthCountry: 'Sudan', asylumCountry: 'Belgium', destinationCountry: 'United Kingdom', count: 6 },
      { birthCountry: 'Ethiopia', asylumCountry: 'Belgium', destinationCountry: 'United Kingdom', count: 14 },
      { birthCountry: 'Ethiopia', asylumCountry: 'France', destinationCountry: 'United Kingdom', count: 6 },
      { birthCountry: 'Iraq', asylumCountry: 'France', destinationCountry: 'United Kingdom', count: 4 },
      { birthCountry: 'Eritrea', asylumCountry: 'Belgium', destinationCountry: 'United Kingdom', count: 3 },
      { birthCountry: 'Afghanistan', asylumCountry: 'Greece', destinationCountry: 'United Kingdom', count: 2 },
      { birthCountry: 'Afghanistan', asylumCountry: 'France', destinationCountry: 'United Kingdom', count: 4 },
      { birthCountry: 'Iran', asylumCountry: 'Greece', destinationCountry: 'United Kingdom', count: 1 },
      { birthCountry: 'Iran', asylumCountry: 'France', destinationCountry: 'United Kingdom', count: 2 },
    ];

    console.log('Loaded trajectories:', rawData);
    setTrajectories(rawData);
  }, []);

  useEffect(() => {
    if (!svgRef.current || trajectories.length === 0 || !worldData) return;

    const width = 1400;
    const height = 800;
    
    // Set up SVG
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    
    // Create projection - wider view to show Middle East, Europe, and North Africa
    const projection = geoMercator()
      .center([25, 45])
      .scale(400)
      .translate([width / 2, height / 2]);

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
      .attr('fill', '#f0f0f0')
      .attr('stroke', '#ddd')
      .attr('stroke-width', 0.5);

    // Define arrow markers
    const defs = svg.append('defs');
    
    // Two-stage arrow (birth to asylum)
    defs.append('marker')
      .attr('id', 'arrow-stage1')
      .attr('viewBox', '0 0 10 10')
      .attr('refX', 8)
      .attr('refY', 5)
      .attr('markerWidth', 5)
      .attr('markerHeight', 5)
      .attr('orient', 'auto-start-reverse')
      .append('path')
      .attr('d', 'M 0 0 L 10 5 L 0 10 z')
      .attr('fill', ARK_COLORS.gradient[2])
      .attr('opacity', 0.6);

    // Final stage arrow (asylum to destination)
    defs.append('marker')
      .attr('id', 'arrow-stage2')
      .attr('viewBox', '0 0 10 10')
      .attr('refX', 8)
      .attr('refY', 5)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto-start-reverse')
      .append('path')
      .attr('d', 'M 0 0 L 10 5 L 0 10 z')
      .attr('fill', ARK_COLORS.blue)
      .attr('opacity', 0.7);

    // Create curved path
    const createCurvedPath = (from: [number, number], to: [number, number], curveOffset: number = 1) => {
      const [x1, y1] = from;
      const [x2, y2] = to;
      
      const dx = x2 - x1;
      const dy = y2 - y1;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      const curvature = Math.min(dist * 0.25, 80) * curveOffset;
      
      const cx = (x1 + x2) / 2 - dy / dist * curvature;
      const cy = (y1 + y2) / 2 + dx / dist * curvature;
      
      return `M ${x1},${y1} Q ${cx},${cy} ${x2},${y2}`;
    };

    // Group trajectories by count
    const sortedTrajectories = [...trajectories].sort((a, b) => a.count - b.count);

    // Draw trajectories
    sortedTrajectories.forEach((traj, index) => {
      const birthCoords = COUNTRY_COORDS[traj.birthCountry];
      const asylumCoords = COUNTRY_COORDS[traj.asylumCountry];
      const destCoords = COUNTRY_COORDS[traj.destinationCountry];

      if (!birthCoords || !asylumCoords || !destCoords) return;

      const birthPoint = projection([birthCoords.lon, birthCoords.lat]);
      const asylumPoint = projection([asylumCoords.lon, asylumCoords.lat]);
      const destPoint = projection([destCoords.lon, destCoords.lat]);

      if (!birthPoint || !asylumPoint || !destPoint) return;

      // Calculate stroke width based on count (log scale for better visual distinction)
      const baseWidth = Math.log(traj.count + 1) * 1.5 + 0.5;
      const opacity = Math.min(0.3 + (traj.count / 20) * 0.3, 0.75);

      // Create a group for this trajectory
      const trajGroup = g.append('g')
        .attr('class', 'trajectory')
        .style('cursor', 'pointer');

      // Stage 1: Birth → Asylum (lighter color)
      trajGroup.append('path')
        .attr('d', createCurvedPath(birthPoint, asylumPoint, 0.8))
        .attr('fill', 'none')
        .attr('stroke', ARK_COLORS.gradient[2])
        .attr('stroke-width', baseWidth * 0.8)
        .attr('opacity', opacity * 0.75)
        .attr('marker-end', 'url(#arrow-stage1)')
        .attr('stroke-dasharray', '4,4');

      // Stage 2: Asylum → Destination (ARK blue)
      trajGroup.append('path')
        .datum(traj)
        .attr('d', createCurvedPath(asylumPoint, destPoint, 1.2))
        .attr('fill', 'none')
        .attr('stroke', ARK_COLORS.blue)
        .attr('stroke-width', baseWidth)
        .attr('opacity', opacity * 0.75)
        .attr('marker-end', 'url(#arrow-stage2)');

      // Add interaction to the entire group
      trajGroup
        .on('mouseenter', function() {
          d3.select(this).selectAll('path')
            .transition()
            .duration(200)
            .attr('opacity', 1)
            .attr('stroke-width', baseWidth * 1.5);
          setHoveredTraj(traj);
        })
        .on('mouseleave', function() {
          d3.select(this).selectAll('path')
            .transition()
            .duration(200)
            .attr('opacity', opacity * 0.75)
            .attr('stroke-width', baseWidth);
          setHoveredTraj(null);
        });
    });

    // Add country labels for unique countries in trajectories
    const uniqueCountries = new Set<string>();
    trajectories.forEach(traj => {
      uniqueCountries.add(traj.birthCountry);
      uniqueCountries.add(traj.asylumCountry);
      uniqueCountries.add(traj.destinationCountry);
    });

    uniqueCountries.forEach(country => {
      const coords = COUNTRY_COORDS[country];
      if (!coords) return;

      const point = projection([coords.lon, coords.lat]);
      if (!point) return;

      // Add dot
      g.append('circle')
        .attr('cx', point[0])
        .attr('cy', point[1])
        .attr('r', 3)
        .attr('fill', ARK_COLORS.gradient[4])
        .attr('stroke', 'white')
        .attr('stroke-width', 1)
        .attr('opacity', 0.9);

      // Add label with background
      const label = g.append('g');
      
      const text = label.append('text')
        .attr('x', point[0])
        .attr('y', point[1] - 10)
        .attr('text-anchor', 'middle')
        .attr('font-size', '11px')
        .attr('font-weight', '600')
        .attr('fill', '#2c3e50')
        .style('pointer-events', 'none')
        .text(country === 'United Kingdom' ? 'UK' : country);

      // Add white background to text
      const bbox = (text.node() as SVGTextElement).getBBox();
      label.insert('rect', 'text')
        .attr('x', bbox.x - 2)
        .attr('y', bbox.y - 1)
        .attr('width', bbox.width + 4)
        .attr('height', bbox.height + 2)
        .attr('fill', 'white')
        .attr('opacity', 0.7)
        .attr('rx', 2);
    });

  }, [trajectories, worldData]);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 p-8">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-[1500px]">
        <div className="mb-6">
          <h1 className="text-3xl mb-2" style={{ color: ARK_COLORS.gradient[3] }}>
            Secondary Irregular Migration Trajectories
          </h1>
          <p className="text-sm text-gray-600">
            Showing migration journeys from country of birth → first asylum country → destination country (UK)
          </p>
        </div>

        <div className="mb-4">
          <svg
            ref={svgRef}
            viewBox="0 0 1400 800"
            className="w-full h-auto border border-gray-200 rounded"
            style={{ maxHeight: '70vh' }}
          />
        </div>

        {/* Legend */}
        <div className="space-y-3">
          <p className="text-sm font-semibold text-gray-700">Journey Stages</p>
          <div className="flex items-center gap-8 text-sm flex-wrap">
            <div className="flex items-center gap-2">
              <svg width="50" height="20">
                <line
                  x1="0" y1="10" x2="50" y2="10"
                  stroke={ARK_COLORS.gradient[2]}
                  strokeWidth="2"
                  strokeDasharray="4,4"
                  opacity="0.6"
                />
              </svg>
              <span className="text-gray-700">
                Stage 1: Birth country → First asylum
              </span>
            </div>
            <div className="flex items-center gap-2">
              <svg width="50" height="20">
                <line
                  x1="0" y1="10" x2="50" y2="10"
                  stroke={ARK_COLORS.blue}
                  strokeWidth="2"
                  opacity="0.75"
                />
              </svg>
              <span className="text-gray-700">
                Stage 2: First asylum → UK
              </span>
            </div>
          </div>
          <p className="text-xs text-gray-500 italic">
            Line thickness represents number of people following this trajectory. Top 30 most common routes shown.
          </p>
          <p className="text-xs text-gray-500 italic">
            Colors: Stage 1 (<span style={{ color: ARK_COLORS.gradient[2], fontWeight: '500' }}>{ARK_COLORS.gradient[2]}</span>), 
            Stage 2 (<span style={{ color: ARK_COLORS.blue, fontWeight: '500' }}>{ARK_COLORS.blue}</span> - ARK Blue)
          </p>
        </div>

        {/* Hover info */}
        {hoveredTraj && (
          <div className="mt-4 p-4 bg-blue-50 rounded border border-blue-200">
            <p className="text-sm font-semibold mb-1">Migration Trajectory:</p>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold" style={{ color: ARK_COLORS.gradient[2] }}>
                {hoveredTraj.birthCountry}
              </span>
              <span className="text-gray-400">→</span>
              <span className="font-semibold" style={{ color: ARK_COLORS.gradient[3] }}>
                {hoveredTraj.asylumCountry}
              </span>
              <span className="text-gray-400">→</span>
              <span className="font-semibold" style={{ color: ARK_COLORS.blue }}>
                {hoveredTraj.destinationCountry}
              </span>
            </div>
            <p className="text-sm mt-2">
              <span className="text-blue-700 font-semibold">{hoveredTraj.count}</span>
              {' '}respondent{hoveredTraj.count !== 1 ? 's' : ''} followed this path
            </p>
          </div>
        )}
      </div>
    </div>
  );
}