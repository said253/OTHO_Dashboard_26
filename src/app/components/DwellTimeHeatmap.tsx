import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { geoMercator } from 'd3-geo';
import * as topojson from 'topojson-client';

interface DwellTimeData {
  country: string;
  avgMonths: number;
  totalRespondents: number;
  durations: string[];
}

// ARK color scheme with gradient for heatmap
const ARK_COLORS = {
  blue: '#597598',
  gradient: ['#b6d5a0', '#9ec8b4', '#597598', '#5c5376', '#52224a', '#585857']
};

// European country coordinates (capital cities)
const COUNTRY_COORDS: { [key: string]: { lat: number; lon: number } } = {
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

// Convert duration text to months
function durationToMonths(duration: string): number {
  if (!duration || duration === 'Missing') return 0;
  
  if (duration.includes('Less than 3 months')) return 1.5;
  if (duration.includes('3-11 months')) return 7;
  if (duration.includes('1 to 2 years')) return 18;
  if (duration.includes('Over 2 years')) return 30;
  
  return 0;
}

export function DwellTimeHeatmap() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dwellData, setDwellData] = useState<DwellTimeData[]>([]);
  const [worldData, setWorldData] = useState<any>(null);
  const [hoveredCountry, setHoveredCountry] = useState<DwellTimeData | null>(null);

  useEffect(() => {
    // Load world map data
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
      .then(response => response.json())
      .then(data => {
        setWorldData(data);
      });

    // Aggregated dwell time data from the CSV
    // Based on "Where did you apply for asylum for the first time?" and 
    // "How long have you stayed in the country where you claimed asylum for the first time?"
    const countryDurations: { [key: string]: string[] } = {
      'Greece': ['3-11 months', 'Less than 3 months', '3-11 months', 'Over 2 years', 'Over 2 years', '3-11 months', '3-11 months', '3-11 months', '3-11 months'],
      'Germany': ['1 to 2 years', '1 to 2 years', '1 to 2 years', 'Over 2 years', 'Over 2 years', '1 to 2 years', '1 to 2 years'],
      'France': ['Over 2 years', '1 to 2 years', '3-11 months', '3-11 months', '3-11 months', '1 to 2 years'],
      'Belgium': ['3-11 months', '3-11 months', '3-11 months', '1 to 2 years'],
      'Italy': ['3-11 months', '1 to 2 years', 'Less than 3 months'],
      'Netherlands': ['3-11 months', '1 to 2 years'],
      'Spain': ['3-11 months', 'Less than 3 months'],
      'Austria': ['3-11 months', '1 to 2 years'],
      'Switzerland': ['3-11 months'],
    };

    const processedData: DwellTimeData[] = Object.entries(countryDurations).map(([country, durations]) => {
      const months = durations.map(d => durationToMonths(d)).filter(m => m > 0);
      const avgMonths = months.length > 0 ? months.reduce((a, b) => a + b, 0) / months.length : 0;
      
      return {
        country,
        avgMonths,
        totalRespondents: durations.length,
        durations
      };
    });

    console.log('Processed dwell time data:', processedData);
    setDwellData(processedData);
  }, []);

  useEffect(() => {
    if (!svgRef.current || dwellData.length === 0 || !worldData) return;

    const width = 1600;
    const height = 900;
    
    // Set up SVG
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    
    // Create projection - zoomed to show all EU countries
    const projection = geoMercator()
      .center([15, 52])
      .scale(900)
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
      .attr('fill', '#f5f5f5')
      .attr('stroke', '#e0e0e0')
      .attr('stroke-width', 0.5);

    // Create color scale based on dwell time
    const maxMonths = Math.max(...dwellData.map(d => d.avgMonths));
    const minMonths = Math.min(...dwellData.map(d => d.avgMonths));
    
    const colorScale = d3.scaleSequential()
      .domain([minMonths, maxMonths])
      .interpolator(d3.interpolateRgbBasis(ARK_COLORS.gradient));

    // Draw circles for each country with dwell time data
    dwellData.forEach(data => {
      const coords = COUNTRY_COORDS[data.country];
      if (!coords) return;

      const point = projection([coords.lon, coords.lat]);
      if (!point) return;

      // Radius based on number of respondents
      const radius = 15 + (data.totalRespondents * 2);

      // Create group for this country
      const countryGroup = g.append('g')
        .attr('transform', `translate(${point[0]}, ${point[1]})`)
        .style('cursor', 'pointer');

      // Draw circle with color based on dwell time
      countryGroup.append('circle')
        .attr('r', radius)
        .attr('fill', colorScale(data.avgMonths))
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 3)
        .attr('opacity', 0.85);

      // Add country label
      countryGroup.append('text')
        .attr('y', radius + 15)
        .attr('text-anchor', 'middle')
        .attr('font-size', '11px')
        .attr('font-weight', '600')
        .attr('fill', '#333')
        .style('pointer-events', 'none')
        .text(data.country);

      // Add average months text inside circle
      countryGroup.append('text')
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('font-size', '14px')
        .attr('font-weight', 'bold')
        .attr('fill', '#ffffff')
        .style('pointer-events', 'none')
        .text(`${data.avgMonths.toFixed(1)}m`);

      // Add interaction
      countryGroup
        .on('mouseenter', function() {
          d3.select(this).select('circle')
            .transition()
            .duration(200)
            .attr('opacity', 1)
            .attr('stroke-width', 4);
          
          setHoveredCountry(data);
        })
        .on('mouseleave', function() {
          d3.select(this).select('circle')
            .transition()
            .duration(200)
            .attr('opacity', 0.85)
            .attr('stroke-width', 3);
          
          setHoveredCountry(null);
        });
    });

  }, [dwellData, worldData]);

  const formatDuration = (months: number): string => {
    if (months >= 24) return `${(months / 12).toFixed(1)} years`;
    if (months >= 12) return `${(months / 12).toFixed(1)} year`;
    return `${months.toFixed(1)} months`;
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 p-8">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-[1700px]">
        <div className="mb-6">
          <h1 className="text-3xl mb-2" style={{ color: ARK_COLORS.blue }}>
            Stagnation & Dwell-Time Heatmap
          </h1>
          <p className="text-sm text-gray-600">
            Average time migrants spent in their first asylum country before moving onward. Darker colors indicate longer stays, highlighting where EU integration or deterrence is failing.
          </p>
        </div>

        <div className="mb-4">
          <svg
            ref={svgRef}
            viewBox="0 0 1600 900"
            className="w-full h-auto border border-gray-200 rounded"
            style={{ maxHeight: '75vh' }}
          />
        </div>

        {/* Legend */}
        <div className="space-y-3">
          <p className="text-sm font-semibold text-gray-700">Average dwell time</p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center">
                {ARK_COLORS.gradient.map((color, i) => (
                  <div
                    key={i}
                    className="w-12 h-6"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <span className="text-sm text-gray-600 ml-2">
                Shorter stay → Longer stay
              </span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">* Circle size represents number of respondents per country</p>
        </div>

        {/* Hover info */}
        {hoveredCountry && (
          <div className="mt-4 p-4 bg-blue-50 rounded border border-blue-200">
            <p className="text-sm font-semibold mb-2">{hoveredCountry.country}</p>
            <div className="space-y-1 text-sm">
              <div>
                <span>Average dwell time: <strong>{formatDuration(hoveredCountry.avgMonths)}</strong></span>
              </div>
              <div>
                <span>Total respondents: <strong>{hoveredCountry.totalRespondents}</strong></span>
              </div>
              <div className="mt-2 pt-2 border-t border-blue-300">
                <p className="text-xs font-semibold mb-1">Duration breakdown:</p>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  {Object.entries(
                    hoveredCountry.durations.reduce((acc, dur) => {
                      acc[dur] = (acc[dur] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  ).map(([duration, count]) => (
                    <div key={duration}>
                      {duration}: {count}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
