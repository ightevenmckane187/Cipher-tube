import React from 'react';

const HilQueue = () => {
  return (
    <div className="p-4 border rounded shadow-sm bg-white dark:bg-gray-800">
      <h3 className="text-lg font-bold mb-2">HIL Queue</h3>
      <div className="space-y-3">
        <div className="p-3 border-l-4 border-yellow-500 bg-yellow-50 rounded">
          <p className="text-sm font-medium">Sensitive Deletion Request</p>
          <p className="text-xs text-gray-600">Awaiting human approval for project 'Alpha'</p>
          <div className="mt-2 flex space-x-2">
            <button className="px-2 py-1 bg-green-600 text-white text-xs rounded">Approve</button>
            <button className="px-2 py-1 bg-red-600 text-white text-xs rounded">Deny</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HilQueue;
