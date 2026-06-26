import React from 'react';

const InsightsPanel = () => {
  return (
    <div className="p-4 border rounded shadow-sm bg-white dark:bg-gray-800">
      <h3 className="text-lg font-bold mb-2">Meta-Cognitive Insights</h3>
      <div className="text-sm italic text-gray-700 dark:text-gray-300">
        "Reflector suggests increasing memory allocation for Sentinel-1 based on recent workload spikes."
      </div>
    </div>
  );
};

export default InsightsPanel;
