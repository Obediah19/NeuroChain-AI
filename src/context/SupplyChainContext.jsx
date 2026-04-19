import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, doc, updateDoc, setDoc, getDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { askGroq } from '../utils/groq';

const SupplyChainContext = createContext();

const initialNodes = [
  { id: 'BLR', name: 'Bangalore Hub', lat: 12.9716, lng: 77.5946, type: 'primary', congestion: 0.2 },
  { id: 'MAA', name: 'Chennai Port', lat: 13.0827, lng: 80.2707, type: 'primary', congestion: 0.1 },
  { id: 'BOM', name: 'Mumbai Hub', lat: 19.0760, lng: 72.8777, type: 'primary', congestion: 0.5 },
  { id: 'DEL', name: 'Delhi NCR', lat: 28.7041, lng: 77.1025, type: 'primary', congestion: 0.3 },
  { id: 'PNQ', name: 'Pune Hub', lat: 18.5204, lng: 73.8567, type: 'primary', congestion: 0.2 },
];

const initialRoutes = [
  { id: 'r1', from: 'BLR', to: 'MAA', distance: 350 },
  { id: 'r2', from: 'BLR', to: 'BOM', distance: 980 },
  { id: 'r3', from: 'BOM', to: 'DEL', distance: 1400 },
  { id: 'r4', from: 'MAA', to: 'DEL', distance: 2200 },
  { id: 'r5', from: 'BOM', to: 'PNQ', distance: 150 },
  { id: 'r6', from: 'PNQ', to: 'BLR', distance: 840 },
];

const SYSTEM_ALERTS = [
  { id: 'a1', time: new Date().toLocaleTimeString(), message: 'System Initialized. Swarm intelligence active.', type: 'info', aiLog: null }
];

// ── localStorage helpers (keyed per user) ─────────────────────────
const lsGet = (key, fallback) => {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch { return fallback; }
};
const lsSet = (key, val) => {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
};

// ── Firebase user-subcollection helpers ───────────────────────────
// Writes to users/{uid}/{subKey} as a single merged document
const fbSave = async (uid, subKey, data) => {
  if (!db || !uid) return;
  try {
    await setDoc(doc(db, 'users', uid, 'data', subKey), { value: data, updatedAt: new Date().toISOString() });
  } catch (e) {
    // Silently fail — localStorage already saved it
  }
};

const fbLoad = async (uid, subKey) => {
  if (!db || !uid) return null;
  try {
    const snap = await getDoc(doc(db, 'users', uid, 'data', subKey));
    if (snap.exists()) return snap.data().value;
  } catch {}
  return null;
};

export function SupplyChainProvider({ children }) {
  const [nodes, setNodes] = useState(initialNodes);
  const [routes, setRoutes] = useState(initialRoutes);
  const [shipments, setShipments] = useState([]);
  const [alerts, setAlerts] = useState(SYSTEM_ALERTS);
  const [ghostNodesActive, setGhostNodesActive] = useState(false);
  const { currentUser } = useAuth();

  // Simulation persistence — survives tab switches
  const [activeSimulation, setActiveSimulation] = useState(null);
  const [simHistory, setSimHistory] = useState([]);
  const [disruptedCities, setDisruptedCities] = useState(new Set());

  // Track if we've loaded user data for the current UID
  const loadedUidRef = useRef(null);

  // ── Load user data when UID changes (login / refresh) ──────────
  useEffect(() => {
    const uid = currentUser?.uid;
    if (!uid) {
      // Logged out — reset to defaults
      setShipments([]);
      setSimHistory([]);
      setAlerts(SYSTEM_ALERTS);
      setActiveSimulation(null);
      setDisruptedCities(new Set());
      loadedUidRef.current = null;
      return;
    }
    if (loadedUidRef.current === uid) return; // already loaded
    loadedUidRef.current = uid;

    const loadAll = async () => {
      // 1. Load from localStorage immediately (instant, synchronous)
      const lsShipments = lsGet(`nc_shipments_${uid}`, null);
      const lsSimHistory = lsGet(`nc_simHistory_${uid}`, null);
      const lsAlerts = lsGet(`nc_alerts_${uid}`, null);

      if (lsShipments) setShipments(lsShipments);
      if (lsSimHistory) setSimHistory(lsSimHistory);
      if (lsAlerts) setAlerts([...SYSTEM_ALERTS, ...lsAlerts.filter(a => a.id !== 'a1')]);

      // 2. Try Firebase — overwrite with server data if available (more authoritative)
      const [fbShipments, fbSimHistory, fbAlerts] = await Promise.all([
        fbLoad(uid, 'shipments'),
        fbLoad(uid, 'simHistory'),
        fbLoad(uid, 'alerts'),
      ]);

      if (fbShipments) { setShipments(fbShipments); lsSet(`nc_shipments_${uid}`, fbShipments); }
      if (fbSimHistory) { setSimHistory(fbSimHistory); lsSet(`nc_simHistory_${uid}`, fbSimHistory); }
      if (fbAlerts) {
        const merged = [...SYSTEM_ALERTS, ...fbAlerts.filter(a => a.id !== 'a1')];
        setAlerts(merged);
        lsSet(`nc_alerts_${uid}`, fbAlerts);
      }
    };

    loadAll();
  }, [currentUser?.uid]);

  // ── Auto-save shipments ────────────────────────────────────────
  const shipmentsRef = useRef(shipments);
  shipmentsRef.current = shipments;
  useEffect(() => {
    const uid = currentUser?.uid;
    if (!uid || loadedUidRef.current !== uid) return;
    // Debounce: only save static snapshots (not every animation tick)
    lsSet(`nc_shipments_${uid}`, shipments);
    // Only try Firebase when status changes (not every animation frame)
    const hasStatusChange = shipments.some(s => s.status === 'delivered' || s.status === 'rerouted' || s.status === 'diverted' || s.status === 'resumed');
    if (hasStatusChange) fbSave(uid, 'shipments', shipments);
  }, [shipments.map(s => `${s.id}:${s.status}`).join(','), currentUser?.uid]);

  // ── Auto-save simHistory ────────────────────────────────────────
  useEffect(() => {
    const uid = currentUser?.uid;
    if (!uid || simHistory.length === 0) return;
    lsSet(`nc_simHistory_${uid}`, simHistory);
    fbSave(uid, 'simHistory', simHistory);
  }, [simHistory, currentUser?.uid]);

  // ── Auto-save alerts (only aiLog entries — the intelligence history) ──
  useEffect(() => {
    const uid = currentUser?.uid;
    if (!uid) return;
    const aiAlerts = alerts.filter(a => a.aiLog && a.aiLog.trim().length > 3);
    if (aiAlerts.length === 0) return;
    lsSet(`nc_alerts_${uid}`, alerts);
    fbSave(uid, 'alerts', aiAlerts);
  }, [alerts.length, currentUser?.uid]);

  // ── Live Firebase read sync (root-level, read-only) ────────────
  useEffect(() => {
    if (!db) return;
    try {
      const unsubNodes = onSnapshot(collection(db, 'nodes'), snap => {
        if (!snap.empty) setNodes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
      const unsubRoutes = onSnapshot(collection(db, 'routes'), snap => {
        if (!snap.empty) setRoutes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
      return () => { unsubNodes(); unsubRoutes(); };
    } catch (e) { console.warn('Firebase read sync:', e.message); }
  }, []);

  // ── Add Shipment ───────────────────────────────────────────────
  const addShipment = useCallback(async (shipment) => {
    const newId = `SHP-${Date.now()}`;
    const newShipment = { ...shipment, id: newId, userId: currentUser?.uid || 'anon', createdAt: new Date().toISOString() };
    setShipments(prev => [...prev, newShipment]);
    // Firebase attempt (might fail — localStorage covers it)
    if (db) {
      try { await setDoc(doc(db, 'shipments', newId), newShipment); } catch {}
      if (currentUser?.uid) {
        try {
          const uid = currentUser.uid;
          const current = lsGet(`nc_shipments_${uid}`, []);
          fbSave(uid, 'shipments', [...current, newShipment]);
        } catch {}
      }
    }
    return newShipment;
  }, [currentUser]);

  // ── Add Ghost Node ─────────────────────────────────────────────
  const addGhostNode = useCallback(async (node) => {
    if (!node || !node.id) {
      console.warn('addGhostNode: invalid node', node);
      return null;
    }
    const ghostId = `${node.id}-GHOST`;
    const ghostName = `${node.name} (Ghost Node)`;
    const newNode = { ...node, id: ghostId, name: ghostName, type: 'ghost', congestion: 0.05 };
    setNodes(prev => [...prev.filter(n => n.id !== ghostId), newNode]);
    setGhostNodesActive(true);

    const alert = {
      id: Date.now().toString(),
      time: new Date().toLocaleTimeString(),
      message: `Ghost Node deployed at ${node.name} (${ghostId}).`,
      type: 'success',
      aiLog: `AI deployed a temporary ghost node at ${node.name} to serve as an emergency bypass hub. This node is available for shipment rerouting during disruptions.`
    };
    setAlerts(prev => [alert, ...prev]);

    if (db) { try { await setDoc(doc(db, 'nodes', ghostId), newNode); } catch {} }
    return newNode;
  }, []);

  // ── Animation Loop ─────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      setShipments(currentShipments => currentShipments.map(s => {
        if (s.status === 'delivered') return s;

        // Determine current movement target
        // If diverted, move toward the ghost node first
        // If resumed, move toward the original/final destination
        let moveLat, moveLng;
        if (s.status === 'diverted' && s.ghostLat && s.ghostLng) {
          moveLat = s.ghostLat;
          moveLng = s.ghostLng;
        } else {
          const targetNode = nodes.find(n => n.id === s.target);
          moveLat = s.targetLat || targetNode?.lat;
          moveLng = s.targetLng || targetNode?.lng;
        }
        if (!moveLat || !moveLng) return s;

        const dx = moveLng - s.lng;
        const dy = moveLat - s.lat;
        const dist = Math.sqrt(dx * dx + dy * dy);

        const totalDist = s.totalDist || Math.sqrt(
          Math.pow(moveLng - (s.originLng || s.lng), 2) +
          Math.pow(moveLat - (s.originLat || s.lat), 2)
        );

        // Reached the current movement target
        if (dist < 0.05) {
          // If diverted → reached ghost node → resume to original destination
          if (s.status === 'diverted' && s.originalTarget) {
            return {
              ...s,
              status: 'resumed',
              target: s.originalTarget,
              targetLat: s.originalTargetLat,
              targetLng: s.originalTargetLng,
              targetName: s.originalTargetName,
              riskScore: 0.05,
              totalDist: null, // recalculate from new position
              progress: 60, // partial progress
            };
          }
          // Otherwise → delivered at final destination
          return { ...s, status: 'delivered', progress: 100, totalDist };
        }

        // Calculate overall progress
        let progress;
        if (s.status === 'diverted') {
          // Diversion is roughly 0-50% of journey
          progress = totalDist > 0 ? Math.min(49, Math.round(((totalDist - dist) / totalDist) * 50)) : 0;
        } else if (s.status === 'resumed') {
          // Resumed is 50-99%
          progress = totalDist > 0 ? Math.min(99, 50 + Math.round(((totalDist - dist) / totalDist) * 50)) : 50;
        } else {
          progress = totalDist > 0 ? Math.min(99, Math.round(((totalDist - dist) / totalDist) * 100)) : 0;
        }

        const targetNode = nodes.find(n => n.id === s.target);
        const speed = (targetNode?.congestion || 0) > 0.8 ? 0.002 : 0.015;

        return {
          ...s, totalDist, progress,
          lng: s.lng + (dx / dist) * speed,
          lat: s.lat + (dy / dist) * speed,
        };
      }));
    }, 50);
    return () => clearInterval(interval);
  }, [nodes]);

  // ── Pick a nearby ghost node city (not the disrupted one) ──────
  const pickGhostCity = (disruptedCityId) => {
    // Known fallback cities for ghost nodes with coordinates
    const GHOST_CANDIDATES = [
      { id: 'HYD', name: 'Hyderabad', lat: 17.3850, lng: 78.4867 },
      { id: 'JAI', name: 'Jaipur', lat: 26.9124, lng: 75.7873 },
      { id: 'LKO', name: 'Lucknow', lat: 26.8467, lng: 80.9462 },
      { id: 'AMD', name: 'Ahmedabad', lat: 23.0225, lng: 72.5714 },
      { id: 'NAG', name: 'Nagpur', lat: 21.1458, lng: 79.0882 },
      { id: 'KOL', name: 'Kolkata', lat: 22.5726, lng: 88.3639 },
      { id: 'GOA', name: 'Goa', lat: 15.2993, lng: 74.1240 },
    ];
    // Filter out the disrupted city itself
    const available = GHOST_CANDIDATES.filter(c => c.id !== disruptedCityId);
    return available[Math.floor(Math.random() * available.length)];
  };

  // ── Simulation Engine ──────────────────────────────────────────
  const triggerSimulation = useCallback(async (type, cityId, cityName) => {
    const alertMsg = type === 'storm' ? 'Severe storm detected'
      : type === 'traffic' ? 'High traffic congestion detected'
      : type === 'port' ? 'Port failure detected'
      : 'Disruption detected';
    const aiMsg = type === 'storm' ? 'severe weather conditions'
      : type === 'traffic' ? 'extreme traffic congestion'
      : type === 'port' ? 'port infrastructure failure'
      : 'unexpected disruption';

    // Pick a ghost city for this disruption
    const ghostCity = pickGhostCity(cityId);
    const ghostId = `${ghostCity.id}-GHOST`;
    const ghostName = `${ghostCity.name} (Ghost Node)`;

    // Immediate state updates — no Firebase hanging
    setNodes(prev => prev.map(n => n.id === cityId ? { ...n, congestion: 0.95 } : n));
    setShipments(prev => prev.map(s =>
      (s.target === cityId && s.status !== 'delivered')
        ? { ...s, riskScore: 0.92, status: 'evaluating_route' }
        : s
    ));
    setDisruptedCities(prev => new Set([...prev, cityId]));

    const SIM_STEPS = [
      { label: 'Threat Detected',       detail: `${alertMsg} in ${cityName}. Congestion spiked to 95%.`,                                              icon: '⚡', color: 'red' },
      { label: 'Risk Assessment',       detail: `Swarm agents score all inbound shipments to ${cityName}. Threshold exceeded at 92%.`,                  icon: '📊', color: 'amber' },
      { label: 'Ghost Node Deployed',   detail: `AI instantiates ${ghostName} (${ghostId}) as temporary bypass hub.`,                                   icon: '🌐', color: 'purple' },
      { label: 'Temporarily Diverted',  detail: `All active shipments to ${cityName} diverted via ${ghostName}. Awaiting clearance in ${cityName}.`,     icon: '🔀', color: 'blue' },
      { label: 'Delivery Resumed',      detail: `Clearance granted. Shipments resume from ${ghostCity.name} → ${cityName}. AI decision logged.`,         icon: '✅', color: 'green' },
    ];

    setActiveSimulation({ cityId, cityName, type, typeLabel: alertMsg, steps: SIM_STEPS, liveStep: 0, result: null, pending: true, ghostCity: ghostCity.name });
    SIM_STEPS.forEach((_, i) => {
      setTimeout(() => {
        setActiveSimulation(prev => prev ? { ...prev, liveStep: i } : prev);
      }, i * 1100);
    });

    setAlerts(prev => [{
      id: Date.now().toString(),
      time: new Date().toLocaleTimeString(),
      message: `${alertMsg} in ${cityName}. All inbound shipments flagged. Risk: 92%.`,
      type: 'danger',
      aiLog: null
    }, ...prev]);

    const runFallback = async () => {
      let aiLogText = `By diverting shipments through the ${ghostCity.name} ghost node, we have successfully mitigated the risk associated with the ${aiMsg}, bringing the overall risk down to 8%. This temporary rerouting has ensured continuity of logistics operations and minimized potential disruptions to the supply chain. Shipments will resume to ${cityName} once clearance is granted.`;
      try {
        const result = await askGroq(
          `Multiple shipments to ${cityName} hit 92% risk due to ${aiMsg}. We temporarily diverted all via a ghost node in ${ghostCity.name}. The shipments will resume to ${cityName} once the disruption clears. Explain in 2-3 sentences. No markdown.`,
          'You are NeuroChain AI, a swarm logistics expert.'
        );
        if (result && result.trim().length > 5) aiLogText = result;
      } catch (e) {
        console.warn('Groq fallback:', e.message);
      }
      applySwarmLogicFallback(cityId, cityName, type, alertMsg, aiLogText, ghostCity);
    };
    setTimeout(runFallback, 2500);
  }, []);

  const applySwarmLogicFallback = (disruptedNodeId, disruptedNodeName, simType, typeLabel, aiLogText, ghostCity) => {
    const ghostId = `${ghostCity.id}-GHOST`;
    const ghostName = `${ghostCity.name} (Ghost Node)`;

    const finalAiLog = (aiLogText && aiLogText.trim().length > 5)
      ? aiLogText
      : `Shipments temporarily diverted away from ${disruptedNodeName} due to ${typeLabel.toLowerCase()}. A temporary ghost node in ${ghostCity.name} was activated as a bypass hub. Shipments will resume to their original destination once clearance is granted.`;

    const ghostNode = { id: ghostId, name: ghostName, lat: ghostCity.lat, lng: ghostCity.lng, type: 'ghost', congestion: 0.05 };
    setNodes(prev => [...prev.filter(n => n.id !== ghostId), ghostNode]);

    const newRoutes = [
      { id: `g-${ghostId}-1`, from: disruptedNodeId, to: ghostId, distance: 570 },
      { id: `g-${ghostId}-2`, from: ghostId, to: disruptedNodeId, distance: 570 }
    ];
    setRoutes(prev => [...prev.filter(r => !r.id.startsWith(`g-${ghostId}`)), ...newRoutes]);
    setGhostNodesActive(true);

    // Divert shipments — store original destination so we can resume later
    setShipments(prev => prev.map(s => {
      if (s.target === disruptedNodeId && s.status !== 'delivered') {
        return {
          ...s,
          // Save original destination
          originalTarget: s.originalTarget || s.target,
          originalTargetLat: s.originalTargetLat || s.targetLat || nodes.find(n => n.id === s.target)?.lat,
          originalTargetLng: s.originalTargetLng || s.targetLng || nodes.find(n => n.id === s.target)?.lng,
          originalTargetName: s.originalTargetName || s.targetName,
          // Temporarily divert to ghost node
          ghostLat: ghostCity.lat,
          ghostLng: ghostCity.lng,
          ghostNodeName: ghostName,
          riskScore: 0.08,
          riskScoreBefore: s.riskScore || 0.92,
          status: 'diverted',
          totalDist: null,
        };
      }
      return s;
    }));

    const swarmAlert = {
      id: Date.now().toString(),
      time: new Date().toLocaleTimeString(),
      message: `Swarm consensus: All shipments to ${disruptedNodeName} temporarily diverted via ${ghostName}. Will resume once clearance is granted.`,
      type: 'success',
      aiLog: finalAiLog
    };
    setAlerts(prev => [swarmAlert, ...prev]);

    const completedSim = {
      id: Date.now().toString(),
      cityId: disruptedNodeId,
      cityName: disruptedNodeName,
      type: simType,
      typeLabel,
      ghostNodeName: ghostCity.name,
      completedAt: new Date().toLocaleTimeString(),
      completedDate: new Date().toLocaleDateString(),
      aiLog: finalAiLog,
    };
    setActiveSimulation(prev => prev ? { ...prev, pending: false, result: completedSim, liveStep: 4 } : null);
    setSimHistory(prev => [completedSim, ...prev]);
  };

  // ── Savings model ──────────────────────────────────────────────
  const displayedShipments = shipments.filter(s => !s.userId || s.userId === currentUser?.uid || s.userId === 'anon');

  // Expose pickGhostCity for use in pages
  const getGhostCandidates = useCallback(() => [
    { id: 'HYD', name: 'Hyderabad', lat: 17.3850, lng: 78.4867 },
    { id: 'JAI', name: 'Jaipur', lat: 26.9124, lng: 75.7873 },
    { id: 'LKO', name: 'Lucknow', lat: 26.8467, lng: 80.9462 },
    { id: 'AMD', name: 'Ahmedabad', lat: 23.0225, lng: 72.5714 },
    { id: 'NAG', name: 'Nagpur', lat: 21.1458, lng: 79.0882 },
    { id: 'KOL', name: 'Kolkata', lat: 22.5726, lng: 88.3639 },
    { id: 'GOA', name: 'Goa', lat: 15.2993, lng: 74.1240 },
  ], []);

  const COST_PER_DELAY_HOUR = 2500;
  const BASE_REROUTE_HOURS  = 10;
  const DELIVERED_BASE      = 800;

  const savingsBreakdown = displayedShipments
    .filter(s => s.status === 'rerouted' || s.status === 'diverted' || s.status === 'resumed' || s.status === 'delivered')
    .map(s => {
      if (s.status === 'rerouted' || s.status === 'diverted' || s.status === 'resumed') {
        const riskDelta = Math.max((s.riskScoreBefore || 0.92) - (s.riskScore || 0.08), 0);
        const hoursAvoided = Math.round(riskDelta * BASE_REROUTE_HOURS * 10) / 10;
        const saving = Math.round(hoursAvoided * COST_PER_DELAY_HOUR);
        return {
          id: s.id, type: s.status === 'diverted' ? 'diverted' : s.status === 'resumed' ? 'resumed' : 'rerouted',
          label: `${s.originName || 'Origin'} → ${s.originalTargetName || s.targetName || s.target}`,
          detail: `Disruption avoided — ${hoursAvoided}h delay saved @ ₹${COST_PER_DELAY_HOUR.toLocaleString('en-IN')}/hr`,
          saving,
        };
      }
      return {
        id: s.id, type: 'delivered',
        label: `${s.originName || 'Origin'} → ${s.targetName || s.target}`,
        detail: `AI-optimised delivery completed — base efficiency saving`,
        saving: DELIVERED_BASE,
      };
    });

  const totalSavings = savingsBreakdown.reduce((acc, r) => acc + r.saving, 0);

  return (
    <SupplyChainContext.Provider value={{
      nodes, routes,
      shipments: displayedShipments,
      alerts,
      triggerSimulation,
      ghostNodesActive,
      addShipment,
      addGhostNode,
      getGhostCandidates,
      activeSimulation,
      simHistory,
      disruptedCities,
      totalSavings,
      savingsBreakdown,
    }}>
      {children}
    </SupplyChainContext.Provider>
  );
}

export const useSupplyChain = () => useContext(SupplyChainContext);
