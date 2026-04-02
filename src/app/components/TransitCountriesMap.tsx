import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { geoMercator } from 'd3-geo';
import * as topojson from 'topojson-client';
import { Users } from 'lucide-react';

interface RouteSegment {
  from: string;
  to: string;
  count: number;
}

interface CountryCoords {
  [key: string]: { lat: number; lon: number };
}

// ARK color scheme
const ARK_COLORS = {
  blue: '#597598',
  lightBlue: '#9ec8b4',
  darkBlue: '#5c5376'
};

// European country coordinates (capital cities and major transit points)
const COUNTRY_COORDS: CountryCoords = {
  'Belgium': { lat: 50.8503, lon: 4.3517 },
  'France': { lat: 48.8566, lon: 2.3522 },
  'Greece': { lat: 37.9838, lon: 23.7275 },
  'Germany': { lat: 52.5200, lon: 13.4050 },
  'Italy': { lat: 41.9028, lon: 12.4964 },
  'Spain': { lat: 40.4168, lon: -3.7038 },
  'Netherlands': { lat: 52.3676, lon: 4.9041 },
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

// Parse CSV data to extract route segments
async function parseTransitData(): Promise<RouteSegment[]> {
  try {
    const csvModule = await import('../../imports/transitCountries-1.csv?raw');
    const csvText = csvModule.default;
    
    console.log('Raw CSV text loaded, length:', csvText.length);
    
    const data = d3.csvParse(csvText);
    
    console.log('Parsed CSV rows:', data.length);
    
    const routeMap = new Map<string, number>();
    
    // Process each submission (each person's journey)
    data.forEach((row, index) => {
      const countries: string[] = [];
      
      // Extract countries in sequence from "Country 1", "Country 2", etc.
      for (let i = 1; i <= 9; i++) {
        const countryKey = `Country ${i}`;
        const country = row[countryKey]?.trim();
        
        // Skip empty, "Other", and "I prefer not to say"
        if (country && country !== '' && country !== 'Other' && country !== 'I prefer not to say') {
          countries.push(country);
        }
      }
      
      // Create route segments from the sequence
      for (let i = 0; i < countries.length - 1; i++) {
        const from = countries[i];
        const to = countries[i + 1];
        const routeKey = `${from}|||${to}`;
        routeMap.set(routeKey, (routeMap.get(routeKey) || 0) + 1);
      }
      
      if (index < 3 && countries.length >= 2) {
        console.log(`Journey ${index + 1}: ${countries.join(' → ')}`);
      }
    });
    
    console.log('Unique route segments found:', routeMap.size);
    
    // Convert to array and sort by count
    const routes: RouteSegment[] = [];
    routeMap.forEach((count, routeKey) => {
      const [from, to] = routeKey.split('|||');
      routes.push({ from, to, count });
    });
    
    const sorted = routes.sort((a, b) => b.count - a.count);
    console.log('Top 15 routes:', sorted.slice(0, 15).map(r => `${r.from}→${r.to}: ${r.count}`));
    
    return sorted;
  } catch (error) {
    console.error('Error parsing transit data:', error);
    return [];
  }
}

export function TransitCountriesMap() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [routes, setRoutes] = useState<RouteSegment[]>([]);
  const [worldData, setWorldData] = useState<any>(null);

  useEffect(() => {
    // Load world map data
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
      .then(response => response.json())
      .then(data => setWorldData(data));

    // Load transit route data
    parseTransitData().then(parsedRoutes => {
      console.log('Loaded transit routes:', parsedRoutes.length);
      setRoutes(parsedRoutes);
    });
  }, []);

  useEffect(() => {
    if (!svgRef.current || routes.length === 0 || !worldData) return;

    const width = 1400;
    const height = 900;
    
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Use same projection as AsylumOutcomesMap - tightly fitted to Europe
    const projection = geoMercator()
      .center([18, 54])
      .scale(1100)
      .translate([width / 2, height / 2 - 100]);

    const path = d3.geoPath().projection(projection);

    // Draw base map
    const countries = topojson.feature(worldData, worldData.objects.countries);
    
    svg.append('g')
      .selectAll('path')
      .data(countries.features)
      .join('path')
      .attr('d', path)
      .attr('fill', '#f5f5f5')
      .attr('stroke', '#e0e0e0')
      .attr('stroke-width', 0.5);

    // Only show top 15 routes for clarity
    const topRoutes = routes.slice(0, 15);
    const maxCount = topRoutes[0]?.count || 1;

    // Find all transit hub countries (countries that appear in routes)
    const transitHubs = new Map<string, number>();
    topRoutes.forEach(route => {
      transitHubs.set(route.from, (transitHubs.get(route.from) || 0) + route.count);
      transitHubs.set(route.to, (transitHubs.get(route.to) || 0) + route.count);
    });

    // Group routes by destination to prevent arrow overlap
    const routesByDestination = new Map<string, RouteSegment[]>();
    topRoutes.forEach(route => {
      if (!routesByDestination.has(route.to)) {
        routesByDestination.set(route.to, []);
      }
      routesByDestination.get(route.to)!.push(route);
    });

    // Draw routes with curved arrows (Libya map style - spread arrows to avoid overlap)
    let globalIndex = 0;
    routesByDestination.forEach((destRoutes, destination) => {
      const destCoords = COUNTRY_COORDS[destination];
      if (!destCoords) return;

      const [destX, destY] = projection([destCoords.lon, destCoords.lat]) || [0, 0];

      // For each route coming into this destination, spread them in a fan pattern
      destRoutes.forEach((route, localIndex) => {
        const originCoords = COUNTRY_COORDS[route.from];
        if (!originCoords) return;

        const [originX, originY] = projection([originCoords.lon, originCoords.lat]) || [0, 0];

        // Calculate base angle from origin to destination
        const baseAngle = Math.atan2(destY - originY, destX - originX);
        
        // Spread arrows in a fan pattern around the destination
        // Create offset perpendicular to the route direction
        const totalRoutes = destRoutes.length;
        const spreadAngle = totalRoutes > 1 ? Math.PI / 6 : 0; // 30 degree spread
        const angleOffset = totalRoutes > 1 
          ? ((localIndex - (totalRoutes - 1) / 2) / (totalRoutes - 1)) * spreadAngle 
          : 0;
        
        // Calculate end point with offset (20 pixels from center)
        const endOffset = 20;
        const finalAngle = baseAngle + angleOffset;
        const x2 = destX - Math.cos(finalAngle) * endOffset;
        const y2 = destY - Math.sin(finalAngle) * endOffset;

        // Calculate gentle curve
        const dx = x2 - originX;
        const dy = y2 - originY;
        const curvature = 0.15;
        const cx = (originX + x2) / 2 - dy * curvature;
        const cy = (originY + y2) / 2 + dx * curvature;

        const pathData = `M ${originX},${originY} Q ${cx},${cy} ${x2},${y2}`;

        // Top 5 routes are solid, rest are dashed (Libya map style)
        const isDashed = globalIndex >= 5;
        const strokeWidth = globalIndex < 5 ? 2.5 : 1.8;
        const opacity = globalIndex < 5 ? 0.75 : 0.45;

        // Draw curved path
        svg.append('path')
          .attr('d', pathData)
          .attr('fill', 'none')
          .attr('stroke', ARK_COLORS.blue)
          .attr('stroke-width', strokeWidth)
          .attr('stroke-opacity', opacity)
          .attr('stroke-dasharray', isDashed ? '8,4' : 'none')
          .attr('marker-end', `url(#arrow-${globalIndex})`);

        // Define arrow marker
        svg.append('defs')
          .append('marker')
          .attr('id', `arrow-${globalIndex}`)
          .attr('markerWidth', 7)
          .attr('markerHeight', 7)
          .attr('refX', 6)
          .attr('refY', 2.5)
          .attr('orient', 'auto')
          .append('polygon')
          .attr('points', '0 0, 7 2.5, 0 5')
          .attr('fill', ARK_COLORS.blue)
          .attr('opacity', opacity);

        globalIndex++;
      });
    });

    // Draw simple text labels for transit hubs (Libya map style - no circles)
    const majorHubs = Array.from(transitHubs.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10); // Top 10 transit hubs

    majorHubs.forEach(([country, count]) => {
      const coords = COUNTRY_COORDS[country];
      if (!coords) return;

      const [x, y] = projection([coords.lon, coords.lat]) || [0, 0];

      // Simple text label only (like Libya map)
      svg.append('text')
        .attr('x', x)
        .attr('y', y)
        .attr('text-anchor', 'middle')
        .attr('font-size', '13px')
        .attr('font-weight', '700')
        .attr('fill', '#333')
        .text(country);
    });

  }, [routes, worldData]);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 p-8">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-[1700px]">
        <div className="mb-6">
          <h1 className="text-3xl mb-2" style={{ color: ARK_COLORS.blue }}>
            Transit Routes Through Europe
          </h1>
          <p className="text-sm text-gray-600">
            Top 15 most common transit routes based on individual journey data. Solid lines represent the most frequent routes, dashed lines show secondary routes.
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
          <p className="text-sm font-semibold text-gray-700">Legend</p>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <svg width="50" height="20">
                <line x1="0" y1="10" x2="50" y2="10" stroke={ARK_COLORS.blue} strokeWidth="3" opacity="0.8" />
              </svg>
              <span className="text-gray-700 text-sm"><strong>Most frequent routes</strong> (Ranks 1-5): Solid lines indicate the five most commonly traveled transit route segments</span>
            </div>
            <div className="flex items-center gap-3">
              <svg width="50" height="20">
                <line x1="0" y1="10" x2="50" y2="10" stroke={ARK_COLORS.blue} strokeWidth="2" strokeDasharray="8,4" opacity="0.5" />
              </svg>
              <span className="text-gray-700 text-sm"><strong>Secondary routes</strong> (Ranks 6-15): Dashed lines show less frequently traveled but still significant transit routes</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            Note: This map displays only the top 15 transit route segments for visual clarity. Each route represents a sequential country-to-country movement 
            reported by survey respondents. Line thickness and opacity reflect frequency of travel, with thicker, more opaque lines indicating higher volumes. 
            Arrow endpoints are offset to prevent visual overlap at destination countries.
          </p>
        </div>
      </div>
    </div>
  );
}