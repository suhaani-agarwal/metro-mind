"use client";

import { useState, useEffect } from "react";
import axios from "axios";

interface TrainParking {
  train_id: string;
  bay: string;
  position: number;
  status: "parking" | "maintenance";
  arrival_time: string;
  departure_time?: string;
  notes: string;
}

interface ParkingTrack {
  track: string;
  positions: number[];
  type: "parking" | "maintenance";
}

export default function TrainParkingPage() {
  const [trains, setTrains] = useState<string[]>([]);
  const [parkingData, setParkingData] = useState<TrainParking[]>([]);
  const [selectedTrain, setSelectedTrain] = useState<string>("");
  const [selectedTrack, setSelectedTrack] = useState<string>("");
  const [selectedPosition, setSelectedPosition] = useState<number>(0);
  const [status, setStatus] = useState<"parking" | "maintenance">("parking");
  const [notes, setNotes] = useState<string>("");
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editingTrain, setEditingTrain] = useState<string>("");

  // Train ID mapping function - converts R001 to TM001
  const mapToTMFormat = (trainId: string): string => {
    if (trainId.startsWith("R")) {
      return trainId.replace("R", "TM");
    }
    return trainId; // Return as-is if it doesn't start with R
  };

  // Reverse mapping - converts TM001 back to R001 (if needed for backend, but we'll use TM everywhere)
  const mapToRFormat = (trainId: string): string => {
    if (trainId.startsWith("TM")) {
      return trainId.replace("TM", "R");
    }
    return trainId;
  };

  const parkingTracks: ParkingTrack[] = [
    { track: "01", positions: [1, 2], type: "parking" },
    { track: "02", positions: [1, 2], type: "parking" },
    { track: "03", positions: [1, 2], type: "parking" },
    { track: "04", positions: [1, 2], type: "parking" },
    { track: "05", positions: [1, 2], type: "parking" },
    { track: "06", positions: [1, 2], type: "parking" },
    { track: "07", positions: [1, 2], type: "parking" },
    { track: "08", positions: [1, 2], type: "parking" },
    { track: "09", positions: [1, 2], type: "parking" },
    { track: "10", positions: [1, 2], type: "parking" },
    { track: "11", positions: [1, 2], type: "parking" },
    { track: "12", positions: [1, 2], type: "parking" },
    { track: "IBL01", positions: [1], type: "maintenance" },
    { track: "IBL02", positions: [1], type: "maintenance" },
    { track: "IBL03", positions: [1], type: "maintenance" },
    { track: "IBL04", positions: [1], type: "maintenance" },
    { track: "IBL05", positions: [1], type: "maintenance" },
  ];

  useEffect(() => {
    fetchTrains();
    fetchParkingData();
  }, []);

  const fetchTrains = async () => {
    try {
      const response = await axios.get(
        "http://localhost:8000/api/nightly/trains"
      );
      // Convert all train IDs to TM format for display
      const tmTrains = response.data.trains.map((train: string) =>
        mapToTMFormat(train)
      );
      setTrains(tmTrains);
    } catch (error) {
      console.error("Error fetching trains:", error);
    }
  };

  const fetchParkingData = async () => {
    try {
      const response = await axios.get(
        "http://localhost:8000/api/nightly/parking/assignments"
      );
      // Convert all train IDs in parking data to TM format
      const tmParkingData =
        response.data.assignments?.map((assignment: TrainParking) => ({
          ...assignment,
          train_id: mapToTMFormat(assignment.train_id), // Save as TM format
        })) || [];
      setParkingData(tmParkingData);
    } catch (error) {
      console.error("Error fetching parking data:", error);
      setParkingData([]);
    }
  };

  /** Display helper */
  const getPositionDisplayName = (bay: string, position: number) => {
    if (bay.startsWith("PT")) {
      const track = bay.replace("PT", "");
      return `Track ${track} Position ${position}`;
    } else if (bay.startsWith("IBL")) {
      const track = bay.replace("IBL", "");
      return `Maintenance IBL${track}`;
    }
    return `${bay}-${position}`;
  };

  /** Occupancy check */
  const isPositionOccupied = (
    track: string,
    position: number,
    trackType: "parking" | "maintenance"
  ) => {
    const bay = getBayFromTrack(track, trackType);
    return parkingData.some(
      (assignment) =>
        assignment.bay === bay &&
        assignment.position === position &&
        assignment.status === trackType &&
        !assignment.departure_time
    );
  };

  /** Get train at position */
  const getTrainAtPosition = (
    track: string,
    position: number,
    trackType: "parking" | "maintenance"
  ) => {
    const bay = getBayFromTrack(track, trackType);
    return parkingData.find(
      (assignment) =>
        assignment.bay === bay &&
        assignment.position === position &&
        assignment.status === trackType &&
        !assignment.departure_time
    );
  };

  /** Convert track to bay format */
  const getBayFromTrack = (
    track: string,
    trackType: "parking" | "maintenance"
  ) => {
    if (trackType === "maintenance") {
      return track;
    }
    return `PT${track.padStart(2, "0")}`;
  };

  /** Handle status change */
  const handleStatusChange = (newStatus: "parking" | "maintenance") => {
    setStatus(newStatus);
    setSelectedTrack("");
    setSelectedPosition(newStatus === "maintenance" ? 1 : 0);
  };

  /** Handle track selection */
  const handleTrackChange = (track: string) => {
    setSelectedTrack(track);
    if (status === "maintenance") {
      setSelectedPosition(1);
    } else {
      setSelectedPosition(0);
    }
  };

  /** Assign parking */
  const handleAssignParking = async () => {
    if (!selectedTrain || !selectedTrack || !selectedPosition) {
      alert("Please select a train, track, and position");
      return;
    }

    const trackType = status;
    if (
      isPositionOccupied(selectedTrack, selectedPosition, trackType) &&
      !isEditing
    ) {
      alert(
        `Position ${getBayFromTrack(
          selectedTrack,
          trackType
        )} is already occupied!`
      );
      return;
    }

    try {
      const bay = getBayFromTrack(selectedTrack, status);

      // Save with TM format directly (no conversion needed since we're using TM everywhere)
      const payload: TrainParking = {
        train_id: selectedTrain, // This is already in TM format
        bay: bay,
        position: selectedPosition,
        status,
        arrival_time: new Date().toISOString(),
        notes,
      };

      if (isEditing) {
        await axios.put(
          `http://localhost:8000/api/nightly/parking/assignment/${editingTrain}`,
          payload
        );
        alert(`Parking assignment updated for Train ${selectedTrain} ✅`);
      } else {
        await axios.post(
          "http://localhost:8000/api/nightly/parking/assignment",
          payload
        );
        alert(
          `Train ${selectedTrain} assigned to ${getPositionDisplayName(
            bay,
            selectedPosition
          )} ✅`
        );
      }

      resetForm();
      fetchParkingData();
    } catch (error) {
      console.error("Error assigning parking:", error);
      alert("Failed to assign parking");
    }
  };

  /** Edit assignment */
  const handleEdit = (trainParking: TrainParking) => {
    let track = "";

    if (trainParking.bay.startsWith("PT")) {
      track = trainParking.bay.replace("PT", "");
    } else if (trainParking.bay.startsWith("IBL")) {
      track = trainParking.bay.replace("IBL", "");
    }

    setSelectedTrain(trainParking.train_id); // This is already in TM format
    setSelectedTrack(track);
    setSelectedPosition(trainParking.position);
    setStatus(trainParking.status);
    setNotes(trainParking.notes);
    setIsEditing(true);
    setEditingTrain(trainParking.train_id); // This is already in TM format
  };

  const handleRemove = async (trainId: string) => {
    if (confirm(`Remove parking assignment for Train ${trainId}?`)) {
      try {
        await axios.delete(
          `http://localhost:8000/api/nightly/parking/assignment/${trainId}`
        );
        alert(`Parking assignment removed for Train ${trainId} ✅`);
        fetchParkingData();
      } catch (error) {
        console.error("Error removing parking assignment:", error);
        alert("Failed to remove parking assignment");
      }
    }
  };

  const handleMarkDeparted = async (trainId: string) => {
    try {
      const assignment = parkingData.find(
        (a) => a.train_id === trainId && !a.departure_time
      );
      if (assignment) {
        await axios.put(
          `http://localhost:8000/api/nightly/parking/assignment/${trainId}`,
          {
            ...assignment,
            departure_time: new Date().toISOString(),
          }
        );
        alert(`Train ${trainId} marked as departed ✅`);
        fetchParkingData();
      }
    } catch (error) {
      console.error("Error marking train as departed:", error);
      alert("Failed to update train status");
    }
  };

  const resetForm = () => {
    setSelectedTrain("");
    setSelectedTrack("");
    setSelectedPosition(0);
    setStatus("parking");
    setNotes("");
    setIsEditing(false);
    setEditingTrain("");
  };

  const parkingTracksList = parkingTracks.filter(
    (track) => track.type === "parking"
  );
  const maintenanceTracks = parkingTracks.filter(
    (track) => track.type === "maintenance"
  );

  const getPositionsForSelectedTrack = () => {
    if (status === "maintenance") {
      return [1];
    }
    const track = parkingTracks.find((t) => t.track === selectedTrack);
    return track ? track.positions : [];
  };

  return (
    <div
      className="min-h-screen w-full"
      style={{
        background:
          "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)",
      }}
    >
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div
          className="backdrop-blur-md rounded-2xl p-8 border border-slate-600/30 shadow-2xl text-center"
          style={{ backgroundColor: "rgba(15, 23, 42, 0.8)" }}
        >
          <h1 className="text-4xl font-bold text-slate-50 mb-2 drop-shadow-lg">
            🚆 Train Parking Management
          </h1>
          <div className="w-24 h-1 mx-auto rounded-full bg-gradient-to-r from-sky-400 to-emerald-400 mb-4"></div>
          <p className="text-slate-300">
            Manage parking assignments for 12 stabling tracks and 5 maintenance
            bays
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Parking Assignment Form */}
          <div
            className="xl:col-span-1 backdrop-blur-md rounded-2xl p-6 border border-slate-600/30 shadow-2xl"
            style={{ backgroundColor: "rgba(15, 23, 42, 0.8)" }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-2 h-8 rounded-full bg-gradient-to-b from-emerald-400 to-teal-400"></div>
              <h2 className="text-xl font-semibold text-slate-50">
                {isEditing
                  ? "Edit Parking Assignment"
                  : "Assign Parking Position"}
              </h2>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">
                  Select Train
                </label>
                <select
                  className="w-full p-4 rounded-xl border border-slate-600/50 text-slate-50 transition-all duration-300 hover:border-emerald-400/50 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none backdrop-blur-sm"
                  style={{ backgroundColor: "rgba(30, 41, 59, 0.6)" }}
                  value={selectedTrain}
                  onChange={(e) => setSelectedTrain(e.target.value)}
                >
                  <option value="" className="bg-slate-800">
                    Select a train
                  </option>
                  {trains.map((train) => (
                    <option key={train} value={train} className="bg-slate-800">
                      {train}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">
                  Assignment Type
                </label>
                <select
                  className="w-full p-4 rounded-xl border border-slate-600/50 text-slate-50 transition-all duration-300 hover:border-emerald-400/50 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none backdrop-blur-sm"
                  style={{ backgroundColor: "rgba(30, 41, 59, 0.6)" }}
                  value={status}
                  onChange={(e) =>
                    handleStatusChange(
                      e.target.value as "parking" | "maintenance"
                    )
                  }
                >
                  <option value="parking" className="bg-slate-800">
                    Parking
                  </option>
                  <option value="maintenance" className="bg-slate-800">
                    Maintenance
                  </option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">
                  {status === "maintenance"
                    ? "Maintenance Bay Selection"
                    : "Stabling Track Selection"}
                </label>
                <select
                  className="w-full p-4 rounded-xl border border-slate-600/50 text-slate-50 transition-all duration-300 hover:border-emerald-400/50 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none backdrop-blur-sm"
                  style={{ backgroundColor: "rgba(30, 41, 59, 0.6)" }}
                  value={selectedTrack}
                  onChange={(e) => handleTrackChange(e.target.value)}
                >
                  <option value="" className="bg-slate-800">
                    Select a track
                  </option>
                  {(status === "maintenance"
                    ? maintenanceTracks
                    : parkingTracksList
                  ).map((track) => (
                    <option
                      key={track.track}
                      value={track.track}
                      className="bg-slate-800"
                    >
                      {status === "maintenance"
                        ? track.track
                        : `Track ${track.track}`}
                    </option>
                  ))}
                </select>
              </div>

              {selectedTrack && status === "parking" && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-300">
                    Position Selection
                  </label>
                  <select
                    className="w-full p-4 rounded-xl border border-slate-600/50 text-slate-50 transition-all duration-300 hover:border-emerald-400/50 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none backdrop-blur-sm"
                    style={{ backgroundColor: "rgba(30, 41, 59, 0.6)" }}
                    value={selectedPosition}
                    onChange={(e) =>
                      setSelectedPosition(parseInt(e.target.value))
                    }
                  >
                    <option value={0} className="bg-slate-800">
                      Select a position
                    </option>
                    {getPositionsForSelectedTrack().map((position) => {
                      const isOccupied = isPositionOccupied(
                        selectedTrack,
                        position,
                        "parking"
                      );
                      const occupyingTrain = getTrainAtPosition(
                        selectedTrack,
                        position,
                        "parking"
                      );

                      return (
                        <option
                          key={position}
                          value={position}
                          disabled={isOccupied && !isEditing}
                          className={`bg-slate-800 ${
                            isOccupied ? "text-red-400" : ""
                          }`}
                        >
                          Position {position}
                          {isOccupied
                            ? ` (Occupied by Train ${occupyingTrain?.train_id})`
                            : " (Available)"}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              {selectedTrack && status === "maintenance" && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-300">
                    Position
                  </label>
                  <div
                    className="w-full p-4 rounded-xl border border-slate-600/50 text-slate-300 backdrop-blur-sm"
                    style={{ backgroundColor: "rgba(30, 41, 59, 0.6)" }}
                  >
                    Position 1 (Fixed for maintenance)
                    {selectedPosition === 1 && (
                      <div className="text-sm text-slate-400 mt-1">
                        {isPositionOccupied(selectedTrack, 1, "maintenance")
                          ? `Occupied by Train ${
                              getTrainAtPosition(
                                selectedTrack,
                                1,
                                "maintenance"
                              )?.train_id
                            }`
                          : "Available"}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">
                  Assignment Notes
                </label>
                <textarea
                  className="w-full p-4 rounded-xl border border-slate-600/50 text-slate-50 placeholder:text-slate-400 transition-all duration-300 hover:border-emerald-400/50 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none backdrop-blur-sm resize-none"
                  style={{ backgroundColor: "rgba(30, 41, 59, 0.6)" }}
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes about this assignment"
                />
              </div>

              <button
                onClick={handleAssignParking}
                disabled={!selectedTrain || !selectedTrack || !selectedPosition}
                className={`w-full py-4 px-6 text-lg font-semibold text-slate-50 rounded-xl border border-transparent transition-all duration-300 hover:transform hover:-translate-y-1 hover:shadow-xl focus:outline-none focus:ring-4 backdrop-blur-sm ${
                  !selectedTrain || !selectedTrack || !selectedPosition
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
                style={{
                  background:
                    !selectedTrain || !selectedTrack || !selectedPosition
                      ? "rgba(100, 116, 139, 0.5)"
                      : isEditing
                      ? "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)"
                      : "linear-gradient(135deg, #38bdf8 0%, #06d6a0 100%)",
                  boxShadow:
                    !selectedTrain || !selectedTrack || !selectedPosition
                      ? "none"
                      : isEditing
                      ? "0 10px 25px -5px rgba(251, 191, 36, 0.3)"
                      : "0 10px 25px -5px rgba(56, 189, 248, 0.3)",
                }}
              >
                {isEditing ? "🔄 Update Assignment" : "📍 Assign Parking"}
              </button>

              {isEditing && (
                <button
                  onClick={resetForm}
                  className="w-full py-3 px-6 rounded-xl text-slate-300 font-medium border border-slate-600 transition-all duration-300 hover:border-slate-400 hover:text-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400/20 backdrop-blur-sm"
                  style={{ backgroundColor: "rgba(100, 116, 139, 0.3)" }}
                >
                  ✖️ Cancel Edit
                </button>
              )}
            </div>
          </div>

          {/* Parking Visualization */}
          <div
            className="xl:col-span-2 backdrop-blur-md rounded-2xl p-6 border border-slate-600/30 shadow-2xl"
            style={{ backgroundColor: "rgba(15, 23, 42, 0.8)" }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-2 h-8 rounded-full bg-gradient-to-b from-sky-400 to-blue-400"></div>
              <h2 className="text-xl font-semibold text-slate-50">
                Real-Time Parking Layout
              </h2>
            </div>

            <div className="space-y-8">
              {/* Parking Tracks - ONLY show parking trains */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-50 border-l-4 border-emerald-400 pl-4">
                  Stabling Tracks (PT01-PT12) - Parking Only
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {parkingTracksList.map((track) => (
                    <div
                      key={track.track}
                      className="border border-slate-600/50 rounded-xl p-4 backdrop-blur-sm"
                      style={{ backgroundColor: "rgba(30, 41, 59, 0.6)" }}
                    >
                      <h4 className="font-semibold text-slate-50 text-center mb-3">
                        Track {track.track}
                      </h4>
                      <div className="space-y-2">
                        {track.positions.map((position) => {
                          const assignment = getTrainAtPosition(
                            track.track,
                            position,
                            "parking"
                          );
                          return (
                            <div
                              key={position}
                              className={`p-3 rounded-lg text-center border transition-all duration-300 ${
                                assignment
                                  ? "bg-emerald-400/20 border-emerald-400/50 text-emerald-300"
                                  : "bg-slate-700/50 border-slate-600/50 text-slate-400"
                              }`}
                            >
                              <div className="font-medium">
                                Position {position}
                              </div>
                              {assignment ? (
                                <div className="text-sm mt-1">
                                  <div className="font-semibold">
                                    Train {assignment.train_id}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-sm mt-1">Available</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Maintenance Bays - ONLY show maintenance trains */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-50 border-l-4 border-amber-400 pl-4">
                  Maintenance Bays (IBL01-IBL05) - Maintenance Only
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {maintenanceTracks.map((track) => (
                    <div
                      key={track.track}
                      className="border border-slate-600/50 rounded-xl p-4 backdrop-blur-sm"
                      style={{ backgroundColor: "rgba(30, 41, 59, 0.6)" }}
                    >
                      <h4 className="font-semibold text-slate-50 text-center mb-3">
                        {track.track}
                      </h4>
                      {track.positions.map((position) => {
                        const assignment = getTrainAtPosition(
                          track.track,
                          position,
                          "maintenance"
                        );
                        return (
                          <div
                            key={position}
                            className={`p-3 rounded-lg text-center border transition-all duration-300 min-h-[80px] flex flex-col justify-center ${
                              assignment
                                ? "bg-amber-400/20 border-amber-400/50 text-amber-300"
                                : "bg-slate-700/50 border-slate-600/50 text-slate-400"
                            }`}
                          >
                            {assignment ? (
                              <div className="mt-1">
                                <div className="font-semibold text-sm">
                                  Train {assignment.train_id}
                                </div>
                              </div>
                            ) : (
                              <div className="text-sm mt-1">Available</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Current Assignments Table */}
        <div
          className="backdrop-blur-md rounded-2xl p-6 border border-slate-600/30 shadow-2xl"
          style={{ backgroundColor: "rgba(15, 23, 42, 0.8)" }}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-2 h-8 rounded-full bg-gradient-to-b from-pink-400 to-rose-400"></div>
            <h2 className="text-xl font-semibold text-slate-50">
              Active Parking Assignments
            </h2>
          </div>

          {parkingData.filter((a) => !a.departure_time).length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🚆</div>
              <p className="text-slate-400 text-lg">
                No active parking assignments.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div
                className="rounded-xl border border-slate-600/50 backdrop-blur-sm overflow-hidden"
                style={{ backgroundColor: "rgba(30, 41, 59, 0.6)" }}
              >
                <table className="min-w-full">
                  <thead
                    className="border-b border-slate-600/50"
                    style={{ backgroundColor: "rgba(15, 23, 42, 0.8)" }}
                  >
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">
                        Train ID (TM)
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">
                        Position
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">
                        Arrival Time
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">
                        Notes
                      </th>
                      {/* <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Actions</th> */}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-600/30">
                    {parkingData
                      .filter((assignment) => !assignment.departure_time)
                      .map((assignment) => (
                        <tr
                          key={assignment.train_id}
                          className="hover:bg-slate-700/30 transition-colors duration-200"
                        >
                          <td className="px-6 py-4 font-medium text-slate-50">
                            Train {assignment.train_id}
                          </td>
                          <td className="px-6 py-4 text-slate-300">
                            {getPositionDisplayName(
                              assignment.bay,
                              assignment.position
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`px-3 py-1 text-xs rounded-full font-medium capitalize border ${
                                assignment.status === "parking"
                                  ? "bg-emerald-400/20 text-emerald-300 border-emerald-400/30"
                                  : "bg-amber-400/20 text-amber-300 border-amber-400/30"
                              }`}
                            >
                              {assignment.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-300 text-sm">
                            {new Date(assignment.arrival_time).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-slate-400 max-w-xs truncate text-sm">
                            {assignment.notes}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}