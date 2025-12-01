"use client";
import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in Leaflet with Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom train icon
const trainIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="6" width="16" height="8" rx="2" fill="#10b981" stroke="#1e293b" stroke-width="1"/>
      <rect x="4" y="3" width="12" height="3" fill="#10b981" stroke="#1e293b" stroke-width="1"/>
      <circle cx="6" cy="14" r="2" fill="#374151"/>
      <circle cx="14" cy="14" r="2" fill="#374151"/>
    </svg>
  `),
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -10],
});

const delayedTrainIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="6" width="16" height="8" rx="2" fill="#f43f5e" stroke="#1e293b" stroke-width="1"/>
      <rect x="4" y="3" width="12" height="3" fill="#f43f5e" stroke="#1e293b" stroke-width="1"/>
      <circle cx="6" cy="14" r="2" fill="#374151"/>
      <circle cx="14" cy="14" r="2" fill="#374151"/>
    </svg>
  `),
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -10],
});

// Custom station icon
const createStationIcon = (isActive: boolean, isTerminal: boolean) => {
  const color = isActive ? '#2dd4bf' : '#64748b';
  const border = isTerminal ? '#f59e0b' : '#1e293b';
  
  return new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,' + btoa(`
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" fill="${color}" stroke="${border}" stroke-width="${isTerminal ? '3' : '2'}"/>
        ${isActive ? `
          <circle cx="12" cy="12" r="14" fill="${color}" opacity="0.3">
            <animate attributeName="r" values="14;18;14" dur="2s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.3;0.1;0.3" dur="2s" repeatCount="indefinite"/>
          </circle>
        ` : ''}
      </svg>
    `),
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
};

interface StationEvent {
  station: string;
  scheduled_arrival: string;
  expected_arrival: string;
  delay_minutes: number;
  delay_reasons: string[];
  delay_probability?: number | null;
  direction: string;
  rotation: number;
  sequence: number;
  next_station_duration: number;
  cumulative_time: number;
  significant_delay: boolean;
}

interface DelayAnalysis {
  base_trip_time: number;
  total_trip_time: number;
  total_delay: number;
  delay_breakdown: {
    job_cards: number;
    maintenance: number;
    weather: number;
  };
  delay_reasons: string[];
}

interface TrainSchedule {
  train_id: string;
  departure_time: string;
  departure_slot: number;
  readiness: number;
  station_events: StationEvent[];
  delay_analysis: DelayAnalysis;
  train_config: {
    job_cards_count: number;
    high_critical_jobs: number;
    maintenance_status: string;
    total_mileage: number;
  };
  total_rotations: number;
  first_departure: string;
  last_arrival: string;
}

interface RotationData {
  service_date: string;
  weather_conditions: any;
  total_trains: number;
  base_trip_time: number;
  train_schedules: TrainSchedule[];
  stations: string[];
  station_timings: any[];
  summary: {
    total_events: number;
    delayed_events: number;
    significant_delays: number;
    max_delay: number;
    avg_delay: number;
  };
  service_hours: {
    start: string;
    end: string;
  };
}
// Convert degree-minute-second coordinates to decimal degrees
const dmsToDecimal = (degrees: number, minutes: number, seconds: number, direction: 'N' | 'S' | 'E' | 'W') => {
  let decimal = degrees + minutes / 60 + seconds / 3600;
  if (direction === 'S' || direction === 'W') {
    decimal = -decimal;
  }
  return decimal;
};

// Kochi Metro stations with actual geographic coordinates
// Kochi Metro stations with actual geographic coordinates (updated with exact DMS coordinates)
const kochiMetroStations = [
  { id: 'aluva', name: 'Aluva', position: [dmsToDecimal(10, 6, 35, 'N'), dmsToDecimal(76, 20, 59, 'E')] as [number, number], isTerminal: true },
  { id: 'pulinchodu', name: 'Pulinchodu', position: [dmsToDecimal(10, 5, 42, 'N'), dmsToDecimal(76, 20, 48, 'E')] as [number, number] },
  { id: 'companypady', name: 'Companypady', position: [dmsToDecimal(10, 5, 14, 'N'), dmsToDecimal(76, 20, 34, 'E')] as [number, number] },
  { id: 'ambattukavu', name: 'Ambattukavu', position: [dmsToDecimal(10, 4, 46, 'N'), dmsToDecimal(76, 20, 20, 'E')] as [number, number] },
  { id: 'muttom', name: 'Muttom', position: [dmsToDecimal(10, 4, 22, 'N'), dmsToDecimal(76, 20, 1, 'E')] as [number, number] },
  { id: 'kalamassery', name: 'Kalamassery', position: [dmsToDecimal(10, 3, 30, 'N'), dmsToDecimal(76, 19, 19, 'E')] as [number, number] },
  { id: 'cochin-university', name: 'Cochin University', position: [dmsToDecimal(10, 2, 49, 'N'), dmsToDecimal(76, 19, 6, 'E')] as [number, number] },
  { id: 'pathadipalam', name: 'Pathadipalam', position: [dmsToDecimal(10, 2, 9, 'N'), dmsToDecimal(76, 18, 52, 'E')] as [number, number] },
  { id: 'edapally', name: 'Edapally', position: [dmsToDecimal(10, 1, 36, 'N'), dmsToDecimal(76, 18, 33, 'E')] as [number, number] },
  { id: 'changampuzha-park', name: 'Changampuzha Park', position: [dmsToDecimal(10, 0, 55, 'N'), dmsToDecimal(76, 18, 8, 'E')] as [number, number] },
  { id: 'palarivattom', name: 'Palarivattom', position: [dmsToDecimal(10, 0, 32, 'N'), dmsToDecimal(76, 18, 14, 'E')] as [number, number] },
  { id: 'jln-stadium', name: 'JLN Stadium', position: [dmsToDecimal(10, 0, 2, 'N'), dmsToDecimal(76, 17, 56, 'E')] as [number, number] },
  { id: 'kaloor', name: 'Kaloor', position: [dmsToDecimal(9, 59, 41, 'N'), dmsToDecimal(76, 17, 30, 'E')] as [number, number] },
  { id: 'town-hall', name: 'Town Hall', position: [dmsToDecimal(9, 59, 28, 'N'), dmsToDecimal(76, 17, 17, 'E')] as [number, number] },
  { id: 'mg-road', name: 'MG Road', position: [dmsToDecimal(9, 59, 3, 'N'), dmsToDecimal(76, 16, 55, 'E')] as [number, number] },
  { id: 'maharajas', name: `Maharaja's College`, position: [dmsToDecimal(9, 58, 24, 'N'), dmsToDecimal(76, 17, 6, 'E')] as [number, number] },
  { id: 'ernakulam-south', name: 'Ernakulam South', position: [dmsToDecimal(9, 58, 4, 'N'), dmsToDecimal(76, 17, 29, 'E')] as [number, number] },
  { id: 'kadavanthra', name: 'Kadavanthra', position: [dmsToDecimal(9, 57, 60, 'N'), dmsToDecimal(76, 17, 54, 'E')] as [number, number] },
  { id: 'elamkulam', name: 'Elamkulam', position: [dmsToDecimal(9, 58, 1, 'N'), dmsToDecimal(76, 18, 30, 'E')] as [number, number] },
  { id: 'vytilla', name: 'Vyttila', position: [dmsToDecimal(9, 58, 3, 'N'), dmsToDecimal(76, 19, 14, 'E')] as [number, number] },
  { id: 'thykoodam', name: 'Thykoodam', position: [dmsToDecimal(9, 57, 36, 'N'), dmsToDecimal(76, 19, 25, 'E')] as [number, number] },
  { id: 'pettah', name: 'Pettah', position: [dmsToDecimal(9, 57, 4, 'N'), dmsToDecimal(76, 19, 52, 'E')] as [number, number], isTerminal: true }
];

// Kakkanad extension line stations (pink line)
const kakkanadExtensionStations = [
  { 
    id: 'palarivattom-junction', 
    name: 'Palarivattom Junction', 
    position: [dmsToDecimal(10, 0, 10.09, 'N'), dmsToDecimal(76, 18, 24.48, 'E')] as [number, number] 
  },
  { 
    id: 'palarivattom-bypass', 
    name: 'Palarivattom Bypass', 
    position: [dmsToDecimal(10, 0, 18.27, 'N'), dmsToDecimal(76, 18, 46.81, 'E')] as [number, number] 
  },
  { 
    id: 'chempumukku', 
    name: 'Chempumukku', 
    position: [dmsToDecimal(10, 0, 39.08, 'N'), dmsToDecimal(76, 19, 15.28, 'E')] as [number, number] 
  },
  { 
    id: 'vazhakkala', 
    name: 'Vazhakkala', 
    position: [dmsToDecimal(10, 0, 45.46, 'N'), dmsToDecimal(76, 19, 39.99, 'E')] as [number, number] 
  },
  { 
    id: 'padamugal', 
    name: 'Padamugal', 
    position: [dmsToDecimal(10, 0, 51.03, 'N'), dmsToDecimal(76, 20, 0.03, 'E')] as [number, number] 
  },
  { 
    id: 'kakkanad-junction', 
    name: 'Kakkanad Junction', 
    position: [dmsToDecimal(10, 0, 50.51, 'N'), dmsToDecimal(76, 20, 30.06, 'E')] as [number, number] 
  },
  { 
    id: 'cochin-sez', 
    name: 'Cochin SEZ', 
    position: [dmsToDecimal(10, 0, 20.12, 'N'), dmsToDecimal(76, 20, 44.00, 'E')] as [number, number] 
  },
  { 
    id: 'chittethukara', 
    name: 'Chittethukara', 
    position: [dmsToDecimal(9, 59, 51.09, 'N'), dmsToDecimal(76, 21, 3.26, 'E')] as [number, number] 
  },
  { 
    id: 'rajagiri', 
    name: 'Rajagiri', 
    position: [dmsToDecimal(10, 0, 0.96, 'N'), dmsToDecimal(76, 21, 36.20, 'E')] as [number, number] 
  },
  { 
    id: 'infopark-1', 
    name: 'Infopark 1', 
    position: [dmsToDecimal(10, 0, 36.75, 'N'), dmsToDecimal(76, 21, 51.47, 'E')] as [number, number],
    isTerminal: true 
  }
];

// Airport extension line stations (yellow line)
const airportExtensionStations = [
  { id: 'aluva', name: 'Aluva', position: [10.1078, 76.3507] as [number, number] },
  { id: 'bank_junction', name: 'Bank Junction', position: [10.1095, 76.3585] as [number, number] },
  { id: 'pulinchodu', name: 'Pulinchodu', position: [10.1150, 76.3725] as [number, number] },
  { id: 'chalekkavattom', name: 'Chalekkavattom', position: [10.1250, 76.3840] as [number, number] },
  { id: 'akaparambu', name: 'Akaparambu (Aleena)', position: [10.1350, 76.3938] as [number, number] },
  { id: 'kariyad', name: 'Kariyad', position: [10.1445, 76.4015] as [number, number] },
  { id: 'cial_t1', name: 'CIAL Airport (T1)', position: [10.1538, 76.4070] as [number, number] },
  { id: 'cial_t3', name: 'CIAL Airport (T3)', position: [10.1575, 76.4050] as [number, number] },
  { id: 'cial_cargo', name: 'CIAL Cargo / SEZ', position: [10.1605, 76.4010] as [number, number] },
  { id: 'nayathode', name: 'Nayathode', position: [10.1700, 76.3950] as [number, number] },
  { id: 'manjapra', name: 'Manjapra Road', position: [10.1745, 76.3885] as [number, number] },
  { id: 'angamaly_rs', name: 'Angamaly Railway', position: [10.1849, 76.3753] as [number, number] },
  { id: 'angamaly_town', name: 'Angamaly Town', position: [10.1855, 76.3720] as [number, number] },
  { id: 'mc_road_junct', name: 'MC Road Junction', position: [10.1830, 76.3700] as [number, number] },
  { id: 'nh_ext_terminal', name: 'NH-544 / Thrissur ext', position: [10.1900, 76.3660] as [number, number], isTerminal: true }
];

// NEW: Leaflet Metro Map Component
const MetroMap: React.FC<{ rotationData: RotationData; onStationSelect: (stationId: string | null) => void }> = ({ rotationData, onStationSelect }) => {
  const [selectedStation, setSelectedStation] = useState<string | null>(null);
  const [showTrains, setShowTrains] = useState(true);
  const [selectedLine, setSelectedLine] = useState<'all' | 'main' | 'kakkanad' | 'airport'>('all');

  // Generate metro line coordinates
  const metroLine = kochiMetroStations.map(station => station.position);
  const kakkanadLine = kakkanadExtensionStations.map(station => station.position);
  const airportLine = airportExtensionStations.map(station => station.position);

  // Simulate train positions based on rotation data
  const getTrainPositions = () => {
    return rotationData.train_schedules.slice(0, 6).map((train, index) => {
      const progress = (index * 20) + 10;
      const stationIndex = Math.floor(progress / 8) % kochiMetroStations.length;
      const station = kochiMetroStations[stationIndex];
      
      // Add some random offset to make trains visible
      const offsetLat = station.position[0] + (Math.random() * 0.002 - 0.001);
      const offsetLng = station.position[1] + (Math.random() * 0.002 - 0.001);
      
      return {
        id: train.train_id,
        position: [offsetLat, offsetLng] as [number, number],
        status: train.delay_analysis?.total_delay > 2 ? 'delayed' : 'on_time',
        delay: train.delay_analysis?.total_delay || 0,
        currentStation: station.name
      };
    });
  };

  const getStationStatus = (stationName: string) => {
    const hasRecentEvents = rotationData.train_schedules.some(train =>
      train.station_events.some(event =>
        event.station.toLowerCase().includes(stationName.toLowerCase().split(' ')[0]) &&
        Math.abs(event.delay_minutes) < 15
      )
    );
    return hasRecentEvents ? 'active' : 'inactive';
  };

  // Auto-fit map to show all stations with horizontal emphasis
  const MapController = () => {
    const map = useMap();
    useEffect(() => {
      // Combine all lines for bounds calculation
      const allStations = [...metroLine, ...kakkanadLine, ...airportLine];
      const bounds = L.latLngBounds(allStations);
      
      map.fitBounds(bounds, { 
        padding: [10, 20] 
      });
    }, [map]);
    return null;
  };

  const handleStationClick = (stationId: string) => {
    setSelectedStation(stationId);
    onStationSelect(stationId);
  };

  return (
    <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 rounded-2xl p-6 shadow-xl h-full max-h-[600px] lg:max-h-[700px]">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold bg-gradient-to-r from-teal-400 to-emerald-500 bg-clip-text text-transparent flex items-center gap-3">
          <span className="p-2 bg-gradient-to-r from-teal-500 to-emerald-500 rounded-lg">🗺️</span>
          Kochi Metro Live Map
        </h3>
        <div className="flex gap-2">
          {/* Line Selector Buttons */}
          <div className="flex gap-2">
            {[
              { key: 'all', label: 'All Lines', color: 'teal' },
              { key: 'main', label: 'Main Line', color: 'teal' },
              { key: 'kakkanad', label: 'Kakkanad', color: 'pink' },
              { key: 'airport', label: 'Airport', color: 'yellow' }
            ].map(line => (
              <button
                key={line.key}
                onClick={() => setSelectedLine(line.key as any)}
                className={`px-3 py-2 text-sm rounded-lg border transition ${
                  selectedLine === line.key
                    ? line.key === 'all' 
                      ? 'bg-teal-500/20 border-teal-500 text-teal-300'
                      : line.key === 'main'
                      ? 'bg-teal-500/20 border-teal-500 text-teal-300'
                      : line.key === 'kakkanad'
                      ? 'bg-pink-500/20 border-pink-500 text-pink-300'
                      : 'bg-yellow-500/20 border-yellow-500 text-yellow-300'
                    : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:border-teal-500/50'
                }`}
              >
                {line.label}
              </button>
            ))}
          </div>
          
          <button 
            onClick={() => setShowTrains(!showTrains)}
            className={`px-4 py-2 text-sm rounded-lg border transition-all ${
              showTrains 
                ? 'bg-teal-500/20 border-teal-500 text-teal-300' 
                : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:border-teal-500/50'
            }`}
          >
            {showTrains ? '🚆 Trains: On' : '🚆 Trains: Off'}
          </button>
        </div>
      </div>

      <div className="relative bg-gradient-to-br from-slate-900/80 to-slate-800/80 rounded-xl p-4 border border-slate-600/30 h-[400px] lg:h-[700px]">
        {/* Leaflet Map Container - WIDER Layout */}
        <div className="h-full rounded-lg overflow-hidden">
          <MapContainer
            center={[10.0160, 76.2990]}
            zoom={11}
            style={{ height: '100%', width: '100%' }}
            className="rounded-lg"
            zoomControl={true}
          >
            <MapController />
            {/* Light theme tile layer - WHITE BACKGROUND MAP */}
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            
            {/* Main Metro Line - Teal */}
            <Polyline
              positions={metroLine}
              color="#2dd4bf"
              weight={selectedLine === 'main' || selectedLine === 'all' ? 8 : 4}
              opacity={selectedLine === 'main' || selectedLine === 'all' ? 0.9 : 0.3}
              smoothFactor={1}
              eventHandlers={{
                click: () => setSelectedLine('main')
              }}
            />
            
            {/* Kakkanad Extension Line - Pink */}
            <Polyline
              positions={kakkanadLine}
              color="#ec4899"
              weight={selectedLine === 'kakkanad' || selectedLine === 'all' ? 6 : 4}
              opacity={selectedLine === 'kakkanad' || selectedLine === 'all' ? 0.9 : 0.3}
              smoothFactor={1}
              eventHandlers={{
                click: () => setSelectedLine('kakkanad')
              }}
            />
            
            {/* Airport Extension Line - Yellow */}
            <Polyline
              positions={airportLine}
              color="#eab308"
              weight={selectedLine === 'airport' || selectedLine === 'all' ? 6 : 4}
              opacity={selectedLine === 'airport' || selectedLine === 'all' ? 0.9 : 0.3}
              smoothFactor={1}
              eventHandlers={{
                click: () => setSelectedLine('airport')
              }}
            />
            
            {/* Main Line Stations */}
            {(selectedLine === 'all' || selectedLine === 'main') && kochiMetroStations.map(station => {
              const status = getStationStatus(station.name);
              const isActive = status === 'active';
              
              return (
                <Marker
                  key={station.id}
                  position={station.position}
                  icon={createStationIcon(isActive, station.isTerminal || false)}
                  eventHandlers={{
                    click: () => handleStationClick(station.id),
                  }}
                >
                  <Popup>
                    <div className="text-slate-800 p-2 min-w-[200px]">
                      <h3 className="font-bold text-lg text-teal-700">{station.name}</h3>
                      <p className="text-sm text-slate-600">
                        {station.isTerminal ? '🚉 Terminal Station' : '🚉 Station'}
                      </p>
                      <p className={`text-sm font-medium ${isActive ? 'text-emerald-600' : 'text-slate-500'}`}>
                        Status: {isActive ? 'Active' : 'Quiet'}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
            
            {/* Kakkanad Extension Stations */}
            {(selectedLine === 'all' || selectedLine === 'kakkanad') && kakkanadExtensionStations.map(station => {
              const status = getStationStatus(station.name);
              const isActive = status === 'active';
              
              return (
                <Marker
                  key={station.id}
                  position={station.position}
                  icon={createStationIcon(isActive, station.isTerminal || false)}
                  eventHandlers={{
                    click: () => handleStationClick(station.id),
                  }}
                >
                  <Popup>
                    <div className="text-slate-800 p-2 min-w-[200px]">
                      <h3 className="font-bold text-lg text-pink-700">{station.name}</h3>
                      <p className="text-sm text-slate-600">
                        {station.isTerminal ? '🚉 Terminal Station' : '🚉 Kakkanad Extension'}
                      </p>
                      <p className={`text-sm font-medium ${isActive ? 'text-emerald-600' : 'text-slate-500'}`}>
                        Status: {isActive ? 'Active' : 'Quiet'}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
            
            {/* Airport Extension Stations */}
            {(selectedLine === 'all' || selectedLine === 'airport') && airportExtensionStations.map(station => {
              const status = getStationStatus(station.name);
              const isActive = status === 'active';
              
              return (
                <Marker
                  key={station.id}
                  position={station.position}
                  icon={createStationIcon(isActive, station.isTerminal || false)}
                  eventHandlers={{
                    click: () => handleStationClick(station.id),
                  }}
                >
                  <Popup>
                    <div className="text-slate-800 p-2 min-w-[200px]">
                      <h3 className="font-bold text-lg text-yellow-700">{station.name}</h3>
                      <p className="text-sm text-slate-600">
                        {station.isTerminal ? '🚉 Terminal Station' : '🚉 Airport Extension'}
                      </p>
                      <p className={`text-sm font-medium ${isActive ? 'text-emerald-600' : 'text-slate-500'}`}>
                        Status: {isActive ? 'Active' : 'Quiet'}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
            
            {/* Trains */}
            {showTrains && getTrainPositions().map(train => (
              <Marker
                key={train.id}
                position={train.position}
                icon={train.status === 'delayed' ? delayedTrainIcon : trainIcon}
              >
                <Popup>
                  <div className="text-slate-800 p-2 min-w-[200px]">
                    <h3 className="font-bold text-lg">{train.id}</h3>
                    <p className={`text-sm font-medium ${
                      train.status === 'delayed' ? 'text-rose-600' : 'text-emerald-600'
                    }`}>
                      Status: {train.status === 'delayed' ? `Delayed +${train.delay}m` : 'On Time'}
                    </p>
                    <p className="text-sm text-slate-600">
                      Near: {train.currentStation}
                    </p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap justify-center gap-4 mt-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-teal-400 animate-pulse"></div>
            <span className="text-slate-300">Active Station</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-slate-500"></div>
            <span className="text-slate-300">Inactive</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full border-2 border-amber-400 bg-amber-400/20"></div>
            <span className="text-slate-300">Terminal</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-3 bg-emerald-400 rounded-sm"></div>
            <span className="text-slate-300">Train On Time</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-3 bg-rose-400 rounded-sm"></div>
            <span className="text-slate-300">Train Delayed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-1 bg-teal-400 rounded-sm"></div>
            <span className="text-slate-300">Main Line</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-1 bg-pink-400 rounded-sm"></div>
            <span className="text-slate-300">Kakkanad Extension</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-1 bg-yellow-400 rounded-sm"></div>
            <span className="text-slate-300">Airport Extension</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const RotationPage: React.FC = () => {
  const [rotationData, setRotationData] = useState<RotationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    station: 'All Stations',
    train: 'All Trains',
    direction: 'All Directions',
    rotation: 'All Rotations',
    showDelaysOnly: false,
    timeRange: 'All Day'
  });
  const [currentView, setCurrentView] = useState<'timeline' | 'table' | 'stations' | 'overview'>('overview');
  const [selectedTimeRange, setSelectedTimeRange] = useState<[string, string]>(['06:00', '22:00']);
  const [expandedTrains, setExpandedTrains] = useState<Set<string>>(new Set());
  const [currentTime, setCurrentTime] = useState<string>('');
  const [usePredictions, setUsePredictions] = useState<boolean>(false);
  const [selectedStation, setSelectedStation] = useState<string | null>(null);

  useEffect(() => {
    fetchRotationData();
    const interval = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('en-IN', { hour12: false }));
    }, 30000);
    setCurrentTime(new Date().toLocaleTimeString('en-IN', { hour12: false }));
    return () => clearInterval(interval);
  }, [usePredictions]);

  const fetchRotationData = async () => {
    try {
      setLoading(true);
      const endpoint = usePredictions ? 'http://localhost:5005/rotation/predictions' : 'http://localhost:5005/rotation/schedule';
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error('Failed to fetch rotation data');
      const data: RotationData = await response.json();
      setRotationData(data);
      try {
        (window as any).__rotationData = data;
        const map = new Map<string, string>();
        data.train_schedules.forEach(ts => {
          ts.station_events.forEach(ev => {
            const key = `${ev.expected_arrival}|${ev.station}|${ev.direction}|${ev.rotation}`;
            map.set(key, ts.train_id);
          });
        });
        (window as any).__rotationDataTrainMap = map;
      } catch {}
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const toggleTrainExpansion = (trainId: string) => {
    const newExpanded = new Set(expandedTrains);
    if (newExpanded.has(trainId)) {
      newExpanded.delete(trainId);
    } else {
      newExpanded.add(trainId);
    }
    setExpandedTrains(newExpanded);
  };

  const filteredEvents = rotationData ? rotationData.train_schedules.flatMap(train => 
    train.station_events.filter(event => {
      const eventTime = event.expected_arrival;
      const inTimeRange = eventTime >= selectedTimeRange[0] && eventTime <= selectedTimeRange[1];
      
      return (
        (filters.station === 'All Stations' || event.station === filters.station) &&
        (filters.train === 'All Trains' || train.train_id === filters.train) &&
        (filters.direction === 'All Directions' || event.direction === filters.direction) &&
        (filters.rotation === 'All Rotations' || event.rotation.toString() === filters.rotation) &&
        (!filters.showDelaysOnly || event.delay_minutes > 1.0) &&
        inTimeRange
      );
    })
  ).sort((a, b) => a.expected_arrival.localeCompare(b.expected_arrival)) : [];

  const timeRanges = [
    { label: 'Morning Peak (6-10 AM)', value: ['06:00', '10:00'] as [string, string] },
    { label: 'Midday (10-2 PM)', value: ['10:00', '14:00'] as [string, string] },
    { label: 'Evening Peak (2-6 PM)', value: ['14:00', '18:00'] as [string, string] },
    { label: 'Night (6-10 PM)', value: ['18:00', '22:00'] as [string, string] },
    { label: 'All Day', value: ['06:00', '22:00'] as [string, string] }
  ];

  const getWeatherIcon = (condition: string) => {
    switch (condition) {
      case 'rainy': return '🌧️';
      case 'sunny': return '☀️';
      case 'partly_cloudy': return '⛅';
      case 'foggy': return '🌫️';
      case 'stormy': return '⛈️';
      case 'clear': return '✨';
      default: return '🌤️';
    }
  };

  const getDelayColor = (delay: number) => {
    if (delay === 0) return 'text-emerald-400';
    if (delay <= 2) return 'text-amber-400';
    if (delay <= 5) return 'text-orange-400';
    return 'text-rose-400';
  };

  const getDelayBgColor = (delay: number) => {
    if (delay === 0) return 'bg-emerald-500/20';
    if (delay <= 2) return 'bg-amber-500/20';
    if (delay <= 5) return 'bg-orange-500/20';
    return 'bg-rose-500/20';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Good': return 'text-emerald-400';
      case 'Attention Needed': return 'text-amber-400';
      case 'Critical': return 'text-rose-400';
      default: return 'text-slate-400';
    }
  };

  // Helper function to safely get delay analysis with defaults
  const getDelayAnalysis = (train: TrainSchedule): DelayAnalysis => {
    return train.delay_analysis || {
      base_trip_time: 0,
      total_trip_time: 0,
      total_delay: 0,
      delay_breakdown: {
        job_cards: 0,
        maintenance: 0,
        weather: 0
      },
      delay_reasons: []
    };
  };

  const getStationStatus = (stationName: string) => {
    if (!rotationData) return 'inactive';
    const hasRecentEvents = rotationData.train_schedules.some(train =>
      train.station_events.some(event =>
        event.station.toLowerCase().includes(stationName.toLowerCase().split(' ')[0]) &&
        Math.abs(event.delay_minutes) < 15
      )
    );
    return hasRecentEvents ? 'active' : 'inactive';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-teal-400 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-100">Loading Rotation Schedule</h2>
          <p className="text-gray-400 mt-2">Calculating station arrivals and delays...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800/80 backdrop-blur-sm border border-slate-600 rounded-2xl p-8 max-w-md text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-100 mb-2">Error Loading Data</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={fetchRotationData}
            className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!rotationData) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 lg:p-6">
      <div className="max-w-[1920px] mx-auto">
        {/* Header Section */}
        <div className="mb-6 lg:mb-8">
  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
    <div>
      <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-teal-400 to-emerald-500 bg-clip-text text-transparent">
        Train Dashboard
      </h1>
      <p className="text-slate-400 mt-2 text-sm lg:text-base">All generated forecast & schedule overview</p>
    </div>
    
    <div className="flex items-center gap-4 lg:gap-6">
      <div className="text-right">
        <div className="text-xl lg:text-2xl font-bold text-teal-300">{rotationData?.total_trains || 0}</div>
        <div className="text-slate-400 text-xs lg:text-sm">Active Trains</div>
      </div>
      <div className="h-6 lg:h-8 w-px bg-slate-600"></div>
      <div className="flex items-center gap-2 lg:gap-3">
        <div className="bg-slate-700/50 rounded-lg px-2 lg:px-3 py-1 lg:py-2">
          <span className="text-teal-300 text-sm lg:text-base">{currentTime}</span>
        </div>
        <div className="bg-slate-700/50 rounded-lg px-2 lg:px-3 py-1 lg:py-2">
          <span className="text-emerald-300 text-sm lg:text-base">{rotationData?.service_date || 'N/A'}</span>
        </div>
      </div>
    </div>
  </div>
</div>

        {/* NEW LAYOUT: Full width three-column layout */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 lg:gap-6 mb-6 lg:mb-8 min-h-[70vh]">
          {/* Left Sidebar - Station List */}
          <div className="xl:col-span-2">
            <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl p-6 h-full flex flex-col">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-r from-teal-500 to-emerald-500 rounded-lg">
                  <span className="text-white">🚉</span>
                </div>
                <h3 className="text-xl font-bold text-teal-200">Stations</h3>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-2 max-h-[300px] mb-4">
  {(rotationData?.stations || []).map((station, index) => (
    <div 
      key={station}
      className="p-3 bg-slate-700/40 rounded-lg border-0 hover:bg-slate-700/60 transition-all cursor-pointer group"
      onClick={() => {
        // Find the station ID from the name
        const stationObj = [...kochiMetroStations, ...kakkanadExtensionStations, ...airportExtensionStations]
          .find(s => s.name === station);
        if (stationObj) {
          setSelectedStation(stationObj.id);
        }
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-teal-400"></div>
          <span className="text-slate-200 group-hover:text-teal-300 transition-colors text-sm truncate">
            {station}
          </span>
        </div>
        <span className="text-slate-500 text-xs flex-shrink-0">{index + 1}</span>
      </div>
    </div>
  ))}
</div>

              {/* Selected Station Info Panel - Moved to left sidebar */}
              {selectedStation ? (
                <div className="mt-4 p-4 bg-gradient-to-r from-teal-500/10 to-emerald-500/10 rounded-xl border-0 shadow-lg shadow-teal-500/10 flex-1 min-h-[200px]">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-teal-200 font-bold text-lg">
                      {(kochiMetroStations.find(s => s.id === selectedStation) || 
                        kakkanadExtensionStations.find(s => s.id === selectedStation) ||
                        airportExtensionStations.find(s => s.id === selectedStation))?.name} Station
                    </h4>
                    <span className="px-2 py-1 bg-teal-500/20 text-teal-300 rounded text-xs font-medium">
                      {getStationStatus((kochiMetroStations.find(s => s.id === selectedStation) || 
                        kakkanadExtensionStations.find(s => s.id === selectedStation) ||
                        airportExtensionStations.find(s => s.id === selectedStation))!.name) === 'active' ? '🚉 LIVE' : '💤 QUIET'}
                    </span>
                  </div>
                  <div className="text-sm text-slate-300 space-y-2">
                    <div>Coordinates: <span className="text-teal-300 font-mono text-xs">
                      {(kochiMetroStations.find(s => s.id === selectedStation) || 
                        kakkanadExtensionStations.find(s => s.id === selectedStation) ||
                        airportExtensionStations.find(s => s.id === selectedStation))?.position[0].toFixed(4)}, 
                      {(kochiMetroStations.find(s => s.id === selectedStation) || 
                        kakkanadExtensionStations.find(s => s.id === selectedStation) ||
                        airportExtensionStations.find(s => s.id === selectedStation))?.position[1].toFixed(4)}
                    </span></div>
                    <div>Next train: <span className="text-teal-300 font-semibold">5-7 min</span></div>
                    <div>Platform: <span className="text-amber-300 font-semibold">1</span></div>
                    <div className="pt-2 border-t border-teal-500/20 mt-2">
                      <button 
                        onClick={() => setSelectedStation(null)}
                        className="w-full py-2 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 rounded-lg transition-colors text-sm"
                      >
                        Clear Selection
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4 p-4 bg-gradient-to-r from-slate-700/40 to-slate-800/40 rounded-xl border-0 flex-1 min-h-[200px] flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-4xl mb-2">📍</div>
                    <p className="text-slate-400 text-sm">Click a station on the map or list to view details</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Center - WIDER Metro Map */}
          <div className="xl:col-span-8">
            <MetroMap rotationData={rotationData} onStationSelect={setSelectedStation} />
          </div>

          {/* Right Sidebar - Stats Cards */}
          <div className="xl:col-span-2">
            <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl p-6 h-full">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg">
                  <span className="text-white">📊</span>
                </div>
                <h3 className="text-xl font-bold text-cyan-200">Live Status</h3>
              </div>

              {/* Stats Cards */}
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-teal-500/20 to-emerald-500/10 rounded-xl p-4 border border-teal-500/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-teal-400">{rotationData?.summary?.total_events || 0}</div>
                      <div className="text-slate-400 text-sm">Total Events</div>
                    </div>
                    <div className="text-xl">📅</div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-rose-500/20 to-pink-500/10 rounded-xl p-4 border border-rose-500/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-rose-400">{rotationData.summary.delayed_events}</div>
                      <div className="text-slate-400 text-sm">Delayed Events</div>
                    </div>
                    <div className="text-xl">⚠️</div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-amber-500/20 to-orange-500/10 rounded-xl p-4 border border-amber-500/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-amber-400">{rotationData.summary.avg_delay}m</div>
                      <div className="text-slate-400 text-sm">Avg Delay</div>
                    </div>
                    <div className="text-xl">⏰</div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-500/20 to-indigo-500/10 rounded-xl p-4 border border-purple-500/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-purple-400">{rotationData.summary.significant_delays}</div>
                      <div className="text-slate-400 text-sm">Significant Delays</div>
                    </div>
                    <div className="text-xl">🔴</div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/10 rounded-xl p-4 border border-blue-500/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-blue-400">{rotationData.summary.max_delay}m</div>
                      <div className="text-slate-400 text-sm">Max Delay</div>
                    </div>
                    <div className="text-xl">📈</div>
                  </div>
                </div>
              </div>

              {/* Service Info */}
              <div className="mt-6 p-4 bg-slate-700/40 rounded-xl border-0">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-sm">Service Hours</span>
                    <span className="text-teal-300 font-semibold text-sm">
                      {rotationData.service_hours.start} - {rotationData.service_hours.end}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-sm">Weather</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{getWeatherIcon(rotationData.weather_conditions.overall_condition)}</span>
                      <span className="text-teal-300 capitalize text-sm">
                        {rotationData.weather_conditions.overall_condition.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-slate-600/50">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={usePredictions} 
                        onChange={(e) => setUsePredictions(e.target.checked)}
                        className="w-4 h-4 accent-teal-500 bg-slate-700 border-slate-600 rounded focus:ring-teal-500"
                      />
                      <span className="text-teal-200 text-sm font-medium">Use ML Predictions</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Dashboard Area */}
        <div className="space-y-6">
          {/* View Controls */}
          <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl p-6 border-0">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex gap-2">
                {[
                  { key: 'overview' as const, label: 'Overview', icon: '🌐' },
                  { key: 'timeline' as const, label: 'Timeline', icon: '📅' },
                  { key: 'stations' as const, label: 'Stations', icon: '🚉' },
                  { key: 'table' as const, label: 'Table', icon: '📊' }
                ].map(view => (
                  <button
                    key={view.key}
                    onClick={() => setCurrentView(view.key)}
                    className={`flex items-center gap-2 py-3 px-4 rounded-xl font-medium border transition-all duration-200 ${
                      currentView === view.key 
                        ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white border-teal-500 shadow-lg' 
                        : 'bg-slate-700/50 text-slate-300 border-0 hover:bg-slate-700/70 hover:text-teal-300'
                    }`}
                  >
                    <span className="text-lg">{view.icon}</span>
                    <span>{view.label}</span>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.showDelaysOnly}
                    onChange={(e) => setFilters(prev => ({ ...prev, showDelaysOnly: e.target.checked }))}
                    className="w-4 h-4 accent-teal-500 bg-slate-700 border-slate-600 rounded focus:ring-teal-500"
                  />
                  <span className="text-teal-200 text-sm font-medium">Show delays only</span>
                </label>
                
                <button
                  onClick={() => setExpandedTrains(new Set())}
                  className="px-3 py-2 text-sm text-slate-400 hover:text-teal-300 hover:bg-slate-700/50 rounded-lg transition border border-transparent hover:border-slate-600"
                >
                  Collapse all
                </button>
              </div>
            </div>

            {/* Filter Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div>
                <label className="block text-sm font-semibold text-teal-200 mb-2">Time Range</label>
                <select
                  value={filters.timeRange}
                  onChange={(e) => {
                    const range = timeRanges.find(t => t.label === e.target.value)?.value || ['06:00', '22:00'];
                    setSelectedTimeRange(range);
                    setFilters(prev => ({ ...prev, timeRange: e.target.value }));
                  }}
                  className="w-full bg-slate-700/50 text-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                >
                  {timeRanges.map(range => (
                    <option key={range.label} value={range.label}>{range.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-teal-200 mb-2">Station</label>
                <select
                  value={filters.station}
                  onChange={(e) => setFilters(prev => ({ ...prev, station: e.target.value }))}
                  className="w-full bg-slate-700/50 text-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                >
                  <option value="All Stations">All Stations</option>
                  {rotationData.stations.map(station => (
                    <option key={station} value={station}>{station}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-teal-200 mb-2">Train</label>
                <select
                  value={filters.train}
                  onChange={(e) => setFilters(prev => ({ ...prev, train: e.target.value }))}
                  className="w-full bg-slate-700/50 border border-slate-600 text-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500"
                >
                  <option value="All Trains">All Trains</option>
                  {rotationData.train_schedules.map(train => (
                    <option key={train.train_id} value={train.train_id}>
                      {train.train_id} ({train.total_rotations} rotations)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Main Dashboard View */}
          <div className="min-h-[600px]">
            {currentView === 'overview' && (
              <OverviewView 
                rotationData={rotationData} 
                expandedTrains={expandedTrains}
                onToggleTrain={toggleTrainExpansion}
                getDelayColor={getDelayColor}
                getDelayBgColor={getDelayBgColor}
                getDelayAnalysis={getDelayAnalysis}
              />
            )}

            {currentView === 'timeline' && (
              <TimelineView 
                events={filteredEvents} 
                trains={rotationData.train_schedules}
                expandedTrains={expandedTrains}
                onToggleTrain={toggleTrainExpansion}
                getDelayColor={getDelayColor}
                getDelayBgColor={getDelayBgColor}
                getDelayAnalysis={getDelayAnalysis}
              />
            )}

            {currentView === 'stations' && (
              <StationsView rotationData={rotationData} />
            )}

            {currentView === 'table' && (
              <TableView events={filteredEvents} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ... (all your existing view components remain exactly the same) ...

const OverviewView: React.FC<{
  rotationData: RotationData;
  expandedTrains: Set<string>;
  onToggleTrain: (trainId: string) => void;
  getDelayColor: (delay: number) => string;
  getDelayBgColor: (delay: number) => string;
  getDelayAnalysis: (train: TrainSchedule) => DelayAnalysis;
}> = ({ rotationData, expandedTrains, onToggleTrain, getDelayColor, getDelayBgColor, getDelayAnalysis }) => {
  return (
    <div className="space-y-6">
      {/* Train Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {rotationData.train_schedules.map((train) => {
          const delayAnalysis = getDelayAnalysis(train);
          return (
            <div
              key={train.train_id}
              className="bg-slate-800/60 backdrop-blur-sm rounded-2xl p-6 hover:border-teal-500/30 transition-all duration-300 group cursor-pointer"
              onClick={() => onToggleTrain(train.train_id)}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-teal-500/20 rounded-xl">
                    <span className="text-xl">🚆</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-teal-200 group-hover:text-teal-100 transition">
                      {train.train_id}
                    </h3>
                    <p className="text-slate-400 text-sm">
                      {train.total_rotations} rotations • {train.train_config?.job_cards_count || 0} job cards
                    </p>
                  </div>
                </div>
                <div className={`px-3 py-2 rounded-lg border font-bold ${getDelayBgColor(delayAnalysis.total_delay)} border-current/20`}>
                  <span className={`text-sm font-bold ${getDelayColor(delayAnalysis.total_delay)}`}>
                    +{delayAnalysis.total_delay.toFixed(1)}m
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-teal-400 font-bold text-lg">{train.first_departure}</div>
                  <div className="text-slate-500 text-xs">First Departure</div>
                </div>
                <div className="text-center">
                  <div className="text-emerald-400 font-bold text-lg">{train.last_arrival}</div>
                  <div className="text-slate-500 text-xs">Last Arrival</div>
                </div>
                <div className="text-center">
                  <div className="text-amber-400 font-bold text-lg">{train.train_config?.high_critical_jobs || 0}</div>
                  <div className="text-slate-500 text-xs">Critical Jobs</div>
                </div>
              </div>

              {expandedTrains.has(train.train_id) && (
                <div className="mt-4 space-y-4 pt-4 border-t border-slate-600/50">
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div className="text-center p-3 bg-slate-700/50 rounded-lg">
                      <div className="text-amber-400 font-bold">{delayAnalysis.delay_breakdown.job_cards.toFixed(1)}m</div>
                      <div className="text-slate-400">Job Cards</div>
                    </div>
                    <div className="text-center p-3 bg-slate-700/50 rounded-lg">
                      <div className="text-rose-300 font-bold">{delayAnalysis.delay_breakdown.maintenance.toFixed(1)}m</div>
                      <div className="text-slate-400">Maintenance</div>
                    </div>
                    <div className="text-center p-3 bg-slate-700/50 rounded-lg">
                      <div className="text-blue-300 font-bold">{delayAnalysis.delay_breakdown.weather.toFixed(1)}m</div>
                      <div className="text-slate-400">Weather</div>
                    </div>
                  </div>

                  <div className="text-sm text-slate-300">
                    <div className="font-semibold text-teal-200 mb-2">Next 3 Stations:</div>
                    <div className="space-y-2">
                      {(train.station_events && train.station_events.slice(0, 3).length > 0) ? (
                        train.station_events.slice(0, 3).map((event, index) => (
                          <div key={index} className="flex justify-between items-center py-2 px-3 bg-slate-700/30 rounded-lg">
                            <span className="text-slate-200">{event.station}</span>
                            <span className={`font-mono ${getDelayColor(event.delay_minutes)}`}>
                              {event.expected_arrival} {event.delay_minutes > 0 && `(+${event.delay_minutes}m)`}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="text-slate-400 text-center py-2">No upcoming events</div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const TimelineView: React.FC<{
  events: StationEvent[];
  trains: TrainSchedule[];
  expandedTrains: Set<string>;
  onToggleTrain: (trainId: string) => void;
  getDelayColor: (delay: number) => string;
  getDelayBgColor: (delay: number) => string;
  getDelayAnalysis: (train: TrainSchedule) => DelayAnalysis;
}> = ({ events, trains, expandedTrains, onToggleTrain, getDelayColor, getDelayBgColor, getDelayAnalysis }) => {
  const eventsByTrain = events.reduce((acc, event) => {
    const train = trains.find(t => t.station_events.includes(event));
    if (!train) return acc;
    
    if (!acc[train.train_id]) {
      acc[train.train_id] = { train, events: [] };
    }
    acc[train.train_id].events.push(event);
    return acc;
  }, {} as Record<string, { train: TrainSchedule, events: StationEvent[] }>);

  // Helper to get current station for a train
  const getCurrentStation = (trainEvents: StationEvent[]) => {
    const now = new Date();
    return trainEvents.find(event => {
      const [hours, minutes] = event.expected_arrival.split(':').map(Number);
      const eventTime = new Date();
      eventTime.setHours(hours, minutes, 0, 0);
      return Math.abs(now.getTime() - eventTime.getTime()) < 30 * 60 * 1000; // Within 30 minutes
    }) || trainEvents[0];
  };

  // Helper to get next stations
  const getNextStations = (trainEvents: StationEvent[], currentIndex: number) => {
    return trainEvents.slice(currentIndex + 1, currentIndex + 4);
  };

  return (
    <div className="space-y-6">
      {Object.entries(eventsByTrain).map(([trainId, { train, events }]) => {
        const delayAnalysis = getDelayAnalysis(train);
        const isExpanded = expandedTrains.has(trainId);
        const currentStation = getCurrentStation(events);
        const currentIndex = events.findIndex(e => e === currentStation);
        const nextStations = getNextStations(events, currentIndex);
        const onTimeStations = events.filter(e => e.delay_minutes === 0).length;
        const delayedStations = events.filter(e => e.delay_minutes > 0).length;
        
        return (
          <div 
            key={trainId} 
            className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 backdrop-blur-lg rounded-3xl shadow-2xl overflow-hidden transition-all duration-500 hover:shadow-cyan-500/10"
          >
            {/* Enhanced Train Header - Much more informative when collapsed */}
            <div 
              className="p-8 cursor-pointer transition-all duration-500 group relative overflow-hidden"
              onClick={() => onToggleTrain(trainId)}
            >
              {/* Animated Background Gradient */}
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              <div className="relative z-10">
                {/* Main Header Row */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-6">
                    <div className="p-4 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 rounded-2xl border border-cyan-500/30 shadow-lg transition-all duration-300">
                      <span className="text-3xl">🚄</span>
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold bg-gradient-to-r from-cyan-300 to-blue-300 bg-clip-text text-transparent">
                        {trainId}
                      </h3>
                      <p className="text-slate-400 text-sm mt-2">
                        Rotation {events[0]?.rotation} • {train.total_rotations} rotations • {train.train_config?.high_critical_jobs || 0} critical jobs
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className={`px-6 py-3 rounded-2xl border backdrop-blur-sm shadow-lg transition-all duration-300 ${getDelayBgColor(delayAnalysis.total_delay)}`}>
                      <span className={`font-black text-sm tracking-wide ${getDelayColor(delayAnalysis.total_delay)}`}>
                        +{delayAnalysis.total_delay.toFixed(1)}m total delay
                      </span>
                    </div>
                    <div className="text-cyan-300 text-2xl transform transition-all duration-300">
                      {isExpanded ? '▼' : '▶'}
                    </div>
                  </div>
                </div>

                {/* Enhanced Status Dashboard - Shows when collapsed */}
                {!isExpanded && (
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-6">
                    {/* Current Station */}
                    <div className="bg-gradient-to-br from-slate-700/40 to-slate-800/40 rounded-2xl p-4 border border-slate-600/30">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse shadow-lg shadow-emerald-400/50"></div>
                        <span className="text-slate-400 text-sm font-medium">CURRENT STATION</span>
                      </div>
                      <div className="text-lg font-bold text-white mb-1">{currentStation?.station || 'En Route'}</div>
                      <div className="text-cyan-300 font-mono text-sm">{currentStation?.expected_arrival || '--:--'}</div>
                    </div>

                    {/* Next Stations Preview */}
                    <div className="bg-gradient-to-br from-slate-700/40 to-slate-800/40 rounded-2xl p-4 border border-slate-600/30">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-3 h-3 bg-amber-400 rounded-full shadow-lg shadow-amber-400/50"></div>
                        <span className="text-slate-400 text-sm font-medium">NEXT STOPS</span>
                      </div>
                      <div className="space-y-2">
                        {nextStations.slice(0, 2).map((station, idx) => (
                          <div key={idx} className="flex justify-between items-center text-sm">
                            <span className="text-slate-300 truncate">{station.station}</span>
                            <span className="text-cyan-300 font-mono text-xs">{station.expected_arrival}</span>
                          </div>
                        ))}
                        {nextStations.length === 0 && (
                          <div className="text-slate-500 text-sm">End of line</div>
                        )}
                      </div>
                    </div>

                    {/* Performance Stats */}
                    <div className="bg-gradient-to-br from-slate-700/40 to-slate-800/40 rounded-2xl p-4 border border-slate-600/30">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-3 h-3 bg-blue-400 rounded-full shadow-lg shadow-blue-400/50"></div>
                        <span className="text-slate-400 text-sm font-medium">PERFORMANCE</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-center">
                        <div>
                          <div className="text-emerald-400 font-bold text-lg">{onTimeStations}</div>
                          <div className="text-slate-500 text-xs">On Time</div>
                        </div>
                        <div>
                          <div className="text-rose-400 font-bold text-lg">{delayedStations}</div>
                          <div className="text-slate-500 text-xs">Delayed</div>
                        </div>
                      </div>
                    </div>

                    {/* Route Progress */}
                    <div className="bg-gradient-to-br from-slate-700/40 to-slate-800/40 rounded-2xl p-4 border border-slate-600/30">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-3 h-3 bg-purple-400 rounded-full shadow-lg shadow-purple-400/50"></div>
                        <span className="text-slate-400 text-sm font-medium">ROUTE PROGRESS</span>
                      </div>
                      <div className="text-center mb-2">
                        <div className="text-cyan-300 font-bold text-lg">
                          {currentIndex + 1}/{events.length}
                        </div>
                        <div className="text-slate-500 text-xs">Stations</div>
                      </div>
                      <div className="w-full bg-slate-600/30 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full transition-all duration-1000"
                          style={{ width: `${((currentIndex + 1) / events.length) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Quick Stats Row */}
                {!isExpanded && (
                  <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-600/30">
                    <div className="flex items-center gap-6 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                        <span className="text-slate-400">
                          <span className="text-emerald-300 font-semibold">{onTimeStations}</span> on time
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
                        <span className="text-slate-400">
                          <span className="text-amber-300 font-semibold">{events.filter(e => e.delay_minutes > 0 && e.delay_minutes <= 5).length}</span> minor delays
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-rose-400 rounded-full"></div>
                        <span className="text-slate-400">
                          <span className="text-rose-300 font-semibold">{events.filter(e => e.delay_minutes > 5).length}</span> major delays
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-slate-400 text-sm">
                      Click to view full timeline →
                    </div>
                  </div>
                )}
              </div>

              {/* Subtle Shimmer Effect - No movement */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/3 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"></div>
            </div>

            {/* Enhanced Events Timeline - Only shows when expanded */}
            {isExpanded && (
              <div className="px-8 pb-8">
                <div className="space-y-6">
                  {events.map((event, index) => (
                    <div 
                      key={index} 
                      className="relative pl-12 group"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      {/* Timeline connector */}
                      {index < events.length - 1 && (
                        <div className="absolute left-[22px] top-12 bottom-0 w-1 bg-gradient-to-b from-cyan-500/20 to-blue-500/20 rounded-full">
                          <div className="absolute top-0 left-0 w-full h-4 bg-gradient-to-b from-cyan-400 to-transparent animate-pulse"></div>
                        </div>
                      )}
                      
                      {/* Timeline dot */}
                      <div className={`absolute left-0 top-2 w-10 h-10 rounded-full flex items-center justify-center border-2 backdrop-blur-sm shadow-lg transition-all duration-300 ${
                        event.delay_minutes > 0 
                          ? 'bg-rose-500/10 border-rose-500/40' 
                          : 'bg-emerald-500/10 border-emerald-500/40'
                      }`}>
                        <div className={`w-4 h-4 rounded-full ${
                          event.delay_minutes > 0 
                            ? 'bg-gradient-to-br from-rose-400 to-rose-500 shadow-lg shadow-rose-400/50' 
                            : 'bg-gradient-to-br from-emerald-400 to-emerald-500 shadow-lg shadow-emerald-400/50'
                        }`}></div>
                        
                        {/* Pulsing ring for current/active events */}
                        {event === currentStation && (
                          <div className="absolute inset-0 rounded-full border-2 border-cyan-400/40 animate-ping"></div>
                        )}
                      </div>

                      {/* Event Card */}
                      <div className="bg-gradient-to-r from-slate-700/40 to-slate-800/40 rounded-3xl p-6 border border-slate-600/20 transition-all duration-300 backdrop-blur-sm">
                        <div className="flex items-start justify-between gap-6">
                          {/* Left: Time & Station */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-4 mb-4">
                              <span className="font-mono text-cyan-300 font-black text-xl bg-cyan-500/10 px-3 py-1 rounded-lg border border-cyan-500/20">
                                {event.expected_arrival}
                              </span>
                              <span className={`px-4 py-2 rounded-xl text-sm font-bold border backdrop-blur-sm ${
                                event.direction === 'forward' 
                                  ? 'bg-blue-500/10 text-blue-300 border-blue-500/30' 
                                  : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                              }`}>
                                {event.direction === 'forward' ? '→ PETTAH' : '← ALUVA'}
                              </span>
                              {event === currentStation && (
                                <span className="px-3 py-1 bg-cyan-500/20 text-cyan-300 rounded-lg text-xs font-bold border border-cyan-500/30">
                                  CURRENT
                                </span>
                              )}
                            </div>
                            <h4 className="text-slate-200 font-bold text-xl mb-3">
                              {event.station}
                            </h4>
                            <div className="flex items-center gap-6 text-sm">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-amber-400 rounded-full shadow-lg shadow-amber-400/50"></div>
                                <span className="text-slate-300">
                                  Next: <span className="text-amber-300 font-bold">{event.next_station_duration}min</span>
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-cyan-400 rounded-full shadow-lg shadow-cyan-400/50"></div>
                                <span className="text-slate-300">
                                  Total: <span className="text-cyan-300 font-bold">{event.cumulative_time}min</span>
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Right: Delay info */}
                          <div className="text-right">
                            {event.delay_minutes > 0 ? (
                              <div>
                                <div className={`px-4 py-3 rounded-2xl border backdrop-blur-sm shadow-lg mb-3 ${getDelayBgColor(event.delay_minutes)}`}>
                                  <span className={`font-black text-lg tracking-wide ${getDelayColor(event.delay_minutes)}`}>
                                    +{event.delay_minutes}m
                                  </span>
                                </div>
                                {event.delay_reasons.length > 0 && (
                                  <p className="text-sm text-slate-400 max-w-[200px] font-medium bg-slate-700/30 px-3 py-2 rounded-lg border border-slate-600/30">
                                    {event.delay_reasons[0]}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <div className="px-4 py-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/30 shadow-lg">
                                <span className="text-emerald-400 font-black text-lg tracking-wide">
                                  ON TIME
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Enhanced Footer for expanded train */}
                <div className="mt-8 pt-6 border-t border-slate-600/30">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-2xl border border-cyan-500/20">
                      <div className="text-2xl font-black text-cyan-300">{events.length}</div>
                      <div className="text-slate-400 text-sm font-medium">TOTAL STOPS</div>
                    </div>
                    <div className="text-center p-4 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-2xl border border-emerald-500/20">
                      <div className="text-2xl font-black text-emerald-300">
                        {events.filter(e => e.delay_minutes === 0).length}
                      </div>
                      <div className="text-slate-400 text-sm font-medium">ON TIME</div>
                    </div>
                    <div className="text-center p-4 bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-2xl border border-amber-500/20">
                      <div className="text-2xl font-black text-amber-300">
                        {events.filter(e => e.delay_minutes > 0 && e.delay_minutes <= 5).length}
                      </div>
                      <div className="text-slate-400 text-sm font-medium">MINOR DELAYS</div>
                    </div>
                    <div className="text-center p-4 bg-gradient-to-br from-rose-500/10 to-pink-500/10 rounded-2xl border border-rose-500/20">
                      <div className="text-2xl font-black text-rose-300">
                        {events.filter(e => e.delay_minutes > 5).length}
                      </div>
                      <div className="text-slate-400 text-sm font-medium">MAJOR DELAYS</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// Stations View Component
const StationsView: React.FC<{ rotationData: RotationData }> = ({ rotationData }) => {
  return (
    <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/80 backdrop-blur-lg rounded-3xl p-8 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-12">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 rounded-2xl border border-cyan-500/30 shadow-2xl">
            <span className="text-3xl">🚇</span>
          </div>
          <div>
            <h3 className="text-3xl font-bold bg-gradient-to-r from-cyan-300 to-blue-300 bg-clip-text text-transparent">
              Metro Line Journey
            </h3>
            <p className="text-slate-400 text-sm mt-2">Interactive station timeline with real-time animations</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-2xl px-5 py-3 border border-emerald-500/30">
          <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse shadow-lg shadow-emerald-400/50"></div>
          <span className="text-emerald-300 text-sm font-bold tracking-wider">LIVE TRACKING</span>
        </div>
      </div>

      {/* Interactive Metro Line */}
      <div className="relative mb-16">
        {/* Main Metro Track */}
        <div className="absolute left-20 top-8 bottom-8 w-3 bg-gradient-to-b from-cyan-500/10 to-blue-500/10 rounded-full">
          {/* Animated Light Pulse */}
          <div className="absolute inset-0 w-3 bg-gradient-to-b from-cyan-400/40 to-blue-400/40 rounded-full animate-pulse"></div>
          
          {/* Moving Train */}
          <div className="absolute left-1/2 -translate-x-1/2 w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full shadow-2xl shadow-cyan-400/50 animate-[trainJourney_15s_linear_infinite] z-20 flex items-center justify-center">
            <div className="w-4 h-4 bg-white/20 rounded-full"></div>
          </div>
        </div>

        {/* Station Markers */}
        <div className="space-y-16 ml-32">
          {rotationData.station_timings.map((station, index) => (
            <div 
              key={station.station}
              className="group relative cursor-pointer transform hover:scale-105 transition-all duration-500"
            >
              {/* Station Connection Line */}
              {index < rotationData.station_timings.length - 1 && (
                <div className="absolute -left-12 top-16 w-12 h-0.5 bg-gradient-to-r from-cyan-500/30 to-blue-500/30 group-hover:from-cyan-400 group-hover:to-blue-400 transition-all duration-300">
                  <div className="absolute -top-1 w-2 h-2 bg-cyan-400 rounded-full animate-ping"></div>
                </div>
              )}

              {/* Station Card */}
              <div className="bg-gradient-to-r from-slate-800/50 to-slate-700/50 rounded-3xl p-8 border border-slate-600/20 hover:border-cyan-500/40 transition-all duration-500 shadow-2xl hover:shadow-cyan-500/20 backdrop-blur-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-8 flex-1">
                    {/* Interactive Station Dot */}
                    <div className="relative">
                      <div className="absolute inset-0 w-16 h-16 rounded-full bg-cyan-400/20 blur-xl group-hover:bg-cyan-400/40 transition-all duration-500"></div>
                      
                      <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-cyan-500/40 flex items-center justify-center shadow-2xl group-hover:border-cyan-300 group-hover:scale-110 group-hover:shadow-cyan-400/30 transition-all duration-300">
                        <span className="text-cyan-300 font-bold text-xl">{index + 1}</span>
                        
                      </div>

                      {/* Terminal Indicator */}
                      {station.next_station_duration === 0 && (
                        <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full border-2 border-slate-900 flex items-center justify-center shadow-lg">
                          <span className="text-slate-900 text-xs font-black">END</span>
                        </div>
                      )}
                    </div>

                    {/* Station Information */}
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-4">
                        <h4 className="text-2xl font-bold text-cyan-100 group-hover:text-white transition-colors duration-300">
                          {station.station}
                        </h4>
                        
                        {station.next_station_duration === 0 ? (
                          <span className="px-3 py-1.5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 rounded-xl text-sm font-bold border border-amber-500/30">
                            TERMINAL STATION
                          </span>
                        ) : (
                          <span className="px-3 py-1.5 bg-gradient-to-r from-teal-500/20 to-cyan-500/20 text-teal-300 rounded-xl text-sm font-bold border border-teal-500/30">
                            NEXT: {station.next_station_duration}min
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-8 text-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 bg-gradient-to-br from-teal-400 to-cyan-400 rounded-full animate-pulse shadow-lg shadow-teal-400/50"></div>
                          <span className="text-slate-300">
                            Travel: <span className="text-teal-300 font-bold">{station.next_station_duration || 0} min</span>
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 bg-gradient-to-br from-blue-400 to-indigo-400 rounded-full shadow-lg shadow-blue-400/50"></div>
                          <span className="text-slate-300">
                            Sequence: <span className="text-blue-300 font-bold">{index + 1}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Time & Status */}
                  <div className="text-right">
                    <div className="mb-4">
                      <div className="text-3xl font-black bg-gradient-to-r from-teal-300 to-cyan-300 bg-clip-text text-transparent">
                        +{station.cumulative_time}m
                      </div>
                      <div className="text-slate-400 text-sm font-medium">From Origin</div>
                    </div>
                    
                    <div className="flex items-center gap-3 justify-end">
                      <div className={`w-4 h-4 rounded-full border-2 shadow-lg ${
                        index === 0 
                          ? 'bg-emerald-500 border-emerald-400 animate-pulse shadow-emerald-400/50' 
                          : index === rotationData.station_timings.length - 1
                          ? 'bg-amber-500 border-amber-400 shadow-amber-400/50'
                          : 'bg-cyan-500 border-cyan-400 shadow-cyan-400/50'
                      }`}></div>
                      <span className="text-slate-300 text-sm font-bold tracking-wide">
                        {index === 0 ? 'DEPARTURE' : index === rotationData.station_timings.length - 1 ? 'DESTINATION' : 'IN TRANSIT'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Hover Glow Effect */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-cyan-500/5 via-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Enhanced Stats Footer */}
      <div className="mt-16 pt-8 border-t border-slate-600/20">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 rounded-2xl p-6 border border-slate-600/20 hover:border-cyan-500/30 transition-all duration-300 group">
            <div className="text-4xl font-black bg-gradient-to-r from-cyan-300 to-blue-300 bg-clip-text text-transparent group-hover:scale-110 transition-transform duration-300">
              {rotationData.station_timings.length}
            </div>
            <div className="text-slate-400 text-sm font-medium mt-2">TOTAL STATIONS</div>
          </div>
          
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 rounded-2xl p-6 border border-slate-600/20 hover:border-teal-500/30 transition-all duration-300 group">
            <div className="text-4xl font-black bg-gradient-to-r from-teal-300 to-cyan-300 bg-clip-text text-transparent group-hover:scale-110 transition-transform duration-300">
              {rotationData.station_timings[rotationData.station_timings.length - 1]?.cumulative_time || 0}m
            </div>
            <div className="text-slate-400 text-sm font-medium mt-2">TOTAL DURATION</div>
          </div>
          
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 rounded-2xl p-6 border border-slate-600/20 hover:border-blue-500/30 transition-all duration-300 group">
            <div className="text-4xl font-black bg-gradient-to-r from-blue-300 to-indigo-300 bg-clip-text text-transparent group-hover:scale-110 transition-transform duration-300">
              {Math.round((rotationData.station_timings[rotationData.station_timings.length - 1]?.cumulative_time || 0) / rotationData.station_timings.length)}m
            </div>
            <div className="text-slate-400 text-sm font-medium mt-2">AVG INTERVAL</div>
          </div>
          
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 rounded-2xl p-6 border border-slate-600/20 hover:border-purple-500/30 transition-all duration-300 group">
            <div className="text-4xl font-black bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent group-hover:scale-110 transition-transform duration-300">
              {rotationData.station_timings.filter(s => s.next_station_duration === 0).length}
            </div>
            <div className="text-slate-400 text-sm font-medium mt-2">TERMINAL STATIONS</div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes trainJourney {
          0% { 
            top: 0%;
            transform: translateX(-50%) scale(1);
          }
          25% {
            transform: translateX(-50%) scale(1.1);
          }
          50% {
            transform: translateX(-50%) scale(1);
          }
          75% {
            transform: translateX(-50%) scale(1.1);
          }
          100% { 
            top: 100%;
            transform: translateX(-50%) scale(1);
          }
        }

        @keyframes metroPulse {
          0% { 
            opacity: 0;
            transform: scale(0.8);
          }
          50% {
            opacity: 1;
            transform: scale(1.2);
          }
          100% {
            opacity: 0;
            transform: scale(0.8);
          }
        }
      `}</style>
    </div>
  );
};

// Table View Component
// Table View Component - Card Based Design
const TableView: React.FC<{ events: StationEvent[] }> = ({ events }) => {
  const [sortBy, setSortBy] = useState<'time' | 'station' | 'delay'>('time');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSort = (column: 'time' | 'station' | 'delay') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const sortedEvents = [...events].sort((a, b) => {
    let aValue, bValue;
    
    switch (sortBy) {
      case 'time':
        aValue = a.expected_arrival;
        bValue = b.expected_arrival;
        break;
      case 'station':
        aValue = a.station;
        bValue = b.station;
        break;
      case 'delay':
        aValue = a.delay_minutes;
        bValue = b.delay_minutes;
        break;
      default:
        return 0;
    }
    
    if (sortOrder === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    }
  });

  const getDelayColor = (delay: number) => {
    if (delay === 0) return 'text-emerald-400';
    if (delay <= 2) return 'text-amber-400';
    if (delay <= 5) return 'text-orange-400';
    return 'text-rose-400';
  };

  const getDelayBg = (delay: number) => {
    if (delay === 0) return 'bg-emerald-500/20';
    if (delay <= 2) return 'bg-amber-500/20';
    if (delay <= 5) return 'bg-orange-500/20';
    return 'bg-rose-500/20';
  };

  // Group events by train for card view
  const eventsByTrain = sortedEvents.reduce((acc, event) => {
    const trainId = (window as any).__rotationDataTrainMap?.get?.(
      event.expected_arrival + '|' + event.station + '|' + event.direction + '|' + event.rotation
    ) || findTrainIdForEvent(event);
    
    if (!acc[trainId]) {
      acc[trainId] = [];
    }
    acc[trainId].push(event);
    return acc;
  }, {} as Record<string, StationEvent[]>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-2xl border border-cyan-400/30">
            <span className="text-2xl">🚇</span>
          </div>
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              Metro Operations
            </h2>
            <p className="text-slate-400 text-sm">
              {Object.keys(eventsByTrain).length} active trains • {events.length} scheduled stops
            </p>
          </div>
        </div>

        {/* Sort Controls */}
        <div className="flex gap-2">
          {[
            { key: 'time', label: 'Time', icon: '🕒' },
            { key: 'station', label: 'Station', icon: '📍' },
            { key: 'delay', label: 'Delay', icon: '⚠️' }
          ].map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => handleSort(key as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${
                sortBy === key
                  ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                  : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:border-cyan-500/50'
              }`}
            >
              <span>{icon}</span>
              <span className="text-sm font-medium">{label}</span>
              {sortBy === key && (
                <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Train Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {Object.entries(eventsByTrain).map(([trainId, trainEvents]) => {
          const currentEvent = trainEvents[0];
          const totalStops = trainEvents.length;
          const delayedStops = trainEvents.filter(e => e.delay_minutes > 0).length;
          const avgDelay = trainEvents.reduce((sum, e) => sum + e.delay_minutes, 0) / trainEvents.length;
          
          return (
            <div
              key={trainId}
              className="group relative bg-gradient-to-br from-slate-800/40 to-slate-900/60 backdrop-blur-sm rounded-2xl border border-slate-700/50 hover:border-cyan-500/30 transition-all duration-300 overflow-hidden"
            >
              {/* Header */}
              <div className="p-5 border-b border-slate-700/50">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${
                      avgDelay > 5 ? 'bg-rose-500/20' : 
                      avgDelay > 2 ? 'bg-amber-500/20' : 
                      'bg-emerald-500/20'
                    }`}>
                      <span className="text-xl">🚆</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-cyan-200">{trainId}</h3>
                      <p className="text-slate-400 text-sm">
                        Rotation {currentEvent.rotation} • {totalStops} stops
                      </p>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-lg ${getDelayBg(avgDelay)}`}>
                    <span className={`text-sm font-bold ${getDelayColor(avgDelay)}`}>
                      +{avgDelay.toFixed(1)}m
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-700/50 rounded-full h-2">
                  <div 
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-1000"
                    style={{ width: `${(trainEvents.filter(e => e.delay_minutes === 0).length / totalStops) * 100}%` }}
                  ></div>
                </div>
              </div>

              {/* Current Station */}
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Current Station</div>
                    <div className="text-lg font-bold text-white">{currentEvent.station}</div>
                    <div className="text-sm text-slate-400 mt-1">
                      {currentEvent.expected_arrival} • {currentEvent.direction === 'forward' ? '→ Pettah' : '← Aluva'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-500 mb-1">Next Stop</div>
                    <div className="text-amber-400 font-bold">{currentEvent.next_station_duration}m</div>
                  </div>
                </div>

                {/* Delay Sparkline */}
                <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                  <span>Recent delays:</span>
                  <span>{delayedStops}/{totalStops} stops affected</span>
                </div>
                <div className="flex items-center gap-1">
                  {trainEvents.slice(0, 8).map((event, idx) => (
                    <div
                      key={idx}
                      className={`flex-1 h-2 rounded-full transition-all ${
                        event.delay_minutes > 3 
                          ? 'bg-rose-500' 
                          : event.delay_minutes > 0
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                    ></div>
                  ))}
                </div>
              </div>

              {/* Upcoming Stations */}
              <div className="p-5 bg-slate-800/30 border-t border-slate-700/50">
                <div className="text-xs text-slate-500 mb-3">Upcoming Stations</div>
                <div className="space-y-2">
                  {trainEvents.slice(1, 4).map((event, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          event.delay_minutes > 0 ? 'bg-rose-400' : 'bg-emerald-400'
                        }`}></div>
                        <span className="text-slate-300">{event.station}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-500 text-xs">{event.expected_arrival}</span>
                        {event.delay_minutes > 0 && (
                          <span className="text-rose-400 text-xs font-bold">+{event.delay_minutes}m</span>
                        )}
                      </div>
                    </div>
                  ))}
                  {trainEvents.length > 4 && (
                    <div className="text-center text-slate-500 text-xs pt-2">
                      +{trainEvents.length - 4} more stations
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Helper to map an event back to its train id from the current rotationData in closure
function findTrainIdForEvent(event: StationEvent): string {
  try {
    const any = (window as any).__rotationData as RotationData | undefined;
    if (any) {
      for (const t of any.train_schedules) {
        if (t.station_events && t.station_events.some(e => e.station === event.station && e.expected_arrival === event.expected_arrival && e.scheduled_arrival === event.scheduled_arrival && e.direction === event.direction && e.rotation === event.rotation)) {
          return t.train_id;
        }
      }
    }
  } catch {}
  return `Train`;
}

export default RotationPage;