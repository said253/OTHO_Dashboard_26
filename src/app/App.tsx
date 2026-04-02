import { AsylumOutcomesMap } from './components/AsylumOutcomesMap';
import { DwellTimeHeatmap } from './components/DwellTimeHeatmap';
import { PushFactorsChart } from './components/PushFactorsChart';
import { ExpectationsVsReality } from './components/ExpectationsVsReality';
import { JourneyTimeline } from './components/JourneyTimeline';
import { TransitCountriesMap } from './components/TransitCountriesMap';
import { PushFactorsDashboard } from './components/PushFactorsDashboard';

export default function App() {
  return (
    <div className="size-full">
      <PushFactorsDashboard />
    </div>
  );
}