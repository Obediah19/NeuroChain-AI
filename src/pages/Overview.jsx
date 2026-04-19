import React from 'react';
import { Link } from 'react-router-dom';
import { useSupplyChain } from '../context/SupplyChainContext';
import { useTheme } from '../context/ThemeContext';
import { 
  Package, 
  Shield, 
  Clock, 
  DollarSign, 
  Activity,
  AlertTriangle,
  CheckCircle,
  Zap
} from 'lucide-react';
import MapDashboard from '../components/MapDashboard';
import Tooltip from '../components/Tooltip';

function StatCard({ icon: Icon, label, value, subtext, color, trend }) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600 shadow-blue-500/25',
    green: 'from-green-500 to-green-600 shadow-green-500/25',
    amber: 'from-amber-500 to-orange-500 shadow-amber-500/25',
    purple: 'from-purple-500 to-purple-600 shadow-purple-500/25',
  };

  return (
    <div className="bg-white dark:bg-[#2d2d2d] rounded-2xl p-5 border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center shadow-lg`}>
          <Icon className="text-white" size={24} />
        </div>
        {trend && (
          <span className={`text-xs font-bold px-2 py-1 rounded-full ${trend > 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <div className="space-y-1">
        <h3 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100">{value}</h3>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
        {subtext && <p className="text-xs text-gray-400 dark:text-gray-500">{subtext}</p>}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const statusConfig = {
    stable: { label: 'Stable', color: 'green', icon: CheckCircle },
    risk: { label: 'At Risk', color: 'amber', icon: AlertTriangle },
    critical: { label: 'Critical', color: 'red', icon: Zap },
  };

  const config = statusConfig[status] || statusConfig.stable;
  const Icon = config.icon;
  const colorClasses = {
    green: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border-green-200 dark:border-green-800',
    amber: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    red: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 border-red-200 dark:border-red-800',
  };

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${colorClasses[config.color]}`}>
      <Icon size={16} />
      <span className="text-sm font-bold">{config.label}</span>
    </div>
  );
}

export default function Overview() {
  const { nodes, shipments, alerts, totalSavings } = useSupplyChain();
  const { theme } = useTheme();

  const activeShipments = shipments.length;
  const disruptionsPrevented = alerts.filter(a => a.type === 'success').length;
  const avgDelayReduction = 78;

  // Format savings: ₹0 for new users, grows with each rerouted/delivered shipment
  const formatSavings = (amt) => {
    if (amt === 0) return '₹0';
    if (amt >= 100000) return `₹${(amt / 100000).toFixed(1)}L`;
    if (amt >= 1000) return `₹${(amt / 1000).toFixed(1)}K`;
    return `₹${amt.toLocaleString('en-IN')}`;
  };
  const costSavings = formatSavings(totalSavings);

  const hasRisk = nodes.some(n => n.congestion > 0.7);
  const systemStatus = hasRisk ? (hasRisk && nodes.some(n => n.congestion > 0.9) ? 'critical' : 'risk') : 'stable';

  const recentAlerts = alerts.slice(-5).reverse();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-gray-900 dark:text-gray-100">
            Command Center
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Real-time swarm intelligence overview
          </p>
        </div>
        <StatusBadge status={systemStatus} />
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Tooltip explanation="Total number of swarm agents actively executing delivery operations in the network.">
          <StatCard 
            icon={Package} 
            label="Active Agents" 
            value={activeShipments} 
            subtext="In transit across network"
            color="blue"
            trend={12}
          />
        </Tooltip>
        <Tooltip explanation="Disruptions (like weather, traffic) predicted and avoided via AI swarm routing.">
          <StatCard 
            icon={Shield} 
            label="Disruptions Prevented" 
            value={disruptionsPrevented} 
            subtext="AI rerouting actions"
            color="green"
            trend={8}
          />
        </Tooltip>
        <Tooltip explanation="Percent drop in estimated delay times using AI routing vs traditional fixed logistics paths.">
          <StatCard 
            icon={Clock} 
            label="Avg Delay Reduction" 
            value={`${avgDelayReduction}%`} 
            subtext="vs. traditional logistics"
            color="purple"
            trend={15}
          />
        </Tooltip>
        <Tooltip explanation="Total savings from AI rerouting (₹2,500/hr per delay hour avoided) + delivered agent efficiency (₹800 each). Starts at ₹0 and grows with each rerouted or completed shipment.">
          <StatCard 
            icon={DollarSign} 
            label="Cost Savings" 
            value={costSavings} 
            subtext={totalSavings === 0 ? 'Run a simulation to see savings' : 'Calculated from your shipments'}
            color="amber"
          />
        </Tooltip>
      </div>

      {/* Map Preview & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Mini Map */}
        <div className="lg:col-span-2 bg-white dark:bg-[#2d2d2d] rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Network Overview</h2>
            <Link to="/operations" className="text-xs font-bold text-blue-500 hover:text-blue-600 transition-colors">
              View Full Map →
            </Link>
          </div>
          <div className="h-64 lg:h-80 bg-gray-100 dark:bg-gray-900 relative flex-1">
            <MapDashboard />
          </div>
        </div>

        {/* Recent Alerts */}
        <div className="bg-white dark:bg-[#2d2d2d] rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Recent Activity</h2>
          </div>
          <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
            {recentAlerts.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">No recent activity</p>
            ) : (
              recentAlerts.map((alert) => (
                <div 
                  key={alert.id}
                  className={`
                    p-3 rounded-xl border-l-4 animate-fade-in
                    ${alert.type === 'danger' 
                      ? 'bg-red-50 dark:bg-red-900/10 border-red-500' 
                      : alert.type === 'success' 
                        ? 'bg-green-50 dark:bg-green-900/10 border-green-500' 
                        : 'bg-blue-50 dark:bg-blue-900/10 border-blue-500'
                    }
                  `}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{alert.message}</p>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 whitespace-nowrap">
                      {alert.time?.substring(11, 19) || 'Now'}
                    </span>
                  </div>
                  {alert.aiLog && (
                    <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-xs font-mono text-purple-600 dark:text-purple-400">
                        🤖 {alert.aiLog}
                      </p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {nodes.slice(0, 4).map((node) => (
          <div 
            key={node.id}
            className="bg-white dark:bg-[#2d2d2d] rounded-xl p-4 border border-gray-200 dark:border-gray-800"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-gray-900 dark:text-gray-100">{node.id}</span>
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                node.congestion > 0.7 
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  : node.congestion > 0.4
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              }`}>
                {Math.round(node.congestion * 100)}% load
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{node.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
}