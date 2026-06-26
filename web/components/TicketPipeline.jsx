import React from 'react';

const TicketPipeline = () => {
  return (
    <div className="p-4 border rounded shadow-sm bg-white dark:bg-gray-800">
      <h3 className="text-lg font-bold mb-4">Ticket Pipeline</h3>
      <div className="grid grid-cols-3 gap-4">
        <div className="p-2 bg-gray-100 rounded">
          <h4 className="text-xs font-bold uppercase text-gray-500 mb-2">Backlog</h4>
          <div className="p-2 bg-white rounded shadow-sm text-xs mb-2">Update Security Docs</div>
        </div>
        <div className="p-2 bg-blue-50 rounded">
          <h4 className="text-xs font-bold uppercase text-blue-500 mb-2">In Progress</h4>
          <div className="p-2 bg-white rounded shadow-sm text-xs mb-2">Refactoring Kernel</div>
        </div>
        <div className="p-2 bg-green-50 rounded">
          <h4 className="text-xs font-bold uppercase text-green-500 mb-2">Done</h4>
          <div className="p-2 bg-white rounded shadow-sm text-xs mb-2">Initial OS Layout</div>
        </div>
      </div>
    </div>
  );
};

export default TicketPipeline;
