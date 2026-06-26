import React from 'react';

const AgentRegistry = () => {
  return (
    <div className="p-4 border rounded shadow-sm bg-white dark:bg-gray-800">
      <h3 className="text-lg font-bold mb-2">Agent Registry</h3>
      <ul className="space-y-2">
        <li className="flex items-center justify-between">
          <span>Sentinel-1</span>
          <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">Active</span>
        </li>
        <li className="flex items-center justify-between">
          <span>Bolt-X</span>
          <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">Active</span>
        </li>
        <li className="flex items-center justify-between">
          <span>Reflector-Zero</span>
          <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">Idle</span>
        </li>
      </ul>
    </div>
  );
};

export default AgentRegistry;
