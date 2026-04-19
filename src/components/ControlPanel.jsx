import React, { useState } from 'react';
import { useSupplyChain } from '../context/SupplyChainContext';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, Zap, ShieldAlert, Cpu, Route, Package, LogOut, Search, PlusCircle, LogIn, Mail } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

export default function ControlPanel() {
  const { nodes, shipments, alerts, triggerSimulation } = useSupplyChain();
  const { currentUser, loginWithGoogle, loginWithEmail, signupWithEmail, logout } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  
  const [newRouteFrom, setNewRouteFrom] = useState('');
  const [newRouteTo, setNewRouteTo] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      if (isRegistering) {
        await signupWithEmail(email, password);
      } else {
        await loginWithEmail(email, password);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleScheduleRoute = async () => {
    if (!newRouteFrom || !newRouteTo || newRouteFrom === newRouteTo) {
      alert("Please select distinct Start and Target Hubs!");
      return;
    }
    const newId = `SHP-${Math.floor(Math.random() * 1000)}`;
    const fromNode = nodes.find(n => n.id === newRouteFrom);
    
    if(db) {
       await setDoc(doc(db, 'shipments', newId), {
         lat: fromNode.lat,
         lng: fromNode.lng,
         status: 'in-transit',
         target: newRouteTo,
         owner: currentUser.uid,
         riskScore: 0.1,
         progress: 0
       });
       
       await setDoc(doc(db, 'alerts', Date.now().toString()), {
         time: new Date().toISOString(),
         message: `Agent ${newId} initialized. Routing to ${newRouteTo}.`,
         type: 'info',
         aiLog: null
       });
    }
  };

  // Filter shipments to show owned deployments
  const myShipments = shipments.filter(s => s.owner === currentUser?.uid);

  return (
    <div className="h-full flex flex-col gap-4 overflow-y-auto p-2">
      
      {/* Profile Bar */}
      <div className="glass flex justify-between items-center p-3 rounded-xl border border-gray-200 dark:border-gray-800">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-gray-400">Commander ID</span>
          <span className="text-sm font-medium">{currentUser.email}</span>
        </div>
        <button onClick={logout} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Logout">
          <LogOut size={18} />
        </button>
      </div>

      {/* Schedule New Route */}
      <div className="glass-card p-5">
        <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
          <Route className="text-brand-500" size={20} />
          Dispatch Swarm Agent
        </h2>
        <div className="flex flex-col gap-3">
          <select 
            value={newRouteFrom} 
            onChange={e => setNewRouteFrom(e.target.value)} 
            className="p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select Origin Hub</option>
            {nodes.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
          </select>
          <select 
            value={newRouteTo} 
            onChange={e => setNewRouteTo(e.target.value)} 
            className="p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select Target Hub</option>
            {nodes.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
          </select>
          <button onClick={handleScheduleRoute} className="w-full bg-brand-500 hover:bg-brand-600 text-white font-medium py-3 rounded-lg transition-colors flex justify-center items-center gap-2 text-sm">
             Deploy Agent <PlusCircle size={16} />
          </button>
        </div>
      </div>

      {/* Track My Agents / Shipments */}
      <div className="glass-card p-5">
        <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
          <Search className="text-blue-500" size={20}/>
          My Active Deployments
        </h2>
        <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
          {myShipments.length === 0 ? (
            <p className="text-xs text-center opacity-60 py-2">No agents dispatched yet.</p>
          ) : myShipments.map(s => (
            <div key={s.id} className="p-2 bg-gray-50/50 dark:bg-dark-900/50 rounded-lg border border-gray-100 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-sm">{s.id}</span>
                <span className={`text-[10px] px-2 py-0.5 font-bold uppercase rounded-full ${s.status === 'rerouted' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>
                  {s.status}
                </span>
              </div>
              <div className="text-xs opacity-70 mt-1">Routing to: <span className="font-bold">{s.target}</span></div>
            </div>
          ))}
        </div>
      </div>

      {/* Simulation Controls */}
      <div className="glass-card p-5">
        <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
          <Zap className="text-yellow-500" size={20}/>
          What-If Simulator
        </h2>
        <div className="flex gap-2">
          <button 
            onClick={() => triggerSimulation('storm')}
            className="flex-1 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-medium py-2 px-3 rounded-lg shadow-md hover:shadow-lg transition-transform transform active:scale-95 text-sm"
          >
            Simulate Storm (BOM)
          </button>
        </div>
      </div>

      {/* AI Logs & Alerts */}
      <div className="glass-card p-5 flex-1 flex flex-col min-h-0">
        <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
          <Cpu className="text-purple-500" size={20}/>
          AI Swarm Logs
        </h2>
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
          {alerts.map(alert => (
            <div key={alert.id} className="animate-fade-in">
              <div className={`p-2 rounded-t-lg border-l-4 ${alert.type === 'danger' ? 'bg-red-50 dark:bg-red-900/10 border-red-500' : alert.type === 'success' ? 'bg-green-50 dark:bg-green-900/10 border-green-500' : 'bg-blue-50 dark:bg-blue-900/10 border-blue-500'}`}>
                <div className="flex gap-2 items-start">
                  {alert.type === 'danger' ? <ShieldAlert size={16} className="text-red-500 mt-0.5" /> : <AlertCircle size={16} className="text-blue-500 mt-0.5" />}
                  <div>
                    <p className="text-xs font-medium">{alert.message}</p>
                    <span className="text-[10px] opacity-60">{alert.time.substring(11, 19)}</span>
                  </div>
                </div>
              </div>
              {alert.aiLog && (
                <div className="bg-white dark:bg-dark-900 p-2 rounded-b-lg border border-t-0 border-gray-200 dark:border-gray-700 text-[11px] font-mono text-purple-600 dark:text-purple-400 leading-relaxed shadow-sm">
                  <span className="font-bold text-purple-700 dark:text-purple-300">Gemini:</span> {alert.aiLog}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      
    </div>
  );
}
