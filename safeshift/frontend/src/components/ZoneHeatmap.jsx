import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip } from 'recharts';

/**
 * ZoneHeatmap Component
 * 
 * Displays zone risk metrics in a radar chart format to help underwriters
 * identify high-risk areas visually. Accepts zone_stats prop and renders
 * a radar chart with normalized metrics.
 * 
 * Requirements: 7.1, 7.2
 */
function ZoneHeatmap({ zone_stats }) {
  // Handle empty or invalid data
  if (!zone_stats || !Array.isArray(zone_stats) || zone_stats.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <p>No zone data available for heatmap visualization</p>
      </div>
    );
  }

  // Normalize metrics to 0-100 scale for radar display
  const normalizeData = (stats) => {
    const maxRisk = Math.max(...stats.map(z => z.risk_score || z.avg_trust || 0));
    const maxClaims = Math.max(...stats.map(z => z.claims || 0));
    
    // Avoid division by zero
    const safeMax = (value) => value === 0 ? 1 : value;
    
    return stats.map(zone => ({
      zone_id: zone.zone_id,
      risk_score: ((zone.risk_score || zone.avg_trust || 0) / safeMax(maxRisk)) * 100,
      claims: ((zone.claims || 0) / safeMax(maxClaims)) * 100,
      // Store original values for tooltip
      original: {
        risk_score: zone.risk_score || zone.avg_trust || 0,
        claims: zone.claims || 0
      }
    }));
  };

  const data = normalizeData(zone_stats);

  // Custom tooltip to show exact values
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-800">{`Zone: ${label}`}</p>
          <p className="text-red-600">{`Risk Score: ${data.original.risk_score}`}</p>
          <p className="text-amber-600">{`Claims: ${data.original.claims}`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Zone Risk Heatmap</h3>
        <p className="text-sm text-gray-600">
          Radar chart showing normalized risk metrics across zones (0-100 scale)
        </p>
      </div>
      
      <div className="flex justify-center">
        <RadarChart width={600} height={400} data={data}>
          <PolarGrid gridType="circle" />
          <PolarAngleAxis dataKey="zone_id" />
          <PolarRadiusAxis angle={90} domain={[0, 100]} />
          <Radar 
            name="Risk Score" 
            dataKey="risk_score" 
            stroke="#ef4444" 
            fill="#ef4444" 
            fillOpacity={0.6} 
          />
          <Radar 
            name="Claims" 
            dataKey="claims" 
            stroke="#f59e0b" 
            fill="#f59e0b" 
            fillOpacity={0.4} 
          />
          <Tooltip content={<CustomTooltip />} />
        </RadarChart>
      </div>
      
      <div className="mt-4 flex justify-center">
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span>Risk Score</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-amber-500 rounded"></div>
            <span>Claims</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ZoneHeatmap;