import React, { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle } from 'react-leaflet';
import L from 'leaflet';
import { useSupplyChain } from '../context/SupplyChainContext';
import { useTheme } from '../context/ThemeContext';
import { searchCities, getCityByName, DEFAULT_NODES } from '../utils/cities';
import { 
  Navigation, 
  Radio, 
  Zap, 
  MessageSquare,
  Package,
  Route as RouteIcon,
  AlertTriangle,
  Clock,
  TrendingUp,
  CheckCircle,
  XCircle,
  CloudLightning,
  Truck,
  Warehouse,
  Plus,
  MapPin,
  Play,
  ArrowRight,
  ChevronDown,
  Lightbulb,
  Brain,
  Sparkles
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Searchable city dropdown component
function CitySearchDropdown({ label, value, onChange, onSelect, placeholder }) {
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState([]);
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    const query = e.target.value;
    onChange(query);
    if (query.length >= 2) {
      const matches = searchCities(query, 8);
      setResults(matches);
      setIsOpen(true);
    } else {
      setResults([]);
      setIsOpen(false);
    }
  };

  const handleSelect = (city) => {
    onSelect(city);
    setIsOpen(false);
    setResults([]);
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <label className="block text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">{label}</label>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={() => value.length >= 2 && results.length > 0 && setIsOpen(true)}
          className="w-full p-2.5 pr-8 rounded-lg bg-white dark:bg-[#2d2d2d] border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={placeholder}
          autoComplete="off"
        />
        <ChevronDown className={`absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>
      {isOpen && results.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-white dark:bg-[#2d2d2d] border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {results.map((city) => (
            <li
              key={city.id}
              onClick={() => handleSelect(city)}
              className="px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-800 last:border-0"
            >
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {city.name}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                {city.state}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export const INDIA_CITIES = DEFAULT_NODES.map(city => ({
  id: city.id,
  name: city.name,
  lat: city.lat,
  lng: city.lng
}));

// Custom marker icons
const createIcon = (color, isGhost = false) => L.divIcon({
  className: 'custom-marker',
  html: `<div style="background-color: ${color}; width: ${isGhost ? '24px' : '16px'}; height: ${isGhost ? '24px' : '16px'}; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px ${color}; ${isGhost ? 'animation: pulse 1.5s infinite;' : ''}"></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

const defaultIcon = createIcon('#3b82f6');
const congestedIcon = createIcon('#ef4444');
const ghostIcon = createIcon('#a855f7', true);
const shipmentIcon = createIcon('#22c55e');

const nodeIcon = (congestion) => {
  const color = congestion > 0.7 ? '#ef4444' : congestion > 0.4 ? '#f59e0b' : '#22c55e';
  return createIcon(color);
};

function LiveTimer({ createdAt, status }) {
  const [elapsed, setElapsed] = useState('00:00');

  useEffect(() => {
    if (!createdAt) return;
    
    // update immediately once
    const updateTime = () => {
      const diffMs = Math.max(0, Date.now() - new Date(createdAt).getTime());
      const mins = Math.floor(diffMs / 60000);
      const secs = Math.floor((diffMs % 60000) / 1000);
      setElapsed(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
    };
    
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [createdAt]);

  if (!createdAt) return null;
  const isWaiting = status === 'waiting' || status === 'diverted';
  
  return (
    <p className={`text-[10px] mb-3 font-mono font-bold flex items-center gap-1 ${isWaiting ? 'text-amber-500 dark:text-amber-400' : 'text-blue-500 dark:text-blue-400'}`}>
      <Clock size={10} />
      {isWaiting ? `Paused at Ghost Node ⏱ ${elapsed}` : `Time Elapsed ⏱ ${elapsed}`}
    </p>
  );
}


function AIDecisionPanel({ shipment }) {
  const isDelivered = shipment.status === 'delivered';
  const isRerouted = shipment.status === 'rerouted';
  const isDiverted = shipment.status === 'diverted';
  const isResumed = shipment.status === 'resumed';
  const progress = shipment.progress ?? 0;

  const statusStyle = isDelivered
    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
    : isDiverted
      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
      : isResumed
        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
        : isRerouted
          ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
          : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';

  const progressColor = isDelivered ? 'bg-blue-500' : isDiverted ? 'bg-amber-500' : isResumed ? 'bg-emerald-500' : progress > 70 ? 'bg-green-500' : progress > 40 ? 'bg-amber-500' : 'bg-blue-500';

  return (
    <div className={`bg-white dark:bg-[#2d2d2d] rounded-xl border p-4 transition-all ${
      isDelivered ? 'border-blue-300 dark:border-blue-800' : 'border-gray-200 dark:border-gray-800'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Radio size={14} className={isDelivered ? 'text-blue-500' : 'text-green-500'} />
          <span className="font-bold text-gray-900 dark:text-gray-100 text-sm">{shipment.id}</span>
        </div>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${statusStyle}`}>
          {isDelivered ? '✓ Delivered' : isDiverted ? '⚠️ Diverted' : isResumed ? '🚀 Resumed' : isRerouted ? '⚡ Rerouted' : '→ In Transit'}
        </span>
      </div>

      {/* Route info */}
      {(shipment.originName || shipment.targetName) && (
        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-3 bg-gray-50 dark:bg-gray-800 px-2 py-1.5 rounded-lg">
          <span className="font-medium text-gray-700 dark:text-gray-300 truncate">{shipment.originName || '—'}</span>
          <ArrowRight size={10} className="flex-shrink-0 mx-1" />
          <span className="font-medium text-gray-700 dark:text-gray-300 truncate">{shipment.targetName || shipment.target}</span>
        </div>
      )}

      {/* Time added */}
      <LiveTimer createdAt={shipment.createdAt} status={shipment.status} />

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-500 dark:text-gray-400">Journey Progress</span>
          <span className="text-xs font-bold text-gray-900 dark:text-gray-100">{progress}%</span>
        </div>
        <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${progressColor}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Risk score */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500 dark:text-gray-400">Risk Score</span>
        <div className="flex items-center gap-2">
          <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${shipment.riskScore > 0.7 ? 'bg-red-500' : shipment.riskScore > 0.4 ? 'bg-amber-500' : 'bg-green-500'}`}
              style={{ width: `${(shipment.riskScore || 0) * 100}%` }}
            />
          </div>
          <span className="text-xs font-bold text-gray-900 dark:text-gray-100">{Math.round((shipment.riskScore || 0) * 100)}%</span>
        </div>
      </div>

      {/* AI reroute badge */}
      {isDiverted && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <AlertTriangle size={12} />
            <span className="text-xs font-bold">Temporarily Diverted — via {shipment.ghostNodeName || 'Ghost Node'}</span>
          </div>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">Awaiting clearance at {shipment.originalTargetName || 'destination'}. Will resume once cleared.</p>
        </div>
      )}
      {isResumed && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
          <Zap size={12} />
          <span className="text-xs font-bold">Resumed Delivery 🚀 — heading to {shipment.targetName}</span>
        </div>
      )}
      {isRerouted && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex items-center gap-2 text-purple-600 dark:text-purple-400">
          <Zap size={12} />
          <span className="text-xs font-bold">AI rerouted — delay reduced 85%</span>
        </div>
      )}
    </div>
  );
}

function SwarmActivityFeed({ alerts }) {
  const getEventIcon = (type) => {
    switch (type) {
      case 'danger': return AlertTriangle;
      case 'success': return CheckCircle;
      default: return Radio;
    }
  };

  const getEventColor = (type) => {
    switch (type) {
      case 'danger': return 'red';
      case 'success': return 'green';
      default: return 'blue';
    }
  };

  return (
    <div className="bg-white dark:bg-[#2d2d2d] rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
        <h3 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <MessageSquare size={16} className="text-blue-500" />
          Swarm Activity
        </h3>
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Live</span>
      </div>
      <div className="max-h-64 overflow-y-auto p-2 space-y-2">
        {alerts.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No activity yet</p>
        ) : (
          alerts.slice().reverse().map((alert, idx) => {
            const Icon = getEventIcon(alert.type);
            const color = getEventColor(alert.type);
            return (
              <div 
                key={alert.id || idx}
                className={`p-3 rounded-lg border-l-2 border-${color}-500 bg-${color}-50 dark:bg-${color}-900/10 animate-fade-in`}
              >
                <div className="flex items-start gap-2">
                  <Icon size={14} className={`text-${color}-500 mt-0.5 flex-shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800 dark:text-gray-200">{alert.message}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-gray-400">
                        {alert.time?.substring(11, 19) || 'Now'}
                      </span>
                      {alert.aiLog && (
                        <span className="text-[10px] text-purple-500 font-medium">🤖 AI</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function OperationsContent() {
  const supplyChain = useSupplyChain();
  const { theme } = useTheme();
  
  const [showAddDelivery, setShowAddDelivery] = useState(false);
  const [originSearch, setOriginSearch] = useState('');
  const [targetSearch, setTargetSearch] = useState('');
  const [originNode, setOriginNode] = useState(null);
  const [targetNode, setTargetNode] = useState(null);
  const [runningSim, setRunningSim] = useState(null);

  if (!supplyChain) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#f7f7f9] dark:bg-[#242424]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading supply chain data...</p>
        </div>
      </div>
    );
  }

  try {
    const { nodes, routes, shipments, alerts, triggerSimulation, suggestGhostNode, deployUserGhostNode, addShipment, disruptedCities = new Set(), getGhostCandidates, clearDisruption } = supplyChain;
    const activeShipments = shipments.filter(s => s.status !== 'delivered');
  const mapUrl = theme === 'dark' 
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/rastertiles/voy/{z}/{x}/{y}{r}.png";

  const routePositions = routes.map(r => {
    const fromNode = nodes.find(n => n.id === r.from);
    const toNode = nodes.find(n => n.id === r.to);
    return fromNode && toNode ? [[fromNode.lat, fromNode.lng], [toNode.lat, toNode.lng]] : null;
  }).filter(Boolean);

  const ghostNodes = nodes.filter(n => n.type === 'ghost');

  const handleRunSimulation = async (type) => {
    setRunningSim(type);
    try {
      await triggerSimulation(type);
    } catch (err) {
      console.error(err);
    } finally {
      setRunningSim(null);
    }
  };

  const [showSuggestHub, setShowSuggestHub] = useState(false);
  const [suggestSearch, setSuggestSearch] = useState('');
  const [suggestCity, setSuggestCity] = useState(null);
  const [suggestResult, setSuggestResult] = useState(null);
  const [suggestLoading, setSuggestLoading] = useState(false);

  const handleSuggestHub = () => {
    if (!suggestCity) return;
    setSuggestLoading(true);
    setSuggestResult(null);
    setTimeout(() => {
      const result = suggestGhostNode(suggestCity);
      setSuggestResult(result);
      setSuggestLoading(false);
    }, 800);
  };

  const handleDeploySuggestion = async () => {
    if (!suggestCity || !suggestResult?.accepted) return;
    try {
      await deployUserGhostNode(suggestCity, suggestResult);
      setShowSuggestHub(false);
      setSuggestSearch('');
      setSuggestCity(null);
      setSuggestResult(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddDelivery = async () => {
    if (!originNode || !targetNode) return;
    try {
      await addShipment({
        lat: originNode.lat,
        lng: originNode.lng,
        originLat: originNode.lat,
        originLng: originNode.lng,
        targetLat: targetNode.lat,
        targetLng: targetNode.lng,
        targetName: targetNode.name,
        originName: originNode.name,
        status: 'in-transit',
        target: targetNode.id,
        riskScore: 0.1,
        progress: 0
      });
      setShowAddDelivery(false);
      setOriginSearch('');
      setTargetSearch('');
      setOriginNode(null);
      setTargetNode(null);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-gray-900 dark:text-gray-100">
            Live Operations
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Real-time shipment tracking and swarm intelligence
          </p>
        </div>
      </div>

      {/* Active AI Ghost Nodes Ribbon */}
      {ghostNodes.length > 0 && (
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl border border-purple-200 dark:border-purple-800 p-3">
          <div className="flex items-center gap-3 overflow-x-auto">
            <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest flex items-center gap-1.5 flex-shrink-0">
              <Sparkles size={12} /> Ghost Nodes
            </span>
            {ghostNodes.map(gn => (
              <div key={gn.id} className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-[#2d2d2d] rounded-lg border border-purple-200 dark:border-purple-700 flex-shrink-0">
                <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                <span className="text-xs font-bold text-gray-900 dark:text-gray-100">{gn.name}</span>
                <span className={`text-[9px] px-1 py-0.5 rounded font-bold ${gn.source === 'user' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'}`}>
                  {gn.source === 'user' ? '👤' : '🧠'}
                </span>
                {gn.delayReduction && <span className="text-[9px] text-green-600 dark:text-green-400 font-bold">↓{gn.delayReduction}%</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Disruptions & Manual Clear Override */}
      {disruptedCities.size > 0 && (
        <div className="bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-200 dark:border-red-800/50 p-4 animate-fade-in shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-red-700 dark:text-red-400 flex items-center gap-2">
              <AlertTriangle size={16} /> Active Disruptions
            </h3>
            <span className="text-xs font-medium text-red-600/80 dark:text-red-400/80">Pending automatic resolution</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[...disruptedCities].map(cityId => {
              const node = nodes.find(n => n.id === cityId);
              return (
                <div key={cityId} className="flex flex-col p-3 bg-white dark:bg-[#2d2d2d] rounded-lg border border-red-100 dark:border-red-800/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-gray-900 dark:text-gray-100">{node?.name || cityId}</p>
                      <p className="text-xs text-amber-600 dark:text-amber-500 flex items-center gap-1 mt-1">
                        <Clock size={12} className="animate-spin-slow" /> Auto-clearing in ~30s
                      </p>
                    </div>
                    <button 
                      onClick={() => clearDisruption(cityId)}
                      className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all shadow-sm"
                    >
                      <CheckCircle size={14} /> Clear Now
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Actions Bar */}
      <div className="flex flex-wrap gap-3 bg-white dark:bg-[#2d2d2d] p-4 rounded-xl border border-gray-200 dark:border-gray-800">
        <button onClick={() => setShowAddDelivery(!showAddDelivery)} className="px-4 py-2 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2">
          <Plus size={16} /> Add Delivery
        </button>
        <button onClick={() => setShowSuggestHub(!showSuggestHub)} className="px-4 py-2 bg-purple-500 text-white font-medium rounded-lg hover:bg-purple-600 transition-colors flex items-center gap-2">
          <Lightbulb size={16} /> Suggest Temporary Hub
        </button>
        <div className="w-px bg-gray-200 dark:bg-gray-700 mx-2 hidden sm:block"></div>
        <button disabled={runningSim === 'storm'} onClick={() => handleRunSimulation('storm')} className="px-3 py-2 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 font-medium rounded-lg hover:bg-red-100 transition-colors flex items-center gap-2 text-sm disabled:opacity-50">
          <CloudLightning size={16} /> Storm
        </button>
        <button disabled={runningSim === 'traffic'} onClick={() => handleRunSimulation('traffic')} className="px-3 py-2 bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400 font-medium rounded-lg hover:bg-amber-100 transition-colors flex items-center gap-2 text-sm disabled:opacity-50">
          <Truck size={16} /> Traffic
        </button>
        <button disabled={runningSim === 'port'} onClick={() => handleRunSimulation('port')} className="px-3 py-2 bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 font-medium rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-2 text-sm disabled:opacity-50">
          <Warehouse size={16} /> Port Fail
        </button>
      </div>

      {/* 🔥 Suggest Temporary Hub (User → AI Validates) */}
      {showSuggestHub && (
        <div className="p-4 bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800 rounded-xl space-y-3">
          <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-2 border-b border-purple-200 dark:border-purple-800 pb-2 flex items-center gap-2">
            <Lightbulb size={16} className="text-purple-500" /> Suggest a Temporary Hub
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Suggest a city as a temporary hub. <strong>AI will validate</strong> — not all suggestions are accepted.
          </p>
          <CitySearchDropdown
            label="Suggested City"
            value={suggestSearch}
            onChange={setSuggestSearch}
            onSelect={(city) => {
              setSuggestSearch(city.name);
              setSuggestCity(city);
              setSuggestResult(null);
            }}
            placeholder="e.g. Nagpur, Hyderabad..."
          />
          <div className="flex justify-end pt-2">
            <button
              onClick={handleSuggestHub}
              disabled={!suggestCity || suggestLoading}
              className="px-6 py-2 bg-purple-500 text-white font-bold rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {suggestLoading
                ? <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />Evaluating...</>
                : <><Brain size={14} /> Submit for AI Validation{suggestCity ? ` — ${suggestCity.name}` : ''}</>
              }
            </button>
          </div>

          {/* AI Validation Result */}
          {suggestResult && (
            <div className={`p-3 rounded-xl border-l-4 transition-all animate-fade-in ${suggestResult.accepted
              ? 'bg-green-50 dark:bg-green-900/20 border-green-500'
              : 'bg-red-50 dark:bg-red-900/20 border-red-500'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                {suggestResult.accepted
                  ? <CheckCircle size={16} className="text-green-500" />
                  : <XCircle size={16} className="text-red-500" />
                }
                <span className={`font-bold text-sm ${suggestResult.accepted ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                  {suggestResult.accepted ? 'Accepted by AI' : 'Rejected by AI'}
                </span>
                {suggestResult.efficiency != null && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-mono">
                    {suggestResult.efficiency}% efficiency
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-700 dark:text-gray-300">{suggestResult.reason}</p>
              {suggestResult.accepted && (
                <button onClick={handleDeploySuggestion}
                  className="mt-2 w-full py-2 text-sm bg-green-500 text-white font-bold rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2">
                  <Zap size={14} /> Deploy {suggestCity?.name} as Temporary Hub
                </button>
              )}
              {!suggestResult.accepted && suggestResult.optimalCity && (
                <p className="text-xs text-purple-600 dark:text-purple-400 mt-2 font-medium">
                  💡 AI recommends: {suggestResult.optimalCity.name}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {showAddDelivery && (
        <div className="p-4 bg-gray-50 dark:bg-[#1f1f1f] border border-blue-200 dark:border-blue-900/50 rounded-xl space-y-3">
          <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-2 border-b border-gray-200 dark:border-gray-800 pb-2">Initialize New Transport Agent</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Origin City */}
            <CitySearchDropdown
              label="Origin City"
              value={originSearch}
              onChange={setOriginSearch}
              onSelect={(city) => {
                setOriginSearch(city.name);
                setOriginNode(city);
              }}
              placeholder="Type city name..."
            />
            {/* Target City */}
            <CitySearchDropdown
              label="Target City"
              value={targetSearch}
              onChange={setTargetSearch}
              onSelect={(city) => {
                setTargetSearch(city.name);
                setTargetNode(city);
              }}
              placeholder="Type city name..."
            />
          </div>
          <div className="flex justify-end pt-2">
            <button 
              onClick={handleAddDelivery}
              disabled={!originNode || !targetNode}
              className="px-6 py-2 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Deploy Agent
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Map - takes 3 cols */}
        <div className="lg:col-span-3 bg-white dark:bg-[#2d2d2d] rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Network Map</h2>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-gray-500 dark:text-gray-400">Normal</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-gray-500 dark:text-gray-400">Moderate</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-gray-500 dark:text-gray-400">Congested</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-purple-500" />
                <span className="text-gray-500 dark:text-gray-400">Ghost Node</span>
              </div>
            </div>
          </div>
          <div className="h-[400px] lg:h-[500px]">
            <MapContainer 
              center={[20.5937, 78.9629]} 
              zoom={5} 
              style={{ height: '100%', width: '100%' }}
              zoomControl={false}
            >
              <TileLayer
                url={mapUrl}
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              />
              
              {/* Routes */}
              {routePositions.map((pos, idx) => (
                <Polyline 
                  key={idx}
                  positions={pos}
                  pathOptions={{ color: '#94a3b8', weight: 2, dashArray: '5, 10' }}
                />
              ))}

              {/* Disruption pulse circles — same as Simulation tab */}
              {[...disruptedCities].map(cId => {
                const n = nodes.find(nd => nd.id === cId);
                if (!n) return null;
                return (
                  <Circle key={`d-${cId}`} center={[n.lat, n.lng]} radius={60000}
                    pathOptions={{ color: '#ef4444', fill: true, fillColor: '#ef4444', fillOpacity: 0.12, weight: 2, dashArray: '6,6' }}
                  />
                );
              })}

              {/* Nodes */}
              {nodes.map(node => (
                <Marker 
                  key={node.id}
                  position={[node.lat, node.lng]}
                  icon={node.type === 'ghost' ? ghostIcon : nodeIcon(node.congestion)}
                >
                  <Popup>
                    <div className="text-center">
                      <p className="font-bold">{node.name}</p>
                      <p className="text-sm">ID: {node.id}</p>
                      <p className="text-sm">Congestion: {Math.round(node.congestion * 100)}%</p>
                      {node.type === 'ghost' && (
                        <>
                          <p className="text-sm text-purple-500 font-bold">
                            {node.source === 'user' ? '👤 User Suggested Hub' : '🧠 AI Temporary Hub'}
                          </p>
                          {node.createdFor && node.createdFor !== 'user-suggestion' && (
                            <p className="text-xs text-gray-500">For: {node.createdFor}</p>
                          )}
                        </>
                      )}
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* Shipment Route Lines — green = normal, purple = rerouted */}
              {activeShipments.map(shipment => {
                const targetNode = nodes.find(n => n.id === shipment.target);
                const destLat = shipment.targetLat || targetNode?.lat;
                const destLng = shipment.targetLng || targetNode?.lng;
                const origLat = shipment.originLat || shipment.lat;
                const origLng = shipment.originLng || shipment.lng;
                if (!destLat || !destLng) return null;
                return (
                  <Polyline
                    key={`sroute-${shipment.id}`}
                    positions={[[origLat, origLng], [destLat, destLng]]}
                    pathOptions={{ color: shipment.status === 'rerouted' ? '#8b5cf6' : '#22c55e', weight: 2, dashArray: '6, 10', opacity: 0.8 }}
                  />
                );
              })}

              {/* Shipments */}
              {activeShipments.map(shipment => (
                <Marker
                  key={shipment.id}
                  position={[shipment.lat, shipment.lng]}
                  icon={shipmentIcon}
                >
                  <Popup>
                    <div className="text-center">
                      <p className="font-bold">{shipment.id}</p>
                      {shipment.originName && <p className="text-sm">From: {shipment.originName}</p>}
                      {shipment.targetName && <p className="text-sm">To: {shipment.targetName}</p>}
                      <p className="text-sm">Status: {shipment.status}</p>
                      <p className="text-sm">Risk: {Math.round((shipment.riskScore || 0) * 100)}%</p>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>

        {/* Sidebar - takes 1 col */}
        <div className="space-y-4">
          {/* Deliveries Panel Container */}
          <div className="bg-white dark:bg-[#2d2d2d] rounded-2xl border border-gray-200 dark:border-gray-800 p-4 flex flex-col" style={{height: '500px'}}>
            <h3 className="font-bold text-gray-900 dark:text-gray-100 flex items-center justify-between mb-3 shrink-0">
              <span className="flex items-center gap-2">
                <Navigation size={16} className="text-blue-500" />
                Live Deliveries Panel
              </span>
              <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-full font-medium">
                {activeShipments.length} Active
              </span>
            </h3>
            <div className="space-y-3 overflow-y-auto flex-1 pr-1 custom-scrollbar">
              {activeShipments.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">No active deliveries</p>
              ) : (
                activeShipments.slice().reverse().map(shipment => (
                  <AIDecisionPanel key={shipment.id} shipment={shipment} />
                ))
              )}
            </div>
          </div>

          {/* Swarm Activity Feed */}
          <SwarmActivityFeed alerts={alerts} />
        </div>
      </div>
    </div>
    );
  } catch (err) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#f7f7f9] dark:bg-[#242424]">
        <div className="text-center p-8">
          <p className="text-gray-500 dark:text-gray-400 mb-4">Loading map data...</p>
          <p className="text-sm text-red-500">{err.message}</p>
        </div>
      </div>
    );
  }
}

export default function Operations() {
  return <OperationsContent />;
}