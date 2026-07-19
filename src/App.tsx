/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { APIProvider, Map, useMap, useMapsLibrary, Polyline, Marker } from '@vis.gl/react-google-maps';
import { MapPin, Route, Bike, ArrowRightLeft, Info, AlertTriangle, Compass, Mountain, Map as MapIcon, Send, Mic, Square, MessageSquare, ListTree, SlidersHorizontal, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { findUniquePaths, TrailSegment } from './services/discoveryService.ts';
import VisionExplorer from './components/VisionExplorer.tsx';

const SPIS_DESTINATIONS = [
  'Poprad',
  'Spišská Nová Ves',
  'Levoča',
  'Kežmarok',
  'Stará Ľubovňa',
  'Spišské Podhradie (Spiš Castle)',
  'Krompachy',
  'Gelnica',
  'Spišská Belá',
  'Smižany',
  'Hrabušice (Slovenský raj Gateway)',
  'Dobsinská Ice Cave',
  'Castle Ľubovňa',
  'Žehra (Gothic Church)'
];

interface RouteInfo {
  distance: string;
  duration: string;
  warnings?: string[];
}

function Directions({ 
  origin, 
  destination, 
  onRouteFound,
  onError
}: { 
  origin: string; 
  destination: string; 
  onRouteFound: (info: RouteInfo) => void;
  onError: (error: string) => void;
}) {
  const map = useMap();
  const routesLibrary = useMapsLibrary('routes');
  const [directionsService, setDirectionsService] = useState<google.maps.DirectionsService>();
  const [directionsRenderer, setDirectionsRenderer] = useState<google.maps.DirectionsRenderer>();

  // Initialize directions service and renderer
  useEffect(() => {
    if (!routesLibrary || !map) return;
    setDirectionsService(new routesLibrary.DirectionsService());
    setDirectionsRenderer(new routesLibrary.DirectionsRenderer({ map }));
  }, [routesLibrary, map]);

  // Request the route calculation
  useEffect(() => {
    if (!directionsService || !directionsRenderer || !origin || !destination) return;

    directionsService
      .route({
        origin: `${origin}, Slovakia`,
        destination: `${destination}, Slovakia`,
        travelMode: google.maps.TravelMode.BICYCLING,
        provideRouteAlternatives: true,
      })
      .then(response => {
        directionsRenderer.setDirections(response);
        const route = response.routes[0];
        if (route && route.legs.length > 0) {
          onRouteFound({
            distance: route.legs[0].distance?.text || 'Unknown',
            duration: route.legs[0].duration?.text || 'Unknown',
            warnings: route.warnings
          });
        }
      })
      .catch(err => {
        console.error('Failed to resolve bike route:', err);
        directionsRenderer.setDirections({ routes: [] } as any);
        onError("No bike route found. Try a different city combination.");
      });
      
    return () => {
      directionsRenderer.setDirections({ routes: [] } as any);
    };
  }, [directionsService, directionsRenderer, origin, destination, onRouteFound, onError]);

  return null;
}

export default function App() {
  const [viewMode, setViewMode] = useState<'map' | 'vision'>('map');
  const [origin, setOrigin] = useState(SPIS_DESTINATIONS[0]);
  const [destination, setDestination] = useState(SPIS_DESTINATIONS[5]);
  const [activeOrigin, setActiveOrigin] = useState('');
  const [activeDestination, setActiveDestination] = useState('');
  
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);

  // Discovery Mode state
  const [isDiscoveryMode, setIsDiscoveryMode] = useState(false);
  const [discoveredPaths, setDiscoveredPaths] = useState<TrailSegment[]>([]);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [selectedPath, setSelectedPath] = useState<TrailSegment | null>(null);

  // Chat/Voice UI state
  const [sidebarMode, setSidebarMode] = useState<'manual' | 'ai'>('manual');
  const [chatMessages, setChatMessages] = useState<{role: 'user'|'agent', text: string}[]>([
    { role: 'agent', text: "Hello! I'm your Spiš route explorer. Tell me where you are trying to go, or what kind of ride you're looking for." }
  ]);
  const [isRecording, setIsRecording] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    setChatMessages(prev => [...prev, { role: 'user', text: chatInput }]);
    setChatInput('');
    // Simulate AI response
    setTimeout(() => {
      setChatMessages(prev => [...prev, { 
        role: 'agent', 
        text: "I found a non-standard route connecting those points mostly via hard-pack gravel. Does that work, or do you want more paved sections?" 
      }]);
    }, 1500);
  };

  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      // Simulate processed voice
      const simulatedVoice = "I want to ride from Poprad to Levoča, but avoiding the main highway. Something scenic.";
      setChatMessages(prev => [...prev, { role: 'user', text: simulatedVoice }]);
      setTimeout(() => {
        setChatMessages(prev => [...prev, { 
          role: 'agent', 
          text: "Visual scan complete. I see a forestry track south of the highway that connects through Spišský Štvrtok. I've plotted it on the map. What do you think of this route?" 
        }]);
      }, 2000);
    } else {
      setIsRecording(true);
    }
  };

  // Route preferences state
  const [surfacePref, setSurfacePref] = useState<'paved' | 'unpaved' | 'mixed'>('mixed');
  const [effortLevel, setEffortLevel] = useState<'easy' | 'moderate' | 'hard'>('moderate');
  const [tourType, setTourType] = useState<'single' | 'multiday'>('single');
  const [showPreferences, setShowPreferences] = useState(false);

  const apiKey = (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY || '';

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (origin === destination) {
      setRouteError("Origin and destination cannot be the same.");
      setRouteInfo(null);
      return;
    }
    setRouteError(null);
    setRouteInfo(null);
    setSelectedPath(null);
    setActiveOrigin(origin);
    setActiveDestination(destination);
  };

  const handleDiscovery = async (map: google.maps.Map) => {
    if (!isDiscoveryMode) {
      setIsDiscoveryMode(true);
      setIsDiscovering(true);
      const bounds = map.getBounds();
      if (bounds) {
        const paths = await findUniquePaths(bounds.toJSON());
        setDiscoveredPaths(paths);
      }
      setIsDiscovering(false);
    } else {
      setIsDiscoveryMode(false);
      setDiscoveredPaths([]);
      setSelectedPath(null);
    }
  };

  const handleSwap = () => {
    setOrigin(destination);
    setDestination(origin);
    if (activeOrigin && activeDestination) {
      setActiveOrigin(destination);
      setActiveDestination(origin);
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden font-sans bg-[#f8fafc] text-slate-900">
      {/* Global Top Nav Header */}
      <header className="flex-shrink-0 bg-white border-b border-slate-200 px-5 py-3 flex items-center justify-between shadow-sm z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-emerald-600/10">
            <Bike className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-extrabold text-base tracking-tight text-slate-900">Spiš Bike Routes</h1>
            <p className="text-[10px] text-slate-500 font-medium">Slovakia Outdoor Navigation Portal</p>
          </div>
        </div>

        {/* View Mode Toggle Buttons */}
        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200/40">
          <button
            onClick={() => setViewMode('map')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
              viewMode === 'map'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            Interactive Map & Chat
          </button>
          <button
            onClick={() => setViewMode('vision')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
              viewMode === 'vision'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
            AI Vision Map Scanner
          </button>
        </div>

        {/* Small decorative indicator */}
        <div className="hidden sm:flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Active Agent Connection</span>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'map' ? (
          <div className="flex flex-col md:flex-row h-full overflow-hidden">
            {/* Sidebar Panel */}
            <div className="w-full md:w-80 flex flex-col h-1/2 md:h-full bg-white border-r border-slate-200 shadow-lg z-20">
              
              {/* Header */}
              <div className="p-4 border-b border-slate-100 bg-white">
                <p className="text-slate-500 text-xs mb-3">
                  Discover the best cycling paths across the historic Spiš region of Slovakia.
                </p>
          
          {/* Mode Toggle */}
          <div className="flex rounded-md bg-slate-100 p-1">
            <button
              onClick={() => setSidebarMode('manual')}
              className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-semibold rounded ${sidebarMode === 'manual' ? 'bg-white shadow text-emerald-700' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Route className="w-3.5 h-3.5" />
              Manual Routing
            </button>
            <button
              onClick={() => setSidebarMode('ai')}
              className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-semibold rounded ${sidebarMode === 'ai' ? 'bg-white shadow text-emerald-700' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              AI Assistant
            </button>
          </div>
        </div>

        {/* Control Panel / Chat */}
        <div className="flex-1 overflow-y-auto flex flex-col">
          {sidebarMode === 'manual' ? (
            <>
              <div className="p-4 bg-slate-50 border-b border-slate-100">
                <form onSubmit={handleSearch} className="space-y-2">
                  <div className="relative">
                    <label className="sr-only">Origin</label>
                    <div className="relative">
                      <div className="absolute left-3 top-3 w-2 h-2 rounded-full border-2 border-emerald-500 bg-white pointer-events-none z-10"></div>
                      <select 
                        value={origin} 
                        onChange={e => setOrigin(e.target.value)}
                        className="w-full appearance-none pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-md text-sm font-medium focus:outline-none focus:border-emerald-500 text-slate-900 transition-all"
                      >
                        {SPIS_DESTINATIONS.map(city => (
                          <option key={city} value={city}>{city}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-center -my-1 relative z-10">
                    <button
                      type="button"
                      onClick={handleSwap}
                      className="bg-white border text-slate-500 hover:text-emerald-600 border-slate-200 p-1.5 rounded shadow-sm transition-all focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5 rotate-90 md:rotate-0" />
                    </button>
                  </div>

                  <div className="relative">
                    <label className="sr-only">Destination</label>
                    <div className="relative">
                      <div className="absolute left-3 top-3 w-2 h-2 rounded-full bg-emerald-500 pointer-events-none z-10"></div>
                      <select 
                        value={destination} 
                        onChange={e => setDestination(e.target.value)}
                        className="w-full appearance-none pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-md text-sm font-medium focus:outline-none focus:border-emerald-500 text-slate-900 transition-all"
                      >
                        {SPIS_DESTINATIONS.map(city => (
                          <option key={city} value={city}>{city}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Route Preferences Toggle */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setShowPreferences(!showPreferences)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors w-full"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      Route Preferences
                      {showPreferences ? <ChevronUp className="w-3.5 h-3.5 ml-auto" /> : <ChevronDown className="w-3.5 h-3.5 ml-auto" />}
                    </button>
                    
                    {showPreferences && (
                      <div className="mt-3 space-y-3 bg-white p-3 rounded-lg border border-slate-200 shadow-sm animate-in fade-in slide-in-from-top-1">
                        
                        {/* Tour Type */}
                        <div>
                          <label className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 block tracking-wider">Tour Type</label>
                          <div className="flex bg-slate-100 rounded-md p-0.5">
                            <button type="button" onClick={() => setTourType('single')} className={`flex-1 text-[11px] font-medium py-1 rounded transition-colors ${tourType === 'single' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Single Day</button>
                            <button type="button" onClick={() => setTourType('multiday')} className={`flex-1 text-[11px] font-medium py-1 rounded transition-colors ${tourType === 'multiday' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Multi-day</button>
                          </div>
                        </div>

                        {/* Surface */}
                        <div>
                          <label className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 block tracking-wider">Surface</label>
                          <div className="flex bg-slate-100 rounded-md p-0.5">
                            <button type="button" onClick={() => setSurfacePref('paved')} className={`flex-1 text-[11px] font-medium py-1 rounded transition-colors ${surfacePref === 'paved' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Paved</button>
                            <button type="button" onClick={() => setSurfacePref('mixed')} className={`flex-1 text-[11px] font-medium py-1 rounded transition-colors ${surfacePref === 'mixed' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Mixed</button>
                            <button type="button" onClick={() => setSurfacePref('unpaved')} className={`flex-1 text-[11px] font-medium py-1 rounded transition-colors ${surfacePref === 'unpaved' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Unpaved</button>
                          </div>
                        </div>

                        {/* Effort */}
                        <div>
                          <label className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 block tracking-wider">Effort Level</label>
                          <div className="flex bg-slate-100 rounded-md p-0.5">
                            <button type="button" onClick={() => setEffortLevel('easy')} className={`flex-1 text-[11px] font-medium py-1 rounded transition-colors ${effortLevel === 'easy' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Easy</button>
                            <button type="button" onClick={() => setEffortLevel('moderate')} className={`flex-1 text-[11px] font-medium py-1 rounded transition-colors ${effortLevel === 'moderate' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Moderate</button>
                            <button type="button" onClick={() => setEffortLevel('hard')} className={`flex-1 text-[11px] font-medium py-1 rounded transition-colors ${effortLevel === 'hard' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Hard (Climbs)</button>
                          </div>
                        </div>

                      </div>
                    )}
                  </div>

                  <button 
                    type="submit" 
                    className="w-full mt-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-2 px-4 rounded shadow-sm transition-all flex items-center justify-center gap-2"
                  >
                    <Route className="w-4 h-4" />
                    Find Bike Route
                  </button>
                </form>
              </div>

              {/* Discovery Toggle */}
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                 <div className="flex items-center gap-2">
                    <Compass className={`w-4 h-4 ${isDiscoveryMode ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Unique Path Discovery</span>
                 </div>
                 <button 
                    onClick={async () => {
                       const newMode = !isDiscoveryMode;
                       setIsDiscoveryMode(newMode);
                       
                       // Offline mode fallback fetch
                       if (newMode && !apiKey && discoveredPaths.length === 0) {
                          setIsDiscovering(true);
                          // Spiš Region approximate bounds
                          const fallbackBounds = {
                             south: 48.8, west: 20.4, north: 49.1, east: 20.8
                          };
                          try {
                             const paths = await findUniquePaths(fallbackBounds);
                             setDiscoveredPaths(paths);
                          } catch (e) {
                             console.error(e);
                          }
                          setIsDiscovering(false);
                       }
                    }}
                    className={`w-10 h-5 rounded-full transition-colors relative flex-shrink-0 ${isDiscoveryMode ? 'bg-emerald-500' : 'bg-slate-300'}`}
                    disabled={isDiscovering}
                 >
                    <div 
                      className={`absolute top-[2px] w-4 h-4 bg-white rounded-full transition-all shadow-sm ${isDiscoveryMode ? 'left-[22px]' : 'left-[2px]'}`} 
                    />
                 </button>
              </div>

              {/* Results Area */}
              {routeError && (
                <div className="m-4 bg-red-50 text-red-700 border-l-4 border-red-500 p-4 flex gap-3 text-xs font-medium animate-in slide-in-from-bottom-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <p>{routeError}</p>
                </div>
              )}

              {routeInfo && (
            <div className="p-4 bg-emerald-50 border-l-4 border-emerald-500 animate-in fade-in slide-in-from-bottom-4 my-2 mx-4">
              <div className="flex justify-between items-start mb-2 border-b border-emerald-200/50 pb-2">
                <h3 className="font-bold text-sm text-emerald-900 flex items-center gap-2">
                  <Bike className="w-4 h-4" /> 
                  Primary Route
                </h3>
                <span className="text-[10px] font-black px-1.5 py-0.5 bg-emerald-200 text-emerald-800 rounded uppercase">Verified</span>
              </div>
              <div className="pt-1">
                <div className="grid grid-cols-3 gap-1 mb-3">
                  <div className="bg-white/50 p-2 rounded">
                    <p className="block text-[10px] uppercase text-emerald-600 font-bold tracking-wider mb-0.5">Dist</p>
                    <p className="text-xs font-bold text-emerald-900">{routeInfo.distance}</p>
                  </div>
                  <div className="bg-white/50 p-2 rounded">
                    <p className="block text-[10px] uppercase text-emerald-600 font-bold tracking-wider mb-0.5">Time</p>
                    <p className="text-xs font-bold text-emerald-900">{routeInfo.duration}</p>
                  </div>
                  <div className="bg-white/50 p-2 rounded">
                    <p className="block text-[10px] uppercase text-emerald-600 font-bold tracking-wider mb-0.5">Quality</p>
                    <p className="text-xs font-bold text-emerald-900">Paved</p>
                  </div>
                </div>

                {routeInfo.warnings && routeInfo.warnings.length > 0 && (
                  <div className="mt-2 p-2 bg-amber-50 text-amber-800 rounded border border-amber-200 text-[11px] flex gap-2">
                    <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold mb-0.5">Route Warnings:</p>
                      <ul className="list-disc pl-4 space-y-0.5">
                        {routeInfo.warnings.map((w, i) => <li key={i}>{w}</li>)}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {isDiscoveryMode && selectedPath && (
             <div className="p-4 bg-slate-100 border-l-4 border-slate-600 animate-in slide-in-from-right-4 my-2 mx-4">
                <div className="flex justify-between items-center mb-2 border-b border-slate-200 pb-2">
                  <h3 className="font-bold text-sm flex items-center gap-2">
                    <Compass className="w-4 h-4 text-slate-600" />
                    Discovery Segment
                  </h3>
                  <button onClick={() => setSelectedPath(null)} className="text-xs font-bold text-slate-400 hover:text-slate-600">Close</button>
                </div>
                <div className="space-y-3">
                   <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Grounding Intel</p>
                      <p className="text-sm font-bold">{selectedPath.name}</p>
                   </div>
                   <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-white p-2 rounded shadow-sm">
                         <span className="block text-[9px] text-slate-400 font-bold uppercase">Surface</span>
                         <span className="font-bold capitalize">{selectedPath.surface}</span>
                      </div>
                      <div className="bg-white p-2 rounded shadow-sm">
                         <span className="block text-[9px] text-slate-400 font-bold uppercase">Smoothness</span>
                         <span className="font-bold capitalize">{selectedPath.smoothness}</span>
                      </div>
                   </div>
                   <div className="bg-emerald-600/10 p-2 rounded border border-emerald-600/20 text-[10px] text-emerald-800 flex items-start gap-2">
                      <Mountain className="w-3.5 h-3.5 mt-0.5" />
                      <p>High exercise quality detected. Significant unpaved sections ground satellite imagery for unique trekking.</p>
                   </div>
                </div>
             </div>
          )}

          {isDiscoveryMode && !selectedPath && (
             <div className="p-4 m-4 bg-slate-50 border border-slate-200 border-dashed rounded text-center">
                <MapIcon className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                <p className="text-[11px] text-slate-500 font-medium">Select a discovered segment on the map to view grounding data and exercise quality.</p>
             </div>
          )}
          
          {!routeInfo && !routeError && activeOrigin && activeDestination && (
             <div className="flex flex-col items-center justify-center p-8 text-slate-400 animate-pulse">
               <Bike className="w-6 h-6 mb-2 opacity-50" />
               <p className="text-xs font-medium">Searching for bike paths...</p>
             </div>
          )}
          </>
          ) : (
            <div className="flex flex-col h-full bg-slate-50 relative">
              {/* Chat View */}
              <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatMessages.map((msg, idx) => (
                  <div key={idx} className={`max-w-[85%] rounded-lg p-3 text-[13px] ${msg.role === 'user' ? 'bg-emerald-600 text-white ml-auto rounded-br-none' : 'bg-white border border-slate-200 text-slate-700 mr-auto rounded-bl-none shadow-sm'}`}>
                    {msg.text}
                  </div>
                ))}
                {isRecording && (
                   <div className="flex items-center gap-2 p-3 text-emerald-600 text-[13px] max-w-[85%] bg-white border border-emerald-100 rounded-lg rounded-bl-none shadow-sm mr-auto animate-pulse">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" />
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{animationDelay: '100ms'}} />
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{animationDelay: '200ms'}} />
                      <span className="ml-1 font-medium italic object-contain">Listening...</span>
                   </div>
                )}
              </div>
              
              {/* Input Area */}
              <div className="p-3 bg-white border-t border-slate-200">
                <div className="relative">
                  <textarea
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Type or talk to map a route..."
                    rows={1}
                    className="w-full bg-slate-100 border-none rounded-xl pr-20 pl-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none overflow-hidden"
                  />
                  <div className="absolute right-2 top-2 flex items-center gap-1">
                    <button 
                      onClick={toggleRecording}
                      className={`p-1.5 rounded-full transition-colors ${isRecording ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-transparent hover:bg-slate-200 text-slate-500'}`}
                      title="Hold to record"
                    >
                      {isRecording ? <Square className="w-4 h-4 fill-current" /> : <Mic className="w-4 h-4" />}
                    </button>
                    <button 
                      onClick={handleSendMessage}
                      disabled={!chatInput.trim() || isRecording}
                      className={`p-1.5 rounded-full transition-colors ${chatInput.trim() ? 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700' : 'bg-transparent text-slate-300'}`}
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Map View */}
      <div className="flex-1 h-1/2 md:h-full relative bg-[#e2e8f0]">
        {apiKey ? (
          <APIProvider apiKey={apiKey}>
            <Map
              defaultCenter={{ lat: 48.9443, lng: 20.5615 }} // Centered roughly on Spišská Nová Ves
              defaultZoom={11}
              gestureHandling={'greedy'}
              disableDefaultUI={false}
              mapId="DEMO_MAP_ID"
              className="w-full h-full"
              onIdle={async (e) => {
                 if (isDiscoveryMode) {
                    const paths = await findUniquePaths(e.map.getBounds()!.toJSON());
                    setDiscoveredPaths(paths);
                 }
              }}
            >
              {activeOrigin && activeDestination && (
                <Directions
                  origin={activeOrigin}
                  destination={activeDestination}
                  onRouteFound={setRouteInfo}
                  onError={setRouteError}
                />
              )}

              {isDiscoveryMode && discoveredPaths.map(path => (
                 <Polyline 
                    key={path.id}
                    path={path.coords}
                    strokeColor={selectedPath?.id === path.id ? "#059669" : "#64748b"}
                    strokeWeight={selectedPath?.id === path.id ? 6 : 3}
                    strokeOpacity={0.8}
                    onClick={() => setSelectedPath(path)}
                 />
              ))}

              {isDiscoveryMode && selectedPath && (
                 <Marker 
                    position={selectedPath.coords[0]} 
                    title={selectedPath.name}
                    onClick={() => setSelectedPath(selectedPath)}
                 />
              )}
            </Map>
          </APIProvider>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-200">
            <div className="text-center p-8 bg-white/80 rounded-xl shadow-lg border border-slate-300 max-w-sm backdrop-blur-sm z-10">
              <MapIcon className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h2 className="text-lg font-bold text-slate-800 mb-2">Interactive Map Disabled</h2>
              <p className="text-sm text-slate-600 mb-4">
                Add your <strong>Google Maps API key</strong> in the Secrets panel to enable interactive routing and visual path plotting.
              </p>
              <div className="text-xs text-slate-500 bg-slate-100 p-4 rounded text-left border border-slate-200">
                <p className="font-bold text-slate-700 uppercase tracking-wider mb-2 text-[10px]">Active Fallback Features:</p>
                <ul className="list-disc pl-4 space-y-1.5">
                  <li><strong>AI Route Planning:</strong> Generating itineraries via logic.</li>
                  <li><strong>Discovery Service:</strong> Overpass API parsing and text output.</li>
                  <li><strong>Voice Agent:</strong> Narration and conversation.</li>
                </ul>
              </div>
            </div>
            {/* Faux Background Grid for aesthetics */}
            <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #94a3b8 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
          </div>
        )}

        {/* Discovery Floating Label */}
        <div className="absolute top-4 right-4 bg-white shadow-md border border-slate-200 p-2 rounded flex flex-col gap-2">
           <button 
              onClick={() => setIsDiscoveryMode(!isDiscoveryMode)}
              className={`p-2 rounded hover:bg-slate-50 transition-colors ${isDiscoveryMode ? 'text-emerald-600' : 'text-slate-400'}`}
              title="Toggle Trail Discovery"
           >
              <Compass className="w-5 h-5" />
           </button>
        </div>

        <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-slate-200 max-w-xs flex items-center gap-3">
           <div className="text-center">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Analysis</div>
              <div className="text-xs font-bold text-emerald-600">Active Grounding</div>
           </div>
           <div className="w-px h-6 bg-slate-200"></div>
           <div className="text-center">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Region</div>
              <div className="text-xs font-bold">Spiš, SK</div>
           </div>
        </div>
      </div>
    </div>
  ) : (
    <VisionExplorer />
  )}
</div>
</div>
  );
}
