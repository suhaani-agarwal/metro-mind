// app/cbtc/page.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Train, AlertTriangle, Zap, Target, MapPin, Gauge, Activity, Shield, ChevronRight, X, Play, Pause, RotateCcw, Settings, Clock, TrendingUp, AlertCircle } from 'lucide-react';

// Define types
interface TrainData {
  id: string;
  speed: number; // km/h
  acceleration: number; // m/s²
  currentStation: string;
  nextStation: string;
  position: number; // 0-100% of route
  status: 'moving' | 'stopped' | 'accelerating' | 'braking' | 'violation';
  signalAspect: 'green' | 'yellow' | 'red' | 'restrictive';
  distanceToNext: number; // meters
  brakingDistance: number;
  safetyDistance: number;
  buffer: number;
  warning: boolean;
  priority: boolean;
  condition: 'excellent' | 'good' | 'moderate';
  eta: number; // seconds to next station
}

// Station data for the route
const STATIONS = [
  "Aluva", "Pulinchodu", "Companypady", "Ambattukavu",
  "Muttom", "Kalamassery", "Cochin University", "Pathadipalam",
  "Edapally", "Changampuzha Park", "Palarivattom", "JLN Stadium",
  "Kaloor", "Lissie", "MG Road", "Maharaja's College",
  "Ernakulam South", "Kadavanthra", "Elamkulam", "Vyttila"
];

// Configuration
const MAX_SPEED = 30; // km/h
const MIN_SPEED = 20; // km/h
const MIN_ACCELERATION = 0.6; // m/s²
const MAX_ACCELERATION = 1.0; // m/s²
const SAFE_BUFFER = 75; // meters
const STATION_DWELL_TIME = 20; // seconds
const ROUTE_LENGTH = 20000; // meters

// Initial train data - arranged in 4-4-2 pattern
const createInitialTrains = (): TrainData[] => {
  const trainIds = ['T01', 'T02', 'T03', 'T04', 'T05', 'T06', 'T07', 'T08', 'T09', 'T10'];
  return trainIds.map((id, index) => {
    const stationIndex = Math.floor(index * 2) % STATIONS.length;
    const baseSpeed = MIN_SPEED + Math.random() * (MAX_SPEED - MIN_SPEED);
    const acceleration = MIN_ACCELERATION + Math.random() * (MAX_ACCELERATION - MIN_ACCELERATION);
    const speed = Math.random() > 0.3 ? baseSpeed : 0;
    
    // Different positions for grid arrangement
    const gridPosition = (index % 4) * 25 + 12.5; // Spread in grid columns
    
    return {
      id,
      speed,
      acceleration,
      currentStation: STATIONS[stationIndex],
      nextStation: STATIONS[(stationIndex + 1) % STATIONS.length],
      position: gridPosition, // Used for grid positioning
      status: speed > 0 ? 'moving' : 'stopped',
      signalAspect: Math.random() > 0.7 ? 'yellow' : 'green',
      distanceToNext: 150 + Math.random() * 100,
      brakingDistance: 0,
      safetyDistance: 0,
      buffer: 50 + Math.random() * 50,
      warning: false,
      priority: index < 3,
      condition: index < 3 ? 'excellent' : index < 7 ? 'good' : 'moderate',
      eta: 30 + Math.floor(Math.random() * 60)
    };
  });
};

export default function CBTCPage() {
  // State management
  const [trains, setTrains] = useState<TrainData[]>(createInitialTrains());
  const [selectedTrain, setSelectedTrain] = useState<TrainData | null>(null);
  const [speedHistory, setSpeedHistory] = useState<Array<{time: number, speed: number}>>([]);
  const [separationHistory, setSeparationHistory] = useState<Array<{time: number, separation: number}>>([]);
  const [isRunning, setIsRunning] = useState(true);
  const [simulationTime, setSimulationTime] = useState(0);
  const [updateInterval, setUpdateInterval] = useState(150); // ms
  const simulationRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate braking distance (v² / (2a))
  const calculateBrakingDistance = (speedKmh: number, accelerationMs2: number): number => {
    const speedMs = (speedKmh * 1000) / 3600;
    return (speedMs * speedMs) / (2 * Math.abs(accelerationMs2));
  };

  // Update safety calculations for all trains
  const updateSafetyCalculations = useCallback((currentTrains: TrainData[]): TrainData[] => {
    return currentTrains.map((train, index) => {
      // Find next train (simple circular order)
      const nextTrain = currentTrains[(index + 1) % currentTrains.length];
      
      // Calculate distance to next train (simulated)
      const distanceToNext = 100 + Math.random() * 150;
      
      // Calculate braking distance
      const brakingDistance = calculateBrakingDistance(train.speed, train.acceleration);
      
      // Calculate safety distance (braking + buffer)
      const safetyDistance = brakingDistance + train.buffer;
      
      // Check for violation
      const warning = distanceToNext < safetyDistance;
      const status = warning ? 'violation' : 
                     train.speed === 0 ? 'stopped' :
                     train.speed < MIN_SPEED + 2 ? 'braking' :
                     train.speed > MAX_SPEED - 2 ? 'accelerating' : 'moving';
      
      // Determine signal aspect
      let signalAspect: TrainData['signalAspect'] = 'green';
      if (distanceToNext < safetyDistance * 0.5) {
        signalAspect = 'red';
      } else if (distanceToNext < safetyDistance * 0.8) {
        signalAspect = 'yellow';
      } else if (distanceToNext < safetyDistance) {
        signalAspect = 'restrictive';
      }
      
      // Update ETA
      const newEta = train.eta > 0 ? train.eta - 0.15 : 30 + Math.floor(Math.random() * 60);
      
      return {
        ...train,
        distanceToNext: Math.round(distanceToNext),
        brakingDistance: Math.round(brakingDistance),
        safetyDistance: Math.round(safetyDistance),
        warning,
        status,
        signalAspect,
        eta: Math.max(0, newEta)
      };
    });
  }, []);

  // Update train dynamics
  const updateTrains = useCallback(() => {
    setTrains(prev => {
      const updated = prev.map(train => {
        let newSpeed = train.speed;
        let newStatus = train.status;
        
        // Simulate station stops
        if (train.eta <= 0 && train.status !== 'stopped') {
          newStatus = 'stopped';
          newSpeed = 0;
        } else if (train.status === 'stopped' && Math.random() > 0.97) {
          // Resume from station
          newStatus = 'accelerating';
        }
        
        // Speed changes based on status
        switch (newStatus) {
          case 'stopped':
            newSpeed = 0;
            break;
          case 'accelerating':
            newSpeed = Math.min(MAX_SPEED, train.speed + (train.acceleration * 3.6 * 0.15));
            if (newSpeed >= MAX_SPEED - 1) {
              newStatus = 'moving';
            }
            break;
          case 'braking':
            newSpeed = Math.max(0, train.speed - (train.acceleration * 3.6 * 0.15));
            break;
          case 'moving':
            // Small speed variations
            const speedChange = (Math.random() - 0.5) * 0.8;
            newSpeed = Math.max(MIN_SPEED, Math.min(MAX_SPEED, train.speed + speedChange));
            break;
        }
        
        // Randomly trigger braking
        if (newStatus === 'moving' && Math.random() > 0.98) {
          newStatus = 'braking';
        }
        if (newStatus === 'braking' && newSpeed < MIN_SPEED + 2) {
          newStatus = 'moving';
        }
        
        // Update station if ETA expired
        let newStation = train.currentStation;
        let newNextStation = train.nextStation;
        let newEta = train.eta;
        
        if (train.eta <= 0 && train.status !== 'stopped') {
          const currentIndex = STATIONS.indexOf(train.currentStation);
          newStation = STATIONS[(currentIndex + 1) % STATIONS.length];
          newNextStation = STATIONS[(currentIndex + 2) % STATIONS.length];
          newEta = 30 + Math.floor(Math.random() * 60);
        }
        
        return {
          ...train,
          speed: parseFloat(newSpeed.toFixed(1)),
          status: newStatus,
          currentStation: newStation,
          nextStation: newNextStation,
          eta: parseFloat(newEta.toFixed(1))
        };
      });
      
      return updateSafetyCalculations(updated);
    });
  }, [updateSafetyCalculations]);

  // Main simulation loop
  useEffect(() => {
    if (!isRunning) return;
    
    simulationRef.current = setInterval(() => {
      setSimulationTime(prev => prev + updateInterval / 1000);
      updateTrains();
      
      // Update charts
      if (trains.length > 0) {
        const avgSpeed = trains.reduce((sum, train) => sum + train.speed, 0) / trains.length;
        const avgSeparation = trains.reduce((sum, train) => sum + train.distanceToNext, 0) / trains.length;
        
        setSpeedHistory(prev => {
          const newData = [...prev.slice(-40), { time: simulationTime, speed: avgSpeed }];
          return newData;
        });
        
        setSeparationHistory(prev => {
          const newData = [...prev.slice(-40), { time: simulationTime, separation: avgSeparation }];
          return newData;
        });
      }
    }, updateInterval);
    
    return () => {
      if (simulationRef.current) clearInterval(simulationRef.current);
    };
  }, [isRunning, updateInterval, trains, simulationTime, updateTrains]);

  // Control handlers
  const toggleSimulation = () => setIsRunning(!isRunning);
  const resetSimulation = () => {
    setTrains(createInitialTrains());
    setSimulationTime(0);
    setSpeedHistory([]);
    setSeparationHistory([]);
  };

  // Get status color
  const getStatusColor = (status: string, warning: boolean) => {
    if (warning) return 'bg-red-500';
    switch (status) {
      case 'moving': return 'bg-green-500';
      case 'stopped': return 'bg-gray-500';
      case 'accelerating': return 'bg-blue-500';
      case 'braking': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  // Get signal color
  const getSignalColor = (aspect: string) => {
    switch (aspect) {
      case 'green': return 'bg-green-500';
      case 'yellow': return 'bg-yellow-500';
      case 'red': return 'bg-red-500';
      case 'restrictive': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  // Grid arrangement: 4-4-2 pattern
  const gridRows = [
    trains.slice(0, 4), // First row: 4 trains
    trains.slice(4, 8), // Second row: 4 trains
    trains.slice(8, 10) // Third row: 2 trains
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center">
              <Train className="mr-3" size={32} />
              CBTC Train Control System
            </h1>
            <p className="text-gray-400 mt-1">Real-time Communication-Based Train Control Monitoring</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="bg-gray-800 px-4 py-2 rounded-lg">
              <div className="text-sm text-gray-400">Update Rate</div>
              <div className="flex items-center space-x-2">
                <input
                  type="range"
                  min="50"
                  max="500"
                  step="50"
                  value={updateInterval}
                  onChange={(e) => setUpdateInterval(parseInt(e.target.value))}
                  className="w-32 accent-teal-500"
                />
                <span className="font-mono text-teal-400">{updateInterval}ms</span>
              </div>
            </div>
            <div className="bg-gray-800 px-4 py-2 rounded-lg">
              <div className="text-sm text-gray-400">Simulation Time</div>
              <div className="text-xl font-mono text-teal-400">
                {Math.floor(simulationTime / 60)}:{(simulationTime % 60).toString().padStart(2, '0')}
              </div>
            </div>
            <button
              onClick={toggleSimulation}
              className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${isRunning ? 'bg-red-500' : 'bg-teal-500'}`}
            >
              {isRunning ? <Pause size={20} /> : <Play size={20} />}
              <span>{isRunning ? 'Pause' : 'Start'}</span>
            </button>
            <button
              onClick={resetSimulation}
              className="px-4 py-2 rounded-lg bg-gray-700 flex items-center space-x-2 hover:bg-gray-600"
            >
              <RotateCcw size={20} />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content - Train Grid */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-6 flex items-center text-teal-300">
          <Train className="mr-2" />
          Active Trains ({trains.length})
        </h2>
        
        {/* Train Grid in 4-4-2 pattern */}
        <div className="space-y-6">
          {gridRows.map((row, rowIndex) => (
            <div key={rowIndex} className="flex justify-center space-x-6">
              {row.map((train) => (
                <div
                  key={train.id}
                  className={`relative w-64 h-32 rounded-xl cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-2xl ${
                    train.warning 
                      ? 'bg-gradient-to-br from-red-900/30 to-red-800/20 border-2 border-red-500' 
                      : 'bg-gradient-to-br from-teal-900/20 to-teal-800/10 border border-teal-500/30'
                  }`}
                  onClick={() => setSelectedTrain(train)}
                >
                  {/* Train ID Badge */}
                  <div className="absolute -top-2 -left-2 bg-teal-500 text-gray-900 font-bold px-3 py-1 rounded-lg">
                    {train.id}
                  </div>
                  
                  {/* Priority Indicator */}
                  {train.priority && (
                    <div className="absolute -top-2 -right-2 bg-yellow-500 text-gray-900 font-bold px-2 py-1 rounded-lg text-xs">
                      PRIORITY
                    </div>
                  )}
                  
                  {/* Status Dot */}
                  <div className="absolute top-2 right-2 flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-1 ${getStatusColor(train.status, train.warning)}`}></div>
                    <div className={`w-2 h-2 rounded-full ${getSignalColor(train.signalAspect)}`}></div>
                  </div>
                  
                  {/* Main Content */}
                  <div className="p-4 h-full flex flex-col justify-center">
                    {/* Speed Display */}
                    <div className="text-center mb-2">
                      <div className="text-3xl font-bold text-teal-300">{train.speed.toFixed(0)}</div>
                      <div className="text-sm text-gray-400">km/h</div>
                    </div>
                    
                    {/* Station Info */}
                    <div className="text-center">
                      <div className="text-sm text-gray-300 font-medium truncate">{train.currentStation}</div>
                      <div className="text-xs text-gray-500 flex items-center justify-center">
                        <Clock size={10} className="mr-1" />
                        ETA: {Math.floor(train.eta)}s
                      </div>
                    </div>
                    
                    {/* Warning Badge */}
                    {train.warning && (
                      <div className="absolute bottom-2 left-0 right-0 flex justify-center">
                        <div className="bg-red-500/80 text-white text-xs px-3 py-1 rounded-full flex items-center">
                          <AlertTriangle size={10} className="mr-1" />
                          SAFETY VIOLATION
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Hover Effect Border */}
                  <div className={`absolute inset-0 rounded-xl border-2 ${
                    selectedTrain?.id === train.id ? 'border-teal-400' : 'border-transparent'
                  } pointer-events-none`}></div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* System Status Dashboard */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4 text-teal-300 flex items-center">
          <Activity className="mr-2" />
          System Status
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* System Metrics */}
          <div className="bg-gray-800 rounded-xl p-4">
            <div className="flex items-center mb-4">
              <Zap className="mr-2 text-teal-400" />
              <h3 className="font-bold">System Metrics</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Avg Speed</span>
                <span className="text-xl font-bold text-teal-300">
                  {Math.round(trains.reduce((sum, t) => sum + t.speed, 0) / trains.length)} km/h
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Moving Trains</span>
                <span className="text-xl font-bold text-green-400">
                  {trains.filter(t => t.status === 'moving').length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Safety Violations</span>
                <span className="text-xl font-bold text-red-400">
                  {trains.filter(t => t.warning).length}
                </span>
              </div>
            </div>
          </div>
          
          {/* Safety Status */}
          <div className="bg-gray-800 rounded-xl p-4">
            <div className="flex items-center mb-4">
              <Shield className="mr-2 text-teal-400" />
              <h3 className="font-bold">Safety Status</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-2 rounded-lg bg-gray-900/50">
                <span>Min Separation</span>
                <span className="font-bold text-teal-300">
                  {Math.min(...trains.map(t => t.distanceToNext))}m
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-gray-900/50">
                <span>Avg Braking Distance</span>
                <span className="font-bold text-yellow-300">
                  {Math.round(trains.reduce((sum, t) => sum + t.brakingDistance, 0) / trains.length)}m
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-gray-900/50">
                <span>Active Signals</span>
                <div className="flex space-x-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" title="Green"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500" title="Yellow"></div>
                  <div className="w-3 h-3 rounded-full bg-red-500" title="Red"></div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Quick Controls */}
          <div className="bg-gray-800 rounded-xl p-4">
            <div className="flex items-center mb-4">
              <Settings className="mr-2 text-teal-400" />
              <h3 className="font-bold">Quick Controls</h3>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button className="bg-teal-600 hover:bg-teal-700 py-2 rounded-lg text-sm">
                  Emergency Stop
                </button>
                <button className="bg-gray-700 hover:bg-gray-600 py-2 rounded-lg text-sm">
                  Reset All
                </button>
              </div>
              <div className="pt-3 border-t border-gray-700">
                <div className="text-sm text-gray-400 mb-2">Update Frequency</div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs">Slow</span>
                  <input
                    type="range"
                    min="100"
                    max="500"
                    step="100"
                    value={updateInterval}
                    onChange={(e) => setUpdateInterval(parseInt(e.target.value))}
                    className="flex-1 accent-teal-500"
                  />
                  <span className="text-xs">Fast</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Speed Chart */}
        <div className="bg-gray-800 rounded-xl p-4">
          <div className="flex items-center mb-4">
            <TrendingUp className="mr-2 text-teal-400" />
            <h3 className="font-bold">System Speed Profile</h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={speedHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="time" 
                  stroke="#9CA3AF"
                  tick={{ fill: '#9CA3AF' }}
                />
                <YAxis 
                  stroke="#9CA3AF"
                  tick={{ fill: '#9CA3AF' }}
                  domain={[MIN_SPEED - 5, MAX_SPEED + 5]}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '0.5rem'
                  }}
                  formatter={(value) => [`${value} km/h`, 'Average Speed']}
                  labelStyle={{ color: '#D1D5DB' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="speed" 
                  stroke="#0D9488" 
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 6, fill: '#0D9488' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Separation Chart */}
        <div className="bg-gray-800 rounded-xl p-4">
          <div className="flex items-center mb-4">
            <Target className="mr-2 text-teal-400" />
            <h3 className="font-bold">Train Separation Monitoring</h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={separationHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="time" 
                  stroke="#9CA3AF"
                  tick={{ fill: '#9CA3AF' }}
                />
                <YAxis 
                  stroke="#9CA3AF"
                  tick={{ fill: '#9CA3AF' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '0.5rem'
                  }}
                  formatter={(value) => [`${value} m`, 'Average Separation']}
                  labelStyle={{ color: '#D1D5DB' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="separation" 
                  stroke="#0D9488" 
                  fill="#0D9488" 
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey={() => SAFE_BUFFER * 2}
                  stroke="#EF4444"
                  strokeDasharray="5 5"
                  strokeWidth={1}
                  dot={false}
                  name="Safety Threshold"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Side Panel for Selected Train */}
      {selectedTrain && (
        <div className="fixed right-0 top-0 h-full w-96 bg-gradient-to-b from-gray-800 to-gray-900 border-l border-teal-500/30 shadow-2xl transform transition-all duration-300 z-50">
          <div className="p-6 h-full overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div className="bg-teal-500 p-2 rounded-lg mr-3">
                  <Train size={24} className="text-gray-900" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Train {selectedTrain.id}</h2>
                  <div className="text-sm text-teal-300">{selectedTrain.currentStation}</div>
                </div>
              </div>
              <button
                onClick={() => setSelectedTrain(null)}
                className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* Warning Banner */}
            {selectedTrain.warning && (
              <div className="bg-gradient-to-r from-red-900/40 to-red-800/20 border-l-4 border-red-500 p-4 rounded-r-lg mb-6">
                <div className="flex items-center">
                  <AlertTriangle className="text-red-400 mr-3" size={24} />
                  <div>
                    <div className="font-bold text-red-300">SAFETY VIOLATION DETECTED</div>
                    <div className="text-sm text-red-200">
                      Distance to next train is {selectedTrain.safetyDistance - selectedTrain.distanceToNext}m below safety threshold
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Status Card */}
            <div className="bg-gray-700/50 rounded-xl p-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-sm text-gray-400 mb-1">Speed</div>
                  <div className="text-3xl font-bold text-teal-300">{selectedTrain.speed} km/h</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-400 mb-1">Acceleration</div>
                  <div className="text-3xl font-bold text-blue-300">{selectedTrain.acceleration.toFixed(2)} m/s²</div>
                </div>
              </div>
              <div className="flex items-center justify-center mt-4 space-x-4">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-2 ${getStatusColor(selectedTrain.status, selectedTrain.warning)}`}></div>
                  <span className="capitalize">{selectedTrain.status}</span>
                </div>
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-2 ${getSignalColor(selectedTrain.signalAspect)}`}></div>
                  <span>Signal: {selectedTrain.signalAspect}</span>
                </div>
              </div>
            </div>

            {/* Safety Calculations */}
            <div className="mb-6">
              <h3 className="font-bold mb-3 text-teal-300 flex items-center">
                <Shield className="mr-2" />
                Safety Calculations
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-700/30 rounded-lg">
                  <span>Distance to Next Train</span>
                  <span className={`font-bold ${selectedTrain.warning ? 'text-red-400' : 'text-green-400'}`}>
                    {selectedTrain.distanceToNext} m
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-700/30 rounded-lg">
                  <span>Braking Distance</span>
                  <span className="font-bold text-yellow-300">{selectedTrain.brakingDistance} m</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-700/30 rounded-lg">
                  <span>Safety Buffer</span>
                  <span className="font-bold text-blue-300">{selectedTrain.buffer.toFixed(0)} m</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-700/30 rounded-lg">
                  <span>Safety Threshold</span>
                  <span className="font-bold text-teal-300">{selectedTrain.safetyDistance} m</span>
                </div>
              </div>
            </div>

            {/* Route Information */}
            <div className="mb-6">
              <h3 className="font-bold mb-3 text-teal-300 flex items-center">
                <MapPin className="mr-2" />
                Route Information
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Current Station</span>
                  <span className="font-bold">{selectedTrain.currentStation}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Next Station</span>
                  <span className="font-bold">{selectedTrain.nextStation}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">ETA to Next Station</span>
                  <span className="font-bold text-teal-300">{Math.floor(selectedTrain.eta)} seconds</span>
                </div>
              </div>
            </div>

            {/* Technical Details */}
            <div className="bg-gray-700/30 rounded-xl p-4">
              <h3 className="font-bold mb-3 text-teal-300">Technical Details</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-gray-400">Condition</div>
                  <div className={`font-bold ${
                    selectedTrain.condition === 'excellent' ? 'text-green-400' :
                    selectedTrain.condition === 'good' ? 'text-blue-400' : 'text-yellow-400'
                  }`}>
                    {selectedTrain.condition.toUpperCase()}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Priority</div>
                  <div className="font-bold text-yellow-400">{selectedTrain.priority ? 'HIGH' : 'NORMAL'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Update Rate</div>
                  <div className="font-bold text-teal-400">{updateInterval}ms</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Simulation Time</div>
                  <div className="font-bold text-gray-300">{simulationTime.toFixed(1)}s</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 pt-6 border-t border-gray-800">
        <div className="flex justify-between items-center text-sm text-gray-500">
          <div>CBTC Simulation System v1.0 • Real-time Monitoring Active</div>
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-teal-500 mr-2"></div>
            Connected • {trains.length} Trains Active
          </div>
        </div>
      </div>
    </div>
  );
}