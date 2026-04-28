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

// ── Ghost node candidate pool ────────────────────────────────────
const GHOST_CANDIDATES = [
  { id: 'HYD', name: 'Hyderabad', lat: 17.3850, lng: 78.4867 },
  { id: 'JAI', name: 'Jaipur',    lat: 26.9124, lng: 75.7873 },
  { id: 'LKO', name: 'Lucknow',   lat: 26.8467, lng: 80.9462 },
  { id: 'AMD', name: 'Ahmedabad', lat: 23.0225, lng: 72.5714 },
  { id: 'NAG', name: 'Nagpur',    lat: 21.1458, lng: 79.0882 },
  { id: 'KOL', name: 'Kolkata',   lat: 22.5726, lng: 88.3639 },
  { id: 'GOA', name: 'Goa',       lat: 15.2993, lng: 74.1240 },
  { id: 'RAI', name: 'Raipur',    lat: 21.2514, lng: 81.6296 },
  { id: 'BHO', name: 'Bhopal',    lat: 23.2599, lng: 77.4126 },
  { id: 'VTZ', name: 'Visakhapatnam', lat: 17.6868, lng: 83.2185 },
  { id: 'IDR', name: 'Indore',    lat: 22.7196, lng: 75.8577 },
  { id: 'SUR', name: 'Surat',     lat: 21.1702, lng: 72.8311 },
];

// ── Haversine distance (km) ──────────────────────────────────────
const haversineKm = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

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

// ══════════════════════════════════════════════════════════════════
// SMART GHOST-NODE SELECTION (context aware & delivery-specific)
// ══════════════════════════════════════════════════════════════════

/**
 * AI picks the optimal delivery-specific ghost node based on:
 * score = distance(origin -> candidate) + distance(candidate -> destination)
 * minimizing the total route length while avoiding the disrupted node
 */
const calculateDeliverySpecificGhostNode = (shipment, disruptedCityId, existingNodeIds) => {
  const currentLat = shipment.lat || shipment.originLat;
  const currentLng = shipment.lng || shipment.originLng;
  // destination should be original target if already diverted, else target
  const destNodeId = shipment.originalTarget || shipment.target;
  // We need destLat/Lng. Since context has nodes in scope later, we can pass it or calculate it
  const destLat = shipment.originalTargetLat || shipment.targetLat || 20.5; // fallback
  const destLng = shipment.originalTargetLng || shipment.targetLng || 78.5; 
  
  const available = GHOST_CANDIDATES.filter(
    c => c.id !== disruptedCityId && c.id !== destNodeId && !existingNodeIds.includes(c.id) && !existingNodeIds.includes(`${c.id}-GHOST`)
  );

  if (available.length === 0) {
    const fallback = GHOST_CANDIDATES.filter(c => c.id !== disruptedCityId);
    return { city: fallback[0] || GHOST_CANDIDATES[0], score: 9999, delayReduction: 15 };
  }

  const scored = available.map(c => {
    const d1 = haversineKm(currentLat, currentLng, c.lat, c.lng);
    const d2 = haversineKm(c.lat, c.lng, destLat, destLng);
    const score = d1 + d2;
    // Delay reduction varies from 5% to 40% based inversely on detour size
    const delayReduction = Math.max(5, Math.min(40, 40 - (score / 100)));
    return { city: c, score, delayReduction: Math.round(delayReduction), dist: Math.round(d1) };
  });

  scored.sort((a, b) => a.score - b.score);
  return scored[0];
};

/**
 * Validate a USER-SUGGESTED ghost node city.
 * Returns { accepted, reason, delayReduction, optimalCity }
 */
const validateUserSuggestion = (suggestedCity, disruptedCityId, disruptedLat, disruptedLng, existingNodeIds, affectedShipmentIds = []) => {
  // Get the AI's optimal pick
  const optimal = pickOptimalGhostCity(disruptedCityId, disruptedLat, disruptedLng, existingNodeIds, affectedShipmentIds);

  // If no active disruption → reject
  if (!disruptedCityId) {
    return {
      accepted: false,
      reason: 'No active disruption detected. Ghost nodes are deployed only during disruptions to reroute affected shipments.',
      delayReduction: 0,
      optimalCity: null,
    };
  }

  // If they suggested the disrupted city itself → reject
  if (suggestedCity.id === disruptedCityId) {
    return {
      accepted: false,
      reason: `${suggestedCity.name} is the disrupted city itself. A ghost node must be at a different location.`,
      delayReduction: 0,
      optimalCity: null, // Removed reference to optimal.city since optimal depends on specific shipments now
    };
  }

  // Score the user's suggestion
  const userDist = haversineKm(disruptedLat, disruptedLng, suggestedCity.lat, suggestedCity.lng);
  const proximity = userDist < 100 ? 0.4 : userDist < 200 ? 0.7 : userDist < 400 ? 1.0 : userDist < 700 ? 0.8 : userDist < 1000 ? 0.6 : 0.3;
  const centrality = 1 - (haversineKm(21.5, 78.5, suggestedCity.lat, suggestedCity.lng) / 2000);
  const userScore = proximity * 0.7 + centrality * 0.3;
  const userDelayReduction = Math.round(userScore * 35 + 5);

  // In absence of global optimal score, check against simple proximity logic
  const efficiency = userScore > 0 ? userScore / 1.0 : 0;

  if (efficiency >= 0.75) {
    return {
      accepted: true,
      reason: `✅ Accepted — ${suggestedCity.name} is ${Math.round(userDist)}km from disruption zone. Reduces delay by ${userDelayReduction}%.`,
      delayReduction: userDelayReduction,
      optimalCity: null,
      efficiency: Math.round(efficiency * 100),
    };
  } else {
    return {
      accepted: false,
      reason: `❌ Not optimal — ${suggestedCity.name} is ${Math.round(userDist)}km away (only ${userDelayReduction}% delay reduction).`,
      delayReduction: userDelayReduction,
      optimalCity: null,
      efficiency: Math.round(efficiency * 100),
    };
  }
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
  const [disruptionTimers, setDisruptionTimers] = useState({});

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
    // Math.random ensures no exact ID clashes if date is exact ms
    const newId = `SHP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
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

  // ── Clear Disruption Function ──────────────────────────────────
  const clearDisruption = useCallback((cityId) => {
    setDisruptedCities(prev => {
      const next = new Set(prev);
      next.delete(cityId);
      return next;
    });
    
    // Clear the timer for this city
    setDisruptionTimers(prev => {
      if (prev[cityId]) clearTimeout(prev[cityId]);
      const next = { ...prev };
      delete next[cityId];
      return next;
    });

    setNodes(prev => prev.map(n => n.id === cityId ? { ...n, congestion: 0.2 } : n));
    
    // Any waiting (or diverted) shipments going to this city should now resume
    setShipments(prev => prev.map(s => {
      if ((s.status === 'waiting' || s.status === 'diverted') && s.originalTarget === cityId) {
        return {
          ...s,
          status: 'resumed',
          target: s.originalTarget,
          targetLat: s.originalTargetLat,
          targetLng: s.originalTargetLng,
          targetName: s.originalTargetName,
          riskScore: 0.05,
          totalDist: null, 
          progress: 60, 
        };
      }
      return s;
    }));

    setAlerts(prev => [{
      id: Date.now().toString(),
      time: new Date().toLocaleTimeString(),
      message: `Disruption cleared at ${cityId}. Shipments resuming routes.`,
      type: 'success',
      aiLog: null
    }, ...prev]);
  }, []);

  // ══════════════════════════════════════════════════════════════
  //  GHOST NODE: Suggest (user) → AI validates
  // ══════════════════════════════════════════════════════════════
  const suggestGhostNode = useCallback((suggestedCity) => {
    if (!suggestedCity || !suggestedCity.id) return { accepted: false, reason: 'Invalid city.', delayReduction: 0 };

    // Find the most recent disrupted city for context
    const disruptedArr = [...disruptedCities];
    if (disruptedArr.length === 0) {
      return {
        accepted: false,
        reason: 'No active disruption detected. Ghost nodes are created automatically by AI during disruptions. Run a simulation first to see ghost node deployment in action.',
        delayReduction: 0,
        optimalCity: null,
      };
    }

    const lastDisrupted = disruptedArr[disruptedArr.length - 1];
    const disruptedNode = nodes.find(n => n.id === lastDisrupted);
    if (!disruptedNode) return { accepted: false, reason: 'Disrupted city not found in network.', delayReduction: 0 };

    const existingIds = nodes.map(n => n.id);
    const affectedIds = shipments.filter(s => s.target === lastDisrupted && s.status !== 'delivered').map(s => s.id);

    return validateUserSuggestion(
      suggestedCity, lastDisrupted,
      disruptedNode.lat, disruptedNode.lng,
      existingIds, affectedIds
    );
  }, [disruptedCities, nodes, shipments]);

  // Deploy a user-suggested ghost node (only if validated)
  const deployUserGhostNode = useCallback(async (city, validationResult) => {
    if (!validationResult?.accepted || !city) return null;

    const ghostId = `${city.id}-GHOST`;
    const ghostName = `⚡ ${city.name} (User Suggested Hub)`;
    const newNode = { ...city, id: ghostId, name: ghostName, type: 'ghost', congestion: 0.05, source: 'user', createdFor: 'user-suggestion' };
    setNodes(prev => [...prev.filter(n => n.id !== ghostId), newNode]);
    setGhostNodesActive(true);

    const alert = {
      id: Date.now().toString(),
      time: new Date().toLocaleTimeString(),
      message: `User-suggested Ghost Node accepted: ${city.name}. AI validated — ${validationResult.delayReduction}% delay reduction.`,
      type: 'success',
      aiLog: `User suggested ${city.name} as a temporary hub. AI validated: ${validationResult.reason}. Efficiency vs AI optimal: ${validationResult.efficiency || '—'}%.`
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
          // If diverted → reached ghost node → switch to waiting status
          if (s.status === 'diverted' && s.originalTarget) {
            return {
              ...s,
              lat: moveLat, // snap exactly
              lng: moveLng,
              status: 'waiting',
              progress: 50, 
            };
          }
          // If waiting, it doesn't move
          if (s.status === 'waiting') {
             return s; 
          }
          // Otherwise → delivered at final destination
          return { ...s, status: 'delivered', progress: 100, totalDist };
        }

        if (s.status === 'waiting') return s; // don't move if waiting

        // Calculate overall progress
        let progress;
        if (s.status === 'diverted') {
          progress = totalDist > 0 ? Math.min(49, Math.round(((totalDist - dist) / totalDist) * 50)) : 0;
        } else if (s.status === 'resumed') {
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

  // ══════════════════════════════════════════════════════════════
  //  SIMULATION ENGINE — AI auto-creates ghost nodes
  // ══════════════════════════════════════════════════════════════
  const triggerSimulation = useCallback(async (type, cityId, cityName) => {
    const alertMsg = type === 'storm' ? 'Severe storm detected'
      : type === 'traffic' ? 'High traffic congestion detected'
      : type === 'port' ? 'Port failure detected'
      : 'Disruption detected';
    const aiMsg = type === 'storm' ? 'severe weather conditions'
      : type === 'traffic' ? 'extreme traffic congestion'
      : type === 'port' ? 'port infrastructure failure'
      : 'unexpected disruption';

    // Find the disrupted city's coordinates
    const disruptedNode = nodes.find(n => n.id === cityId);
    const disruptedLat = disruptedNode?.lat || 20.5;
    const disruptedLng = disruptedNode?.lng || 78.5;

    // Find affected shipments
    const affected = shipments
      .filter(s => s.target === cityId && s.status !== 'delivered');
    const affectedIds = affected.map(s => s.id);

    // Immediate state updates — no Firebase hanging
    setNodes(prev => prev.map(n => n.id === cityId ? { ...n, congestion: 0.95 } : n));
    setShipments(prev => prev.map(s =>
      (s.target === cityId && s.status !== 'delivered')
        ? { ...s, riskScore: 0.92, status: 'evaluating_route' }
        : s
    ));
    setDisruptedCities(prev => new Set([...prev, cityId]));

    // Start 30 second automatic clear timer
    const timerId = setTimeout(() => {
       clearDisruption(cityId);
    }, 30000);
    setDisruptionTimers(prev => ({ ...prev, [cityId]: timerId }));

    const SIM_STEPS = [
      { label: 'Threat Detected',       detail: `${alertMsg} in ${cityName}. Congestion spiked to 95%.`,                                                   icon: '⚡', color: 'red' },
      { label: 'Risk Assessment',       detail: `Swarm agents score all inbound shipments to ${cityName}. Threshold exceeded at 92%. ${affectedIds.length} shipment(s) affected: ${affectedIds.join(', ') || 'none active'}.`, icon: '📊', color: 'amber' },
      { label: 'AI Ghost Nodes Generated', detail: `AI analyzed shipment routes and deployed delivery-specific temporary hubs to minimize delay.`, icon: '🧠', color: 'purple' },
      { label: 'Shipments Diverted',    detail: `${affectedIds.length || 'All active'} shipments to ${cityName} diverted to safe zones to wait for clearance.`, icon: '🔀', color: 'blue' },
      { label: 'Delivery Paused',      detail: `Shipments have successfully diverted. They will automatically resume to ${cityName} when clearance is granted.`,              icon: '⌛', color: 'orange' },
    ];

    setActiveSimulation({
      cityId, cityName, type, typeLabel: alertMsg,
      steps: SIM_STEPS, liveStep: 0, result: null, pending: true,
      ghostCity: 'Various (Delivery-Specific)', ghostNodeLabel: 'Multiple Ghost Nodes',
      affectedShipments: affectedIds,
      delayReduction: 30, // Default display value
    });
    SIM_STEPS.forEach((_, i) => {
      setTimeout(() => {
        setActiveSimulation(prev => prev ? { ...prev, liveStep: i } : prev);
      }, i * 1100);
    });

    setAlerts(prev => [{
      id: Date.now().toString(),
      time: new Date().toLocaleTimeString(),
      message: `${alertMsg} in ${cityName}. ${affectedIds.length} inbound shipment(s) flagged. Risk: 92%.`,
      type: 'danger',
      aiLog: null
    }, ...prev]);

    const runFallback = async () => {
      let aiLogText = `AI analyzed individual routes for ${affectedIds.length} shipments and created delivery-specific ghost nodes to bypass ${cityName}'s disruption. Shipments have diverted and will pause in 'waiting' status until the 30-sec automatic clearance is granted, after which they will resume.`;
      
      applySwarmLogicFallback(cityId, cityName, type, alertMsg, aiLogText, affected);
    };
    setTimeout(runFallback, 2500);
  }, [nodes, shipments]);

  const applySwarmLogicFallback = async (disruptedNodeId, disruptedNodeName, simType, typeLabel, aiLogText, affectedShipments) => {
    const existingIds = nodes.map(n => n.id);
    const newGhostNodes = [];
    const newRoutes = [];
    const affectedIds = affectedShipments.map(s => s.id);
    
    // Per shipment ghost creation
    const updatedShipments = await Promise.all(shipments.map(async s => {
      if (s.target === disruptedNodeId && s.status !== 'delivered') {
        const ghostSelection = calculateDeliverySpecificGhostNode(s, disruptedNodeId, existingIds);
        const ghostCity = ghostSelection.city;
        const ghostId = `${ghostCity.id}-GHOST-${s.id}`;
        const ghostName = `⚡ ${ghostCity.name} (Shipment Hub)`;

        // Make sure we only add one per city if multiple go to same city?
        // Let's allow unique ghost nodes per shipment to accurately reflect delivery-specificity
        const ghostNode = {
          id: ghostId,
          name: ghostName,
          lat: ghostCity.lat,
          lng: ghostCity.lng,
          type: 'ghost',
          congestion: 0.05,
          source: 'ai',
          createdFor: s.id,
          createdAt: new Date().toISOString(),
          delayReduction: ghostSelection.delayReduction || 25,
        };
        newGhostNodes.push(ghostNode);

        newRoutes.push(
          { id: `g-${ghostId}-1`, from: s.originName || disruptedNodeId, to: ghostId, distance: ghostSelection.dist },
          { id: `g-${ghostId}-2`, from: ghostId, to: disruptedNodeId, distance: ghostSelection.dist } // mock distance back
        );

        const prompt = `You are an AI supply chain optimizer. A delivery from ${s.originName || "origin"} to ${disruptedNodeName} was disrupted by a ${typeLabel}. A temporary Ghost Node hub in ${ghostCity.name} was selected. Explain in 1 very short, professional sentence why this specific city was optimal for temporary rerouting.`;
        let aiExplanation = '';
        try {
          aiExplanation = await askGroq(prompt);
        } catch (err) {
          aiExplanation = `AI selected ${ghostCity.name} to minimize travel distance and bypass the ${typeLabel} disruption in ${disruptedNodeName}.`;
        }

        return {
          ...s,
          originalTarget: s.originalTarget || s.target,
          originalTargetLat: s.originalTargetLat || s.targetLat || nodes.find(n => n.id === s.target)?.lat,
          originalTargetLng: s.originalTargetLng || s.targetLng || nodes.find(n => n.id === s.target)?.lng,
          originalTargetName: s.originalTargetName || s.targetName,
          
          ghostLat: ghostCity.lat,
          ghostLng: ghostCity.lng,
          ghostNodeName: ghostName,
          aiExplanation,
          riskScore: 0.08,
          riskScoreBefore: s.riskScore || 0.92,
          status: 'diverted',
          totalDist: null,
          targetLat: ghostCity.lat, // target is now ghost city
          targetLng: ghostCity.lng,
        };
      }
      return s;
    }));

    setNodes(prev => [...prev, ...newGhostNodes]);
    setRoutes(prev => [...prev, ...newRoutes]);
    setGhostNodesActive(true);
    setShipments(updatedShipments);

    const aggregatedExplanations = updatedShipments
       .filter(s => s.aiExplanation && s.targetLat === s.ghostLat) // simplistic check to ensure it was just diverted
       .map(s => `• Shipment ${s.id.substring(0, 5)} (${s.originName || 'Origin'} → ${disruptedNodeName}): ${s.aiExplanation}`)
       .join('\n\n');

    const finalAiLogText = aggregatedExplanations 
      ? `${aiLogText}\n\n*Specific Node Decisions:*\n${aggregatedExplanations}`
      : aiLogText;

    const swarmAlert = {
      id: Date.now().toString(),
      time: new Date().toLocaleTimeString(),
      message: `🧠 AI optimized paths — dispatched ${newGhostNodes.length} delivery-specific ghost nodes to bypass ${disruptedNodeName}.`,
      type: 'success',
      aiLog: finalAiLogText
    };
    setAlerts(prev => [swarmAlert, ...prev]);

    const completedSim = {
      id: Date.now().toString(),
      cityId: disruptedNodeId,
      cityName: disruptedNodeName,
      type: simType,
      typeLabel,
      ghostNodeName: 'Delivery Specific Hubs',
      ghostNodeLabel: 'Multiple Hubs',
      ghostSource: 'ai',
      delayReduction: 30,
      affectedShipments: affectedIds || [],
      completedAt: new Date().toLocaleTimeString(),
      completedDate: new Date().toLocaleDateString(),
      aiLog: finalAiLogText,
    };
    setActiveSimulation(prev => prev ? { ...prev, pending: false, result: completedSim, liveStep: 4 } : null);
    setSimHistory(prev => [completedSim, ...prev]);
  };

  // ── Savings model ──────────────────────────────────────────────
  const displayedShipments = shipments.filter(s => !s.userId || s.userId === currentUser?.uid || s.userId === 'anon');

  // Expose for pages
  const getGhostCandidates = useCallback(() => GHOST_CANDIDATES, []);

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
      suggestGhostNode,
      deployUserGhostNode,
      getGhostCandidates,
      activeSimulation,
      simHistory,
      disruptedCities,
      clearDisruption,
      totalSavings,
      savingsBreakdown,
    }}>
      {children}
    </SupplyChainContext.Provider>
  );
}

export const useSupplyChain = () => useContext(SupplyChainContext);
