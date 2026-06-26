import React from 'react';

const Header = () => {
  return (
    <header className="flex items-center justify-between p-4 bg-gray-900 text-white shadow-md">
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center font-bold">C</div>
        <h1 className="text-xl font-bold tracking-tight">Cypher-Tube OS</h1>
      </div>
      <div className="flex items-center space-x-4">
        <button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded transition-colors uppercase text-sm">
          Emergency Stop
        </button>
      </div>
    </header>
  );
};

export default Header;
