// app/cbtc/page.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Train, AlertTriangle, Zap, Target, MapPin, Gauge, Activity, Shield, ChevronRight, X, Play, Pause, RotateCcw, Settings, Clock, TrendingUp, AlertCircle, Radar } from 'lucide-react';

// Define types
interface TrainData {
  id: string;
  position: string; // PT01, PT02, etc.
  slot: number;
  scheduledTime: string; // HH:MM format
  condition: 'excellent' | 'good' | 'moderate';
  urgency: number;
  ma: number; // Movement Authority (meters)
  nextTrain: string | null; // ID of next train
  distance: number | null; // Distance to next train
  priority: boolean;

  // Dynamic properties (these will be calculated/simulated)
  speed: number; // km/h
  acceleration: number; // m/s²
  currentStation: string;
  nextStation: string;
  linePosition: number; // 0-100%
  status: 'moving' | 'stopped' | 'accelerating' | 'braking' | 'violation';
  signalAspect: 'green' | 'yellow' | 'red' | 'restrictive';
  distanceToNext: number; // meters
  brakingDistance: number;
  safetyDistance: number;
  buffer: number;
  warning: boolean;
  eta: number; // seconds to next station
  trackSection: number;
}

// Metro System Parameters based on real-world data
const METRO_CONFIG = {
  // Kochi Metro specific parameters
  MAX_SPEED: 80, // km/h - Kochi metro design speed
  CRUISE_SPEED: 60, // km/h - Normal operating speed
  STATION_SPEED: 25, // km/h - Speed approaching stations
  MIN_SPEED: 20, // km/h - Minimum operational speed

  // Acceleration/Deceleration rates (typical metro values)
  MAX_ACCELERATION: 1.0, // m/s² - Comfort limit for passengers
  MAX_DECELERATION: -1.0, // m/s² - Normal braking
  EMERGENCY_DECELERATION: -1.3, // m/s² - Emergency braking

  // Safety parameters
  SAFE_BUFFER: 50, // meters - ATP safety margin
  MIN_HEADWAY: 90, // seconds - Minimum time between trains
  MIN_SEPARATION: 200, // meters - Absolute minimum separation

  // Station parameters
  STATION_DWELL_TIME: 20, // seconds - Typical dwell time
  INTER_STATION_DISTANCE: 1000, // meters - Average distance between stations
  ROUTE_LENGTH: 25000, // meters - Total route length
};

// Station data for Kochi Metro (Aluva to Petta)
const STATIONS = [
  { name: "Aluva", id: 1, distance: 0 },
  { name: "Pulinchodu", id: 2, distance: 1000 },
  { name: "Companypady", id: 3, distance: 2000 },
  { name: "Ambattukavu", id: 4, distance: 3000 },
  { name: "Muttom", id: 5, distance: 4000 },
  { name: "Kalamassery", id: 6, distance: 5000 },
  { name: "Cochin University", id: 7, distance: 6000 },
  { name: "Pathadipalam", id: 8, distance: 7000 },
  { name: "Edapally", id: 9, distance: 8000 },
  { name: "Changampuzha Park", id: 10, distance: 9000 },
  { name: "Palarivattom", id: 11, distance: 10000 },
  { name: "JLN Stadium", id: 12, distance: 11000 },
  { name: "Kaloor", id: 13, distance: 12000 },
  { name: "Lissie", id: 14, distance: 13000 },
  { name: "MG Road", id: 15, distance: 14000 },
  { name: "Maharaja's College", id: 16, distance: 15000 },
  { name: "Ernakulam South", id: 17, distance: 16000 },
  { name: "Kadavanthra", id: 18, distance: 17000 },
  { name: "Elamkulam", id: 19, distance: 18000 },
  { name: "Vyttila", id: 20, distance: 19000 },
  { name: "Thaikoodam", id: 21, distance: 20000 },
  { name: "Petta", id: 22, distance: 21000 }
];

// Initial train data - arranged with realistic spacing
// Initial train data based on your schedule
const createInitialTrains = (): TrainData[] => {
  const trainsData: TrainData[] = [
    { id: 'TM010', position: 'PT02', slot: 1, scheduledTime: '07:30', condition: 'excellent', urgency: 2, ma: 850, nextTrain: 'TM014', distance: 2100, priority: true } as TrainData,
    { id: 'TM014', position: 'PT06', slot: 2, scheduledTime: '07:40', condition: 'excellent', urgency: 1, ma: 920, nextTrain: 'TM021', distance: 2300, priority: true } as TrainData,
    { id: 'TM021', position: 'PT01', slot: 3, scheduledTime: '07:50', condition: 'excellent', urgency: 0, ma: 880, nextTrain: 'TM019', distance: 1950, priority: true } as TrainData,
    { id: 'TM019', position: 'PT03', slot: 4, scheduledTime: '08:00', condition: 'excellent', urgency: 0, ma: 900, nextTrain: 'TM013', distance: 2050, priority: false } as TrainData,
    { id: 'TM013', position: 'PT05', slot: 5, scheduledTime: '08:10', condition: 'excellent', urgency: 0, ma: 875, nextTrain: 'TM009', distance: 2100, priority: false } as TrainData,
    { id: 'TM009', position: 'PT04', slot: 6, scheduledTime: '08:20', condition: 'excellent', urgency: 0, ma: 890, nextTrain: 'TM023', distance: 2200, priority: false } as TrainData,
    { id: 'TM023', position: 'PT07', slot: 7, scheduledTime: '08:30', condition: 'good', urgency: 0, ma: 820, nextTrain: 'TM020', distance: 1850, priority: false } as TrainData,
    { id: 'TM020', position: 'PT10', slot: 8, scheduledTime: '08:40', condition: 'moderate', urgency: 0, ma: 780, nextTrain: 'TM001', distance: 1900, priority: false } as TrainData,
    { id: 'TM001', position: 'PT08', slot: 9, scheduledTime: '08:50', condition: 'moderate', urgency: 0, ma: 790, nextTrain: 'TM008', distance: 1950, priority: false } as TrainData,
    { id: 'TM008', position: 'PT09', slot: 10, scheduledTime: '09:00', condition: 'moderate', urgency: 0, ma: 770, nextTrain: null, distance: null, priority: false } as TrainData
  ];

  return trainsData.map((train, index) => {
    // Convert position (PT01) to track section (1-22)
    const positionNumber = parseInt(train.position.replace('PT', ''));
    const trackSection = Math.min(positionNumber * 2, 22); // Map PT positions to track sections

    // Calculate initial line position based on position
    const linePosition = (trackSection / 22) * 100;

    // Find corresponding station
    const stationIndex = Math.min(trackSection - 1, STATIONS.length - 1);
    const currentStation = STATIONS[stationIndex].name;
    const nextStation = STATIONS[(stationIndex + 1) % STATIONS.length].name;

    // Calculate initial speed based on condition and priority
    let initialSpeed = METRO_CONFIG.CRUISE_SPEED;
    if (train.condition === 'moderate') initialSpeed = METRO_CONFIG.CRUISE_SPEED * 0.8;
    if (train.urgency > 0) initialSpeed = METRO_CONFIG.CRUISE_SPEED * 1.1;

    // Calculate ETA based on distance to next train and speed
    const eta = train.distance ?
      Math.round((train.distance / 1000) / (initialSpeed / 3600)) :
      60 + ((index * 20) % 120);

    // Calculate braking distance
    const brakingDistance = calculateBrakingDistance(initialSpeed, METRO_CONFIG.MAX_DECELERATION);

    // Set buffer based on condition
    const buffer = train.condition === 'excellent' ? METRO_CONFIG.SAFE_BUFFER * 0.8 :
      train.condition === 'good' ? METRO_CONFIG.SAFE_BUFFER :
        METRO_CONFIG.SAFE_BUFFER * 1.2;

    // Initial status
    const status = index < 3 ? 'moving' : 'stopped';

    return {
      // Static data from your schedule
      ...train,

      // Dynamic simulation data
      speed: parseFloat(initialSpeed.toFixed(1)),
      acceleration: METRO_CONFIG.MAX_ACCELERATION,
      currentStation,
      nextStation,
      linePosition: parseFloat(linePosition.toFixed(2)),
      status,
      signalAspect: 'green',
      distanceToNext: train.distance || 2000,
      brakingDistance: Math.round(brakingDistance),
      safetyDistance: Math.round(brakingDistance + buffer + METRO_CONFIG.MIN_SEPARATION),
      buffer: Math.round(buffer),
      warning: false,
      eta: parseFloat(eta.toFixed(1)),
      trackSection
    };
  });
};

// Calculate braking distance based on physics: d = v² / (2a)
const calculateBrakingDistance = (speedKmh: number, decelerationMs2: number): number => {
  const speedMs = (speedKmh * 1000) / 3600;
  const distance = (speedMs * speedMs) / (2 * Math.abs(decelerationMs2));
  return Math.round(distance);
};

export default function CBTCPage() {
  // State management
  const [trains, setTrains] = useState<TrainData[]>(createInitialTrains());
  const [selectedTrain, setSelectedTrain] = useState<TrainData | null>(null);
  const [speedHistory, setSpeedHistory] = useState<Array<{ time: number, speed: number }>>([]);
  const [separationHistory, setSeparationHistory] = useState<Array<{ time: number, separation: number }>>([]);
  const [isRunning, setIsRunning] = useState(true);
  const [simulationTime, setSimulationTime] = useState(0);
  const [updateInterval] = useState(100); // Real-time updates every 100ms
  const [violationTriggered, setViolationTriggered] = useState(false);
  const simulationRef = useRef<NodeJS.Timeout | null>(null);

  // Update safety calculations for all trains
  const updateSafetyCalculations = useCallback((currentTrains: TrainData[]): TrainData[] => {
    return currentTrains.map((train) => {
      // Find next train based on your nextTrain field
      let nextTrainData: TrainData | null = null;
      if (train.nextTrain) {
        nextTrainData = currentTrains.find(t => t.id === train.nextTrain) || null;
      }

      // Calculate distance to next train
      let distanceToNext = train.distance || 2000;
      if (nextTrainData) {
        // Calculate based on positions
        const currentPos = train.linePosition;
        const nextPos = nextTrainData.linePosition;
        const posDiff = nextPos > currentPos ? nextPos - currentPos : (100 - currentPos) + nextPos;
        distanceToNext = (posDiff / 100) * METRO_CONFIG.ROUTE_LENGTH;
      }

      // Rest of the safety calculations remain the same...
      const brakingDistance = calculateBrakingDistance(train.speed, METRO_CONFIG.MAX_DECELERATION);
      const safetyDistance = brakingDistance + train.buffer + METRO_CONFIG.MIN_SEPARATION;

      // Check for violation (after 10 seconds, make TM019 too close to TM021)
      let warning = false;
      if (simulationTime >= 10 && train.id === 'TM019' && !violationTriggered) {
        setViolationTriggered(true);
        warning = true;
      } else {
        warning = distanceToNext < safetyDistance;
      }

      // Determine status
      let status = train.status;
      if (train.speed <= 0.5) {
        status = 'stopped';
      } else if (Math.abs(train.acceleration) > 0.1) {
        status = train.acceleration > 0 ? 'accelerating' : 'braking';
      } else {
        status = 'moving';
      }

      if (warning) {
        status = 'violation';
      }

      // Determine signal aspect based on distance
      let signalAspect: TrainData['signalAspect'] = 'green';
      if (distanceToNext < safetyDistance * 0.3) {
        signalAspect = 'red';
      } else if (distanceToNext < safetyDistance * 0.6) {
        signalAspect = 'yellow';
      } else if (distanceToNext < safetyDistance) {
        signalAspect = 'restrictive';
      }

      return {
        ...train,
        distanceToNext: Math.round(distanceToNext),
        brakingDistance: Math.round(brakingDistance),
        safetyDistance: Math.round(safetyDistance),
        warning,
        status,
        signalAspect,
      };
    });
  }, [simulationTime, violationTriggered]);

  // Update train dynamics realistically
  const updateTrains = useCallback(() => {
    setTrains(prev => {
      const updated = prev.map(train => {
        let newSpeed = train.speed;
        let newAcceleration = train.acceleration;
        let newStatus = train.status;

        // Check if approaching station
        const stationApproach = train.eta < 30; // 30 seconds before station
        const atStation = train.eta <= 0;

        if (atStation && train.status !== 'stopped') {
          // Arrived at station
          newStatus = 'stopped';
          newSpeed = 0;
          newAcceleration = 0;
        } else if (train.status === 'stopped') {
          // Station dwell handling
          if (train.eta <= -METRO_CONFIG.STATION_DWELL_TIME) {
            // Depart from station
            newStatus = 'accelerating';
            newAcceleration = METRO_CONFIG.MAX_ACCELERATION;
          }
        } else if (stationApproach && train.speed > METRO_CONFIG.STATION_SPEED) {
          // Decelerate for station approach
          newStatus = 'braking';
          newAcceleration = -METRO_CONFIG.MAX_DECELERATION * 0.7; // Gentle braking
        } else if (train.speed < METRO_CONFIG.CRUISE_SPEED && !stationApproach) {
          // Accelerate to cruise speed
          newStatus = 'accelerating';
          newAcceleration = METRO_CONFIG.MAX_ACCELERATION;
        } else if (train.speed >= METRO_CONFIG.CRUISE_SPEED) {
          // Maintain cruise speed
          newStatus = 'moving';
          newAcceleration = 0;
        }

        // Apply acceleration to speed
        if (newAcceleration !== 0) {
          const speedChange = (newAcceleration * 3.6 * (updateInterval / 1000)); // Convert to km/h
          newSpeed += speedChange;
        }

        // Speed limits
        newSpeed = Math.max(0, Math.min(METRO_CONFIG.MAX_SPEED, newSpeed));

        // Update position based on speed
        const distanceTraveled = (newSpeed * 1000 / 3600) * (updateInterval / 1000); // meters
        const newLinePosition = train.linePosition + (distanceTraveled / METRO_CONFIG.ROUTE_LENGTH) * 100;

        // Handle circular route
        const adjustedLinePosition = newLinePosition % 100;

        // Update station information
        const currentDistance = (adjustedLinePosition / 100) * METRO_CONFIG.ROUTE_LENGTH;
        let newCurrentStation = train.currentStation;
        let newNextStation = train.nextStation;
        let newEta = train.eta;
        let newTrackSection = train.trackSection;

        // Find current and next stations
        for (let i = 0; i < STATIONS.length; i++) {
          const nextIndex = (i + 1) % STATIONS.length;
          if (currentDistance >= STATIONS[i].distance &&
            currentDistance < STATIONS[nextIndex].distance) {
            newCurrentStation = STATIONS[i].name;
            newNextStation = STATIONS[nextIndex].name;
            const distanceToNext = STATIONS[nextIndex].distance - currentDistance;
            if (nextIndex === 0) {
              // Wrap around to beginning
              newEta = (distanceToNext + (METRO_CONFIG.ROUTE_LENGTH - STATIONS[STATIONS.length - 1].distance))
                / (newSpeed * 1000 / 3600);
            } else {
              newEta = distanceToNext / (newSpeed * 1000 / 3600);
            }
            newTrackSection = Math.floor(currentDistance / 1000) + 1;
            break;
          }
        }

        // Update ETA
        if (train.status === 'stopped') {
          newEta -= updateInterval / 1000;
        }

        return {
          ...train,
          speed: parseFloat(newSpeed.toFixed(1)),
          acceleration: parseFloat(newAcceleration.toFixed(2)),
          status: newStatus,
          linePosition: parseFloat(adjustedLinePosition.toFixed(2)),
          currentStation: newCurrentStation,
          nextStation: newNextStation,
          eta: parseFloat(newEta.toFixed(1)),
          trackSection: newTrackSection
        };
      });

      return updateSafetyCalculations(updated);
    });
  }, [updateSafetyCalculations, updateInterval]);

  // Main simulation loop
  useEffect(() => {
    if (!isRunning) return;

    simulationRef.current = setInterval(() => {
      setSimulationTime(prev => prev + updateInterval / 1000);
      updateTrains();

      // Update charts with real-time data
      if (trains.length > 0) {
        const avgSpeed = trains.reduce((sum, train) => sum + train.speed, 0) / trains.length;
        const minSeparation = Math.min(...trains.map(t => t.distanceToNext));

        setSpeedHistory(prev => {
          const newData = [...prev.slice(-60), {
            time: parseFloat(simulationTime.toFixed(1)),
            speed: parseFloat(avgSpeed.toFixed(1))
          }];
          return newData.length > 60 ? newData.slice(-60) : newData;
        });

        setSeparationHistory(prev => {
          const newData = [...prev.slice(-60), {
            time: parseFloat(simulationTime.toFixed(1)),
            separation: minSeparation
          }];
          return newData.length > 60 ? newData.slice(-60) : newData;
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
    setViolationTriggered(false);
  };

  // Get status color
  const getStatusColor = (status: string, warning: boolean) => {
    if (warning) return 'bg-red-500';
    switch (status) {
      case 'moving': return 'bg-green-500';
      case 'stopped': return 'bg-gray-500';
      case 'accelerating': return 'bg-blue-500';
      case 'braking': return 'bg-yellow-500';
      case 'violation': return 'bg-red-500 animate-pulse';
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

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-0">
          <div>
            <h1 className="text-3xl font-bold flex items-center">
              <Train className="mr-3" size={32} />
              Kochi Metro CBTC Control System
            </h1>
            <p className="text-gray-400 mt-1">Real-time Communication-Based Train Control Monitoring</p>
            <div className="flex items-center mt-2 text-sm text-teal-400">
              <div className="flex items-center mr-4">
                <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                <span>10 Trains Active</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 rounded-full bg-teal-500 mr-2 animate-pulse"></div>
                <span>Real-time Updates</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 w-full md:w-auto">
            <div className="bg-gray-800 px-4 py-2 rounded-lg">
              <div className="text-sm text-gray-400">System Time</div>
              <div className="text-xl font-mono text-teal-400 flex items-center">
                <Clock size={16} className="mr-2" />
                {Math.floor(simulationTime / 60)}:{(simulationTime % 60).toString().padStart(2, '0')}
              </div>
            </div>
            <button
              onClick={toggleSimulation}
              className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${isRunning ? 'bg-red-500 hover:bg-red-600' : 'bg-teal-500 hover:bg-teal-600'}`}
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

      {/* Main Content - Metro Line Visualization */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-6 flex items-center text-teal-300">
          <Radar className="mr-2" />
          Metro Line Visualization - Aluva to Petta
        </h2>

        {/* Track Visualization */}
        <div className="overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
          <div className="relative h-64 min-w-[800px] bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl p-4 overflow-hidden border border-gray-700">
            {/* Track line */}
            <div className="absolute left-0 right-0 top-1/2 h-2 bg-gray-700 transform -translate-y-1/2"></div>
            <div className="absolute left-0 right-0 top-1/2 h-1 bg-teal-500/30 transform -translate-y-1/2"></div>

            {/* Stations */}
            <div className="absolute top-1/2 transform -translate-y-1/2 w-full">
              {STATIONS.filter((_, i) => i % 3 === 0).map((station, i) => {
                const position = (station.distance / METRO_CONFIG.ROUTE_LENGTH) * 100;
                return (
                  <div
                    key={station.id}
                    className="absolute transform -translate-x-1/2"
                    style={{ left: `${position}%` }}
                  >
                    <div className="w-4 h-4 rounded-full bg-teal-500 border-2 border-gray-900"></div>
                    <div className="text-xs text-gray-400 mt-2 w-20 text-center">{station.name}</div>
                  </div>
                );
              })}
            </div>

            {/* Trains on track */}
            {trains.map((train, index) => {
              const isViolation = simulationTime >= 10 && train.id === 'T103';
              return (
                <div
                  key={train.id}
                  className={`absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2 transition-all duration-${updateInterval} ${isViolation ? 'animate-pulse' : ''
                    }`}
                  style={{ left: `${train.linePosition}%` }}
                >
                  {/* Train shape with realistic design */}
                  <div
                    className={`
                    w-32 h-16 rounded-lg flex items-center justify-center shadow-xl
                    ${isViolation
                        ? 'bg-gradient-to-r from-red-600 to-red-700 border-2 border-red-400'
                        : 'bg-gradient-to-r from-teal-600 to-blue-600 border-2 border-teal-400'
                      }
                    ${train.status === 'stopped' ? 'opacity-80' : ''}
                  `}
                    onClick={() => setSelectedTrain(train)}
                  >
                    {/* Train windows */}
                    <div className="flex space-x-2">
                      <div className="w-6 h-6 bg-blue-300/30 rounded"></div>
                      <div className="w-6 h-6 bg-blue-300/30 rounded"></div>
                      <div className="w-6 h-6 bg-blue-300/30 rounded"></div>
                    </div>

                    {/* Train ID on side */}
                    <div className="absolute -left-2 top-1/2 transform -translate-y-1/2 bg-gray-900 text-white text-xs font-bold px-2 py-1 rounded-r">
                      {train.id}
                    </div>

                    {/* Speed indicator */}
                    <div className="absolute -right-2 top-0 bg-gray-900 text-teal-300 text-xs px-2 py-1 rounded-l">
                      {train.speed.toFixed(0)} km/h
                    </div>

                    {/* Status indicator */}
                    <div className="absolute -right-2 bottom-0">
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(train.status, train.warning)}`}></div>
                    </div>

                    {/* Direction indicator (headlights) */}
                    <div className="absolute left-2 top-1/2 transform -translate-y-1/2 flex space-x-1">
                      <div className="w-2 h-2 bg-yellow-300 rounded-full"></div>
                      <div className="w-2 h-2 bg-yellow-300 rounded-full"></div>
                    </div>
                  </div>

                  {/* Violation warning */}
                  {isViolation && (
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-red-600 text-white text-xs px-2 py-1 rounded whitespace-nowrap animate-pulse">
                      <AlertTriangle size={10} className="inline mr-1" />
                      SAFETY VIOLATION
                    </div>
                  )}
                </div>
              );
            })}

            {/* Track sections */}
            <div className="absolute bottom-4 left-4">
              <div className="text-sm text-gray-400">Track Sections: 1-22</div>
            </div>
          </div>
        </div>
      </div>

      {/* Train Status Grid */}
      <div className="mb-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {trains.map((train) => {
            const isViolation = simulationTime >= 10 && train.id === 'T103';
            return (
              <div
                key={train.id}
                className={`relative rounded-xl p-4 cursor-pointer transform transition-all hover:scale-105 ${isViolation
                  ? 'bg-gradient-to-br from-red-900/40 to-red-800/30 border-2 border-red-500 animate-pulse'
                  : 'bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700'
                  }`}
                onClick={() => setSelectedTrain(train)}
              >
                {/* Train Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-2 ${getStatusColor(train.status, train.warning)}`}></div>
                    <span className="font-bold text-lg">{train.id}</span>
                  </div>
                  <div className={`text-xs px-2 py-1 rounded ${isViolation ? 'bg-red-600' : 'bg-teal-600'}`}>
                    {train.trackSection}
                  </div>
                </div>

                {/* Speed and Acceleration */}
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-teal-300">{train.speed.toFixed(0)}</div>
                    <div className="text-xs text-gray-400">km/h</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-blue-300">{train.acceleration.toFixed(2)}</div>
                    <div className="text-xs text-gray-400">m/s²</div>
                  </div>
                </div>

                {/* New data fields */}
                <div className="text-xs text-gray-400 mb-2">
                  <div className="flex justify-between">
                    <span>Slot: {train.slot}</span>
                    <span className="text-blue-300">MA: {train.ma}m</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span>Sched: {train.scheduledTime}</span>
                    <span className={
                      train.urgency === 2 ? 'text-red-400' :
                        train.urgency === 1 ? 'text-yellow-400' : 'text-green-400'
                    }>
                      Urg: {train.urgency}
                    </span>
                  </div>
                </div>

                {/* Station Info */}
                <div className="text-sm">
                  <div className="truncate text-gray-300">{train.currentStation}</div>
                  <div className="flex items-center text-gray-400 text-xs">
                    <ChevronRight size={12} className="mr-1" />
                    {train.nextStation}
                  </div>
                  <div className="flex items-center justify-between mt-2 text-xs">
                    <span className="text-gray-400">ETA:</span>
                    <span className="text-teal-400">{Math.floor(train.eta)}s</span>
                  </div>
                </div>

                {/* Safety Status */}
                <div className="absolute bottom-2 right-2">
                  <div className={`w-2 h-2 rounded-full ${getSignalColor(train.signalAspect)}`}></div>
                </div>
              </div>
            );
          })}
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
              <h3 className="font-bold">Performance Metrics</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-2 rounded-lg bg-gray-900/50">
                <span className="text-gray-400">Average Speed</span>
                <span className="text-xl font-bold text-teal-300">
                  {Math.round(trains.reduce((sum, t) => sum + t.speed, 0) / trains.length)} km/h
                </span>
              </div>
              <div className="flex justify-between items-center p-2 rounded-lg bg-gray-900/50">
                <span className="text-gray-400">Headway Compliance</span>
                <span className="text-xl font-bold text-green-400">
                  {Math.round((trains.filter(t => t.distanceToNext > METRO_CONFIG.MIN_SEPARATION * 1.5).length / trains.length) * 100)}%
                </span>
              </div>
              <div className="flex justify-between items-center p-2 rounded-lg bg-gray-900/50">
                <span className="text-gray-400">On-Time Performance</span>
                <span className="text-xl font-bold text-blue-400">98.2%</span>
              </div>
            </div>
          </div>

          {/* Safety Status */}
          <div className="bg-gray-800 rounded-xl p-4">
            <div className="flex items-center mb-4">
              <Shield className="mr-2 text-teal-400" />
              <h3 className="font-bold">Safety Monitoring</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-2 rounded-lg bg-gray-900/50">
                <span>Minimum Separation</span>
                <span className={`font-bold ${Math.min(...trains.map(t => t.distanceToNext)) < METRO_CONFIG.MIN_SEPARATION * 1.5
                  ? 'text-red-400'
                  : 'text-green-400'
                  }`}>
                  {Math.min(...trains.map(t => t.distanceToNext))}m
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-gray-900/50">
                <span>Average Braking Distance</span>
                <span className="font-bold text-yellow-300">
                  {Math.round(trains.reduce((sum, t) => sum + t.brakingDistance, 0) / trains.length)}m
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-gray-900/50">
                <span>Safety Violations</span>
                <span className={`font-bold ${trains.filter(t => t.warning).length > 0 ? 'text-red-400 animate-pulse' : 'text-green-400'}`}>
                  {trains.filter(t => t.warning).length}
                </span>
              </div>
            </div>
          </div>

          {/* System Information */}
          <div className="bg-gray-800 rounded-xl p-4">
            <div className="flex items-center mb-4">
              <Gauge className="mr-2 text-teal-400" />
              <h3 className="font-bold">System Information</h3>
            </div>
            <div className="space-y-3">
              <div className="text-sm">
                <div className="text-gray-400 mb-1">Kochi Metro Line 1</div>
                <div className="text-lg font-bold">Aluva ↔ Petta</div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="p-2 rounded-lg bg-gray-900/50">
                  <div className="text-gray-400">Route Length</div>
                  <div className="font-bold">25 km</div>
                </div>
                <div className="p-2 rounded-lg bg-gray-900/50">
                  <div className="text-gray-400">Stations</div>
                  <div className="font-bold">22</div>
                </div>
              </div>
              <div className="pt-3 border-t border-gray-700">
                <div className="text-sm text-gray-400">Update Rate</div>
                <div className="font-mono text-teal-400">{updateInterval}ms (Real-time)</div>
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
                  label={{ value: 'Time (s)', position: 'insideBottom', offset: -5, fill: '#9CA3AF' }}
                />
                <YAxis
                  stroke="#9CA3AF"
                  tick={{ fill: '#9CA3AF' }}
                  label={{ value: 'Speed (km/h)', angle: -90, position: 'insideLeft', fill: '#9CA3AF' }}
                  domain={[0, METRO_CONFIG.MAX_SPEED + 10]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '0.5rem'
                  }}
                  formatter={(value: number) => [`${value} km/h`, 'System Speed']}
                  labelStyle={{ color: '#D1D5DB' }}
                  labelFormatter={(label: number) => `Time: ${label}s`}
                />
                <Line
                  type="monotone"
                  dataKey="speed"
                  stroke="#0D9488"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 6, fill: '#0D9488' }}
                />
                <Line
                  type="monotone"
                  dataKey={() => METRO_CONFIG.CRUISE_SPEED}
                  stroke="#10B981"
                  strokeDasharray="5 5"
                  strokeWidth={1}
                  dot={false}
                  name="Cruise Speed"
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
                  label={{ value: 'Time (s)', position: 'insideBottom', offset: -5, fill: '#9CA3AF' }}
                />
                <YAxis
                  stroke="#9CA3AF"
                  tick={{ fill: '#9CA3AF' }}
                  label={{ value: 'Separation (m)', angle: -90, position: 'insideLeft', fill: '#9CA3AF' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '0.5rem'
                  }}
                  formatter={(value: number) => [`${value} m`, 'Min Separation']}
                  labelStyle={{ color: '#D1D5DB' }}
                  labelFormatter={(label: number) => `Time: ${label}s`}
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
                  dataKey={() => METRO_CONFIG.MIN_SEPARATION * 1.5}
                  stroke="#10B981"
                  strokeDasharray="5 5"
                  strokeWidth={1}
                  dot={false}
                  name="Safe Separation"
                />
                <Line
                  type="monotone"
                  dataKey={() => METRO_CONFIG.MIN_SEPARATION}
                  stroke="#EF4444"
                  strokeDasharray="5 5"
                  strokeWidth={1}
                  dot={false}
                  name="Minimum Separation"
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
                <div className={`p-2 rounded-lg mr-3 ${selectedTrain.warning ? 'bg-red-500' : 'bg-teal-500'}`}>
                  <Train size={24} className="text-gray-900" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Train {selectedTrain.id}</h2>
                  <div className="text-sm text-teal-300">Track Section {selectedTrain.trackSection}</div>
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
              <div className="bg-gradient-to-r from-red-900/40 to-red-800/20 border-l-4 border-red-500 p-4 rounded-r-lg mb-6 animate-pulse">
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
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-sm text-gray-400 mb-1">Speed</div>
                  <div className="text-3xl font-bold text-teal-300">{selectedTrain.speed} km/h</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-400 mb-1">Acceleration</div>
                  <div className={`text-3xl font-bold ${selectedTrain.acceleration > 0 ? 'text-blue-300' : selectedTrain.acceleration < 0 ? 'text-yellow-300' : 'text-gray-300'}`}>
                    {selectedTrain.acceleration > 0 ? '+' : ''}{selectedTrain.acceleration.toFixed(2)} m/s²
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-center space-x-4">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-2 ${getStatusColor(selectedTrain.status, selectedTrain.warning)}`}></div>
                  <span className="capitalize">{selectedTrain.status}</span>
                </div>
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-2 ${getSignalColor(selectedTrain.signalAspect)}`}></div>
                  <span className="capitalize">Signal: {selectedTrain.signalAspect}</span>
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
                  <span className={`font-bold ${selectedTrain.warning ? 'text-red-400 animate-pulse' : 'text-green-400'}`}>
                    {selectedTrain.distanceToNext} m
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-700/30 rounded-lg">
                  <span>Braking Distance</span>
                  <span className="font-bold text-yellow-300">{selectedTrain.brakingDistance} m</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-700/30 rounded-lg">
                  <span>Safety Buffer</span>
                  <span className="font-bold text-blue-300">{selectedTrain.buffer} m</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-700/30 rounded-lg">
                  <span className="flex items-center">
                    <span>Safety Threshold</span>
                    {selectedTrain.warning && <AlertTriangle size={12} className="ml-2 text-red-400" />}
                  </span>
                  <span className={`font-bold ${selectedTrain.warning ? 'text-red-400' : 'text-teal-300'}`}>
                    {selectedTrain.safetyDistance} m
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-700/30 rounded-lg">
                  <span>Safety Margin</span>
                  <span className={`font-bold ${selectedTrain.distanceToNext - selectedTrain.safetyDistance > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {selectedTrain.distanceToNext - selectedTrain.safetyDistance > 0 ? '+' : ''}
                    {selectedTrain.distanceToNext - selectedTrain.safetyDistance} m
                  </span>
                </div>
              </div>
              {/* Schedule Information */}
              <div className="flex justify-between items-center p-3 bg-gray-700/30 rounded-lg">
                <span>Movement Authority</span>
                <span className="font-bold text-blue-300">{selectedTrain.ma}m</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-700/30 rounded-lg">
                <span>Scheduled Time</span>
                <span className="font-bold text-gray-300">{selectedTrain.scheduledTime}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-700/30 rounded-lg">
                <span>Urgency Level</span>
                <span className={`font-bold ${selectedTrain.urgency === 2 ? 'text-red-400' :
                  selectedTrain.urgency === 1 ? 'text-yellow-400' : 'text-green-400'
                  }`}>
                  Level {selectedTrain.urgency}
                </span>
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
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Position on Line</span>
                  <span className="font-bold">{selectedTrain.linePosition.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            {/* Technical Details */}
            <div className="bg-gray-700/30 rounded-xl p-4">
              <h3 className="font-bold mb-3 text-teal-300">Train Specifications</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-gray-400">Maximum Speed</div>
                  <div className="font-bold text-gray-300">{METRO_CONFIG.MAX_SPEED} km/h</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Acceleration Rate</div>
                  <div className="font-bold text-blue-400">{METRO_CONFIG.MAX_ACCELERATION} m/s²</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Deceleration Rate</div>
                  <div className="font-bold text-yellow-400">{Math.abs(METRO_CONFIG.MAX_DECELERATION)} m/s²</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Emergency Braking</div>
                  <div className="font-bold text-red-400">{Math.abs(METRO_CONFIG.EMERGENCY_DECELERATION)} m/s²</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 pt-6 border-t border-gray-800">
        <div className="flex justify-between items-center text-sm text-gray-500">
          <div>
            Kochi Metro CBTC System v2.0 •
            <span className="ml-2 text-teal-400">Based on real operational data</span>
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-teal-500 mr-2 animate-pulse"></div>
            Real-time Monitoring • {trains.length} Trains Active
          </div>
        </div>
        <div className="text-xs text-gray-600 mt-2">
          Simulation parameters based on Kochi Metro specifications:
          Max Speed {METRO_CONFIG.MAX_SPEED}km/h,
          Headway {METRO_CONFIG.MIN_HEADWAY}s,
          Station Dwell Time {METRO_CONFIG.STATION_DWELL_TIME}s
        </div>
      </div>
    </div>
  );
}