import React from "react";

export default function TestDRMSimulation() {
  return (
    <div className="min-h-screen bg-gray-900 text-white font-mono p-8">
      <h1 className="text-3xl font-bold text-teal-400 mb-4">
        Test DRM Simulation - Working!
      </h1>
      
      <div className="grid grid-cols-3 gap-4 h-96">
        {/* Left Panel - Stream Cards */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <h2 className="text-lg font-bold text-teal-400 mb-4">DWSIM Streams</h2>
          <div className="space-y-3">
            <div className="border border-gray-600 bg-gray-700 rounded-lg p-3">
              <div className="font-bold text-white text-sm">Stream 1</div>
              <div className="text-xs text-gray-300">Test Stream</div>
              <div className="text-xs text-gray-400">Flow: 41.1 mg/s</div>
            </div>
            <div className="border border-gray-600 bg-gray-700 rounded-lg p-3">
              <div className="font-bold text-white text-sm">Stream 2</div>
              <div className="text-xs text-gray-300">CO2 Inlet</div>
              <div className="text-xs text-gray-400">Flow: 30.1 mg/s</div>
            </div>
          </div>
        </div>

        {/* Center Panel - Process Flow */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <h2 className="text-lg font-bold text-teal-400 mb-4">Process Flow</h2>
          <div className="flex flex-col items-center space-y-4">
            <div className="bg-blue-500/20 border border-blue-400 rounded-lg p-4 w-32 text-center">
              <div className="text-sm font-bold">MIXER</div>
            </div>
            <div className="bg-orange-500/20 border border-orange-400 rounded-lg p-4 w-32 text-center">
              <div className="text-sm font-bold">REACTOR</div>
            </div>
            <div className="bg-green-500/20 border border-green-400 rounded-lg p-4 w-32 text-center">
              <div className="text-sm font-bold">OUTLET</div>
            </div>
          </div>
        </div>

        {/* Right Panel - Properties */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <h2 className="text-lg font-bold text-teal-400 mb-4">Stream Properties</h2>
          <div className="space-y-3">
            <div className="bg-gray-700 p-3 rounded">
              <div className="text-sm text-gray-300">Temperature</div>
              <div className="text-white font-mono">25.0°C</div>
            </div>
            <div className="bg-gray-700 p-3 rounded">
              <div className="text-sm text-gray-300">Pressure</div>
              <div className="text-white font-mono">1.013 bar</div>
            </div>
            <div className="bg-gray-700 p-3 rounded">
              <div className="text-sm text-gray-300">Mass Flow</div>
              <div className="text-white font-mono">30.14 mg/s</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}