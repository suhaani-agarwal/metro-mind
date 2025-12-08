"use client";
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useMap } from 'react-leaflet';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';

let L: typeof import('leaflet') | undefined;

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5005";
// Dynamically import leaflet only on client side
if (typeof window !== 'undefined') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    L = require('leaflet');

    // Fix for default markers in Leaflet with Next.js
    if (L && L.Icon.Default.prototype) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      });
    }
  } catch (e) {
    console.error('Leaflet initialization error:', e);
  }
}

const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-slate-900/50 rounded-lg flex items-center justify-center">Loading map...</div>,
});

const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), {
  ssr: false,
});

const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), {
  ssr: false,
});

const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), {
  ssr: false,
});

const Polyline = dynamic(() => import('react-leaflet').then(mod => mod.Polyline), {
  ssr: false,
});

// Custom train icon - lazy initialization
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let trainIcon: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let delayedTrainIcon: any = null;

const getTrainIcons = () => {
  if (!L) return { trainIcon: null, delayedTrainIcon: null };

  if (!trainIcon) {
    trainIcon = new L.Icon({
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
  }

  if (!delayedTrainIcon) {
    delayedTrainIcon = new L.Icon({
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
  }

  return { trainIcon, delayedTrainIcon };
};

// Custom station icon
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const createStationIcon = (isActive: boolean, isTerminal: boolean) => {
  if (!L) return null;

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
  delay_probability?: number;
  direction: string;
  rotation: number;
  sequence: number;
  next_station_duration: number;
  cumulative_time: number;
  significant_delay: number; // Changed from boolean to number (0 or 1)
}

interface DelayAnalysis {
  base_trip_time: number;
  total_trip_time: number;
  total_delay: number;
  delay_breakdown: {
    job_cards: number;
    maintenance: number;
    weather: number;
    crowd?: number;
    anomaly?: number;
    cascading?: number;
    other?: number;
  };
  delay_reasons: string[];
}

interface TrainSchedule {
  train_id: string;
  departure_time: string;
  departure_slot: number;
  readiness: number;
  station_events: StationEvent[];
  delay_analysis: DelayAnalysis; // Directly use DelayAnalysis
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  weather_conditions: any;
  total_trains: number;
  base_trip_time: number;
  train_schedules: TrainSchedule[];
  stations: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
const kochiMetroStations = [
  { id: 'aluva', name: 'Aluva', position: [dmsToDecimal(10, 6, 35, 'N'), dmsToDecimal(76, 20, 59, 'E')] as [number, number] },
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
  { id: 'mg-road', name: 'M.G Road', position: [dmsToDecimal(9, 59, 3, 'N'), dmsToDecimal(76, 16, 55, 'E')] as [number, number] },
  { id: 'maharajas', name: `Maharaja's College`, position: [dmsToDecimal(9, 58, 24, 'N'), dmsToDecimal(76, 17, 6, 'E')] as [number, number] },
  { id: 'ernakulam-south', name: 'Ernakulam South', position: [dmsToDecimal(9, 58, 4, 'N'), dmsToDecimal(76, 17, 29, 'E')] as [number, number] },
  { id: 'kadavanthra', name: 'Kadavanthra', position: [dmsToDecimal(9, 57, 60, 'N'), dmsToDecimal(76, 17, 54, 'E')] as [number, number] },
  { id: 'elamkulam', name: 'Elamkulam', position: [dmsToDecimal(9, 58, 1, 'N'), dmsToDecimal(76, 18, 30, 'E')] as [number, number] },
  { id: 'vytilla', name: 'Vytilla', position: [dmsToDecimal(9, 58, 3, 'N'), dmsToDecimal(76, 19, 14, 'E')] as [number, number] },
  { id: 'thaikoodam', name: 'Thaikoodam', position: [dmsToDecimal(9, 57, 36, 'N'), dmsToDecimal(76, 19, 25, 'E')] as [number, number] },
  { id: 'pettah', name: 'Pettah', position: [dmsToDecimal(9, 57, 4, 'N'), dmsToDecimal(76, 19, 52, 'E')] as [number, number] },
  { id: 'vadakkekotta', name: 'Vadakkekotta', position: [dmsToDecimal(9, 57, 15, 'N'), dmsToDecimal(76, 20, 25, 'E')] as [number, number] },
  { id: 'sn-junction', name: 'SN Junction', position: [dmsToDecimal(9, 57, 17, 'N'), dmsToDecimal(76, 20, 46, 'E')] as [number, number] },
  { id: 'tripunithura', name: 'Tripunithura Terminal', position: [dmsToDecimal(9, 57, 1, 'N'), dmsToDecimal(76, 21, 6, 'E')] as [number, number], isTerminal: true }
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

// NEW: Improved Metro Map Component

// NEW: Metro Map Component with Station Labels

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MetroMap: React.FC<{ rotationData: RotationData; onStationSelect: (stationId: string | null) => void; t: any; }> = ({ rotationData, onStationSelect, t }) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [icons, setIcons] = useState<{ trainIcon: any; delayedTrainIcon: any } | null>(null);
  const [selectedStation, setSelectedStation] = useState<string | null>(null);
  const [showTrains, setShowTrains] = useState(true);
  const [selectedLine, setSelectedLine] = useState<'all' | 'main' | 'kakkanad' | 'airport'>('main');

  // Generate metro line coordinates
  const metroLine = kochiMetroStations.map(station => station.position);
  const kakkanadLine = kakkanadExtensionStations.map(station => station.position);
  const airportLine = airportExtensionStations.map(station => station.position);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const initIcons = () => {
        const { trainIcon, delayedTrainIcon } = getTrainIcons();
        if (trainIcon && delayedTrainIcon) {
          setIcons({ trainIcon, delayedTrainIcon });
        }
      };

      const timer = setTimeout(initIcons, 100);
      return () => clearTimeout(timer);
    }
  }, []);

  // Calculate bounds for main line (zoomed in view)
  const getMainLineBounds = () => {
    if (!L) return null;
    const mainLinePositions = kochiMetroStations.map(s => s.position);
    return L.latLngBounds(mainLinePositions);
  };

  // Custom station icons with different colors per line
  const createStationIcon = (line: 'main' | 'kakkanad' | 'airport', isActive: boolean, isTerminal: boolean) => {
    if (!L) return null;
    const colors = {
      main: { fill: isActive ? '#2dd4bf' : '#64748b', border: isTerminal ? '#f59e0b' : '#1e293b' },
      kakkanad: { fill: isActive ? '#ec4899' : '#9d174d', border: isTerminal ? '#f59e0b' : '#1e293b' },
      airport: { fill: isActive ? '#eab308' : '#854d0e', border: isTerminal ? '#f59e0b' : '#1e293b' }
    };

    const color = colors[line];

    return new L.Icon({
      iconUrl: 'data:image/svg+xml;base64,' + btoa(`
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" fill="${color.fill}" stroke="${color.border}" stroke-width="${isTerminal ? '3' : '2'}"/>
          ${isActive ? `
            <circle cx="12" cy="12" r="14" fill="${color.fill}" opacity="0.3">
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

  // Custom DivIcon for station labels
  const createStationLabel = (stationName: string, line: 'main' | 'kakkanad' | 'airport') => {
    if (!L) return null;
    const colors = {
      main: 'text-teal-600',
      kakkanad: 'text-pink-600',
      airport: 'text-yellow-600'
    };

    return L.divIcon({
      html: `
        <div class="station-label ${colors[line]} font-medium text-xs bg-white/90 backdrop-blur-sm px-2 py-1 rounded shadow-sm whitespace-nowrap">
          ${stationName}
        </div>
      `,
      className: 'station-label-container',
      iconSize: [100, 20],
      iconAnchor: [-50, 10],
    });
  };

  // Simulate train positions - now based on actual station events and time
  const getTrainPositions = useMemo(() => {
    if (!rotationData || !rotationData.train_schedules || !L) return [];

    const now = new Date();
    const trainPositions = rotationData.train_schedules.map(train => {
      let currentStation: typeof kochiMetroStations[0] | undefined;
      let nextStation: typeof kochiMetroStations[0] | undefined;
      let progressBetweenStations = 0;
      let totalDelay = 0; // Initialize total delay
      let isDelayed = false; // Initialize delay status

      const relevantStations = kochiMetroStations.concat(kakkanadExtensionStations, airportExtensionStations);

      // Find the current or upcoming station event for this train
      for (let i = 0; i < train.station_events.length; i++) {
        const event = train.station_events[i];
        const [eventHours, eventMinutes] = event.expected_arrival.split(':').map(Number);
        const eventTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), eventHours, eventMinutes, 0);

        // Find the actual station object using the station name
        const stationObj = relevantStations.find(s => s.name === event.station);
        if (!stationObj) continue;

        if (eventTime < now) {
          currentStation = stationObj; // This event is in the past
          totalDelay = event.delay_minutes; // Use the latest delay for the current station
          isDelayed = event.significant_delay === 1; // Check significant_delay
        } else {
          nextStation = stationObj; // This event is in the future
          if (currentStation) {
            // Calculate progress between currentStation and nextStation
            const [prevEventHours, prevEventMinutes] = train.station_events[i - 1].expected_arrival.split(':').map(Number);
            const prevEventTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), prevEventHours, prevEventMinutes, 0);

            const durationBetween = eventTime.getTime() - prevEventTime.getTime();
            const timeElapsed = now.getTime() - prevEventTime.getTime();

            if (durationBetween > 0) {
              progressBetweenStations = timeElapsed / durationBetween;
            }
            break; // Found current segment
          } else {
            // Train has not departed yet, or is at the very first station
            currentStation = stationObj; // Assume at first station if no past events
            break;
          }
        }
      }

      let finalPosition = currentStation ? currentStation.position : [0, 0]; // Default if no events
      if (currentStation && nextStation && progressBetweenStations > 0 && progressBetweenStations < 1) {
        // Interpolate position between current and next station
        const lat = currentStation.position[0] + (nextStation.position[0] - currentStation.position[0]) * progressBetweenStations;
        const lng = currentStation.position[1] + (nextStation.position[1] - currentStation.position[1]) * progressBetweenStations;
        finalPosition = [lat, lng];
      } else if (nextStation && !currentStation) {
        // If only nextStation is found (train hasn't departed current yet), position it at nextStation
        finalPosition = nextStation.position;
      } else if (currentStation && !nextStation) {
        // If only currentStation is found (end of the line), position it at currentStation
        finalPosition = currentStation.position;
      }

      // Add slight offset for visual clarity (random for now, could be direction-based)
      const offsetLat = finalPosition[0] + (Math.random() * 0.0005 - 0.00025);
      const offsetLng = finalPosition[1] + (Math.random() * 0.0005 - 0.00025);

      return {
        id: train.train_id,
        position: [offsetLat, offsetLng] as [number, number],
        status: isDelayed ? 'delayed' : 'on_time',
        delay: totalDelay,
        currentStation: currentStation?.name || nextStation?.name || 'Unknown',
      };
    });
    return trainPositions;
  }, [rotationData, L]);

  const getStationStatus = (stationName: string) => {
    if (!rotationData) return 'inactive';

    const now = new Date();
    // Consider a station 'active' if any train is expected to arrive or depart within the last 15 minutes or next 15 minutes
    const isActive = rotationData.train_schedules.some(train =>
      train.station_events.some(event => {
        const [eventHours, eventMinutes] = event.expected_arrival.split(':').map(Number);
        const eventTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), eventHours, eventMinutes, 0);

        const fifteenMinutes = 15 * 60 * 1000; // 15 minutes in milliseconds
        const timeDiff = Math.abs(eventTime.getTime() - now.getTime());

        return (
          event.station.toLowerCase().includes(stationName.toLowerCase().split(' ')[0]) &&
          timeDiff <= fifteenMinutes
        );
      })
    );
    return isActive ? 'active' : 'inactive';
  };

  // Auto-zoom to main line
  const MapController = () => {
    const map = useMap();
    const shouldAutoZoom = useRef(true); // Only auto-zoom once

    useEffect(() => {
      if (!map || !L || !shouldAutoZoom.current) return;

      try {
        const timer = setTimeout(() => {
          const bounds = getMainLineBounds();
          if (bounds && map && map.fitBounds && typeof map.fitBounds === 'function') {
            map.fitBounds(bounds, {
              padding: [80, 120],
              maxZoom: 14
            });
            shouldAutoZoom.current = false; // Disable future auto-zooms
          }
        }, 100);

        return () => clearTimeout(timer);
      } catch (error) {
        console.error('Error fitting map bounds:', error);
      }
    }, [map]); // Only depends on map
    return null;
  };

  const handleStationClick = (stationId: string) => {
    setSelectedStation(stationId);
    onStationSelect(stationId);
  };

  // Function to render stations with labels
  const renderStationsWithLabels = (
    stations: typeof kochiMetroStations,
    line: 'main' | 'kakkanad' | 'airport',
    getStationStatus: (stationName: string) => 'active' | 'inactive'
  ) => {
    if (!L) return null;

    return stations.map(station => {
      // Use the getStationStatus from props directly
      const isActive = getStationStatus(station.name);
      const stationIcon = createStationIcon(line, isActive === 'active', station.isTerminal || false);
      const labelIcon = createStationLabel(station.name, line);

      if (!stationIcon || !labelIcon) return null;

      return (
        <div key={station.id}>
          {/* Station Dot */}
          <Marker
            position={station.position}
            icon={stationIcon}
            eventHandlers={{
              click: () => handleStationClick(station.id),
            }}
          >
            <Popup>
              <div className="text-slate-800 p-2 min-w-[180px]">
                <h3 className={`font-bold text-lg ${line === 'main' ? 'text-teal-700' :
                  line === 'kakkanad' ? 'text-pink-700' :
                    'text-yellow-700'
                  }`}>
                  {station.name}
                </h3>
                <p className="text-sm text-slate-600 flex items-center gap-1">
                  {station.isTerminal ? `🚉 ${t('map.terminal')}` : `🚉 ${t('map.station')}`}
                  <span className={`ml-2 px-2 py-0.5 text-xs rounded ${line === 'main' ? 'bg-teal-100 text-teal-800' :
                    line === 'kakkanad' ? 'bg-pink-100 text-pink-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                    {line === 'main' ? t('map.mainLine') : line === 'kakkanad' ? t('map.kakkanadLine') : t('map.airportLine')}
                  </span>
                </p>
                <p className={`text-sm font-medium ${isActive ? 'text-emerald-600' : 'text-slate-500'}`}>
                  {t('map.status')}: {isActive ? t('map.active') : t('map.quiet')}
                </p>
              </div>
            </Popup>
          </Marker>

          {/* Station Label (positioned to the left) */}
          <Marker
            position={station.position}
            icon={labelIcon}
            zIndexOffset={-1000} // Place labels behind dots
          />
        </div>
      );
    });
  };

  return (
    <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 rounded-2xl p-6 shadow-xl h-full max-h-[600px] lg:max-h-[700px]">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold bg-gradient-to-r from-teal-400 to-emerald-500 bg-clip-text text-transparent flex items-center gap-3">
          <span className="p-2 bg-gradient-to-r from-teal-500 to-emerald-500 rounded-lg">🗺️</span>
          {t('map.title')}
        </h3>
        <div className="flex gap-2">
          {/* Simplified Line Selector */}
          <div className="flex gap-2 bg-slate-700/50 p-1 rounded-lg">
            {[
              { key: 'main' as const, label: t('map.mainLine'), color: 'teal', icon: '●' },
              { key: 'kakkanad' as const, label: t('map.kakkanadLine'), color: 'pink', icon: '●' },
              { key: 'airport' as const, label: t('map.airportLine'), color: 'yellow', icon: '●' },
              { key: 'all' as const, label: t('map.allLines'), color: 'slate', icon: '●' },
            ].map(line => (
              <button
                key={line.key}
                onClick={() => setSelectedLine(line.key)}
                className={`px-3 py-1.5 text-sm rounded-md transition-all flex items-center gap-1.5 ${selectedLine === line.key
                  ? line.key === 'main'
                    ? 'bg-teal-500 text-white shadow-md'
                    : line.key === 'kakkanad'
                      ? 'bg-pink-500 text-white shadow-md'
                      : line.key === 'airport'
                        ? 'bg-yellow-500 text-white shadow-md'
                        : 'bg-slate-600 text-white shadow-md'
                  : 'text-slate-300 hover:bg-slate-600/50'
                  }`}
              >
                <span className={`${selectedLine === line.key ? 'text-white' :
                  line.key === 'main' ? 'text-teal-400' :
                    line.key === 'kakkanad' ? 'text-pink-400' :
                      line.key === 'airport' ? 'text-yellow-400' :
                        'text-slate-400'
                  }`}>{line.icon}</span>
                <span>{line.label}</span>
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowTrains(!showTrains)}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-all flex items-center gap-2 ${showTrains
              ? 'bg-teal-500/20 border-teal-500 text-teal-300'
              : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:border-teal-500/50'
              }`}
          >
            <span className="text-sm">🚆</span>
            <span>{showTrains ? t('map.trainsToggle') : t('map.trainsToggleOff')}</span>
          </button>
        </div>
      </div>

      <div className="relative bg-gradient-to-br from-slate-900/80 to-slate-800/80 rounded-xl p-4 border border-slate-600/30 h-[400px] lg:h-[700px]">
        <div className="h-full rounded-lg overflow-hidden">
          <MapContainer
            center={[10.0160, 76.2990]}
            zoom={3}
            style={{ height: '100%', width: '100%' }}
            className="rounded-lg"
            zoomControl={true}
            scrollWheelZoom={true}
          >
            <MapController />

            {/* Cleaner tile layer */}
            {/* Cleaner tile layer */}
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />

            {/* Main Metro Line - Teal */}
            {(selectedLine === 'main' || selectedLine === 'all') && (
              <>
                <Polyline
                  positions={metroLine}
                  color="#2dd4bf"
                  weight={6}
                  opacity={0.9}
                  smoothFactor={1}
                />
                {renderStationsWithLabels(kochiMetroStations, 'main', getStationStatus)}
              </>
            )}

            {/* Kakkanad Extension Line - Pink */}
            {(selectedLine === 'kakkanad' || selectedLine === 'all') && (
              <>
                <Polyline
                  positions={kakkanadLine}
                  color="#ec4899"
                  weight={4}
                  opacity={0.7}
                  smoothFactor={1}
                />
                {renderStationsWithLabels(kakkanadExtensionStations, 'kakkanad', getStationStatus)}
              </>
            )}

            {/* Airport Extension Line - Yellow */}
            {(selectedLine === 'airport' || selectedLine === 'all') && (
              <>
                <Polyline
                  positions={airportLine}
                  color="#eab308"
                  weight={4}
                  opacity={0.7}
                  smoothFactor={1}
                />
                {renderStationsWithLabels(airportExtensionStations, 'airport', getStationStatus)}
              </>
            )}

            {/* Trains */}
            {showTrains && icons && getTrainPositions.map((train: { id: string; position: [number, number]; status: string; delay: number; currentStation: string; }) => (
              <Marker
                key={train.id}
                position={train.position}
                icon={train.status === 'delayed' ? icons.delayedTrainIcon : icons.trainIcon}
              >
                <Popup>
                  <div className="text-slate-800 p-2 min-w-[180px]">
                    <h3 className="font-bold text-lg">{train.id}</h3>
                    <p className={`text-sm font-medium ${train.status === 'delayed' ? 'text-rose-600' : 'text-emerald-600'
                      }`}>
                      {t('map.status')}: {train.status === 'delayed' ? `${t('stationDetails.delayed')} +${train.delay}m` : t('stationDetails.onTime')}
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

        {/* Compact Legend */}
        <div className="flex flex-wrap justify-center gap-3 mt-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-teal-400"></div>
            <span className="text-slate-300">{t('map.mainLine')} Line</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-pink-400"></div>
            <span className="text-slate-300">{t('map.kakkanadLine')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
            <span className="text-slate-300">{t('map.airportLine')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full border-2 border-amber-400 bg-amber-400/20"></div>
            <span className="text-slate-300">{t('map.terminal')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-2 bg-emerald-400 rounded-sm"></div>
            <span className="text-slate-300">{t('filters.train')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const RotationPage: React.FC = () => {
  const t = useTranslations('Rotation');
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
  const [currentView, setCurrentView] = useState<'timeline' | 'stations' | 'overview'>('overview');
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
      const endpoint = usePredictions ? `${API_BASE}/rotation/predictions` : `${API_BASE}/rotation/schedule`;
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error('Failed to fetch rotation data');
      const data: RotationData = await response.json();
      setRotationData(data);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).__rotationData = data;
        const map = new Map<string, string>();
        data.train_schedules.forEach(ts => {
          ts.station_events.forEach(ev => {
            const key = `${ev.expected_arrival}|${ev.station}|${ev.direction}|${ev.rotation}`;
            map.set(key, ts.train_id);
          });
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).__rotationDataTrainMap = map;
      } catch { }
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
    if (delay <= 1) return 'text-amber-400'; // Minor delay
    if (delay <= 5) return 'text-orange-400'; // Moderate delay
    return 'text-rose-500'; // Significant delay
  };

  const getDelayBgColor = (delay: number) => {
    if (delay === 0) return 'bg-emerald-500/20';
    if (delay <= 1) return 'bg-amber-500/20';
    if (delay <= 5) return 'bg-orange-500/20';
    return 'bg-rose-500/20';
  };

  // Fix 3: Rename getStatusColor to _getStatusColor
  const _getStatusColor = (status: string) => {
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
        weather: 0,
        crowd: 0,
        anomaly: 0,
        cascading: 0,
        other: 0,
      },
      delay_reasons: [],
    };
  };

  const getStationStatus = (stationName: string) => {
    if (!rotationData) return 'inactive';

    const now = new Date();
    // Consider a station 'active' if any train is expected to arrive or depart within the last 15 minutes or next 15 minutes
    const isActive = rotationData.train_schedules.some(train =>
      train.station_events.some(event => {
        const [eventHours, eventMinutes] = event.expected_arrival.split(':').map(Number);
        const eventTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), eventHours, eventMinutes, 0);

        const fifteenMinutes = 15 * 60 * 1000; // 15 minutes in milliseconds
        const timeDiff = Math.abs(eventTime.getTime() - now.getTime());

        return (
          event.station.toLowerCase().includes(stationName.toLowerCase().split(' ')[0]) &&
          timeDiff <= fifteenMinutes
        );
      })
    );
    return isActive ? 'active' : 'inactive';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-teal-400 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-100">{t('loading.title')}</h2>
          <p className="text-gray-400 mt-2">{t('loading.subtitle')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800/80 backdrop-blur-sm border border-slate-600 rounded-2xl p-8 max-w-md text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-100 mb-2">{t('error.title')}</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={fetchRotationData}
            className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg"
          >
            {t('error.tryAgain')}
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
                {t('title')}
              </h1>
              <p className="text-slate-400 mt-2 text-sm lg:text-base">{t('subtitle')}</p>
            </div>

            <div className="flex items-center gap-4 lg:gap-6">
              <div className="text-right">
                <div className="text-xl lg:text-2xl font-bold text-teal-300">{rotationData?.total_trains || 0}</div>
                <div className="text-slate-400 text-xs lg:text-sm">{t('activeTrains')}</div>
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
                <h3 className="text-xl font-bold text-teal-200">{t('stations')}</h3>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 max-h-[200px] mb-4">
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
                        airportExtensionStations.find(s => s.id === selectedStation))?.name} {t('map.station')}
                    </h4>
                    <span className="px-2 py-1 bg-teal-500/20 text-teal-300 rounded text-xs font-medium">
                      {getStationStatus((kochiMetroStations.find(s => s.id === selectedStation) ||
                        kakkanadExtensionStations.find(s => s.id === selectedStation) ||
                        airportExtensionStations.find(s => s.id === selectedStation))!.name) === 'active' ? `🚉 ${t('map.live')}` : `💤 ${t('map.quiet')}`}
                    </span>
                  </div>
                  <div className="text-sm text-slate-300 space-y-2">
                    <div>{t('stationDetails.coordinates')}: <span className="text-teal-300 font-mono text-xs">
                      {(kochiMetroStations.find(s => s.id === selectedStation) ||
                        kakkanadExtensionStations.find(s => s.id === selectedStation) ||
                        airportExtensionStations.find(s => s.id === selectedStation))?.position[0].toFixed(4)},
                      {(kochiMetroStations.find(s => s.id === selectedStation) ||
                        kakkanadExtensionStations.find(s => s.id === selectedStation) ||
                        airportExtensionStations.find(s => s.id === selectedStation))?.position[1].toFixed(4)}
                    </span></div>
                    <div>{t('stationDetails.nextTrain')}: <span className="text-teal-300 font-semibold">5-7 min</span></div>
                    <div>{t('stationDetails.platform')}: <span className="text-amber-300 font-semibold">1</span></div>
                    <div className="pt-2 border-t border-teal-500/20 mt-2">
                      <button
                        onClick={() => setSelectedStation(null)}
                        className="w-full py-2 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 rounded-lg transition-colors text-sm"
                      >
                        {t('stationDetails.clearSelection')}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4 p-4 bg-gradient-to-r from-slate-700/40 to-slate-800/40 rounded-xl border-0 flex-1 min-h-[200px] flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-4xl mb-2">📍</div>
                    <p className="text-slate-400 text-sm">{t('stationDetails.clickPrompt')}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Center - WIDER Metro Map */}
          <div className="xl:col-span-8">
            <MetroMap rotationData={rotationData} onStationSelect={setSelectedStation} t={t} />
          </div>

          {/* Right Sidebar - Stats Cards */}
          <div className="xl:col-span-2">
            <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl p-6 h-full">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg">
                  <span className="text-white">📊</span>
                </div>
                <h3 className="text-xl font-bold text-cyan-200">{t('liveStatus')}</h3>
              </div>

              {/* Stats Cards */}
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-teal-500/20 to-emerald-500/10 rounded-xl p-4 border border-teal-500/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-teal-400">{rotationData?.summary?.total_events || 0}</div>
                      <div className="text-slate-400 text-sm">{t('totalEvents')}</div>
                    </div>
                    <div className="text-xl">📅</div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-rose-500/20 to-pink-500/10 rounded-xl p-4 border border-rose-500/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-rose-400">{rotationData.summary.delayed_events}</div>
                      <div className="text-slate-400 text-sm">{t('delayedEvents')}</div>
                    </div>
                    <div className="text-xl">⚠️</div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-amber-500/20 to-orange-500/10 rounded-xl p-4 border border-amber-500/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-amber-400">{rotationData.summary.avg_delay}m</div>
                      <div className="text-slate-400 text-sm">{t('avgDelay')}</div>
                    </div>
                    <div className="text-xl">⏰</div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-500/20 to-indigo-500/10 rounded-xl p-4 border border-purple-500/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-purple-400">{rotationData.summary.significant_delays}</div>
                      <div className="text-slate-400 text-sm">{t('significantDelays')}</div>
                    </div>
                    <div className="text-xl">🔴</div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/10 rounded-xl p-4 border border-blue-500/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-blue-400">{rotationData.summary.max_delay}m</div>
                      <div className="text-slate-400 text-sm">{t('maxDelay')}</div>
                    </div>
                    <div className="text-xl">📈</div>
                  </div>
                </div>
              </div>

              {/* Service Info */}
              <div className="mt-6 p-4 bg-slate-700/40 rounded-xl border-0">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-sm">{t('serviceHours')}</span>
                    <span className="text-teal-300 font-semibold text-sm">
                      {rotationData.service_hours.start} - {rotationData.service_hours.end}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-sm">{t('weather')}</span>
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
                      <span className="text-teal-200 text-sm font-medium">{t('usePredictions')}</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Dashboard Area */}
        <div className="space-y-6 min-h-[500px]"> {/* Add min-height here */}
          {/* View Controls */}
          <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl p-6 border-0">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex gap-2">
                {[
                  { key: 'overview' as const, label: t('view.overview'), icon: '🌐' },
                  { key: 'timeline' as const, label: t('view.timeline'), icon: '📅' },
                  { key: 'stations' as const, label: t('view.stations'), icon: '🚉' },
                ].map(view => (
                  <button
                    key={view.key}
                    onClick={() => setCurrentView(view.key)}
                    className={`flex items-center gap-2 py-3 px-4 rounded-xl font-medium border transition-all duration-200 ${currentView === view.key
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
                  <span className="text-teal-200 text-sm font-medium">{t('filters.showDelaysOnly')}</span>
                </label>

                <button
                  onClick={() => setExpandedTrains(new Set())}
                  className="px-3 py-2 text-sm text-slate-400 hover:text-teal-300 hover:bg-slate-700/50 rounded-lg transition border border-transparent hover:border-slate-600"
                >
                  {t('filters.collapseAll')}
                </button>
              </div>
            </div>

            {/* Filter Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div>
                <label className="block text-sm font-semibold text-teal-200 mb-2">{t('filters.timeRange')}</label>
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
                <label className="block text-sm font-semibold text-teal-200 mb-2">{t('filters.station')}</label>
                <select
                  value={filters.station}
                  onChange={(e) => setFilters(prev => ({ ...prev, station: e.target.value }))}
                  className="w-full bg-slate-700/50 text-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                >
                  <option value="All Stations">{t('filters.allStations')}</option>
                  {rotationData.stations.map(station => (
                    <option key={station} value={station}>{station}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-teal-200 mb-2">{t('filters.train')}</label>
                <select
                  value={filters.train}
                  onChange={(e) => setFilters(prev => ({ ...prev, train: e.target.value }))}
                  className="w-full bg-slate-700/50 border border-slate-600 text-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500"
                >
                  <option value="All Trains">{t('filters.allTrains')}</option>
                  {rotationData.train_schedules.map(train => (
                    <option key={train.train_id} value={train.train_id}>
                      {train.train_id} ({train.total_rotations} {t('trainCard.rotations')})
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
              // Fix 4: Add ESLint disable for TimelineView
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              <TimelineView
                events={filteredEvents}
                trains={rotationData.train_schedules}
                expandedTrains={expandedTrains}
                onToggleTrain={toggleTrainExpansion}
                getDelayColor={getDelayColor}
                getDelayBgColor={getDelayBgColor}
                getDelayAnalysis={getDelayAnalysis}
                selectedTrain={filters.train}
              />
            )}

            {currentView === 'stations' && (
              <StationsView rotationData={rotationData} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};



const OverviewView: React.FC<{
  rotationData: RotationData;
  expandedTrains: Set<string>;
  onToggleTrain: (trainId: string) => void;
  getDelayColor: (delay: number) => string;
  getDelayBgColor: (delay: number) => string;
  getDelayAnalysis: (train: TrainSchedule) => TrainSchedule['delay_analysis'];
}> = ({ rotationData, expandedTrains, onToggleTrain, getDelayColor, getDelayBgColor, getDelayAnalysis }) => {
  const t = useTranslations('Rotation');
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
                      {train.total_rotations} {t('trainCard.rotations')} • {train.train_config?.job_cards_count || 0} {t('trainCard.jobCards')}
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
                  <div className="text-slate-500 text-xs">{t('trainCard.firstDeparture')}</div>
                </div>
                <div className="text-center">
                  <div className="text-emerald-400 font-bold text-lg">{train.last_arrival}</div>
                  <div className="text-slate-500 text-xs">{t('trainCard.lastArrival')}</div>
                </div>
                <div className="text-center">
                  <div className="text-amber-400 font-bold text-lg">{train.train_config?.high_critical_jobs || 0}</div>
                  <div className="text-slate-500 text-xs">{t('trainCard.criticalJobs')}</div>
                </div>
              </div>

              {expandedTrains.has(train.train_id) && (
                <div className="mt-4 space-y-4 pt-4 border-t border-slate-600/50">
                  <div className="text-sm text-slate-300">
                    <div className="font-semibold text-teal-200 mb-2">{t('trainCard.overallDelayBreakdown')}</div>
                    <ul className="list-disc list-inside text-slate-500 text-xs space-y-1">
                      {delayAnalysis.delay_reasons && delayAnalysis.delay_reasons.length > 0 ? (
                        delayAnalysis.delay_reasons.map((reason, idx) => (
                          <li key={idx}>{reason}</li>
                        ))
                      ) : (
                        <li>{t('trainCard.noSpecificReasons')}</li>
                      )}
                    </ul>
                  </div>
                  <div className="text-sm text-slate-300">
                    <div className="font-semibold text-teal-200 mb-2">{t('trainCard.nextStations')}</div>
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
                        <div className="text-slate-400 text-center py-2">{t('trainCard.noEvents')}</div>
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


// eslint-disable-next-line @typescript-eslint/no-unused-vars
const TimelineView: React.FC<{
  events: StationEvent[];
  trains: TrainSchedule[];
  expandedTrains: Set<string>;
  onToggleTrain: (trainId: string) => void;
  getDelayColor: (delay: number) => string;
  getDelayBgColor: (delay: number) => string;
  getDelayAnalysis: (train: TrainSchedule) => TrainSchedule['delay_analysis'];
  selectedTrain?: string;
}> = ({ events, trains, getDelayColor, getDelayBgColor, getDelayAnalysis, selectedTrain: propSelectedTrain = 'All Trains' }) => {
  const t = useTranslations('Rotation');
  const [selectedTrain, setSelectedTrain] = useState<string>(propSelectedTrain);
  const [selectedStation, setSelectedStation] = useState<string | null>(null);
  const [currentTrainPosition, setCurrentTrainPosition] = useState<string | null>(null);

  // Get all unique stations in order
  const allStations = useMemo(() => {
    if (trains.length === 0) return [];

    const stationMap = new Map<string, number>();

    trains.forEach(train => {
      train.station_events.forEach(event => {
        if (!stationMap.has(event.station)) {
          stationMap.set(event.station, event.sequence);
        }
      });
    });

    return Array.from(stationMap.entries())
      .sort((a, b) => a[1] - b[1])
      .map(([station]) => station);
  }, [trains]);

  // Get current train's position
  const getTrainPosition = useMemo(() => {
    if (selectedTrain === 'All Trains' || trains.length === 0) {
      return null;
    }

    const train = trains.find(t => t.train_id === selectedTrain);
    if (!train || !train.station_events || train.station_events.length === 0) return null;

    const now = new Date();
    const events = train.station_events;

    // Find current station
    let currentStation = events[0].station;
    for (let i = 0; i < events.length; i++) {
      const [hours, minutes] = events[i].expected_arrival.split(':').map(Number);
      const eventTime = new Date();
      eventTime.setHours(hours, minutes, 0, 0);

      if (eventTime > now) {
        currentStation = i > 0 ? events[i - 1].station : events[0].station;
        break;
      }
      if (i === events.length - 1) {
        currentStation = events[i].station;
      }
    }

    return currentStation;
  }, [selectedTrain, trains]);

  // Update current train position when selectedTrain changes
  useEffect(() => {
    if (selectedTrain !== 'All Trains') {
      const position = getTrainPosition;
      setCurrentTrainPosition(position);
    } else {
      setCurrentTrainPosition(null);
    }
  }, [selectedTrain, getTrainPosition]);

  // Get events for selected station
  const getStationEvents = (stationName: string) => {
    if (!selectedStation || selectedStation !== stationName) return [];

    const stationEvents: Array<{
      time: string;
      delay: number;
      rotation: number;
      direction: string;
      trainId: string;
      scheduled: string;
      delayReasons: string[];
      delayProbability?: number;
    }> = [];

    trains.forEach(train => {
      train.station_events.forEach(event => {
        if (event.station === stationName) {
          stationEvents.push({
            time: event.expected_arrival,
            delay: event.delay_minutes,
            rotation: event.rotation,
            direction: event.direction,
            trainId: train.train_id,
            scheduled: event.scheduled_arrival,
            delayReasons: event.delay_reasons || [],
            delayProbability: event.delay_probability || 0
          });
        }
      });
    });

    return stationEvents.sort((a, b) => a.time.localeCompare(b.time));
  };

  const handleStationClick = (station: string) => {
    setSelectedStation(selectedStation === station ? null : station);
  };

  return (
    <div className="w-full p-6 bg-gradient-to-br from-slate-800/50 to-slate-700/50 backdrop-blur-lg rounded-2xl min-h-[400px]">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 rounded-xl border border-cyan-500/30">
            <span className="text-2xl">🚄</span>
          </div>
          <div>
            <h3 className="text-xl font-bold text-cyan-300">{t('timeline.title')}</h3>
            <p className="text-slate-400 text-sm">{t('timeline.subtitle')}</p>
          </div>
        </div>

        {/* Train Selector */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-teal-200 mb-2">{t('timeline.selectTrain')}</label>
          <select
            value={selectedTrain}
            onChange={(e) => setSelectedTrain(e.target.value)}
            className="w-full max-w-md bg-slate-700/50 border border-slate-600 text-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500"
          >
            <option value="All Trains">{t('timeline.viewStationsOnly')}</option>
            {trains.map(train => (
              <option key={train.train_id} value={train.train_id}>
                {train.train_id}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Simple Horizontal Metro Line */}
      <div className="relative mb-8">
        {/* The horizontal metro line */}
        <div className="relative h-1 bg-gradient-to-r from-slate-600 via-slate-500 to-slate-600 rounded-full mb-12"></div>

        {/* Station Dots and Names */}
        <div className="flex justify-between items-start">
          {allStations.map((station, index) => {
            const isSelected = selectedStation === station;
            const isTrainHere = currentTrainPosition === station;

            return (
              <div key={station} className="flex flex-col items-center -mt-6">
                {/* Station Dot and Line Connection */}
                <div className="relative flex flex-col items-center">
                  {/* Vertical line connecting dot to station name */}
                  <div className={`h-8 w-0.5 mb-2 ${isSelected ? 'bg-cyan-400' : 'bg-slate-600'}`}></div>

                  {/* Station Dot */}
                  <button
                    onClick={() => handleStationClick(station)}
                    className={`relative w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${isSelected
                      ? 'bg-cyan-500 border-cyan-400 scale-125 shadow-lg shadow-cyan-500/30'
                      : isTrainHere
                        ? 'bg-emerald-500 border-emerald-400 shadow-lg shadow-emerald-500/30'
                        : 'bg-slate-700 border-slate-600 hover:border-teal-400 hover:scale-110'
                      }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : isTrainHere ? 'bg-white' : 'bg-slate-400'}`}></div>

                    {/* Train indicator */}
                    {isTrainHere && selectedTrain !== 'All Trains' && (
                      <>
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 px-2 py-1 rounded border border-emerald-500 text-xs text-emerald-300 whitespace-nowrap">
                          {selectedTrain}
                        </div>
                        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-2xl">↓</div>
                      </>
                    )}

                    {/* Selected indicator */}
                    {isSelected && (
                      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-2xl text-cyan-400">↓</div>
                    )}
                  </button>
                </div>

                {/* Station Name */}
                <div className={`mt-2 text-center max-w-[80px] ${isSelected ? 'text-cyan-300 font-semibold' : 'text-slate-300'}`}>
                  <p className="text-xs truncate">{station}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Station Info */}
      {selectedStation && (
        <div className="mt-12 p-6 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-cyan-500/30 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                <span className="text-white">🚉</span>
              </div>
              <h4 className="text-xl font-bold text-cyan-300">{selectedStation}</h4>
            </div>
            <button
              onClick={() => setSelectedStation(null)}
              className="px-3 py-1 text-sm text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Train Visits */}
            <div>
              <h5 className="text-teal-200 font-semibold mb-3">{t('stationDetails.trainVisits')}</h5>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {getStationEvents(selectedStation).map((visit, idx) => (
                  <div key={idx} className="p-3 bg-slate-700/40 rounded-lg mb-2 border border-slate-600/30 transition-all duration-200 hover:bg-slate-700/60">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-cyan-300 flex items-center gap-2">
                        {visit.trainId}
                        {visit.delay > 1 && <span className="text-rose-400 text-xs font-medium">(Delayed)</span>}
                      </span>
                      <div className="text-right">
                        <div className={`font-mono font-bold ${getDelayColor(visit.delay)}`}>
                          {visit.time}
                          {visit.delay > 0.1 && (<span className="text-xs ml-2">(+{visit.delay}m)</span>)}
                        </div>
                        <div className="text-xs text-slate-500">sched: {visit.scheduled}</div>
                      </div>
                    </div>
                    <div className="text-xs text-slate-400 flex items-center justify-between">
                      <span>Rotation {visit.rotation} • {visit.direction === 'forward' ? '→ TRIPUNITHRA' : '← ALUVA'}</span>
                      {visit.delayProbability !== undefined && visit.delayProbability > 0 && (
                        <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded-md font-medium">
                          Risk: {Math.round(visit.delayProbability * 100)}%
                        </span>
                      )}
                    </div>
                    {visit.delayReasons && visit.delayReasons.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-600/50">
                        <p className="text-slate-400 text-xs font-semibold mb-1">Reasons:</p>
                        <ul className="list-disc list-inside text-slate-500 text-xs space-y-0.5">
                          {visit.delayReasons.map((reason, rIdx) => (
                            <li key={rIdx}>{reason}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Station Stats */}
            <div>
              <h5 className="text-teal-200 font-semibold mb-3">{t('stationDetails.stationStats')}</h5>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-700/40 rounded-lg">
                  <div className="text-2xl font-bold text-cyan-300">
                    {getStationEvents(selectedStation).length}
                  </div>
                  <div className="text-xs text-slate-400">{t('stationDetails.totalVisits')}</div>
                </div>
                <div className="p-3 bg-slate-700/40 rounded-lg">
                  <div className="text-2xl font-bold text-emerald-300">
                    {getStationEvents(selectedStation).filter(v => v.delay === 0).length}
                  </div>
                  <div className="text-xs text-slate-400">{t('stationDetails.onTime')}</div>
                </div>
                <div className="p-3 bg-slate-700/40 rounded-lg">
                  <div className="text-2xl font-bold text-amber-300">
                    {getStationEvents(selectedStation).filter(v => v.delay > 0).length}
                  </div>
                  <div className="text-xs text-slate-400">{t('stationDetails.delayed')}</div>
                </div>
                <div className="p-3 bg-slate-700/40 rounded-lg">
                  <div className="text-2xl font-bold text-rose-300">
                    {getStationEvents(selectedStation).length > 0
                      ? (getStationEvents(selectedStation).reduce((sum, v) => sum + v.delay, 0) / getStationEvents(selectedStation).length).toFixed(1)
                      : '0'
                    }m
                  </div>
                  <div className="text-xs text-slate-400">{t('avgDelay')}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Current Train Info */}
      {selectedTrain !== 'All Trains' && currentTrainPosition && (
        <div className="mt-6 p-4 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-xl border border-emerald-500/30">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-emerald-300 font-bold">{selectedTrain}</div>
              <div className="text-slate-400 text-sm">{t('timeline.currentlyAt')}: {currentTrainPosition}</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
              <span className="text-emerald-300 text-sm">{t('map.live')}</span>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-8 pt-6 border-t border-slate-600/30">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-slate-700 border-2 border-slate-600"></div>
          <span className="text-slate-400 text-sm">{t('map.station')}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-emerald-500 border-2 border-emerald-400"></div>
          <span className="text-slate-400 text-sm">Train Here</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-cyan-500 border-2 border-cyan-400"></div>
          <span className="text-slate-400 text-sm">{t('stationDetails.clearSelection')}</span>
        </div>
      </div>
    </div>
  );
};

// Stations View Component
const StationsView: React.FC<{ rotationData: RotationData }> = ({ rotationData }) => {
  const t = useTranslations('Rotation');
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
              {t('journey.title')}
            </h3>
            <p className="text-slate-400 text-sm mt-2">{t('journey.subtitle')}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-2xl px-5 py-3 border border-emerald-500/30">
          <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse shadow-lg shadow-emerald-400/50"></div>
          <span className="text-emerald-300 text-sm font-bold tracking-wider">{t('journey.liveTracking')}</span>
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
          {/* Fix 5: Add underscore to index parameter */}
          {rotationData.station_timings.map((station, _index) => (
            <div
              key={station.station}
              className="group relative cursor-pointer transform hover:scale-105 transition-all duration-500"
            >
              {/* Station Connection Line */}
              {_index < rotationData.station_timings.length - 1 && (
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
                        <span className="text-cyan-300 font-bold text-xl">{_index + 1}</span>

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
                            {t('journey.terminalStations')}
                          </span>
                        ) : (
                          <span className="px-3 py-1.5 bg-gradient-to-r from-teal-500/20 to-cyan-500/20 text-teal-300 rounded-xl text-sm font-bold border border-teal-500/30">
                            {t('journey.next')}: {station.next_station_duration}min
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-8 text-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 bg-gradient-to-br from-teal-400 to-cyan-400 rounded-full animate-pulse shadow-lg shadow-teal-400/50"></div>
                          <span className="text-slate-300">
                            {t('journey.travel')}: <span className="text-teal-300 font-bold">{station.next_station_duration || 0} min</span>
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 bg-gradient-to-br from-blue-400 to-indigo-400 rounded-full shadow-lg shadow-blue-400/50"></div>
                          <span className="text-slate-300">
                            {t('journey.sequence')}: <span className="text-blue-300 font-bold">{_index + 1}</span>
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
                      <div className="text-slate-400 text-sm font-medium">{t('journey.fromOrigin')}</div>
                    </div>

                    <div className="flex items-center gap-3 justify-end">
                      <div className={`w-4 h-4 rounded-full border-2 shadow-lg ${_index === 0
                        ? 'bg-emerald-500 border-emerald-400 animate-pulse shadow-emerald-400/50'
                        : _index === rotationData.station_timings.length - 1
                          ? 'bg-amber-500 border-amber-400 shadow-amber-400/50'
                          : 'bg-cyan-500 border-cyan-400 shadow-cyan-400/50'
                        }`}></div>
                      <span className="text-slate-300 text-sm font-bold tracking-wide">
                        {_index === 0 ? t('journey.departure') : _index === rotationData.station_timings.length - 1 ? t('journey.destination') : t('journey.inTransit')}
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
            <div className="text-slate-400 text-sm font-medium mt-2">{t('journey.totalStations')}</div>
          </div>

          <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 rounded-2xl p-6 border border-slate-600/20 hover:border-teal-500/30 transition-all duration-300 group">
            <div className="text-4xl font-black bg-gradient-to-r from-teal-300 to-cyan-300 bg-clip-text text-transparent group-hover:scale-110 transition-transform duration-300">
              {rotationData.station_timings[rotationData.station_timings.length - 1]?.cumulative_time || 0}m
            </div>
            <div className="text-slate-400 text-sm font-medium mt-2">{t('journey.totalDuration')}</div>
          </div>

          <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 rounded-2xl p-6 border border-slate-600/20 hover:border-blue-500/30 transition-all duration-300 group">
            <div className="text-4xl font-black bg-gradient-to-r from-blue-300 to-indigo-300 bg-clip-text text-transparent group-hover:scale-110 transition-transform duration-300">
              {Math.round((rotationData.station_timings[rotationData.station_timings.length - 1]?.cumulative_time || 0) / rotationData.station_timings.length)}m
            </div>
            <div className="text-slate-400 text-sm font-medium mt-2">{t('journey.avgInterval')}</div>
          </div>

          <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/50 rounded-2xl p-6 border border-slate-600/20 hover:border-purple-500/30 transition-all duration-300 group">
            <div className="text-4xl font-black bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent group-hover:scale-110 transition-transform duration-300">
              {rotationData.station_timings.filter(s => s.next_station_duration === 0).length}
            </div>
            <div className="text-slate-400 text-sm font-medium mt-2">{t('journey.terminalStations')}</div>
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

// Helper to map an event back to its train id from the current rotationData in closure
function findTrainIdForEvent(event: StationEvent): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const any = (window as any).__rotationData as RotationData | undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (any) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const t of any.train_schedules) {
        if (t.station_events && t.station_events.some(e => e.station === event.station && e.expected_arrival === event.expected_arrival && e.scheduled_arrival === event.scheduled_arrival && e.direction === event.direction && e.rotation === event.rotation)) {
          return t.train_id;
        }
      }
    }
  } catch { }
  return `Train`;
}

export default RotationPage;