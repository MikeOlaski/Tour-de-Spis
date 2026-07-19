import React, { useState, useRef, useEffect } from "react";
import { 
  Sparkles, Upload, RefreshCw, Compass, Mountain, 
  AlertTriangle, Route, Info, Eye, CheckCircle2, 
  MapPin, Landmark, ArrowRight, ShieldAlert, Navigation 
} from "lucide-react";

// Image presets generated for our Spiš Region Topo maps
const PRESETS = [
  {
    id: "slovensky_raj",
    name: "Slovenský Raj (Gorge Track)",
    description: "Rugged limestone gorges, stream crossings, and steep forest climbs.",
    image: "/src/assets/images/slovensky_raj_map_1784379023093.jpg",
    region: "Slovenský Raj National Park, Spiš"
  },
  {
    id: "spis_castle",
    name: "Spiš Castle Meadows",
    description: "Rolling hills, historic approaches, and scenic meadows surrounding the fortress.",
    image: "/src/assets/images/spis_castle_map_1784379041035.jpg",
    region: "Spišské Podhradie & Dreveník, Spiš"
  }
];

interface PointOfInterest {
  name: string;
  description: string;
  icon: string;
}

interface ItineraryItem {
  segment: string;
  details: string;
  elevation: string;
}

interface VisionRouteResult {
  routeName: string;
  description: string;
  distanceKm: number;
  climbMeters: number;
  difficulty: string;
  highlights: string[];
  pointsOfInterest: PointOfInterest[];
  safetyWarnings: string[];
  itinerary: ItineraryItem[];
  pathPoints: { x: number; y: number }[];
}

export default function VisionExplorer() {
  const [selectedPreset, setSelectedPreset] = useState(PRESETS[0]);
  const [customImage, setCustomImage] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VisionRouteResult | null>(null);
  
  // Local preferences
  const [surfacePref, setSurfacePref] = useState<"paved" | "unpaved" | "mixed">("mixed");
  const [effortLevel, setEffortLevel] = useState<"easy" | "moderate" | "hard">("moderate");
  const [tourType, setTourType] = useState<"single" | "multiday">("single");
  const [hoveredPoi, setHoveredPoi] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Status messages cycled during analysis to show realistic progress
  const progressMessages = [
    "Uploading map coordinates & base64 matrix...",
    "Initializing Gemini 3.5 Flash vision model...",
    "Scanning map topography and isolating contour lines...",
    "Tracing color-coded cycle and hiking trail markers...",
    "Analyzing elevation shifts & slope gradients...",
    "Locating streams, landmarks, and historic assets...",
    "Optimizing a scenic, custom trail itinerary...",
    "Finalizing safety parameters and relative overlay path..."
  ];

  useEffect(() => {
    if (!isAnalyzing) return;
    let index = 0;
    setAnalysisProgress(progressMessages[0]);
    const interval = setInterval(() => {
      index = (index + 1) % progressMessages.length;
      setAnalysisProgress(progressMessages[index]);
    }, 2000);
    return () => clearInterval(interval);
  }, [isAnalyzing]);

  // Handle Drag & Drop events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please upload a valid image file (PNG, JPG, JPEG).");
      return;
    }
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      setCustomImage(reader.result as string);
      setResult(null); // Clear previous result
      setError(null);
    };
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  const runVisionAnalysis = async () => {
    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    const activeImage = customImage || selectedPreset.image;
    const regionName = customImage ? "Custom Uploaded Map" : selectedPreset.name;

    try {
      // First, check if the image has already been loaded, or if we need to convert the preset image to Base64
      let finalBase64 = activeImage;
      if (!customImage) {
        // If it is a preset (which is a local static path), we can fetch it and convert to base64
        const response = await fetch(activeImage);
        const blob = await response.blob();
        finalBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }

      const res = await fetch("/api/vision/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: finalBase64,
          region: regionName,
          surfacePref,
          effortLevel,
          tourType
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Vision model failed to analyze the map.");
      }

      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred while communicating with the server.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Convert points array into SVG path string
  const getSvgPathString = (points: { x: number; y: number }[]) => {
    if (points.length === 0) return "";
    return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x}% ${p.y}%`).join(" ");
  };

  // Helper to resolve icon based on keyword
  const getPoiIcon = (keyword: string) => {
    switch (keyword?.toLowerCase()) {
      case "castle":
      case "fortress":
      case "ruin":
        return <Landmark className="w-4 h-4 text-amber-600" />;
      case "mountain":
      case "peak":
      case "hill":
        return <Mountain className="w-4 h-4 text-rose-600" />;
      case "water":
      case "river":
      case "stream":
      case "gorge":
        return <Compass className="w-4 h-4 text-blue-600" />;
      case "forest":
      case "woods":
      case "tree":
        return <Compass className="w-4 h-4 text-emerald-600" />;
      case "church":
      case "chapel":
      case "cross":
        return <Landmark className="w-4 h-4 text-indigo-600" />;
      default:
        return <MapPin className="w-4 h-4 text-emerald-600" />;
    }
  };

  return (
    <div id="vision-explorer" className="flex flex-col lg:flex-row h-full overflow-hidden bg-slate-900 text-slate-100">
      
      {/* Sidebar Controls & Parameters */}
      <div className="w-full lg:w-[420px] flex flex-col h-1/2 lg:h-full border-r border-slate-800 bg-slate-950 overflow-y-auto">
        
        {/* Banner */}
        <div className="p-5 border-b border-slate-800 bg-gradient-to-r from-emerald-950 to-slate-950">
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles className="w-5 h-5 text-emerald-400 animate-pulse" />
            <h2 className="font-extrabold text-base tracking-tight text-white uppercase">Vision Route Scanner</h2>
          </div>
          <p className="text-slate-400 text-xs leading-relaxed">
            Upload any hiking or cycling map screenshot from <span className="text-emerald-400 font-semibold">Freemap.sk</span> (or use a preset), and let our computer vision model analyze elevations, trail systems, and contours to plan your perfect route.
          </p>
        </div>

        {/* Configurations */}
        <div className="p-5 space-y-5 flex-1">
          
          {/* Map Input Selector */}
          <div>
            <label className="text-[10px] uppercase font-black text-slate-400 mb-2 block tracking-wider">
              1. Choose Map Source
            </label>
            
            {/* Presets Grid */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelectedPreset(p);
                    setCustomImage(null);
                    setResult(null);
                    setError(null);
                  }}
                  className={`p-2.5 rounded-lg text-left transition-all border text-xs flex flex-col justify-between h-[100px] ${
                    selectedPreset.id === p.id && !customImage
                      ? "border-emerald-500 bg-emerald-950/40 text-white shadow-lg shadow-emerald-950/20"
                      : "border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <div>
                    <div className="font-bold text-slate-200 leading-snug">{p.name}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-2">{p.description}</div>
                  </div>
                  <span className="text-[9px] uppercase font-black text-emerald-400/80 tracking-wider">Preset Map</span>
                </button>
              ))}
            </div>

            {/* Custom Drag & Drop File Upload */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={triggerUpload}
              className={`p-4 border-2 border-dashed rounded-lg text-center cursor-pointer transition-all ${
                dragActive 
                  ? "border-emerald-400 bg-emerald-950/20 text-white" 
                  : customImage 
                    ? "border-emerald-500/80 bg-slate-900/80 text-emerald-300"
                    : "border-slate-800 bg-slate-900/30 text-slate-400 hover:border-slate-700 hover:bg-slate-900/50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
              />
              <Upload className={`w-5 h-5 mx-auto mb-2 ${customImage ? "text-emerald-400" : "text-slate-500"}`} />
              <p className="text-[11px] font-semibold leading-tight">
                {customImage ? "Custom Screenshot Uploaded" : "Drag & drop map screenshot here"}
              </p>
              <p className="text-[9px] text-slate-500 mt-1">
                {customImage ? "Click to change screenshot" : "or click to browse files"}
              </p>
            </div>
            
            {/* Freemap link reminder */}
            <div className="mt-2 text-[10px] bg-slate-900/50 border border-slate-800/80 p-2 rounded text-slate-400 flex items-start gap-1.5 leading-snug">
              <Info className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span>
                Tip: Visit <a href="https://www.freemap.sk/#map=10/48.832182/20.639877&layers=X" target="_blank" rel="noopener noreferrer" className="text-emerald-400 font-bold underline hover:text-emerald-300">Freemap.sk (Layer X)</a>, capture any region, and drag the screenshot above!
              </span>
            </div>
          </div>

          {/* Preferences */}
          <div className="space-y-3.5 border-t border-slate-800 pt-4">
            <label className="text-[10px] uppercase font-black text-slate-400 block tracking-wider">
              2. Route Tuning Settings
            </label>

            {/* Tour Type */}
            <div>
              <span className="text-[10px] text-slate-400 font-bold block mb-1">Ride Style</span>
              <div className="grid grid-cols-2 gap-1 bg-slate-900 rounded p-0.5 border border-slate-800">
                <button 
                  onClick={() => setTourType("single")} 
                  className={`text-[10px] font-bold py-1 rounded transition-all ${tourType === "single" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-slate-200"}`}
                >
                  Single Day Loop
                </button>
                <button 
                  onClick={() => setTourType("multiday")} 
                  className={`text-[10px] font-bold py-1 rounded transition-all ${tourType === "multiday" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-slate-200"}`}
                >
                  Multi-Day Tour
                </button>
              </div>
            </div>

            {/* Surface */}
            <div>
              <span className="text-[10px] text-slate-400 font-bold block mb-1">Surface Preference</span>
              <div className="grid grid-cols-3 gap-1 bg-slate-900 rounded p-0.5 border border-slate-800">
                <button 
                  onClick={() => setSurfacePref("paved")} 
                  className={`text-[10px] font-bold py-1 rounded transition-all ${surfacePref === "paved" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-slate-200"}`}
                >
                  Paved Only
                </button>
                <button 
                  onClick={() => setSurfacePref("mixed")} 
                  className={`text-[10px] font-bold py-1 rounded transition-all ${surfacePref === "mixed" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-slate-200"}`}
                >
                  Mixed Gravel
                </button>
                <button 
                  onClick={() => setSurfacePref("unpaved")} 
                  className={`text-[10px] font-bold py-1 rounded transition-all ${surfacePref === "unpaved" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-slate-200"}`}
                >
                  Rugged MTB
                </button>
              </div>
            </div>

            {/* Effort */}
            <div>
              <span className="text-[10px] text-slate-400 font-bold block mb-1">Target Effort Level</span>
              <div className="grid grid-cols-3 gap-1 bg-slate-900 rounded p-0.5 border border-slate-800">
                <button 
                  onClick={() => setEffortLevel("easy")} 
                  className={`text-[10px] font-bold py-1 rounded transition-all ${effortLevel === "easy" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-slate-200"}`}
                >
                  Easy Roll
                </button>
                <button 
                  onClick={() => setEffortLevel("moderate")} 
                  className={`text-[10px] font-bold py-1 rounded transition-all ${effortLevel === "moderate" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-slate-200"}`}
                >
                  Moderate
                </button>
                <button 
                  onClick={() => setEffortLevel("hard")} 
                  className={`text-[10px] font-bold py-1 rounded transition-all ${effortLevel === "hard" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-slate-200"}`}
                >
                  Epic Climbs
                </button>
              </div>
            </div>
          </div>

          {/* Action Trigger */}
          <div className="pt-4 border-t border-slate-800">
            <button
              onClick={runVisionAnalysis}
              disabled={isAnalyzing}
              className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold py-2.5 px-4 rounded-lg shadow-lg shadow-emerald-500/10 transition-all flex items-center justify-center gap-2 text-xs"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                  Analyzing Map...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-slate-950" />
                  Analyze with Vision Model
                </>
              )}
            </button>
          </div>

          {/* Error display */}
          {error && (
            <div className="bg-rose-950/50 border border-rose-900/80 rounded p-3 text-rose-300 text-[11px] leading-relaxed flex gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Analysis Failed</p>
                <p className="mt-0.5 text-rose-400">{error}</p>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Main Viewport: Map Screenshot Renderer with Interactive Vector Overlays */}
      <div className="flex-1 flex flex-col h-1/2 lg:h-full bg-slate-900 relative">
        
        {/* Loading / Processing State Overlay */}
        {isAnalyzing && (
          <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center z-30 p-6 text-center backdrop-blur-sm">
            <div className="relative mb-6">
              <div className="w-16 h-16 rounded-full border-4 border-slate-800 border-t-emerald-400 animate-spin"></div>
              <Sparkles className="w-6 h-6 text-emerald-400 absolute inset-0 m-auto animate-pulse" />
            </div>
            
            <h3 className="font-bold text-lg text-white tracking-tight">AI Map Intelligence Scanning</h3>
            <p className="text-emerald-400 font-mono text-[11px] mt-2 animate-pulse bg-slate-900 px-3 py-1.5 rounded-md border border-slate-800">
              {analysisProgress}
            </p>
            
            {/* Tech-styled progress bar */}
            <div className="w-64 bg-slate-900 h-1.5 rounded-full mt-6 overflow-hidden border border-slate-800">
              <div className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full animate-infinite-loading"></div>
            </div>
          </div>
        )}

        {/* Dynamic Split Screen layout: Top/Left is Map Canvas, Bottom/Right is Gemini Analysis */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          
          {/* Map Viewer Canvas */}
          <div className="flex-1 bg-slate-950 flex items-center justify-center p-4 relative overflow-auto min-h-[300px]">
            
            {/* Map image container */}
            <div className="relative rounded-lg shadow-2xl border border-slate-800 overflow-hidden max-w-full max-h-[85vh] aspect-[4/3] group">
              <img
                src={customImage || selectedPreset.image}
                alt="Map Snapshot"
                className="object-contain w-full h-full"
                referrerPolicy="no-referrer"
              />

              {/* Laser Scan Animation Line when loading */}
              {isAnalyzing && (
                <div className="absolute left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-lg shadow-emerald-400 animate-laser-scan"></div>
              )}

              {/* Grid calibration text overlay (aesthetic) */}
              <div className="absolute top-2 left-2 font-mono text-[8px] text-slate-500 bg-slate-950/80 px-1.5 py-0.5 rounded border border-slate-800 pointer-events-none uppercase tracking-wider">
                Grid: Calibrated | Zoom: 12x | Spiš Topography
              </div>

              {/* Overlay Interactive SVG and Pins only when results are loaded */}
              {result && (
                <>
                  {/* Glowing Vector Trail Path */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none select-none">
                    <defs>
                      <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#14b8a6" />
                      </linearGradient>
                      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>
                    </defs>

                    {/* Background shadow line */}
                    <path
                      d={getSvgPathString(result.pathPoints)}
                      fill="none"
                      stroke="#022c22"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* Primary glowing line */}
                    <path
                      d={getSvgPathString(result.pathPoints)}
                      fill="none"
                      stroke="url(#routeGradient)"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      filter="url(#glow)"
                      className="animate-dash"
                      style={{
                        strokeDasharray: "1000",
                        strokeDashoffset: "0"
                      }}
                    />
                  </svg>

                  {/* Interactive POI Markers on the Map */}
                  {result.pointsOfInterest.map((poi, idx) => {
                    // Generate a semi-random but deterministic placement on the map based on the POI name if we don't have exact coordinates
                    // We distribute them along the route path (e.g. index 2, index 5, index 8 of the generated path points)
                    const pathIndex = Math.min(
                      Math.floor((idx + 1) * (result.pathPoints.length / 4)),
                      result.pathPoints.length - 1
                    );
                    const point = result.pathPoints[pathIndex] || { x: 50, y: 50 };

                    return (
                      <div
                        key={idx}
                        className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10"
                        style={{ left: `${point.x}%`, top: `${point.y}%` }}
                        onMouseEnter={() => setHoveredPoi(idx)}
                        onMouseLeave={() => setHoveredPoi(null)}
                      >
                        {/* Glowing ring */}
                        <div className={`absolute inset-0 rounded-full bg-emerald-400/30 animate-ping duration-1000 ${hoveredPoi === idx ? "scale-150" : ""}`}></div>
                        
                        {/* Pin Dot */}
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center border shadow-lg transition-all transform hover:scale-125 ${
                          hoveredPoi === idx 
                            ? "bg-emerald-400 border-white text-slate-950 scale-110" 
                            : "bg-slate-950 border-emerald-500 text-emerald-400"
                        }`}>
                          {getPoiIcon(poi.icon)}
                        </div>

                        {/* Interactive Tooltip Card on Hover */}
                        {hoveredPoi === idx && (
                          <div className="absolute bottom-9 left-1/2 -translate-x-1/2 w-48 bg-slate-950 text-white rounded-lg p-2.5 shadow-xl border border-slate-800 z-20 text-[10px] animate-in fade-in slide-in-from-bottom-1 pointer-events-none">
                            <span className="block font-extrabold uppercase tracking-widest text-emerald-400 text-[8px] mb-0.5">Point of Interest</span>
                            <span className="block font-bold text-slate-100 mb-1 leading-snug">{poi.name}</span>
                            <span className="block text-slate-400 leading-normal">{poi.description}</span>
                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-950 border-r border-b border-slate-800 rotate-45"></div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              )}

            </div>
            
            {/* Visual Help bar when map is hovered */}
            {result && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-950/90 border border-slate-800/80 text-slate-300 text-[10px] px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg backdrop-blur-sm pointer-events-none">
                <Navigation className="w-3.5 h-3.5 text-emerald-400 animate-bounce" />
                <span>Hover over trail points on the map to view terrain landmarks</span>
              </div>
            )}
          </div>

          {/* Gemini Route Analysis Details Pane */}
          <div className="w-full lg:w-[480px] border-t lg:border-t-0 lg:border-l border-slate-800 bg-slate-900/60 flex flex-col h-full overflow-y-auto">
            {result ? (
              <div className="p-5 space-y-5 animate-in fade-in slide-in-from-right-4">
                
                {/* Header Metrics */}
                <div className="border-b border-slate-800 pb-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] uppercase font-black px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-md border border-emerald-500/20">
                      Vision Resolved
                    </span>
                    <span className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> Topographic Match
                    </span>
                  </div>
                  <h3 className="font-extrabold text-lg text-white leading-tight">{result.routeName}</h3>
                  <p className="text-slate-400 text-xs mt-2 leading-relaxed">{result.description}</p>
                </div>

                {/* Key Stats Grid */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-lg text-center">
                    <span className="block text-[9px] uppercase font-bold text-slate-500 tracking-wider mb-0.5">Est. Distance</span>
                    <span className="text-sm font-extrabold text-white">{result.distanceKm} km</span>
                  </div>
                  <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-lg text-center">
                    <span className="block text-[9px] uppercase font-bold text-slate-500 tracking-wider mb-0.5">Total Climb</span>
                    <span className="text-sm font-extrabold text-white">+{result.climbMeters} m</span>
                  </div>
                  <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-lg text-center">
                    <span className="block text-[9px] uppercase font-bold text-slate-500 tracking-wider mb-0.5">Difficulty</span>
                    <span className="text-sm font-extrabold text-emerald-400">{result.difficulty}</span>
                  </div>
                </div>

                {/* Visual Highlights */}
                <div>
                  <h4 className="text-[10px] uppercase font-black text-slate-400 mb-2 tracking-wider">Visual Highlights Identified</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {result.highlights.map((h, i) => (
                      <span key={i} className="text-[10px] px-2.5 py-1 bg-slate-800 rounded-md border border-slate-700/60 text-slate-300 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" /> {h}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Points of Interest */}
                <div>
                  <h4 className="text-[10px] uppercase font-black text-slate-400 mb-2.5 tracking-wider">Topographic Landmarks</h4>
                  <div className="space-y-2">
                    {result.pointsOfInterest.map((poi, i) => (
                      <div 
                        key={i} 
                        className={`p-3 rounded-lg border transition-all flex gap-3 cursor-pointer ${
                          hoveredPoi === i 
                            ? "bg-emerald-950/20 border-emerald-500/50" 
                            : "bg-slate-950/40 border-slate-800 hover:border-slate-700"
                        }`}
                        onMouseEnter={() => setHoveredPoi(i)}
                        onMouseLeave={() => setHoveredPoi(null)}
                      >
                        <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center flex-shrink-0">
                          {getPoiIcon(poi.icon)}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white flex items-center gap-1.5">
                            {poi.name}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">{poi.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Safety Advisories */}
                {result.safetyWarnings.length > 0 && (
                  <div className="bg-amber-950/30 border border-amber-900/50 rounded-lg p-4">
                    <h4 className="text-[10px] uppercase font-black text-amber-400 mb-2 tracking-wider flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-amber-500" /> Cartographic Warnings
                    </h4>
                    <ul className="list-disc pl-4 space-y-1 text-[10px] text-amber-300/90 leading-relaxed">
                      {result.safetyWarnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Detailed Itinerary */}
                <div>
                  <h4 className="text-[10px] uppercase font-black text-slate-400 mb-2.5 tracking-wider">Trail Itinerary</h4>
                  <div className="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-800">
                    {result.itinerary.map((item, i) => (
                      <div key={i} className="flex gap-4 relative">
                        <div className="w-6 h-6 rounded-full bg-slate-950 border border-slate-800 text-[10px] font-bold text-emerald-400 flex items-center justify-center flex-shrink-0 z-10">
                          {i + 1}
                        </div>
                        <div className="bg-slate-950/30 border border-slate-800/80 p-3 rounded-lg flex-1">
                          <div className="flex justify-between items-start gap-2 border-b border-slate-800/60 pb-1.5 mb-1.5">
                            <h5 className="text-xs font-bold text-white">{item.segment}</h5>
                            <span className="text-[8px] uppercase font-black px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-400 tracking-wider">
                              {item.elevation}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 leading-normal">{item.details}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-500 text-center">
                <Compass className="w-12 h-12 text-slate-700 mb-4 animate-pulse" />
                <h4 className="font-extrabold text-sm text-slate-400">Scan Results Awaiting</h4>
                <p className="text-xs text-slate-600 mt-2 max-w-xs leading-relaxed">
                  Configure your tour style, choose or upload a trail map snapshot, and click <strong className="text-slate-400">Analyze with Vision Model</strong> to resolve topographic routes using AI.
                </p>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
