import React, { useState, memo, useCallback, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { searchCities, getCityByName, DEFAULT_NODES } from '../utils/cities';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle } from 'react-leaflet';
import L from 'leaflet';
import { useSupplyChain } from '../context/SupplyChainContext';
import { useTheme } from '../context/ThemeContext';
import {
  FlaskConical, CloudLightning, Truck, Warehouse, Zap, AlertTriangle,
  Play, MapPin, Plus, Navigation, History, Brain, ChevronDown, CheckCircle, Clock,
  XCircle, Lightbulb, Sparkles
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Searchable city dropdown component (shared)
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

/* ── Icons ─────────────────────────────────────────────────────── */
const createIcon = (color) => L.divIcon({
  className: 'custom-marker',
  html: `<div class="w-4 h-4 rounded-full border-2 border-white shadow-lg" style="background-color:${color};box-shadow:0 0 10px ${color}40;"></div>`,
  iconSize: [16, 16], iconAnchor: [8, 8],
});
const nodeIcon    = (c) => createIcon(c > 0.8 ? '#ef4444' : c > 0.4 ? '#f59e0b' : '#22c55e');
const ghostIcon   = createIcon('#8b5cf6');
const shipIcon    = createIcon('#3b82f6');
const disruptIcon = createIcon('#ef4444');

/* ── Disruption types ───────────────────────────────────────────── */
const DISRUPTION_TYPES = [
  { id: 'storm',   label: 'Severe Storm',      icon: CloudLightning, color: 'red',    desc: 'Heavy weather makes the hub inaccessible.' },
  { id: 'traffic', label: 'Traffic Congestion', icon: Truck,          color: 'amber',  desc: 'Extreme congestion spikes transit times.' },
  { id: 'port',    label: 'Port / Hub Failure', icon: Warehouse,      color: 'blue',   desc: 'Critical infrastructure shutdown.' },
  { id: 'strike',  label: 'Worker Strike',      icon: AlertTriangle,  color: 'orange', desc: 'Operations halted due to industrial action.' },
];

const COLOR = {
  red:    'border-red-400 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300',
  amber:  'border-amber-400 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300',
  blue:   'border-blue-400 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',
  orange: 'border-orange-400 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300',
  purple: 'border-purple-400 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300',
  green:  'border-green-400 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300',
};

/* ── Stable Map (memo = no remount when parent re-renders) ─────── */
const SimMap = memo(function SimMap({ mapUrl, routePositions, nodes, shipments, disruptedCities }) {
  return (
    <MapContainer center={[20.5937, 78.9629]} zoom={5} style={{ height: '100%', width: '100%' }} zoomControl={false}>
      <TileLayer url={mapUrl} />

      {/* Base routes */}
      {routePositions.map((pos, i) => (
        <Polyline key={i} positions={pos} pathOptions={{ color: '#94a3b8', weight: 2, dashArray: '5,10' }} />
      ))}

      {/* Shipment route lines */}
      {shipments.map(s => {
        const tn = nodes.find(n => n.id === s.target);
        const dLat = s.targetLat || tn?.lat, dLng = s.targetLng || tn?.lng;
        if (!dLat) return null;
        return (
          <Polyline key={`r-${s.id}`}
            positions={[[s.originLat || s.lat, s.originLng || s.lng], [dLat, dLng]]}
            pathOptions={{ color: s.status === 'rerouted' ? '#8b5cf6' : '#22c55e', weight: 2, dashArray: '6,10', opacity: 0.8 }}
          />
        );
      })}

      {/* Disruption pulse circles */}
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
      {nodes.map(nd => (
        <Marker key={nd.id} position={[nd.lat, nd.lng]}
          icon={nd.type === 'ghost' ? ghostIcon : disruptedCities.has(nd.id) ? disruptIcon : nodeIcon(nd.congestion)}>
          <Popup>
            <div className="text-center">
              <p className="font-bold">{nd.name}</p>
              <p className="text-sm">Congestion: {Math.round(nd.congestion * 100)}%</p>
              {nd.type === 'ghost' && (
                <>
                  <p className="text-sm text-purple-500 font-bold">⚡ {nd.source === 'user' ? 'User Suggested Hub' : 'AI Temporary Hub'}</p>
                  {nd.createdFor && <p className="text-xs text-gray-500">Created for: {nd.createdFor}</p>}
                </>
              )}
              {disruptedCities.has(nd.id) && <p className="text-sm text-red-500 font-bold">⚠ Disrupted</p>}
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Shipment dots */}
      {shipments.map(s => (
        <Marker key={s.id} position={[s.lat, s.lng]} icon={shipIcon}>
          <Popup><div className="text-center"><p className="font-bold">{s.id}</p><p className="text-sm">{s.status}</p></div></Popup>
        </Marker>
      ))}
    </MapContainer>
  );
});

/* ── Main page ──────────────────────────────────────────────────── */
export default function Simulation() {
  const {
    nodes, routes, shipments, alerts,
    triggerSimulation, addShipment, suggestGhostNode, deployUserGhostNode, getGhostCandidates,
    activeSimulation, simHistory, disruptedCities,
  } = useSupplyChain();
  const { theme } = useTheme();

  /* City / type pickers */
  const [selectedCity, setSelectedCity] = useState(null);
  const [citySearch,   setCitySearch]   = useState('');
  const [showCityDD,   setShowCityDD]   = useState(false);
  const [selectedType, setSelectedType] = useState(null);

  /* UI state */
  const [isRunning,         setIsRunning]         = useState(false);
  const [error,             setError]             = useState(null);
  const [showHistory,       setShowHistory]       = useState(false);
  const [showAddDelivery,   setShowAddDelivery]   = useState(false);
  const [showSuggestHub,    setShowSuggestHub]    = useState(false);
  const [suggestSearch,     setSuggestSearch]     = useState('');
  const [suggestCity,       setSuggestCity]       = useState(null);
  const [suggestResult,     setSuggestResult]     = useState(null);
  const [suggestLoading,    setSuggestLoading]    = useState(false);
  const [originSearch,      setOriginSearch]      = useState('');
  const [targetSearch,      setTargetSearch]      = useState('');
  const [originNode,        setOriginNode]        = useState(null);
  const [targetNode,        setTargetNode]        = useState(null);

  const mapUrl = theme === 'dark'
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/rastertiles/voy/{z}/{x}/{y}{r}.png';

  const routePositions = routes.map(r => {
    const f = nodes.find(n => n.id === r.from), t = nodes.find(n => n.id === r.to);
    return f && t ? [[f.lat, f.lng], [t.lat, t.lng]] : null;
  }).filter(Boolean);

  const activeShipments = shipments.filter(s => s.status !== 'delivered');
  const affectedShipments = selectedCity
    ? activeShipments.filter(s => s.target === selectedCity.id)
    : [];

  const filteredCities = citySearch.length >= 2 ? searchCities(citySearch, 8) : [];
  const ghostNodes = nodes.filter(n => n.type === 'ghost');

  const handleRun = async () => {
    if (!selectedCity || !selectedType || isRunning) return;
    setIsRunning(true);
    setError(null);
    try {
      await triggerSimulation(selectedType.id, selectedCity.id, selectedCity.name);
    } catch (e) { setError(e.message || 'Simulation failed'); }
    finally { setIsRunning(false); }
  };

  const handleAddDelivery = async () => {
    if (!originNode || !targetNode) return;
    try {
      await addShipment({
        lat: originNode.lat, lng: originNode.lng,
        originLat: originNode.lat, originLng: originNode.lng,
        targetLat: targetNode.lat, targetLng: targetNode.lng,
        targetName: targetNode.name, originName: originNode.name,
        status: 'in-transit', target: targetNode.id, riskScore: 0.1, progress: 0,
      });
      setShowAddDelivery(false);
      setOriginSearch(''); setTargetSearch(''); setOriginNode(null); setTargetNode(null);
    } catch (e) { setError(e.message); }
  };

  // 🔥 User suggests a ghost node → AI validates
  const handleSuggestHub = () => {
    if (!suggestCity) return;
    setSuggestLoading(true);
    setSuggestResult(null);
    // Small delay for dramatic effect
    setTimeout(() => {
      const result = suggestGhostNode(suggestCity);
      setSuggestResult(result);
      setSuggestLoading(false);
    }, 800);
  };

  // Deploy accepted suggestion
  const handleDeploySuggestion = async () => {
    if (!suggestCity || !suggestResult?.accepted) return;
    try {
      await deployUserGhostNode(suggestCity, suggestResult);
      setShowSuggestHub(false);
      setSuggestSearch('');
      setSuggestCity(null);
      setSuggestResult(null);
    } catch (e) { setError(e.message); }
  };

  /* Active sim step panel — reads from context so it survives tab change */
  const sim = activeSimulation;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-gray-900 dark:text-gray-100">Simulation Lab</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Pick any city and disruption type — watch NeuroChain predict and prevent delays live
          </p>
        </div>
        {simHistory.length > 0 && (
          <button
            onClick={() => setShowHistory(v => !v)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-purple-100 dark:hover:bg-purple-900/30 hover:text-purple-700 dark:hover:text-purple-400 transition-colors"
          >
            <History size={16} />
            History ({simHistory.length})
          </button>
        )}
      </div>

      {error && <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl"><p className="text-red-600 dark:text-red-400 text-sm">{error}</p></div>}

      {/* ── Active AI Ghost Nodes Panel ── */}
      {ghostNodes.length > 0 && (
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-2xl border border-purple-200 dark:border-purple-800 p-5">
          <p className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Sparkles size={14} /> Active AI Ghost Nodes ({ghostNodes.length})
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {ghostNodes.map(gn => (
              <div key={gn.id} className="bg-white dark:bg-[#2d2d2d] rounded-xl border border-purple-200 dark:border-purple-700 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse flex-shrink-0" />
                  <span className="font-bold text-sm text-gray-900 dark:text-gray-100 truncate">{gn.name}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-gray-500 dark:text-gray-400">
                  <span className={`px-1.5 py-0.5 rounded-full font-bold ${gn.source === 'user' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'}`}>
                    {gn.source === 'user' ? '👤 User Suggested' : '🧠 AI Created'}
                  </span>
                  {gn.delayReduction && <span className="text-green-600 dark:text-green-400 font-bold">↓{gn.delayReduction}% delay</span>}
                </div>
                {gn.createdFor && gn.createdFor !== 'user-suggestion' && (
                  <p className="text-[10px] text-gray-400 mt-1">Created for: {gn.createdFor}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Simulation History Panel ── */}
      {showHistory && simHistory.length > 0 && (
        <div className="bg-white dark:bg-[#2d2d2d] rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <History size={14} /> Simulation History
          </p>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {simHistory.map((h) => (
              <div key={h.id} className="p-3 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{h.typeLabel} — {h.cityName}</span>
                  <span className="text-[10px] text-gray-400 flex items-center gap-1"><Clock size={10} /> {h.completedAt}</span>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 font-bold">
                    🧠 {h.ghostNodeLabel || `⚡ ${h.ghostNodeName} (AI Temporary Hub)`}
                  </span>
                  {h.delayReduction && <span className="text-[10px] text-green-600 dark:text-green-400 font-bold">↓{h.delayReduction}% delay</span>}
                  {h.affectedShipments?.length > 0 && (
                    <span className="text-[10px] text-gray-400">Shipments: {h.affectedShipments.join(', ')}</span>
                  )}
                </div>
                <p className="text-xs text-purple-600 dark:text-purple-400">🤖 {h.aiLog}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Configurator ── */}
      <div className="bg-white dark:bg-[#2d2d2d] rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-4">Configure Disruption</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
          {/* City picker */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">1. Select City</label>
            <div className="relative">
              <button onClick={() => setShowCityDD(v => !v)}
                className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm hover:border-blue-400 transition-colors">
                <span className={selectedCity ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400'}>
                  {selectedCity ? `📍 ${selectedCity.name}` : 'Choose any city...'}
                </span>
                <ChevronDown size={16} className="text-gray-400" />
              </button>
              {showCityDD && (
                <div className="absolute z-50 mt-1 w-full bg-white dark:bg-[#2d2d2d] border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden">
                  <div className="p-2 border-b border-gray-100 dark:border-gray-700">
                    <input autoFocus type="text" value={citySearch} onChange={e => setCitySearch(e.target.value)}
                      placeholder="Search cities..." className="w-full px-3 py-1.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none" />
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {filteredCities.map(city => (
                      <button key={city.id} onClick={() => { setSelectedCity(city); setShowCityDD(false); setCitySearch(''); }}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${selectedCity?.id === city.id ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-semibold' : 'text-gray-800 dark:text-gray-200'}`}>
                        <MapPin size={12} className="text-gray-400 flex-shrink-0" />
                        {city.name}
                        <span className="ml-auto text-[10px] text-gray-400 font-mono">{city.id}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Disruption type */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">2. Select Disruption</label>
            <div className="grid grid-cols-2 gap-2">
              {DISRUPTION_TYPES.map(dt => {
                const Icon = dt.icon;
                const active = selectedType?.id === dt.id;
                return (
                  <button key={dt.id} onClick={() => setSelectedType(dt)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium text-left transition-all ${active ? `${COLOR[dt.color]} border-2` : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-400'}`}>
                    <Icon size={14} />
                    {dt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Preview */}
        {selectedCity && selectedType && (
          <div className={`mb-4 p-3 rounded-xl border ${COLOR[selectedType.color]}`}>
            <p className="text-xs font-semibold mb-1">{selectedType.label} in {selectedCity.name}</p>
            <p className="text-sm">{selectedType.desc}</p>
            {affectedShipments.length > 0 ? (
              <p className="text-xs mt-1.5 opacity-80">
                ⚠️ {affectedShipments.length} active shipment{affectedShipments.length > 1 ? 's' : ''} heading to {selectedCity.name} will be rerouted: {affectedShipments.map(s => s.id).join(', ')}
              </p>
            ) : (
              <p className="text-xs mt-1.5 opacity-70">
                ℹ️ No active shipments heading to {selectedCity.name} right now. Add one in Live Operations to see rerouting in action.
              </p>
            )}
            <p className="text-xs mt-1 opacity-60 italic">
              🧠 AI will automatically create an optimal ghost node during simulation
            </p>
          </div>
        )}

        <button onClick={handleRun} disabled={!selectedCity || !selectedType || isRunning}
          className={`w-full py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${(!selectedCity || !selectedType || isRunning) ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:shadow-lg hover:scale-[1.01] active:scale-[0.99]'}`}>
          {isRunning
            ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Simulating...</>
            : <><Play size={16} />Run {selectedCity && selectedType ? `— ${selectedType.label} in ${selectedCity.name}` : 'Simulation'}</>
          }
        </button>
      </div>

      {/* ── Live Step Panel (driven from context — survives tab switch) ── */}
      {sim && (
        <div className="bg-white dark:bg-[#2d2d2d] rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${sim.pending ? 'bg-purple-500 animate-pulse' : 'bg-green-500'} inline-block`} />
              {sim.pending ? 'Live AI Response' : '✅ Simulation Complete'}
              — {sim.typeLabel} in {sim.cityName}
            </p>
            <span className="text-[10px] text-gray-400">Switch tabs freely — this persists</span>
          </div>
          <div className="space-y-2">
            {sim.steps.map((step, i) => {
              const done = i <= sim.liveStep;
              const c = COLOR[step.color] || '';
              return (
                <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border-l-4 transition-all duration-500 ${done ? c : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 opacity-30'}`}>
                  <span className="text-xl flex-shrink-0">{step.icon}</span>
                  <div>
                    <p className={`font-bold text-sm ${done ? '' : 'text-gray-400'}`}>
                      Step {i + 1}: {step.label}
                      {i === sim.liveStep && sim.pending && <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-white dark:bg-gray-900 rounded-full font-normal opacity-80">Now</span>}
                    </p>
                    <p className={`text-xs mt-0.5 ${done ? 'text-gray-600 dark:text-gray-300' : 'text-gray-400'}`}>{step.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>
          {!sim.pending && sim.result && (
            <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-800 rounded-xl">
              <p className="text-green-700 dark:text-green-400 font-bold text-sm">
                Rerouting complete. AI reasoning logged — check the <strong>AI Intelligence</strong> tab.
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 font-bold">
                  🧠 {sim.result.ghostNodeLabel || sim.result.ghostNodeName}
                </span>
                {sim.result.delayReduction && <span className="text-[10px] text-green-600 font-bold">↓{sim.result.delayReduction}% delay reduction</span>}
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">🤖 {sim.result.aiLog}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Map (memoised — won't zoom out on node/route changes) ── */}
      <div className="bg-white dark:bg-[#2d2d2d] rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Live Network Map</h2>
          <Link to="/operations" className="text-sm text-blue-500 hover:text-blue-600">Full Map →</Link>
        </div>
        <div className="h-[280px]">
          <SimMap
            mapUrl={mapUrl}
            routePositions={routePositions}
            nodes={nodes}
            shipments={activeShipments}
            disruptedCities={disruptedCities}
          />
        </div>
        <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800 flex flex-wrap gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />Normal</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />Moderate</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />Congested / Disrupted</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500 inline-block" />Ghost Node (AI)</span>
        </div>
      </div>

      {/* ── Quick Actions ── */}
      <div className="bg-white dark:bg-[#2d2d2d] rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
          <Zap size={18} className="text-amber-500" /> Quick Actions
        </h3>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => setShowSuggestHub(v => !v)} className="px-4 py-2 bg-purple-500 text-white text-sm font-medium rounded-lg hover:bg-purple-600 transition-colors flex items-center gap-2">
            <Lightbulb size={14} /> Suggest Temporary Hub
          </button>
          <button onClick={() => setShowAddDelivery(v => !v)} className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2">
            <Plus size={14} /> Add Delivery
          </button>
        </div>

        {/* 🔥 Suggest Ghost Node (User → AI Validates) */}
        {showSuggestHub && (
          <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-900/10 rounded-xl border border-purple-200 dark:border-purple-800">
            <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-2 text-sm flex items-center gap-2">
              <Lightbulb size={14} className="text-purple-500" /> Suggest a Temporary Hub
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Suggest a city as a temporary hub. <strong>AI will validate</strong> whether it's optimal — not all suggestions are accepted.
            </p>
            <CitySearchDropdown
              label="Suggested City"
              value={suggestSearch}
              onChange={setSuggestSearch}
              onSelect={(city) => {
                setSuggestSearch(city.name);
                setSuggestCity(city);
                setSuggestResult(null); // reset previous result
              }}
              placeholder="e.g. Nagpur, Hyderabad..."
            />

            <button onClick={handleSuggestHub} disabled={!suggestCity || suggestLoading}
              className="mt-3 w-full py-2 text-sm bg-purple-500 text-white font-medium rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {suggestLoading
                ? <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />AI Evaluating...</>
                : <><Brain size={14} /> Submit for AI Validation{suggestCity ? ` — ${suggestCity.name}` : ''}</>
              }
            </button>

            {/* AI Validation Result */}
            {suggestResult && (
              <div className={`mt-3 p-3 rounded-xl border-l-4 transition-all animate-fade-in ${suggestResult.accepted
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
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-3 text-sm">New Delivery Agent</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <button onClick={handleAddDelivery} disabled={!originNode || !targetNode}
              className="mt-3 w-full py-2 text-sm bg-green-500 text-white font-medium rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              Create Agent — {originNode?.name || '?'} → {targetNode?.name || '?'}
            </button>
          </div>
        )}
      </div>

      {/* ── AI Decision Log ── */}
      <div className="bg-white dark:bg-[#2d2d2d] rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <Brain size={18} className="text-purple-500" />
          AI Decisions from Simulations
          <span className="ml-auto text-xs font-normal text-gray-400">Full view → AI Intelligence tab</span>
        </h3>
        <div className="space-y-2 max-h-52 overflow-y-auto">
          {alerts.filter(a => a.aiLog).length > 0 ? (
            alerts.filter(a => a.aiLog).slice(0, 5).map((alert, idx) => (
              <div key={alert.id || idx} className={`p-3 rounded-lg border-l-4 ${alert.type === 'danger' ? 'bg-red-50 dark:bg-red-900/10 border-red-500' : 'bg-purple-50 dark:bg-purple-900/10 border-purple-500'}`}>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{alert.message}</p>
                <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">🤖 {alert.aiLog}</p>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <FlaskConical size={32} className="mx-auto mb-2 text-gray-300 dark:text-gray-600" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">No AI decisions yet</p>
              <p className="text-gray-400 text-xs mt-1">Pick a city + disruption above and run a simulation</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}