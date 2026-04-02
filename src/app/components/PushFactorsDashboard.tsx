import { useEffect, useState, useRef } from 'react';
import * as d3 from 'd3';
import { geoMercator } from 'd3-geo';
import * as topojson from 'topojson-client';
import { Filter, X, Users, MapPin, AlertCircle, TrendingUp, Globe } from 'lucide-react';
import { InteractiveWebMap } from './InteractiveWebMap';
import { ExportButton } from './ExportButton';
import { DataExportButton } from './DataExportButton';

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

// ARK color scheme
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
};

async function parsePushFactorsData(): Promise<SurveyData[]> {
  try {
    const csvModule = await import('../../imports/Push_Factors-_Difficulties_Faced_in_EU_Countries_-1.csv?raw');
    const csvText = csvModule.default;
    const data = d3.csvParse(csvText);
    
    const parsedData: SurveyData[] = data.map(row => {
      // Parse difficulties (columns with prefix "When you were living in European countries")
      const difficulties: string[] = [];
      const difficultyFields = [
        'Asylum procedures',
        'Long delays or uncertainty',
        'Accommodation conditions',
        'Racism and discrimination',
        'Barriers to practising religious, social, and cultural obligations',
        'No right to work or difficulty to find work',
        'Having to radically change my academic, educational, or professional path',
        'Living without legal status / documentation',
        'Lack of family or social connections',
        'Safety concerns',
        'Barriers related to gender, family responsibilities or childcare',
        'Challenges related to disability or health needs',
        'Homelessness',
        'Language barriers',
        'Personal circumstances/issues'
      ];

      // Extract checked difficulties from the concatenated field
      const difficultiesStr = row['When you were living in European countries, what were the main difficulties or challenges you faced?'] || '';
      difficultyFields.forEach(field => {
        if (difficultiesStr.includes(field)) {
          difficulties.push(field);
        }
      });

      // Parse UK expectations
      const expectations: string[] = [];
      const expectationFields = [
        'I will have my asylum claim accepted',
        'I will be able to stay undocumented',
        'Family or friends will help me settle',
        'I speak English and it will be easier for me to communicate',
        'I think it will be easier to work and support myself in the UK',
        'I expect things to be similar to other EU countries',
        'I hope to feel safe and stable',
        'I will find work easily',
        'I will receive state benefits',
        'I will be able to bring my family members',
        'I will be able to continue the same or similar academic or professional path'
      ];

      const expectationsStr = row['What do you expect will be possible for you in the UK?'] || '';
      expectationFields.forEach(field => {
        if (expectationsStr.includes(field)) {
          expectations.push(field);
        }
      });

      // Parse information sources
      const sources: string[] = [];
      const sourceFields = [
        'Friends or family',
        'People who already went to the UK',
        'Social media',
        'Smugglers / facilitators',
        'NGOs or support organisations',
        'Official sources / government',
        'Personal experience'
      ];

      const sourcesStr = row['Where did you get most of your information about the UK asylum system? (select all that apply)'] || '';
      sourceFields.forEach(field => {
        if (sourcesStr.includes(field)) {
          sources.push(field);
        }
      });

      // Parse transit countries
      const transitCountries: string[] = [];
      for (let i = 1; i <= 9; i++) {
        const country = row[`Country ${i}`]?.trim();
        if (country && country !== '' && country !== 'Other' && country !== 'I prefer not to say') {
          transitCountries.push(country);
        }
      }

      // Parse traveling with
      const travelingWith: string[] = [];
      const travelStr = row['Who are you traveling with right now? (select all that apply)'] || '';
      ['Alone', 'With partner', 'With children', 'With other family members', 'With friends'].forEach(option => {
        if (travelStr.includes(option)) {
          travelingWith.push(option);
        }
      });

      return {
        ID: row['ID'] || '',
        Age: row['Age'] || '',
        Gender: row['Gender'] || '',
        Nationality1: row['Nationality 1'] || '',
        CountryOfBirth: row['What is your country of birth?'] || '',
        Education: row['Education'] || '',
        ArrivalInEurope: row['Arrival in Europe'] || '',
        AsylumApplied: row['Have you applied for asylum since you arrived in the EU?'] || '',
        FirstAsylumCountry: row['Where did you apply for asylum for the first time?'] || '',
        FirstAsylumOutcome: row['What was the outcome of your first asylum application?'] || '',
        DifficultiesFaced: difficulties,
        UKExpectations: expectations,
        InformationSources: sources,
        AsylumChances: row['Asylum chances'] || '',
        TransitCountries: transitCountries,
        LegalResidency: row['Do you have legal residency in a European country at the moment?'] || '',
        TravelingWith: travelingWith
      };
    });

    console.log('Parsed survey data:', parsedData.length, 'responses');
    return parsedData;
  } catch (error) {
    console.error('Error parsing push factors data:', error);
    return [];
  }
}

export function PushFactorsDashboard() {
  const [data, setData] = useState<SurveyData[]>([]);
  const [filteredData, setFilteredData] = useState<SurveyData[]>([]);
  const [worldData, setWorldData] = useState<any>(null);
  const [showFilters, setShowFilters] = useState(true);

  // Filter states
  const [selectedGender, setSelectedGender] = useState<string>('All');
  const [selectedAge, setSelectedAge] = useState<string>('All');
  const [selectedEducation, setSelectedEducation] = useState<string>('All');
  const [selectedAsylumStatus, setSelectedAsylumStatus] = useState<string>('All');
  const [selectedNationality, setSelectedNationality] = useState<string>('All');

  useEffect(() => {
    parsePushFactorsData().then(setData);
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
      .then(response => response.json())
      .then(setWorldData);
  }, []);

  useEffect(() => {
    if (data.length === 0) return;

    let filtered = [...data];

    if (selectedGender !== 'All') {
      filtered = filtered.filter(d => d.Gender === selectedGender);
    }
    if (selectedAge !== 'All') {
      filtered = filtered.filter(d => d.Age === selectedAge);
    }
    if (selectedEducation !== 'All') {
      filtered = filtered.filter(d => d.Education === selectedEducation);
    }
    if (selectedAsylumStatus !== 'All') {
      filtered = filtered.filter(d => d.AsylumApplied === selectedAsylumStatus);
    }
    if (selectedNationality !== 'All') {
      filtered = filtered.filter(d => d.Nationality1 === selectedNationality);
    }

    setFilteredData(filtered);
  }, [data, selectedGender, selectedAge, selectedEducation, selectedAsylumStatus, selectedNationality]);

  // Get unique values for filters
  const genders = ['All', ...Array.from(new Set(data.map(d => d.Gender).filter(Boolean)))];
  const ages = ['All', ...Array.from(new Set(data.map(d => d.Age).filter(Boolean)))];
  const educations = ['All', ...Array.from(new Set(data.map(d => d.Education).filter(Boolean)))];
  const asylumStatuses = ['All', 'Yes', 'No'];
  const nationalities = ['All', ...Array.from(new Set(data.map(d => d.Nationality1).filter(Boolean)))].sort();

  // Calculate statistics
  const difficultyCounts = new Map<string, number>();
  filteredData.forEach(d => {
    d.DifficultiesFaced.forEach(difficulty => {
      difficultyCounts.set(difficulty, (difficultyCounts.get(difficulty) || 0) + 1);
    });
  });

  const expectationCounts = new Map<string, number>();
  filteredData.forEach(d => {
    d.UKExpectations.forEach(expectation => {
      expectationCounts.set(expectation, (expectationCounts.get(expectation) || 0) + 1);
    });
  });

  const sourceCounts = new Map<string, number>();
  filteredData.forEach(d => {
    d.InformationSources.forEach(source => {
      sourceCounts.set(source, (sourceCounts.get(source) || 0) + 1);
    });
  });

  const asylumOutcomeCounts = new Map<string, number>();
  filteredData.forEach(d => {
    if (d.FirstAsylumOutcome && d.FirstAsylumOutcome !== '') {
      asylumOutcomeCounts.set(d.FirstAsylumOutcome, (asylumOutcomeCounts.get(d.FirstAsylumOutcome) || 0) + 1);
    }
  });

  // Top difficulties
  const topDifficulties = Array.from(difficultyCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const maxDifficultyCount = topDifficulties[0]?.[1] || 1;

  // Top expectations
  const topExpectations = Array.from(expectationCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const maxExpectationCount = topExpectations[0]?.[1] || 1;

  // Information sources
  const topSources = Array.from(sourceCounts.entries())
    .sort((a, b) => b[1] - a[1]);

  const maxSourceCount = topSources[0]?.[1] || 1;

  // Asylum outcomes
  const asylumOutcomes = Array.from(asylumOutcomeCounts.entries())
    .sort((a, b) => b[1] - a[1]);

  // Transit route segments
  const routeSegments = new Map<string, number>();
  filteredData.forEach(d => {
    for (let i = 0; i < d.TransitCountries.length - 1; i++) {
      const from = d.TransitCountries[i];
      const to = d.TransitCountries[i + 1];
      const key = `${from}|||${to}`;
      routeSegments.set(key, (routeSegments.get(key) || 0) + 1);
    }
  });

  const topRoutes = Array.from(routeSegments.entries())
    .map(([key, count]) => {
      const [from, to] = key.split('|||');
      return { from, to, count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  const clearFilters = () => {
    setSelectedGender('All');
    setSelectedAge('All');
    setSelectedEducation('All');
    setSelectedAsylumStatus('All');
    setSelectedNationality('All');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-[2000px] mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl mb-2" style={{ color: ARK_COLORS.blue }}>
                EU Migration Push Factors Dashboard
              </h1>
              <p className="text-gray-600">
                Comprehensive analysis of difficulties faced by migrants in EU countries and their expectations for the UK
              </p>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-colors"
              style={{ backgroundColor: ARK_COLORS.blue }}
            >
              <Filter size={20} />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </button>
          </div>

          {/* Key Statistics */}
          <div className="grid grid-cols-5 gap-4 mt-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Users size={20} style={{ color: ARK_COLORS.blue }} />
                <p className="text-sm text-gray-600">Total Respondents</p>
              </div>
              <p className="text-3xl" style={{ color: ARK_COLORS.blue }}>{filteredData.length}</p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <MapPin size={20} className="text-green-700" />
                <p className="text-sm text-gray-600">Applied for Asylum</p>
              </div>
              <p className="text-3xl text-green-700">
                {filteredData.filter(d => d.AsylumApplied === 'Yes').length}
              </p>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-lg border border-red-200">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle size={20} className="text-red-700" />
                <p className="text-sm text-gray-600">Avg. Difficulties</p>
              </div>
              <p className="text-3xl text-red-700">
                {filteredData.length > 0 
                  ? (filteredData.reduce((sum, d) => sum + d.DifficultiesFaced.length, 0) / filteredData.length).toFixed(1)
                  : '0'}
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={20} className="text-purple-700" />
                <p className="text-sm text-gray-600">Avg. Expectations</p>
              </div>
              <p className="text-3xl text-purple-700">
                {filteredData.length > 0 
                  ? (filteredData.reduce((sum, d) => sum + d.UKExpectations.length, 0) / filteredData.length).toFixed(1)
                  : '0'}
              </p>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-200">
              <div className="flex items-center gap-2 mb-2">
                <Globe size={20} className="text-orange-700" />
                <p className="text-sm text-gray-600">Avg. Transit Countries</p>
              </div>
              <p className="text-3xl text-orange-700">
                {filteredData.length > 0 
                  ? (filteredData.reduce((sum, d) => sum + d.TransitCountries.length, 0) / filteredData.length).toFixed(1)
                  : '0'}
              </p>
            </div>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold" style={{ color: ARK_COLORS.blue }}>Filters</h2>
              <button
                onClick={clearFilters}
                className="flex items-center gap-2 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <X size={16} />
                Clear All
              </button>
            </div>

            <div className="grid grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                <select
                  value={selectedGender}
                  onChange={(e) => setSelectedGender(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {genders.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Age Group</label>
                <select
                  value={selectedAge}
                  onChange={(e) => setSelectedAge(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {ages.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Education</label>
                <select
                  value={selectedEducation}
                  onChange={(e) => setSelectedEducation(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {educations.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Applied for Asylum</label>
                <select
                  value={selectedAsylumStatus}
                  onChange={(e) => setSelectedAsylumStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {asylumStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nationality</label>
                <select
                  value={selectedNationality}
                  onChange={(e) => setSelectedNationality(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {nationalities.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Difficulties Faced */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl mb-4" style={{ color: ARK_COLORS.blue }}>
              Top 10 Difficulties Faced in EU Countries
            </h2>
            <div className="space-y-3">
              {topDifficulties.map(([difficulty, count]) => (
                <div key={difficulty}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-gray-700 font-medium">{difficulty}</span>
                    <span className="text-sm font-bold" style={{ color: ARK_COLORS.blue }}>
                      {count} ({((count / filteredData.length) * 100).toFixed(0)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-6">
                    <div
                      className="h-6 rounded-full flex items-center justify-end pr-2"
                      style={{
                        width: `${(count / maxDifficultyCount) * 100}%`,
                        backgroundColor: ARK_COLORS.blue,
                        minWidth: count > 0 ? '30px' : '0'
                      }}
                    >
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* UK Expectations */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl mb-4" style={{ color: ARK_COLORS.darkBlue }}>
              Top UK Expectations
            </h2>
            <div className="space-y-3">
              {topExpectations.map(([expectation, count]) => (
                <div key={expectation}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-gray-700 font-medium">{expectation}</span>
                    <span className="text-sm font-bold" style={{ color: ARK_COLORS.darkBlue }}>
                      {count} ({((count / filteredData.length) * 100).toFixed(0)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-6">
                    <div
                      className="h-6 rounded-full"
                      style={{
                        width: `${(count / maxExpectationCount) * 100}%`,
                        backgroundColor: ARK_COLORS.darkBlue,
                        minWidth: count > 0 ? '30px' : '0'
                      }}
                    >
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Second Row */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Information Sources */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl mb-4" style={{ color: ARK_COLORS.lightBlue }}>
              Information Sources About UK Asylum System
            </h2>
            <div className="space-y-3">
              {topSources.map(([source, count]) => (
                <div key={source}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-gray-700 font-medium">{source}</span>
                    <span className="text-sm font-bold" style={{ color: ARK_COLORS.lightBlue }}>
                      {count} ({((count / filteredData.length) * 100).toFixed(0)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-6">
                    <div
                      className="h-6 rounded-full"
                      style={{
                        width: `${(count / maxSourceCount) * 100}%`,
                        backgroundColor: ARK_COLORS.lightBlue,
                        minWidth: count > 0 ? '30px' : '0'
                      }}
                    >
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Asylum Outcomes */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl mb-4" style={{ color: ARK_COLORS.red }}>
              First Asylum Application Outcomes
            </h2>
            <div className="space-y-3">
              {asylumOutcomes.map(([outcome, count]) => (
                <div key={outcome}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-gray-700 font-medium">{outcome}</span>
                    <span className="text-sm font-bold" style={{ color: ARK_COLORS.red }}>
                      {count} ({((count / filteredData.filter(d => d.FirstAsylumOutcome).length) * 100).toFixed(0)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-6">
                    <div
                      className="h-6 rounded-full"
                      style={{
                        width: `${(count / asylumOutcomes[0][1]) * 100}%`,
                        backgroundColor: ARK_COLORS.red,
                        minWidth: count > 0 ? '30px' : '0'
                      }}
                    >
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Transit Routes Map */}
        <InteractiveWebMap filteredData={filteredData} />
        
        {/* Export Section */}
        <div className="mt-6 bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold mb-2" style={{ color: ARK_COLORS.blue }}>
                Share This Dashboard
              </h3>
              <p className="text-sm text-gray-600">
                Share your current view with others or export the data
              </p>
            </div>
            <div className="flex gap-2">
              <ExportButton />
              <DataExportButton data={filteredData} fileName="migration-dashboard-data" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}