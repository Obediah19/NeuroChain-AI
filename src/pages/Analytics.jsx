import React from 'react';
import { useSupplyChain } from '../context/SupplyChainContext';
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  Route,
  Package,
  Zap,
  ArrowUp,
  ArrowDown,
  Minus,
  IndianRupee,
  CheckCircle,
  RefreshCw,
  Info,
  FlaskConical
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Tooltip from '../components/Tooltip';

function ChartPlaceholder({ title, children, tooltip }) {
  return (
    <div className="bg-white dark:bg-[#2d2d2d] rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
        <h3 className="font-bold text-gray-900 dark:text-gray-100">{title}</h3>
        {tooltip && (
          <Tooltip explanation={tooltip}>
             <span className="w-4" />
          </Tooltip>
        )}
      </div>
      <div className="p-6">
        {children}
      </div>
    </div>
  );
}

function SimpleBar({ label, value, max = 100, color }) {
  const percentage = Math.min((value / max) * 100, 100);
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
    purple: 'bg-purple-500',
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{value}</span>
      </div>
      <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div 
          className={`h-full ${colorClasses[color]} rounded-full transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function StatRow({ icon: Icon, label, value, change, color }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl bg-${color}-100 dark:bg-${color}-900/20 flex items-center justify-center`}>
          <Icon size={20} className={`text-${color}-500`} />
        </div>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{value}</span>
        {change !== undefined && (
          <span className={`text-xs font-bold px-2 py-1 rounded-full ${
            change > 0 
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : change < 0
                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
          }`}>
            {change > 0 ? <ArrowUp size={12} /> : change < 0 ? <ArrowDown size={12} /> : <Minus size={12} />}
            {Math.abs(change)}%
          </span>
        )}
      </div>
    </div>
  );
}

function fmt(amt) {
  if (amt === 0) return '₹0';
  if (amt >= 100000) return `₹${(amt / 100000).toFixed(2)}L`;
  if (amt >= 1000)   return `₹${(amt / 1000).toFixed(2)}K`;
  return `₹${amt.toLocaleString('en-IN')}`;
}

export default function Analytics() {
  const { nodes, routes, shipments, alerts, totalSavings, savingsBreakdown } = useSupplyChain();

  const totalShipments    = shipments.length;
  const totalRoutes       = routes.length;
  const totalNodes        = nodes.length;
  const avgRisk           = shipments.reduce((acc, s) => acc + (s.riskScore || 0), 0) / Math.max(shipments.length, 1);
  const avgProgress       = shipments.reduce((acc, s) => acc + (s.progress || 0), 0) / Math.max(shipments.length, 1);
  const reroutedCount     = shipments.filter(s => s.status === 'rerouted').length;
  const deliveredCount    = shipments.filter(s => s.status === 'delivered').length;

  const deliveryRate  = Math.round(avgProgress);
  const efficiency    = Math.round((1 - avgRisk) * 100);

  const reroutedSavings  = savingsBreakdown.filter(s => s.type === 'rerouted').reduce((a, s) => a + s.saving, 0);
  const deliveredSavings = savingsBreakdown.filter(s => s.type === 'delivered').reduce((a, s) => a + s.saving, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-gray-900 dark:text-gray-100">Analytics</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Performance metrics and delivery insights</p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Tooltip explanation="The sum of all agents currently traversing the neural network.">
          <div className="bg-white dark:bg-[#2d2d2d] rounded-xl border border-gray-200 dark:border-gray-800 p-4 w-full text-left">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                <Package size={20} className="text-blue-500" />
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">Total</span>
            </div>
            <p className="text-2xl font-extrabold text-gray-900 dark:text-gray-100">{totalShipments}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Shipments</p>
          </div>
        </Tooltip>
        <Tooltip explanation="Number of physical or virtual connections actively maintaining data/cargo flow.">
          <div className="bg-white dark:bg-[#2d2d2d] rounded-xl border border-gray-200 dark:border-gray-800 p-4 w-full text-left">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <Route size={20} className="text-green-500" />
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">Active</span>
            </div>
            <p className="text-2xl font-extrabold text-gray-900 dark:text-gray-100">{totalRoutes}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Routes</p>
          </div>
        </Tooltip>
        <Tooltip explanation="Sum of agents successfully rerouted to avoid predicted collision or delay events.">
          <div className="bg-white dark:bg-[#2d2d2d] rounded-xl border border-gray-200 dark:border-gray-800 p-4 w-full text-left">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                <Zap size={20} className="text-purple-500" />
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">AI</span>
            </div>
            <p className="text-2xl font-extrabold text-gray-900 dark:text-gray-100">{reroutedCount}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Optimized</p>
          </div>
        </Tooltip>
        <Tooltip explanation="Average journey completion percentage across the active agent pool.">
          <div className="bg-white dark:bg-[#2d2d2d] rounded-xl border border-gray-200 dark:border-gray-800 p-4 w-full text-left">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center">
                <Clock size={20} className="text-amber-500" />
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">Avg</span>
            </div>
            <p className="text-2xl font-extrabold text-gray-900 dark:text-gray-100">{Math.round(avgProgress)}%</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Progress</p>
          </div>
        </Tooltip>
      </div>

      {/* ── Cost Savings Breakdown ─────────────────────────────────── */}
      <div className="bg-white dark:bg-[#2d2d2d] rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
              <IndianRupee size={20} className="text-white" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 dark:text-gray-100 text-lg">AI Cost Savings Breakdown</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">How every rupee is calculated</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-extrabold text-green-600 dark:text-green-400">{fmt(totalSavings)}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Total saved</p>
          </div>
        </div>

        {/* Calculation model explainer */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-blue-50 dark:bg-blue-900/10">
          <div className="flex gap-3">
            <Info size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
              <p className="font-semibold">How savings are calculated:</p>
              <p>• <strong>Rerouted shipments:</strong> Delay risk before rerouting (92%) minus risk after (8%) = 84% risk delta × 10 base delay hours × <strong>₹2,500/hr</strong> = <strong>₹21,000 per rerouted shipment</strong></p>
              <p>• <strong>Delivered shipments:</strong> AI-optimised path completion earns a flat <strong>₹800</strong> base efficiency saving per shipment</p>
              <p>• <strong>New user:</strong> Starts at ₹0. Run simulations and add deliveries to grow this number.</p>
            </div>
          </div>
        </div>

        {/* Summary row */}
        <div className="grid grid-cols-2 gap-px bg-gray-100 dark:bg-gray-800">
          <div className="bg-white dark:bg-[#2d2d2d] p-4">
            <div className="flex items-center gap-2 mb-1">
              <RefreshCw size={14} className="text-purple-500" />
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">From Rerouting</span>
            </div>
            <p className="text-xl font-extrabold text-purple-600 dark:text-purple-400">{fmt(reroutedSavings)}</p>
            <p className="text-xs text-gray-400 mt-0.5">{reroutedCount} shipment{reroutedCount !== 1 ? 's' : ''} rerouted</p>
          </div>
          <div className="bg-white dark:bg-[#2d2d2d] p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle size={14} className="text-green-500" />
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">From Delivered</span>
            </div>
            <p className="text-xl font-extrabold text-green-600 dark:text-green-400">{fmt(deliveredSavings)}</p>
            <p className="text-xs text-gray-400 mt-0.5">{deliveredCount} shipment{deliveredCount !== 1 ? 's' : ''} delivered</p>
          </div>
        </div>

        {/* Per-shipment breakdown table */}
        <div className="p-4">
          {savingsBreakdown.length === 0 ? (
            <div className="text-center py-10">
              <FlaskConical size={36} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
              <p className="font-semibold text-gray-500 dark:text-gray-400 mb-1">No savings recorded yet</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 max-w-xs mx-auto">
                Add deliveries and run simulations to reroute them — each rerouted or delivered shipment contributes to your total savings.
              </p>
              <Link to="/simulation"
                className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-blue-500 text-white text-sm font-semibold rounded-lg hover:bg-blue-600 transition-colors">
                Go to Simulation Lab →
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Per-Shipment Detail</p>
              {savingsBreakdown.map((item, i) => (
                <div key={item.id || i}
                  className={`flex items-start justify-between p-3 rounded-xl border ${
                    item.type === 'rerouted'
                      ? 'bg-purple-50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-900/40'
                      : 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-900/40'
                  }`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      item.type === 'rerouted' ? 'bg-purple-100 dark:bg-purple-900/30' : 'bg-green-100 dark:bg-green-900/30'
                    }`}>
                      {item.type === 'rerouted'
                        ? <RefreshCw size={14} className="text-purple-600 dark:text-purple-400" />
                        : <CheckCircle size={14} className="text-green-600 dark:text-green-400" />
                      }
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{item.id}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{item.label}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{item.detail}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <p className={`text-base font-extrabold ${
                      item.type === 'rerouted' ? 'text-purple-700 dark:text-purple-300' : 'text-green-700 dark:text-green-300'
                    }`}>
                      +{fmt(item.saving)}
                    </p>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      item.type === 'rerouted'
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                        : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    }`}>
                      {item.type === 'rerouted' ? 'Rerouted' : 'Delivered'}
                    </span>
                  </div>
                </div>
              ))}

              {/* Running total at bottom */}
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Total ({savingsBreakdown.length} shipment{savingsBreakdown.length !== 1 ? 's' : ''})
                </span>
                <span className="text-xl font-extrabold text-green-600 dark:text-green-400">
                  {fmt(totalSavings)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Delivery Performance */}
        <ChartPlaceholder title="Delivery Performance" tooltip="Measures completion timeliness mapped against network stress">
          <div className="space-y-4">
            <SimpleBar label="On-Time Delivery" value={Math.round(deliveredCount / Math.max(totalShipments, 1) * 100)} color="green" />
            <SimpleBar label="Network Efficiency" value={efficiency} color="blue" />
            <SimpleBar label="AI Optimised" value={Math.round(reroutedCount / Math.max(totalShipments, 1) * 100)} color="purple" />
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Overall Score</span>
                <span className="text-xl font-bold text-green-500">{efficiency}%</span>
              </div>
            </div>
          </div>
        </ChartPlaceholder>

        {/* Route Efficiency */}
        <ChartPlaceholder title="Node Congestion" tooltip="Current load on each hub — lower is better.">
          <div className="space-y-4">
            {nodes.slice(0, 5).map((node, idx) => (
              <SimpleBar 
                key={node.id} 
                label={node.name} 
                value={Math.round(node.congestion * 100)}
                max={100}
                color={node.congestion > 0.7 ? 'red' : node.congestion > 0.4 ? 'amber' : 'green'}
              />
            ))}
          </div>
        </ChartPlaceholder>

        {/* Risk Assessment */}
        <ChartPlaceholder title="Risk Distribution" tooltip="Breakdown of current risk factors across the network.">
          <div className="space-y-4">
            <SimpleBar label="Weather" value={35} color="amber" />
            <SimpleBar label="Traffic" value={28} color="red" />
            <SimpleBar label="Port" value={15} color="purple" />
            <SimpleBar label="Customs" value={10} color="blue" />
            <SimpleBar label="Other" value={12} color="green" />
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Avg Network Risk</span>
                <span className="text-xl font-bold text-amber-500">{Math.round(avgRisk * 100)}%</span>
              </div>
            </div>
          </div>
        </ChartPlaceholder>

        {/* Shipment Status */}
        <ChartPlaceholder title="Shipment Status Summary" tooltip="Current status split of all agents in the network.">
          <div className="space-y-4">
            <SimpleBar label="In Transit" value={shipments.filter(s => s.status === 'in-transit').length} max={Math.max(totalShipments, 1)} color="blue" />
            <SimpleBar label="Rerouted" value={reroutedCount} max={Math.max(totalShipments, 1)} color="purple" />
            <SimpleBar label="Delivered" value={deliveredCount} max={Math.max(totalShipments, 1)} color="green" />
            <SimpleBar label="Evaluating" value={shipments.filter(s => s.status === 'evaluating_route').length} max={Math.max(totalShipments, 1)} color="amber" />
          </div>
        </ChartPlaceholder>
      </div>

      {/* Detailed Stats */}
      <div className="bg-white dark:bg-[#2d2d2d] rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <h3 className="font-bold text-gray-900 dark:text-gray-100">Performance Breakdown</h3>
        </div>
        <div className="p-4">
          <StatRow icon={Package} label="Total Deliveries" value={totalShipments} color="blue" />
          <StatRow icon={Route} label="Active Routes" value={totalRoutes} color="green" />
          <StatRow icon={Zap} label="AI Optimizations" value={reroutedCount} color="purple" />
          <StatRow icon={CheckCircle} label="Completed Deliveries" value={deliveredCount} color="green" />
          <StatRow icon={TrendingUp} label="Network Efficiency" value={`${efficiency}%`} color="blue" />
          <StatRow icon={IndianRupee} label="Total Savings" value={fmt(totalSavings)} color="amber" />
        </div>
      </div>
    </div>
  );
}