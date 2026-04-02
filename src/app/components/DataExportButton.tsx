import { FileDown } from 'lucide-react';

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

export function DataExportButton({ data, fileName = 'filtered-data' }: { data: SurveyData[], fileName?: string }) {
  const exportAsCSV = () => {
    if (data.length === 0) {
      alert('No data to export. Please adjust your filters.');
      return;
    }

    // Create CSV header
    const headers = [
      'ID',
      'Age',
      'Gender',
      'Nationality',
      'Country of Birth',
      'Education',
      'Arrival in Europe',
      'Applied for Asylum',
      'First Asylum Country',
      'First Asylum Outcome',
      'Difficulties Faced',
      'UK Expectations',
      'Information Sources',
      'Asylum Chances',
      'Transit Countries',
      'Legal Residency',
      'Traveling With'
    ];

    // Create CSV rows
    const rows = data.map(d => [
      d.ID,
      d.Age,
      d.Gender,
      d.Nationality1,
      d.CountryOfBirth,
      d.Education,
      d.ArrivalInEurope,
      d.AsylumApplied,
      d.FirstAsylumCountry,
      d.FirstAsylumOutcome,
      d.DifficultiesFaced.join('; '),
      d.UKExpectations.join('; '),
      d.InformationSources.join('; '),
      d.AsylumChances,
      d.TransitCountries.join(' → '),
      d.LegalResidency,
      d.TravelingWith.join('; ')
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Create download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={exportAsCSV}
      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      title="Export filtered data as CSV"
    >
      <FileDown size={20} />
      Export Data (CSV)
    </button>
  );
}
