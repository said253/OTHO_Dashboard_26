import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { geoMercator } from 'd3-geo';
import { feature } from 'topojson-client';
import * as topojson from 'topojson-client';

interface FlowData {
  from: string;
  to: string;
  weight: number;
  frac: number;
  from_lon: number;
  from_lat: number;
  to_lon: number;
  to_lat: number;
}

// ARK color scheme
const ARK_COLORS = {
  blue: '#597598',
  green: '#b6d5a0',
  gradient: ['#585857', '#52224a', '#5c5376', '#597598', '#9ec8b4', '#b6d5a0']
};

// Hardcoded CSV data to ensure it loads
const CSV_DATA = `From,To,weight,frac,from_lon,from_lat,to_lon,to_lat
Romania,Switzerland,1,0.003610108,26.10272,44.436141,7.451451,46.948271
Norway,Switzerland,1,0.003610108,10.73897,59.91333,7.451451,46.948271
Italy,Switzerland,5,0.018050542,12.482932,41.89332,7.451451,46.948271
Bulgaria,Switzerland,1,0.003610108,23.3219,42.6977,7.451451,46.948271
Germany,Sweden,1,0.003610108,13.38886,52.517036,18.071094,59.325117
Denmark,Sweden,1,0.003610108,12.570072,55.686724,18.071094,59.325117
Italy,Spain,2,0.007220217,12.482932,41.89332,-3.703582,40.416705
France,Spain,1,0.003610108,2.351462,48.856697,-3.703582,40.416705
Croatia,Spain,1,0.003610108,15.977048,45.813177,-3.703582,40.416705
Switzerland,Slovenia,1,0.003610108,7.451451,46.948271,14.50686,46.04998
Hungary,Slovenia,1,0.003610108,19.040471,47.498382,14.50686,46.04998
Croatia,Slovenia,2,0.007220217,15.977048,45.813177,14.50686,46.04998
Croatia,Slovakia,1,0.003610108,15.977048,45.813177,17.109306,48.151699
Hungary,Romania,2,0.007220217,19.040471,47.498382,26.10272,44.436141
Bulgaria,Romania,2,0.007220217,23.3219,42.6977,26.10272,44.436141
Germany,Poland,1,0.003610108,13.38886,52.517036,21.071411,52.233717
Denmark,Norway,1,0.003610108,12.570072,55.686724,10.73897,59.91333
Switzerland,Netherlands,1,0.003610108,7.451451,46.948271,4.893604,52.37276
Italy,Netherlands,2,0.007220217,12.482932,41.89332,4.893604,52.37276
Greece,Netherlands,1,0.003610108,23.728305,37.983941,4.893604,52.37276
France,Netherlands,1,0.003610108,2.351462,48.856697,4.893604,52.37276
Slovenia,Italy,2,0.007220217,14.50686,46.04998,12.482932,41.89332
Slovakia,Italy,1,0.003610108,17.109306,48.151699,12.482932,41.89332
Greece,Italy,7,0.025270758,23.728305,37.983941,12.482932,41.89332
Germany,Italy,1,0.003610108,13.38886,52.517036,12.482932,41.89332
France,Italy,3,0.010830325,2.351462,48.856697,12.482932,41.89332
Croatia,Italy,3,0.010830325,15.977048,45.813177,12.482932,41.89332
Bulgaria,Italy,2,0.007220217,23.3219,42.6977,12.482932,41.89332
Belgium,Italy,2,0.007220217,4.351697,50.846557,12.482932,41.89332
Austria,Italy,1,0.003610108,16.372504,48.208354,12.482932,41.89332
Romania,Hungary,1,0.003610108,26.10272,44.436141,19.040471,47.498382
Greece,Hungary,1,0.003610108,23.728305,37.983941,19.040471,47.498382
Germany,Greece,1,0.003610108,13.38886,52.517036,23.728305,37.983941
France,Greece,1,0.003610108,2.351462,48.856697,23.728305,37.983941
Spain,Germany,1,0.003610108,-3.703582,40.416705,13.38886,52.517036
Romania,Germany,2,0.007220217,26.10272,44.436141,13.38886,52.517036
Poland,Germany,1,0.003610108,21.071411,52.233717,13.38886,52.517036
Netherlands,Germany,1,0.003610108,4.893604,52.37276,13.38886,52.517036
Italy,Germany,4,0.014440433,12.482932,41.89332,13.38886,52.517036
Hungary,Germany,1,0.003610108,19.040471,47.498382,13.38886,52.517036
Greece,Germany,12,0.0433213,23.728305,37.983941,13.38886,52.517036
Czech Republic,Germany,1,0.003610108,14.421254,50.087465,13.38886,52.517036
Croatia,Germany,3,0.010830325,15.977048,45.813177,13.38886,52.517036
Bulgaria,Germany,1,0.003610108,23.3219,42.6977,13.38886,52.517036
Austria,Germany,5,0.018050542,16.372504,48.208354,13.38886,52.517036
Switzerland,France,5,0.018050542,7.451451,46.948271,2.351462,48.856697
Sweden,France,2,0.007220217,18.071094,59.325117,2.351462,48.856697
Spain,France,7,0.025270758,-3.703582,40.416705,2.351462,48.856697
Slovenia,France,2,0.007220217,14.50686,46.04998,2.351462,48.856697
Poland,France,1,0.003610108,21.071411,52.233717,2.351462,48.856697
Norway,France,1,0.003610108,10.73897,59.91333,2.351462,48.856697
Netherlands,France,2,0.007220217,4.893604,52.37276,2.351462,48.856697
Italy,France,33,0.119133574,12.482932,41.89332,2.351462,48.856697
Greece,France,15,0.054151625,23.728305,37.983941,2.351462,48.856697
Germany,France,13,0.046931408,13.38886,52.517036,2.351462,48.856697
Denmark,France,1,0.003610108,12.570072,55.686724,2.351462,48.856697
Croatia,France,2,0.007220217,15.977048,45.813177,2.351462,48.856697
Bulgaria,France,4,0.014440433,23.3219,42.6977,2.351462,48.856697
Belgium,France,6,0.02166065,4.351697,50.846557,2.351462,48.856697
Austria,France,2,0.007220217,16.372504,48.208354,2.351462,48.856697
Germany,Denmark,3,0.010830325,13.38886,52.517036,12.570072,55.686724
Greece,Czech Republic,1,0.003610108,23.728305,37.983941,14.421254,50.087465
Greece,Croatia,6,0.02166065,23.728305,37.983941,15.977048,45.813177
Bulgaria,Croatia,2,0.007220217,23.3219,42.6977,15.977048,45.813177
Croatia,Bulgaria,1,0.003610108,15.977048,45.813177,23.3219,42.6977
Switzerland,Belgium,2,0.007220217,7.451451,46.948271,4.351697,50.846557
Spain,Belgium,6,0.02166065,-3.703582,40.416705,4.351697,50.846557
Portugal,Belgium,1,0.003610108,-9.136592,38.707751,4.351697,50.846557
Poland,Belgium,1,0.003610108,21.071411,52.233717,4.351697,50.846557
Netherlands,Belgium,3,0.010830325,4.893604,52.37276,4.351697,50.846557
Italy,Belgium,11,0.039711191,12.482932,41.89332,4.351697,50.846557
Hungary,Belgium,1,0.003610108,19.040471,47.498382,4.351697,50.846557
Greece,Belgium,9,0.032490975,23.728305,37.983941,4.351697,50.846557
Germany,Belgium,4,0.014440433,13.38886,52.517036,4.351697,50.846557
France,Belgium,21,0.075812274,2.351462,48.856697,4.351697,50.846557
Bulgaria,Belgium,1,0.003610108,23.3219,42.6977,4.351697,50.846557
Slovenia,Austria,1,0.003610108,14.50686,46.04998,16.372504,48.208354
Romania,Austria,1,0.003610108,26.10272,44.436141,16.372504,48.208354
Italy,Austria,1,0.003610108,12.482932,41.89332,16.372504,48.208354
Hungary,Austria,2,0.007220217,19.040471,47.498382,16.372504,48.208354
France,Austria,2,0.007220217,2.351462,48.856697,16.372504,48.208354`;

export function MigrationFlowMap() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [flows, setFlows] = useState<FlowData[]>([]);
  const [hoveredFlow, setHoveredFlow] = useState<FlowData | null>(null);
  const [worldData, setWorldData] = useState<any>(null);

  useEffect(() => {
    // Load world map data
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
      .then(response => response.json())
      .then(data => {
        setWorldData(data);
      });

    // Parse CSV data
    const lines = CSV_DATA.trim().split('\n');
    
    const allFlows: FlowData[] = lines.slice(1).map(line => {
      const values = line.split(',');
      return {
        from: values[0],
        to: values[1],
        weight: parseFloat(values[2]),
        frac: parseFloat(values[3]),
        from_lon: parseFloat(values[4]),
        from_lat: parseFloat(values[5]),
        to_lon: parseFloat(values[6]),
        to_lat: parseFloat(values[7])
      };
    }).filter(flow => flow.from !== flow.to); // Filter out self-loops
    
    // Separate flows by weight
    const lowWeightFlows = allFlows.filter(f => f.weight <= 2);
    const mediumWeightFlows = allFlows.filter(f => f.weight > 2 && f.weight <= 7);
    const highWeightFlows = allFlows.filter(f => f.weight > 7);
    
    // Keep only 5-7 low weight flows (randomly selected for variety)
    const selectedLowWeight = lowWeightFlows.slice(0, 6);
    
    // Combine: selected low weight + all medium and high weight
    const filteredFlows = [...selectedLowWeight, ...mediumWeightFlows, ...highWeightFlows];
    
    console.log('Total flows:', allFlows.length);
    console.log('Filtered flows:', filteredFlows.length);
    console.log('Low weight (showing 6):', selectedLowWeight.length);
    console.log('Medium weight:', mediumWeightFlows.length);
    console.log('High weight:', highWeightFlows.length);
    
    setFlows(filteredFlows);
  }, []);

  useEffect(() => {
    if (!svgRef.current || flows.length === 0 || !worldData) return;

    const width = 1200;
    const height = 800;
    
    // Set up SVG
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    
    // Create projection centered on Europe
    const projection = geoMercator()
      .center([15, 52])
      .scale(600)
      .translate([width / 2, height / 2]);

    const pathGenerator = d3.geoPath().projection(projection);

    // Create a group for the map
    const g = svg.append('g');

    // Draw world basemap (countries)
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

    // Define arrow markers for different weight categories
    const defs = svg.append('defs');
    
    const weightCategories = [
      { id: 'arrow-low', range: [0, 2], width: 2, opacity: 0.1875 },
      { id: 'arrow-medium', range: [3, 7], width: 3, opacity: 0.375 },
      { id: 'arrow-high', range: [8, Infinity], width: 5, opacity: 0.6 }
    ];

    weightCategories.forEach(cat => {
      defs.append('marker')
        .attr('id', cat.id)
        .attr('viewBox', '0 0 10 10')
        .attr('refX', 8)
        .attr('refY', 5)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto-start-reverse')
        .append('path')
        .attr('d', 'M 0 0 L 10 5 L 0 10 z')
        .attr('fill', ARK_COLORS.blue)
        .attr('opacity', cat.opacity);
    });

    // Helper function to get weight category
    const getWeightCategory = (weight: number) => {
      if (weight <= 2) return 'low';
      if (weight <= 7) return 'medium';
      return 'high';
    };

    // Helper function to get style based on weight
    const getFlowStyle = (weight: number) => {
      if (weight <= 2) return { width: 1, opacity: 0.1875, marker: 'arrow-low' };
      if (weight <= 7) return { width: 2.5, opacity: 0.375, marker: 'arrow-medium' };
      return { width: 4, opacity: 0.6, marker: 'arrow-high' };
    };

    // Create curved path for flow
    const createCurvedPath = (from: [number, number], to: [number, number]) => {
      const [x1, y1] = from;
      const [x2, y2] = to;
      
      // Calculate control point for quadratic bezier curve
      const dx = x2 - x1;
      const dy = y2 - y1;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      // Curve intensity based on distance
      const curvature = Math.min(dist * 0.3, 100);
      
      // Control point perpendicular to the line
      const cx = (x1 + x2) / 2 - dy / dist * curvature;
      const cy = (y1 + y2) / 2 + dx / dist * curvature;
      
      return `M ${x1},${y1} Q ${cx},${cy} ${x2},${y2}`;
    };

    // Sort flows by weight (draw lighter ones first)
    const sortedFlows = [...flows].sort((a, b) => a.weight - b.weight);

    // Draw flows
    sortedFlows.forEach(flow => {
      const fromPoint = projection([flow.from_lon, flow.from_lat]);
      const toPoint = projection([flow.to_lon, flow.to_lat]);
      
      if (!fromPoint || !toPoint) return;
      
      const style = getFlowStyle(flow.weight);
      
      g.append('path')
        .datum(flow)
        .attr('d', createCurvedPath(fromPoint, toPoint))
        .attr('fill', 'none')
        .attr('stroke', ARK_COLORS.blue)
        .attr('stroke-width', style.width)
        .attr('opacity', style.opacity)
        .attr('marker-end', `url(#${style.marker})`)
        .attr('class', 'flow-path')
        .style('cursor', 'pointer')
        .on('mouseenter', function(event, d) {
          d3.select(this)
            .attr('stroke', ARK_COLORS.gradient[3])
            .attr('opacity', 1)
            .attr('stroke-width', style.width * 1.5);
          setHoveredFlow(d as FlowData);
        })
        .on('mouseleave', function() {
          d3.select(this)
            .attr('stroke', ARK_COLORS.blue)
            .attr('opacity', style.opacity)
            .attr('stroke-width', style.width);
          setHoveredFlow(null);
        });
    });

    // Add country labels for ALL countries mentioned in the data
    const allCountries = new Map<string, { lon: number; lat: number }>();
    
    flows.forEach(flow => {
      if (!allCountries.has(flow.from)) {
        allCountries.set(flow.from, { lon: flow.from_lon, lat: flow.from_lat });
      }
      if (!allCountries.has(flow.to)) {
        allCountries.set(flow.to, { lon: flow.to_lon, lat: flow.to_lat });
      }
    });

    allCountries.forEach((coords, country) => {
      const point = projection([coords.lon, coords.lat]);
      if (!point) return;

      // Add dot
      g.append('circle')
        .attr('cx', point[0])
        .attr('cy', point[1])
        .attr('r', 2.5)
        .attr('fill', ARK_COLORS.gradient[4])
        .attr('opacity', 0.7);

      // Add label
      g.append('text')
        .attr('x', point[0])
        .attr('y', point[1] - 7)
        .attr('text-anchor', 'middle')
        .attr('font-size', '9px')
        .attr('font-weight', '500')
        .attr('fill', '#2c3e50')
        .attr('opacity', 0.85)
        .style('pointer-events', 'none')
        .text(country);
    });

  }, [flows, worldData]);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 p-8">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-[1300px]">
        <div className="mb-6">
          <h1 className="text-3xl mb-2" style={{ color: ARK_COLORS.gradient[3] }}>
            Migration Flows in Europe
          </h1>
          <p className="text-sm text-gray-600">
            Directional arrows showing reported movements. Arrow width and opacity indicate frequency.
          </p>
        </div>

        <div className="mb-4">
          <svg
            ref={svgRef}
            viewBox="0 0 1200 800"
            className="w-full h-auto border border-gray-200 rounded"
            style={{ maxHeight: '70vh' }}
          />
        </div>

        {/* Legend */}
        <div className="space-y-3">
          <p className="text-sm font-semibold text-gray-700">Movement Flow Legend</p>
          <div className="flex items-center gap-8 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-12 h-0.5" style={{ 
                backgroundColor: ARK_COLORS.blue, 
                opacity: 0.1875
              }} />
              <span className="text-gray-700">
                <span style={{ color: ARK_COLORS.blue }}>1-2</span> movements
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-12 h-1" style={{ 
                backgroundColor: ARK_COLORS.blue, 
                opacity: 0.375
              }} />
              <span className="text-gray-700">
                <span style={{ color: ARK_COLORS.blue }}>3-7</span> movements
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-12 h-1.5" style={{ 
                backgroundColor: ARK_COLORS.blue, 
                opacity: 0.6
              }} />
              <span className="text-gray-700">
                <span style={{ color: ARK_COLORS.blue }}>8+</span> movements
              </span>
            </div>
          </div>
          <p className="text-xs text-gray-500 italic">
            Color: <span style={{ color: ARK_COLORS.blue, fontWeight: '500' }}>{ARK_COLORS.blue}</span> (ARK Blue)
          </p>
        </div>

        {/* Hover info */}
        {hoveredFlow && (
          <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
            <p className="text-sm">
              <span className="font-semibold">{hoveredFlow.from}</span>
              {' → '}
              <span className="font-semibold">{hoveredFlow.to}</span>
              {': '}
              <span className="text-blue-700">{hoveredFlow.weight} movement{hoveredFlow.weight !== 1 ? 's' : ''}</span>
              {' '}
              <span className="text-gray-500">({(hoveredFlow.frac * 100).toFixed(1)}%)</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}