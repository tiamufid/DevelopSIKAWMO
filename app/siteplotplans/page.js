"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import withAuth from "../components/withAuth";
import {
  AREA_HIERARCHY,
  getAreaList,
  getFacilitiesByArea,
  getDecksByFacility,
  getLayout,
  getLayoutById,
  formatLocationPath,
  parseLocationFromPermit
} from "@/lib/areaHierarchy";

function SitePlotPlans() {
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [selectedArea, setSelectedArea] = useState("ORF"); // ORF, WEST, EAST, FSO, LSB, ALL
  const [selectedFacility, setSelectedFacility] = useState("ORF");
  const [selectedDeck, setSelectedDeck] = useState("DEFAULT");
  const [selectedZone, setSelectedZone] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [plotPoints, setPlotPoints] = useState([]);
  const [loading, setLoading] = useState(true);

  const handleSelectArea = (areaId) => {
    setSelectedArea(areaId);
    setSelectedPoint(null);
    if (areaId === "ALL") return;

    const facilities = getFacilitiesByArea(areaId);
    const firstFac = facilities[0]?.id || "DEFAULT";
    setSelectedFacility(firstFac);

    const decks = getDecksByFacility(areaId, firstFac);
    const firstDeck = decks[0]?.id || "DEFAULT";
    setSelectedDeck(firstDeck);
  };

  const handleSelectFacility = (facId) => {
    setSelectedFacility(facId);
    setSelectedPoint(null);

    const decks = getDecksByFacility(selectedArea, facId);
    const firstDeck = decks[0]?.id || "DEFAULT";
    setSelectedDeck(firstDeck);
  };

  const handleSelectDeck = (deckId) => {
    setSelectedDeck(deckId);
    setSelectedPoint(null);
  };

  const currentLayout = selectedArea !== "ALL"
    ? getLayout(selectedArea, selectedFacility, selectedDeck)
    : null;
  const currentLayoutImage = currentLayout?.image || "/images/layout-orf.png";
  const availableFacilities = selectedArea !== "ALL" ? getFacilitiesByArea(selectedArea) : [];
  const availableDecks = selectedArea !== "ALL" ? getDecksByFacility(selectedArea, selectedFacility) : [];

  useEffect(() => {
    fetchData();
    
    // Refresh data when window becomes visible again (user switches back to tab)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchData();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const userData = JSON.parse(localStorage.getItem("user") || "{}");

      console.log('📊 Fetching permit data for user:', userData);

      // Fetch only permit planning data
      const permitResponse = await fetch(
        `/api/permit-planning?userId=${userData.id}`
      );
      const permitResult = await permitResponse.json();

      console.log('📋 API Response:', permitResult);

      if (permitResult.success) {
        console.log(`📦 Total permits from API: ${permitResult.data.length}`);
        
        // Filter fully approved and active permits
        const approvedPermits = permitResult.data.filter((permit) => {
          return permit.status === 'FULLY_APPROVED' || permit.status === 'ACTIVE';
        });
        
        console.log(`✅ Fully approved and active permits: ${approvedPermits.length} of ${permitResult.data.length}`);
        
        // Convert approved permit data to plot points format and filter out old permits
        const convertedPermits = approvedPermits
          .map((permit) => {
            console.log(`🔍 Processing permit ${permit.id}:`, {
              status: permit.status,
              startDate: permit.startDate,
              endDate: permit.endDate,
              coordinates: permit.coordinates,
              zone: permit.zone
            });
            
            const coords = parseCoordinates(permit.coordinates, permit.zone);
            
            // Check if permit is currently running based on dates
            const currentDate = new Date();
            const startDate = new Date(permit.startDate);
            const endDate = new Date(permit.endDate);
            
            console.log(`📅 Date comparison for permit ${permit.id}:`, {
              current: currentDate.toISOString().split('T')[0],
              start: startDate.toISOString().split('T')[0],
              end: endDate.toISOString().split('T')[0]
            });
            
            // Set time to beginning of day for proper date comparison
            currentDate.setHours(0, 0, 0, 0);
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(23, 59, 59, 999);
            
            // Calculate days since end date
            const daysSinceEnd = Math.floor((currentDate - endDate) / (1000 * 60 * 60 * 24));
            
            console.log(`⏰ Days since end for permit ${permit.id}: ${daysSinceEnd}`);
            
            // Hide permit if it's 1 day or more past end date, BUT keep ACTIVE permits visible
            if (daysSinceEnd >= 1 && permit.status !== 'ACTIVE') {
              console.log(`❌ Filtering out permit ${permit.id} - too old (non-ACTIVE permit)`);
              return null; // Will be filtered out
            }
            
            // Log ACTIVE permits that are being kept visible despite being past end date
            if (permit.status === 'ACTIVE' && daysSinceEnd >= 1) {
              console.log(`🟢 Keeping ACTIVE permit ${permit.id} visible despite being ${daysSinceEnd} days past end date`);
            }
            
            let dynamicStatus = permit.status.toLowerCase();
            
            // Only modify status for date-based logic if permit is FULLY_APPROVED or ACTIVE
            if (permit.status === 'FULLY_APPROVED' || permit.status === 'ACTIVE') {
              // Determine status based on date range
              if (currentDate >= startDate && currentDate <= endDate) {
                dynamicStatus = 'running';
                console.log(`🏃 Permit ${permit.id} set to RUNNING`);
              } else if (currentDate > endDate) {
                // If current date is past end date, mark as completed
                dynamicStatus = 'completed';
                console.log(`✅ Permit ${permit.id} set to COMPLETED`);
              } else if (currentDate < startDate) {
                // If current date is before start date, keep as approved but pending start
                dynamicStatus = 'pending';
                console.log(`⏳ Permit ${permit.id} set to PENDING (approved but not started)`);
              }
            } else if (permit.status === 'AA_APPROVED') {
              // AA approved permits are shown but marked as waiting for SC approval
              dynamicStatus = 'pending';
              console.log(`⏳ Permit ${permit.id} - AA approved, waiting for SC approval`);
            }

            const result = {
              id: permit.id,
              x: coords.x,
              y: coords.y,
              type: getPermitTypeCode(permit.workType),
              status: dynamicStatus,
              originalStatus: permit.status, // Keep original status for reference
              permitNumber: permit.permitNumber,
              location: permit.workLocation,
              description: permit.workDescription,
              startDate: permit.startDate,
              endDate: permit.endDate,
              startTime: new Date(permit.startDate).toLocaleDateString("id-ID", {
                day: "2-digit",
              month: "2-digit", 
              year: "numeric"
            }),
            endTime: new Date(permit.endDate).toLocaleDateString("id-ID", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric"
            }),
            performingAuthority: permit.performingAuthority || "N/A",
            zone: permit.zone,
            areaName: permit.areaName || "ORF", // Default ke ORF jika belum ada
            area: permit.zone, // Add this for area filtering to work
            company: permit.company,
            riskLevel: permit.riskLevel,
          };
          
          console.log(`✨ Final permit object ${permit.id}:`, result);
          return result;
        })
        .filter(permit => permit !== null); // Remove permits that are more than 1 day past end date

        console.log(`🎯 Final converted permits: ${convertedPermits.length}`);
        console.log('📍 Plot points to display:', convertedPermits);
        
        setPlotPoints(convertedPermits);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getZoneCoordinates = (zone) => {
    // Berdasarkan layout gambar site plan yang diberikan
    const zoneAreas = {
      PRC: {
        // Processing Area - Area merah di kanan
        minX: 50,
        maxX: 85,
        minY: 15,
        maxY: 65,
      },
      UTL: {
        // Utilities - Area orange di atas tengah
        minX: 25,
        maxX: 50,
        minY: 10,
        maxY: 25,
      },
      BLD: {
        // Building - Area kuning di kiri atas
        minX: 5,
        maxX: 25,
        minY: 15,
        maxY: 40,
      },
      GMS: {
        // Gas Metering Station - Area abu-abu di tengah
        minX: 45,
        maxX: 55,
        minY: 25,
        maxY: 35,
      },
      CCR: {
        // Central Control Room - Area biru di tengah
        minX: 30,
        maxX: 45,
        minY: 20,
        maxY: 35,
      },
      OY: {
        // Open Yard - Area hijau besar di bawah
        minX: 25,
        maxX: 75,
        minY: 40,
        maxY: 75,
      },
      NBL: {
        // New Building/Laboratory - Area hijau di kanan bawah
        minX: 60,
        maxX: 80,
        minY: 50,
        maxY: 70,
      },
      WS: {
        // Workshop/Warehouse - Area hijau di kiri bawah
        minX: 5,
        maxX: 35,
        minY: 60,
        maxY: 85,
      },
    };

    const area = zoneAreas[zone];
    if (!area) {
      // Default area jika zona tidak dikenal
      return {
        x: Math.random() * 80 + 10,
        y: Math.random() * 80 + 10,
      };
    }

    // Generate koordinat random dalam area zona
    return {
      x: Math.random() * (area.maxX - area.minX) + area.minX,
      y: Math.random() * (area.maxY - area.minY) + area.minY,
    };
  };

  const parseCoordinates = (coordinates, zone = null) => {
    if (!coordinates) {
      // Jika tidak ada koordinat, generate berdasarkan zona
      if (zone) {
        return getZoneCoordinates(zone);
      }
      return {
        x: Math.random() * 80 + 10,
        y: Math.random() * 80 + 10,
      };
    }

    try {
      // Try parsing as JSON first
      const parsed = JSON.parse(coordinates);
      if (parsed.x !== undefined && parsed.y !== undefined) {
        return parsed;
      }
    } catch {
      // Try parsing as string format "x,y" or "x;y"
      if (coordinates.includes(",")) {
        const [x, y] = coordinates.split(",");
        const parsedX = parseFloat(x);
        const parsedY = parseFloat(y);
        if (!isNaN(parsedX) && !isNaN(parsedY)) {
          return { x: parsedX, y: parsedY };
        }
      } else if (coordinates.includes(";")) {
        const [x, y] = coordinates.split(";");
        const parsedX = parseFloat(x);
        const parsedY = parseFloat(y);
        if (!isNaN(parsedX) && !isNaN(parsedY)) {
          return { x: parsedX, y: parsedY };
        }
      }
    }

    // Fallback: generate based on zone
    if (zone) {
      return getZoneCoordinates(zone);
    }

    return {
      x: Math.random() * 80 + 10,
      y: Math.random() * 80 + 10,
    };
  };

  const getPermitTypeCode = (workType) => {
    const typeMap = {
      // Work types from permit planning form - Updated names
      COLD_WORK: "GW",                    // General Work (blue pin)
      COLD_WORK_BREAKING: "BC",          // Breaking Containment (black pin)
      HOT_WORK_SPARK: "CW",              // Critical Work (yellow pin)
      HOT_WORK_FLAME: "HW",              // Hot Work (red pin)
      
      // Legacy types (keeping for backward compatibility)
      HOT_WORK: "CW",                    // Critical Work
      ELECTRICAL: "GW",                  // General Work
      MECHANICAL: "GW",                  // General Work
      EXCAVATION: "BC",                  // Breaking Containment
      CONFINED_SPACE: "CW",              // Critical Work
      HEIGHT_WORK: "BC",                 // Breaking Containment
      MAINTENANCE: "GW",                 // General Work
    };
    return typeMap[workType] || "GW";
  };

  const getPointColor = (type, status) => {
    // First check status for special cases
    if (status === "cancelled") {
      return "#6B7280"; // gray for cancelled
    }
    
    // For active permits, add slight transparency or different shade based on status
    let baseColor;
    switch (type) {
      case "HW":
        baseColor = "#EF4444"; // red - Hot Work
        break;
      case "CW":
        baseColor = "#F59E0B"; // yellow - Critical Work
        break;
      case "GW":
        baseColor = "#3B82F6"; // blue - General Work
        break;
      case "BC":
        baseColor = "#1F2937"; // black - Breaking Containment
        break;
      default:
        baseColor = "#6B7280"; // gray
    }
    
    // Modify color based on status
    if (status === "pending") {
      // Add transparency to pending permits
      return baseColor + "CC"; // Add transparency
    } else if (status === "completed") {
      // Make completed permits slightly darker
      return baseColor + "DD";
    }
    
    return baseColor; // running permits use full color
  };

  const getFilteredPoints = () => {
    let filtered = plotPoints;

    // 1. Filter by Area (ORF, WEST, EAST, FSO, LSB, ALL)
    if (selectedArea !== "ALL") {
      filtered = filtered.filter((point) => {
        const pArea = (point.areaName || "ORF").toUpperCase();
        return pArea === selectedArea.toUpperCase();
      });

      // Filter by Facility if applicable
      if (selectedFacility && selectedFacility !== "DEFAULT" && availableFacilities.length > 1) {
        filtered = filtered.filter((point) => {
          const loc = parseLocationFromPermit(point);
          return loc.facilityId === selectedFacility;
        });
      }

      // Filter by Deck if applicable
      if (selectedDeck && selectedDeck !== "DEFAULT" && availableDecks.length > 1) {
        filtered = filtered.filter((point) => {
          const loc = parseLocationFromPermit(point);
          return loc.deckId === selectedDeck;
        });
      }
    }

    // 2. Filter by Work Type
    if (selectedFilter !== "all") {
      filtered = filtered.filter((point) => point.type === selectedFilter);
    }

    // 3. Filter by Zone
    if (selectedZone !== "all") {
      filtered = filtered.filter((point) => point.zone === selectedZone);
    }

    // 4. Filter by Status
    if (selectedStatus !== "all") {
      filtered = filtered.filter((point) => point.status === selectedStatus);
    }

    return filtered;
  };

  const handlePointClick = (point) => {
    setSelectedPoint(point);
  };

  const filterOptions = [
    { value: "all", label: "Semua", color: "#6B7280" },
    { value: "HW", label: "Hot Work (Red)", color: "#EF4444" },
    { value: "CW", label: "Critical Work (Yellow)", color: "#F59E0B" },
    { value: "GW", label: "General Work (Blue)", color: "#3B82F6" },
    { value: "BC", label: "Breaking Containment (Black)", color: "#1F2937" },
  ];

  const zoneOptions = [
    { value: "all", label: "Semua Zona", color: "#6B7280" },
    { value: "PRC", label: "PRC", color: "#EF4444" },
    { value: "UTL", label: "UTL", color: "#F97316" },
    { value: "BLD", label: "BLD", color: "#EAB308" },
    { value: "OY", label: "OY", color: "#22C55E" },
    { value: "NBL", label: "NBL", color: "#16A34A" },
    { value: "CCR", label: "CCR", color: "#3B82F6" },
    { value: "WS", label: "WS", color: "#06B6D4" },
    { value: "GMS", label: "GMS", color: "#8B5CF6" },
  ];
  const areaOptions = zoneOptions; // Alias for backward compatibility

  const statusOptions = [
    { value: "all", label: "Semua Status", color: "#6B7280" },
    { value: "pending", label: "Pending", color: "#F59E0B" },
    { value: "running", label: "Running", color: "#22C55E" },
    { value: "completed", label: "Completed", color: "#3B82F6" },
    { value: "cancelled", label: "Cancelled", color: "#EF4444" },
  ];

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
       
        <div className="flex-1 p-6 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-gray-500 mt-4">Loading site plot plans...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="p-4 lg:p-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-quaternary">
                  Site Plot Plans
                </h1>
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide bg-primary/10 text-primary border border-primary/20">
                  {selectedArea === "all" ? "Semua Area" : AREA_CONFIGS[selectedArea]?.fullName || selectedArea}
                </span>
              </div>
              <p className="text-gray-600 text-sm mt-1">
                Visualisasi lokasi kerja dan permit planning PHE WMO (ORF, LSB, East, West)
              </p>
            </div>
            <div className="flex items-center gap-6 self-end md:self-auto">
              <div className="text-right">
                <div className="text-sm font-semibold text-gray-700">
                  {selectedArea === "all" ? "PHE WMO (Semua Area)" : AREA_CONFIGS[selectedArea]?.tagline || `${selectedArea} PHE WMO`}
                </div>
                <div className="mt-1">
                  <span className="text-xs text-gray-500">Permit Aktif di Area</span>
                  <div className="text-3xl font-bold text-quaternary">
                    {loading ? "..." : getFilteredPoints().length}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Area Selector Tabs (ORF, LSB, East, West) */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Pilihan Area Kerja Operasional:
              </span>
              <span className="text-xs text-gray-500">
                Pilih area untuk memfilter permit dan denah lokasi
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {Object.keys(AREA_CONFIGS).map((areaKey) => {
                const conf = AREA_CONFIGS[areaKey];
                const isSelected = selectedArea === areaKey;
                const areaPermitsCount = plotPoints.filter(p => (p.areaName || "ORF") === areaKey).length;
                return (
                  <button
                    key={areaKey}
                    onClick={() => {
                      setSelectedArea(areaKey);
                      setSelectedPoint(null);
                    }}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-medium transition-all cursor-pointer ${
                      isSelected
                        ? `${conf.activeClass} border-transparent`
                        : "bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{conf.icon}</span>
                      <div className="text-left">
                        <div className="font-bold leading-tight">{conf.name}</div>
                        <div className={`text-[10px] leading-tight ${isSelected ? "text-white/80" : "text-gray-500"}`}>
                          {conf.fullName}
                        </div>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                      isSelected ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700"
                    }`}>
                      {areaPermitsCount}
                    </span>
                  </button>
                );
              })}
              
              {/* Option to view All Areas */}
              <button
                onClick={() => {
                  setSelectedArea("all");
                  setSelectedPoint(null);
                }}
                className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-medium transition-all cursor-pointer ${
                  selectedArea === "all"
                    ? "bg-gray-900 text-white shadow-md ring-2 ring-gray-400 border-transparent"
                    : "bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">🌐</span>
                  <div className="text-left">
                    <div className="font-bold leading-tight">Semua Area</div>
                    <div className={`text-[10px] leading-tight ${selectedArea === "all" ? "text-white/80" : "text-gray-500"}`}>
                      Semua Wilayah
                    </div>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  selectedArea === "all" ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700"
                }`}>
                  {plotPoints.length}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* 2 Column Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 h-[calc(100vh-250px)]">
          {/* Left Column - Site Layout Map */}
          <div className="xl:col-span-7 flex flex-col">
            <div className="bg-white rounded-lg shadow-md p-6 flex-1">
              {/* Filter Section */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-quaternary">
                    Layout Denah Site: {selectedArea === "all" ? "Semua Area" : `${selectedArea} (${AREA_CONFIGS[selectedArea]?.fullName})`}
                  </h2>
                  <button
                    onClick={fetchData}
                    disabled={loading}
                    className="flex items-center gap-2 px-3 py-2 bg-quaternary text-white rounded-lg hover:bg-quaternary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg
                      className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    <span className="text-sm">Refresh</span>
                  </button>
                </div>
                
                {/* Filter Legend */}
                <div className="space-y-4 mb-6">
                  {/* Work Type Filter */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">
                      Filter by Work Type:
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {filterOptions.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => setSelectedFilter(option.value)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs transition-all ${
                            selectedFilter === option.value
                              ? "bg-quaternary text-white"
                              : "bg-gray-100 hover:bg-gray-200"
                          }`}
                        >
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: option.color }}
                          ></div>
                          <span className="font-medium">{option.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Zone Filter */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">
                      Filter by Zona:
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {zoneOptions.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => setSelectedZone(option.value)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs transition-all ${
                            selectedZone === option.value
                              ? "bg-quaternary text-white"
                              : "bg-gray-100 hover:bg-gray-200"
                          }`}
                        >
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: option.color }}
                          ></div>
                          <span className="font-medium">{option.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Status Filter */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">
                      Filter by Status:
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {statusOptions.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => setSelectedStatus(option.value)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs transition-all ${
                            selectedStatus === option.value
                              ? "bg-quaternary text-white"
                              : "bg-gray-100 hover:bg-gray-200"
                          }`}
                        >
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: option.color }}
                          ></div>
                          <span className="font-medium">{option.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Visual Legend */}
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <h3 className="text-xs font-medium text-gray-700 mb-2">
                      Status Legend:
                    </h3>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-opacity-100" style={{ backgroundColor: "#22C55E" }}></div>
                        <span>Running (Full Color)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-opacity-80" style={{ backgroundColor: "#F59E0BCC" }}></div>
                        <span>Pending (Transparent)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#3B82F6DD" }}></div>
                        <span>Completed (Darker)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                        <span>Cancelled (Gray)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Site Layout Map */}
              <div className="relative w-full flex-1">
                <div className="relative inline-block w-full h-full">
                  <div className="relative bg-gray-100 rounded-lg overflow-hidden h-full min-h-[400px]">
                    {/* Active Area Badge Overlay */}
                    <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-sm border border-gray-200 z-10 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
                      <span className="text-xs font-bold text-gray-800">
                        {selectedArea === "all"
                          ? "Semua Area PHE WMO"
                          : `${selectedArea} - ${AREA_CONFIGS[selectedArea]?.fullName || selectedArea}`}
                      </span>
                    </div>

                    <Image
                      src={
                        selectedArea === "LSB"
                          ? "/images/layout-lsb.png"
                          : selectedArea === "East"
                          ? "/images/layout-east.png"
                          : selectedArea === "West"
                          ? "/images/layout-west.png"
                          : "/images/layout-orf.png"
                      }
                      alt={`${selectedArea} Site Plot Plan Layout`}
                      width={1200}
                      height={800}
                      className="w-full h-full object-contain rounded-lg border bg-white"
                      priority
                    />

                    {/* Plot Points Overlay */}
                    {loading ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 rounded-lg">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                          <p className="text-sm text-gray-500 mt-2">
                            Loading permits...
                          </p>
                        </div>
                      </div>
                    ) : (
                      getFilteredPoints().map((point) => (
                        <button
                          key={point.id}
                          onClick={() => handlePointClick(point)}
                          className={`absolute transform -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 border-white shadow-lg transition-all hover:scale-125 ${
                            selectedPoint?.id === point.id
                              ? "scale-125 ring-4 ring-blue-200"
                              : ""
                          }`}
                          style={{
                            left: `${point.x}%`,
                            top: `${point.y}%`,
                            backgroundColor: getPointColor(
                              point.type,
                              point.status
                            ),
                          }}
                          title={`${point.permitNumber} - ${point.location}`}
                        ></button>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Permit Details */}
          <div className="xl:col-span-5 flex flex-col space-y-6">
            {/* Detail Permit */}
            <div className="bg-white rounded-lg shadow-md p-6 flex-1">
              <h3 className="text-xl font-semibold text-quaternary mb-6">
                Detail Permit
              </h3>
              {selectedPoint ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    No. Permit
                  </label>
                  <div className="text-lg font-semibold mt-1">
                    {selectedPoint.permitNumber}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Status
                  </label>
                  <div
                    className={`inline-block px-3 py-1 rounded-full text-xs font-medium mt-1 ${
                      selectedPoint.status === "active"
                        ? "bg-green-100 text-green-800"
                        : selectedPoint.status === "running"
                        ? "bg-green-100 text-green-800"
                        : selectedPoint.status === "pending"
                        ? "bg-yellow-100 text-yellow-800"
                        : selectedPoint.status === "completed"
                        ? "bg-blue-100 text-blue-800"
                        : selectedPoint.status === "cancelled"
                        ? "bg-red-100 text-red-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {selectedPoint.status === "active"
                      ? "Aktif"
                      : selectedPoint.status === "running"
                      ? "On Progress"
                      : selectedPoint.status === "pending"
                      ? "Menunggu"
                      : selectedPoint.status === "completed"
                      ? "Selesai"
                      : selectedPoint.status === "cancelled"
                      ? "Dibatalkan"
                      : "Selesai"}
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Approval Status
                  </label>
                  <div
                    className={`inline-block px-3 py-1 rounded-full text-xs font-medium mt-1 ${
                      selectedPoint.originalStatus === "FULLY_APPROVED"
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {selectedPoint.originalStatus === "FULLY_APPROVED"
                      ? "Fully Approved"
                      : selectedPoint.originalStatus}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Tipe Pekerjaan
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{
                        backgroundColor: getPointColor(
                          selectedPoint.type,
                          selectedPoint.status
                        ),
                      }}
                    ></div>
                    <span className="font-medium">{selectedPoint.type}</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Area Kerja
                  </label>
                  <div className="mt-1">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                      (selectedPoint.areaName || 'ORF') === 'ORF' ? 'bg-blue-100 text-blue-800' :
                      (selectedPoint.areaName || 'ORF') === 'LSB' ? 'bg-purple-100 text-purple-800' :
                      (selectedPoint.areaName || 'ORF') === 'East' ? 'bg-amber-100 text-amber-800' :
                      'bg-emerald-100 text-emerald-800'
                    }`}>
                      {selectedPoint.areaName || 'ORF'}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Zona Lokasi
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{
                        backgroundColor:
                          zoneOptions.find(
                            (a) => a.value === selectedPoint.zone
                          )?.color || "#6B7280",
                      }}
                    ></div>
                    <span className="font-medium">{selectedPoint.zone}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">
                  Lokasi Pekerjaan
                </label>
                <div className="font-medium mt-1">{selectedPoint.location}</div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">
                  Deskripsi Pekerjaan
                </label>
                <div className="text-sm mt-1 p-3 bg-gray-50 rounded-lg">
                  {selectedPoint.description}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Tanggal Mulai
                  </label>
                  <div className="font-medium mt-1">
                    {selectedPoint.startTime}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Tanggal Selesai
                  </label>
                  <div className="font-medium mt-1">
                    {selectedPoint.endTime}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Performing Authority
                  </label>
                  <div className="font-medium mt-1">
                    {selectedPoint.performingAuthority}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Company
                  </label>
                  <div className="font-medium mt-1">
                    {selectedPoint.company || "N/A"}
                  </div>
                </div>
              </div>
            </div>
            ) : (
              <div className="text-center text-gray-500 py-12">
                <div className="w-16 h-16 mx-auto mb-4 text-gray-300">
                  <svg fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 2C5.58 2 2 5.58 2 10s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zM9 9a1 1 0 112 0v4a1 1 0 11-2 0V9zm1-3a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
                  </svg>
                </div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">
                  Pilih Permit
                </h4>
                <p className="text-sm">
                  Klik pada titik di denah untuk melihat detail permit yang dipilih
                </p>
              </div>
            )}
            </div>

            {/* Statistik dan Ringkasan */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-semibold text-quaternary mb-6">
                Statistik Permit
              </h3>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-blue-700">Total Permit</span>
                      <span className="text-2xl font-bold text-blue-800">
                        {getFilteredPoints().length}
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-red-50 p-3 rounded-lg">
                      <div className="text-center">
                        <div className="text-lg font-bold text-red-600">
                          {
                            getFilteredPoints().filter((p) =>
                              p.type === "HW"
                            ).length
                          }
                        </div>
                        <div className="text-xs text-red-600 font-medium">Hot Work</div>
                      </div>
                    </div>
                    <div className="bg-yellow-50 p-3 rounded-lg">
                      <div className="text-center">
                        <div className="text-lg font-bold text-yellow-600">
                          {
                            getFilteredPoints().filter((p) =>
                              p.type === "CW"
                            ).length
                          }
                        </div>
                        <div className="text-xs text-yellow-600 font-medium">Critical Work</div>
                      </div>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="text-center">
                        <div className="text-lg font-bold text-blue-600">
                          {
                            getFilteredPoints().filter((p) =>
                              p.type === "GW"
                            ).length
                          }
                        </div>
                        <div className="text-xs text-blue-600 font-medium">General Work</div>
                      </div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-center">
                        <div className="text-lg font-bold text-gray-600">
                          {
                            getFilteredPoints().filter((p) =>
                              p.type === "BC"
                            ).length
                          }
                        </div>
                        <div className="text-xs text-gray-600 font-medium">Breaking Containment</div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-gray-600">Aktif</span>
                      <span className="font-semibold text-green-600">
                        {
                          getFilteredPoints().filter(
                            (p) => p.status === "active"
                          ).length
                        }
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-gray-600">On Progress</span>
                      <span className="font-semibold text-green-600">
                        {
                          getFilteredPoints().filter(
                            (p) => p.status === "running"
                          ).length
                        }
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-gray-600">Menunggu</span>
                      <span className="font-semibold text-yellow-600">
                        {
                          getFilteredPoints().filter(
                            (p) => p.status === "pending"
                          ).length
                        }
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-gray-600">Selesai</span>
                      <span className="font-semibold text-gray-600">
                        {
                          getFilteredPoints().filter(
                            (p) => p.status === "completed"
                          ).length
                        }
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default withAuth(SitePlotPlans);
