import { useEffect, useState, useMemo, useRef } from 'react';
import * as d3 from 'd3';
import { geoMercator } from 'd3-geo';
import * as topojson from 'topojson-client';
import { Layers, Info, TrendingUp, MapPin, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface SurveyData {
  ID: string;
  Age: string;
  Gender: string;
  Nationality1: string;
  CountryOfBirth: string;
  Education: string;
  ArrivalInEurope: string;
  AsylumApplied: string;
  FirstAsylumCountry: string;
  FirstAsylumOutcome: string;
  DifficultiesFaced: string[];
  UKExpectations: string[];
  InformationSources: string[];
  AsylumChances: string;
  TransitCountries: string[];
  LegalResidency: string;
  TravelingWith: string[];
}

const ARK_COLORS = {
  blue: '#597598',
  lightBlue: '#9ec8b4',
  darkBlue: '#5c5376',
  red: '#e07a5f',
  yellow: '#f2cc8f'
};

const COUNTRY_COORDS: { [key: string]: { lat: number; lon: number } } = {
  'Belgium': { lat: 50.8503, lon: 4.3517 },
  'France': { lat: 48.8566, lon: 2.3522 },
  'Greece': { lat: 37.9838, lon: 23.7275 },
  'Germany': { lat: 52.5200, lon: 13.4050 },
  'Italy': { lat: 41.9028, lon: 12.4964 },
  'Spain': { lat: 40.4168, lon: -3.7038 },
  'Netherlands': { lat: 52.3676, lon: 4.9041 },
  'Austria': { lat: 48.2082, lon: 16.3738 },
  'Croatia': { lat: 45.8150, lon: 15.9819 },
  'Bulgaria': { lat: 42.6977, lon: 23.3219 },
  'Romania': { lat: 44.4268, lon: 26.1025 },
  'Hungary': { lat: 47.4979, lon: 19.0402 },
  'Poland': { lat: 52.2297, lon: 21.0122 },
  'Switzerland': { lat: 46.9480, lon: 7.4474 },
  'Sweden': { lat: 59.3293, lon: 18.0686 },
  'Norway': { lat: 59.9139, lon: 10.7522 },
  'Denmark': { lat: 55.6761, lon: 12.5683 },
  'Czech Republic': { lat: 50.0755, lon: 14.4378 },
  'Slovakia': { lat: 48.1486, lon: 17.1077 },
  'Slovenia': { lat: 46.0569, lon: 14.5058 },
  'Portugal': { lat: 38.7223, lon: -9.1393 },
  'United Kingdom': { lat: 51.5074, lon: -0.1278 },
  'Ireland': { lat: 53.3498, lon: -6.2603 },
  'Finland': { lat: 60.1695, lon: 24.9354 },
  'Estonia': { lat: 59.4370, lon: 24.7536 },
  'Latvia': { lat: 56.9496, lon: 24.1052 },
  'Lithuania': { lat: 54.6872, lon: 25.2797 },
  'Albania': { lat: 41.3275, lon: 19.8187 },
  'Serbia': { lat: 44.7866, lon: 20.4489 },
  'Bosnia and Herzegovina': { lat: 43.8564, lon: 18.4131 },
  'North Macedonia': { lat: 41.9973, lon: 21.4280 },
  'Montenegro': { lat: 42.4304, lon: 19.2594 },
};

interface RouteData {
  from: string;
  to: string;
  count: number;
  travelers: SurveyData[];
}

interface CountryStats {
  country: string;
  totalTransits: number;
  asOrigin: number;
  asDestination: number;
  asylumApplications: number;
  positiveOutcomes: number;
  negativeOutcomes: number;
  avgDifficulties: number;
  topDifficulties: string[];
  travelers: SurveyData[];
}

export function InteractiveWebMap({ filteredData }: { filteredData: SurveyData[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [worldData, setWorldData] = useState<any>(null);
  const [selectedRoute, setSelectedRoute] = useState<RouteData | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<CountryStats | null>(null);
  const [showRoutes, setShowRoutes] = useState(true);
  const [showCountries, setShowCountries] = useState(true);
  const [routeFilter, setRouteFilter] = useState<'all' | 'top10' | 'top20'>('top20');
  const [zoomLevel, setZoomLevel] = useState(1);

  useEffect(() => {
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
      .then(response => response.json())
      .then(setWorldData);
  }, []);

  // Calculate route data
  const routeData = useMemo(() => {
    const routeMap = new Map<string, RouteData>();
    
    filteredData.forEach(traveler => {
      for (let i = 0; i < traveler.TransitCountries.length - 1; i++) {
        const from = traveler.TransitCountries[i];
        const to = traveler.TransitCountries[i + 1];
        const key = `${from}|||${to}`;
        
        if (!routeMap.has(key)) {
          routeMap.set(key, { from, to, count: 0, travelers: [] });
        }
        const route = routeMap.get(key)!;
        route.count++;
        route.travelers.push(traveler);
      }
    });

    return Array.from(routeMap.values()).sort((a, b) => b.count - a.count);
  }, [filteredData]);

  // Calculate country statistics
  const countryStats = useMemo(() => {
    const statsMap = new Map<string, CountryStats>();

    filteredData.forEach(traveler => {
      traveler.TransitCountries.forEach((country, index) => {
        if (!statsMap.has(country)) {
          statsMap.set(country, {
            country,
            totalTransits: 0,
            asOrigin: 0,
            asDestination: 0,
            asylumApplications: 0,
            positiveOutcomes: 0,
            negativeOutcomes: 0,
            avgDifficulties: 0,
            topDifficulties: [],
            travelers: []
          });
        }

        const stats = statsMap.get(country)!;
        stats.totalTransits++;
        stats.travelers.push(traveler);

        if (index === 0) stats.asOrigin++;
        if (index === traveler.TransitCountries.length - 1) stats.asDestination++;

        if (traveler.FirstAsylumCountry === country) {
          stats.asylumApplications++;
          if (traveler.FirstAsylumOutcome?.includes('Positive')) stats.positiveOutcomes++;
          if (traveler.FirstAsylumOutcome?.includes('Negative')) stats.negativeOutcomes++;
        }
      });
    });

    statsMap.forEach(stats => {
      const difficultiesCount = new Map<string, number>();
      let totalDifficulties = 0;

      stats.travelers.forEach(traveler => {
        totalDifficulties += traveler.DifficultiesFaced.length;
        traveler.DifficultiesFaced.forEach(diff => {
          difficultiesCount.set(diff, (difficultiesCount.get(diff) || 0) + 1);
        });
      });

      stats.avgDifficulties = stats.travelers.length > 0 ? totalDifficulties / stats.travelers.length : 0;
      stats.topDifficulties = Array.from(difficultiesCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([difficulty]) => difficulty);
    });

    return Array.from(statsMap.values()).sort((a, b) => b.totalTransits - a.totalTransits);
  }, [filteredData]);

  const displayedRoutes = useMemo(() => {
    if (routeFilter === 'top10') return routeData.slice(0, 10);
    if (routeFilter === 'top20') return routeData.slice(0, 20);
    return routeData;
  }, [routeData, routeFilter]);

  const maxRouteCount = routeData[0]?.count || 1;

  // Render map
  useEffect(() => {
    if (!svgRef.current || !worldData || !filteredData.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = 1050;
    const height = 700;

    const g = svg.append('g');

    const projection = geoMercator()
      .center([18, 54])
      .scale(1000 * zoomLevel)
      .translate([width / 2, height / 2 - 50]);

    const path = d3.geoPath().projection(projection);

    // Zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.5, 8])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom as any);

    // Draw base map
    const countries = topojson.feature(worldData, worldData.objects.countries);
    
    g.append('g')
      .selectAll('path')
      .data(countries.features)
      .join('path')
      .attr('d', path as any)
      .attr('fill', '#f5f5f5')
      .attr('stroke', '#ddd')
      .attr('stroke-width', 0.5)
      .style('cursor', 'pointer')
      .on('mouseover', function() {
        d3.select(this).attr('fill', '#e8e8e8');
      })
      .on('mouseout', function() {
        d3.select(this).attr('fill', '#f5f5f5');
      });

    // Draw routes
    if (showRoutes) {
      const routesByDest = new Map<string, typeof displayedRoutes>();
      displayedRoutes.forEach(route => {
        if (!routesByDest.has(route.to)) {
          routesByDest.set(route.to, []);
        }
        routesByDest.get(route.to)!.push(route);
      });

      let globalIndex = 0;
      routesByDest.forEach((destRoutes) => {
        destRoutes.forEach((route, localIndex) => {
          const fromCoords = COUNTRY_COORDS[route.from];
          const toCoords = COUNTRY_COORDS[route.to];

          if (!fromCoords || !toCoords) return;

          const [originX, originY] = projection([fromCoords.lon, fromCoords.lat]) || [0, 0];
          const [destX, destY] = projection([toCoords.lon, toCoords.lat]) || [0, 0];

          const baseAngle = Math.atan2(destY - originY, destX - originX);
          const totalRoutes = destRoutes.length;
          const spreadAngle = totalRoutes > 1 ? Math.PI / 6 : 0;
          const angleOffset = totalRoutes > 1 
            ? ((localIndex - (totalRoutes - 1) / 2) / (totalRoutes - 1)) * spreadAngle 
            : 0;
          
          const endOffset = 20;
          const finalAngle = baseAngle + angleOffset;
          const x2 = destX - Math.cos(finalAngle) * endOffset;
          const y2 = destY - Math.sin(finalAngle) * endOffset;

          const dx = x2 - originX;
          const dy = y2 - originY;
          const curvature = 0.15;
          const cx = (originX + x2) / 2 - dy * curvature;
          const cy = (originY + y2) / 2 + dx * curvature;

          const pathData = `M ${originX},${originY} Q ${cx},${cy} ${x2},${y2}`;

          const isDashed = globalIndex >= 5;
          const strokeWidth = 2 + (route.count / maxRouteCount) * 4;
          const opacity = 0.3 + (route.count / maxRouteCount) * 0.5;

          const routePath = g.append('path')
            .attr('d', pathData)
            .attr('fill', 'none')
            .attr('stroke', ARK_COLORS.blue)
            .attr('stroke-width', strokeWidth)
            .attr('stroke-opacity', opacity)
            .attr('stroke-dasharray', isDashed ? '8,4' : 'none')
            .attr('marker-end', `url(#arrow-${globalIndex})`)
            .style('cursor', 'pointer')
            .on('mouseover', function(event) {
              d3.select(this).attr('stroke-width', strokeWidth + 2);
              showTooltip(event, route, 'route');
            })
            .on('mouseout', function() {
              d3.select(this).attr('stroke-width', strokeWidth);
              hideTooltip();
            })
            .on('click', () => setSelectedRoute(route));

          g.append('defs')
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
    }

    // Draw country markers
    if (showCountries) {
      countryStats.forEach(stats => {
        const coords = COUNTRY_COORDS[stats.country];
        if (!coords) return;

        const [x, y] = projection([coords.lon, coords.lat]) || [0, 0];
        const radius = 5 + (stats.totalTransits / countryStats[0].totalTransits) * 15;
        const color = stats.asylumApplications > 0 ? ARK_COLORS.red : ARK_COLORS.darkBlue;

        g.append('circle')
          .attr('cx', x)
          .attr('cy', y)
          .attr('r', radius)
          .attr('fill', color)
          .attr('fill-opacity', 0.6)
          .attr('stroke', '#fff')
          .attr('stroke-width', 2)
          .style('cursor', 'pointer')
          .on('mouseover', function(event) {
            d3.select(this).attr('r', radius + 3);
            showTooltip(event, stats, 'country');
          })
          .on('mouseout', function() {
            d3.select(this).attr('r', radius);
            hideTooltip();
          })
          .on('click', () => setSelectedCountry(stats));

        // Country label
        g.append('text')
          .attr('x', x)
          .attr('y', y - radius - 5)
          .attr('text-anchor', 'middle')
          .attr('font-size', '11px')
          .attr('font-weight', '600')
          .attr('fill', '#333')
          .style('pointer-events', 'none')
          .text(stats.country);
      });
    }

  }, [worldData, displayedRoutes, countryStats, showRoutes, showCountries, zoomLevel]);

  const showTooltip = (event: any, data: RouteData | CountryStats, type: 'route' | 'country') => {
    const tooltip = d3.select(tooltipRef.current);
    
    if (type === 'route') {
      const route = data as RouteData;
      tooltip.html(`
        <div class="p-3">
          <h4 class="font-bold text-sm mb-2" style="color: ${ARK_COLORS.blue}">${route.from} → ${route.to}</h4>
          <p class="text-xs mb-1"><strong>Travelers:</strong> ${route.count}</p>
          <p class="text-xs mb-1"><strong>Male:</strong> ${route.travelers.filter(t => t.Gender === 'Male').length}</p>
          <p class="text-xs"><strong>Female:</strong> ${route.travelers.filter(t => t.Gender === 'Female').length}</p>
        </div>
      `);
    } else {
      const stats = data as CountryStats;
      tooltip.html(`
        <div class="p-3">
          <h4 class="font-bold text-sm mb-2" style="color: ${ARK_COLORS.blue}">${stats.country}</h4>
          <p class="text-xs mb-1"><strong>Total Transits:</strong> ${stats.totalTransits}</p>
          <p class="text-xs mb-1"><strong>Asylum Apps:</strong> ${stats.asylumApplications}</p>
          <p class="text-xs"><strong>Avg Difficulties:</strong> ${stats.avgDifficulties.toFixed(1)}</p>
        </div>
      `);
    }

    tooltip
      .style('left', (event.pageX + 10) + 'px')
      .style('top', (event.pageY - 10) + 'px')
      .style('display', 'block');
  };

  const hideTooltip = () => {
    d3.select(tooltipRef.current).style('display', 'none');
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-4 border-b border-gray-200" style={{ backgroundColor: '#f8f9fa' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin size={24} style={{ color: ARK_COLORS.blue }} />
            <h2 className="text-2xl font-bold" style={{ color: ARK_COLORS.blue }}>
              Interactive Migration Routes Map
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="showRoutes"
                checked={showRoutes}
                onChange={(e) => setShowRoutes(e.target.checked)}
                className="w-4 h-4"
              />
              <label htmlFor="showRoutes" className="text-sm text-gray-700">Routes</label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="showCountries"
                checked={showCountries}
                onChange={(e) => setShowCountries(e.target.checked)}
                className="w-4 h-4"
              />
              <label htmlFor="showCountries" className="text-sm text-gray-700">Markers</label>
            </div>
            <select
              value={routeFilter}
              onChange={(e) => setRouteFilter(e.target.value as any)}
              className="px-3 py-1 border border-gray-300 rounded text-sm"
            >
              <option value="top10">Top 10</option>
              <option value="top20">Top 20</option>
              <option value="all">All Routes</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-0" style={{ height: '700px' }}>
        <div className="col-span-3 relative bg-gray-100">
          <svg
            ref={svgRef}
            width="1050"
            height="700"
            className="w-full h-full"
            style={{ cursor: 'move' }}
          />
          
          {/* Tooltip */}
          <div
            ref={tooltipRef}
            className="absolute bg-white rounded-lg shadow-lg border border-gray-200 pointer-events-none"
            style={{ display: 'none', zIndex: 1000 }}
          />

          {/* Zoom Controls */}
          <div className="absolute top-4 right-4 bg-white rounded-lg shadow-md p-2 space-y-2">
            <button
              onClick={() => setZoomLevel(Math.min(zoomLevel + 0.2, 3))}
              className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded"
              title="Zoom In"
            >
              <ZoomIn size={18} />
            </button>
            <button
              onClick={() => setZoomLevel(Math.max(zoomLevel - 0.2, 0.5))}
              className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded"
              title="Zoom Out"
            >
              <ZoomOut size={18} />
            </button>
            <button
              onClick={() => setZoomLevel(1)}
              className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded"
              title="Reset"
            >
              <Maximize2 size={18} />
            </button>
          </div>
        </div>

        {/* Side Panel */}
        <div className="col-span-1 bg-gray-50 p-4 overflow-y-auto border-l border-gray-200">
          <div className="space-y-4">
            {/* Legend */}
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Layers size={18} style={{ color: ARK_COLORS.blue }} />
                <h3 className="font-bold" style={{ color: ARK_COLORS.blue }}>Legend</h3>
              </div>
              <div className="space-y-2 text-xs">
                <div>
                  <p className="font-semibold mb-1">Route Lines:</p>
                  <div className="flex items-center gap-2 mb-1">
                    <div style={{ width: '30px', height: '4px', backgroundColor: ARK_COLORS.blue, opacity: 0.9 }}></div>
                    <span>More travelers</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div style={{ width: '30px', height: '2px', backgroundColor: ARK_COLORS.blue, opacity: 0.4 }}></div>
                    <span>Fewer travelers</span>
                  </div>
                </div>
                <hr />
                <div>
                  <p className="font-semibold mb-1">Country Markers:</p>
                  <div className="flex items-center gap-2 mb-1">
                    <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: ARK_COLORS.darkBlue, opacity: 0.6 }}></div>
                    <span>Transit point</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: ARK_COLORS.red, opacity: 0.6 }}></div>
                    <span>Asylum apps</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Routes */}
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={18} style={{ color: ARK_COLORS.blue }} />
                <h3 className="font-bold text-sm" style={{ color: ARK_COLORS.blue }}>Top Routes</h3>
              </div>
              <div className="space-y-2">
                {displayedRoutes.slice(0, 8).map((route, index) => (
                  <div
                    key={`${route.from}-${route.to}`}
                    className="p-2 rounded border border-gray-200 hover:bg-blue-50 cursor-pointer"
                    onClick={() => setSelectedRoute(route)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold">#{index + 1}</span>
                      <span className="text-xs font-bold" style={{ color: ARK_COLORS.blue }}>
                        {route.count}
                      </span>
                    </div>
                    <p className="text-xs">
                      {route.from} → {route.to}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Countries */}
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <MapPin size={18} style={{ color: ARK_COLORS.darkBlue }} />
                <h3 className="font-bold text-sm" style={{ color: ARK_COLORS.darkBlue }}>Top Countries</h3>
              </div>
              <div className="space-y-2">
                {countryStats.slice(0, 8).map((stats) => (
                  <div
                    key={stats.country}
                    className="p-2 rounded border border-gray-200 hover:bg-purple-50 cursor-pointer"
                    onClick={() => setSelectedCountry(stats)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">{stats.country}</span>
                      <span className="text-xs font-bold" style={{ color: ARK_COLORS.darkBlue }}>
                        {stats.totalTransits}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {stats.asylumApplications} asylum apps
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Info size={18} style={{ color: ARK_COLORS.blue }} />
                <h3 className="font-bold text-sm" style={{ color: ARK_COLORS.blue }}>Stats</h3>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Routes:</span>
                  <span className="font-bold">{routeData.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Countries:</span>
                  <span className="font-bold">{countryStats.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Travelers:</span>
                  <span className="font-bold">{filteredData.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-3 bg-blue-50 border-t border-blue-200">
        <p className="text-xs text-gray-700">
          <strong>💡 Interactive:</strong> Hover over routes/markers for details • Click to select • Drag to pan • Use zoom controls • 
          Toggle layers with checkboxes above
        </p>
      </div>
    </div>
  );
}

function getMostCommon(arr: string[]): string {
  const counts = new Map<string, number>();
  arr.forEach(item => {
    if (item) counts.set(item, (counts.get(item) || 0) + 1);
  });
  const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0] || 'N/A';
}
