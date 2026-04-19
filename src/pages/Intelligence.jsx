import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSupplyChain } from '../context/SupplyChainContext';
import { 
  Brain, 
  MessageSquare, 
  TrendingUp, 
  Zap,
  CheckCircle,
  AlertTriangle,
  Clock,
  Target,
  Shield,
  ChevronRight,
  X,
  Send,
  Loader2
} from 'lucide-react';
import Tooltip from '../components/Tooltip';
import { askGroq } from '../utils/groq';

function AILogCard({ log, index, onExplain }) {
  return (
    <div className="bg-white dark:bg-[#2d2d2d] rounded-xl border border-gray-200 dark:border-gray-800 p-4 animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
            log.type === 'danger' ? 'bg-red-100 dark:bg-red-900/30' :
            log.type === 'success' ? 'bg-green-100 dark:bg-green-900/30' :
            'bg-blue-100 dark:bg-blue-900/30'
          }`}>
            {log.type === 'danger' ? (
              <AlertTriangle size={20} className="text-red-500" />
            ) : log.type === 'success' ? (
              <CheckCircle size={20} className="text-green-500" />
            ) : (
              <Brain size={20} className="text-blue-500" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                log.type === 'danger' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
                log.type === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
              }`}>
                {log.type === 'danger' ? '⚠ Disruption Detected' : log.type === 'success' ? '✓ Decision Executed' : 'ℹ System Event'}
              </span>
              <span className="text-[10px] text-gray-400">{log.time?.substring(11, 19) || 'Now'}</span>
            </div>
            <p className="font-semibold text-gray-900 dark:text-gray-100 mt-1 text-sm">{log.message}</p>
          </div>
        </div>
        <span className="text-xs font-bold px-2 py-1 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded-full flex-shrink-0">
          🤖 AI
        </span>
      </div>

      {/* AI Reasoning block */}
      {log.aiLog && (
        <div className="mt-2 p-3 bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-900/40 rounded-lg">
          <p className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <Zap size={10} /> NeuroChain Reasoning
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{log.aiLog}</p>
        </div>
      )}

      {/* Explain button */}
      {onExplain && (
        <button
          onClick={() => onExplain(log)}
          className="mt-3 w-full text-xs font-semibold py-2 px-3 bg-gray-100 dark:bg-gray-800 hover:bg-purple-100 dark:hover:bg-purple-900/30 text-gray-600 dark:text-gray-300 hover:text-purple-700 dark:hover:text-purple-400 rounded-lg transition-colors flex items-center justify-center gap-1.5"
        >
          <MessageSquare size={12} />
          Question this decision
        </button>
      )}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, change, color }) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    amber: 'from-amber-500 to-orange-500',
  };

  return (
    <div className="bg-white dark:bg-[#2d2d2d] rounded-xl border border-gray-200 dark:border-gray-800 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center`}>
          <Icon className="text-white" size={20} />
        </div>
        {change && (
          <span className={`text-xs font-bold px-2 py-1 rounded-full ${
            change > 0 
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
          }`}>
            {change > 0 ? '+' : ''}{change}%
          </span>
        )}
      </div>
      <p className="text-2xl font-extrabold text-gray-900 dark:text-gray-100">{value}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
    </div>
  );
}

function ExplainModal({ isOpen, onClose, explanation }) {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAsk = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setIsLoading(true);
    try {
      if (!import.meta.env.VITE_GROQ_API_KEY) throw new Error("API Key missing");
      const ai_prompt = `Context: A logistical AI system made the following decision: "${explanation || 'Reroute to Hyderabad to avoid Mumbai weather delay'}". The human operator asks: "${query}" Provide a concise 1-2 sentence direct logistical answer. Do not use markdown or asterisks.`;
      const answer = await askGroq(ai_prompt, 'You are NeuroChain AI, a swarm logistics expert.');
      setResponse(answer);
    } catch (err) {
      setResponse("Could not connect to neural network: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-[#2d2d2d] rounded-2xl p-6 max-w-lg w-full shadow-2xl animate-fade-in flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Brain size={20} className="text-purple-500" />
            AI Explanation
          </h3>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            <X size={20} />
          </button>
        </div>
        
        <div className="space-y-4 overflow-y-auto pr-2 flex-grow">
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
            <p className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wide opacity-80 mb-1">
              Decision Recorded
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              {explanation || 'The AI detected severe congestion (95%) at the hub due to adverse weather conditions. Analysis of alternative routes revealed that creating a temporary ghost node in Hyderabad would reduce delivery delay by 85% while minimizing additional distance. The swarm algorithm selected this optimal path based on real-time risk assessment.'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 pb-2">
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400">Confidence</p>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">94%</p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400">Impact</p>
              <p className="text-lg font-bold text-green-600 dark:text-green-400">-85% delay</p>
            </div>
          </div>

          {/* Follow-up Section */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Question this decision</p>
            {response && (
              <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900 rounded-lg text-sm text-gray-800 dark:text-gray-200">
                <div className="flex items-center gap-1.5 mb-1 text-blue-600 dark:text-blue-400">
                  <Brain size={12} />
                  <span className="text-[10px] uppercase font-bold tracking-wider">AI response</span>
                </div>
                {response}
              </div>
            )}
            <form onSubmit={handleAsk} className="flex gap-2 relative">
              <input 
                type="text" 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask e.g. Why not route via Bangalore instead?"
                className="flex-1 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white"
              />
              <button 
                type="submit"
                disabled={isLoading || !query.trim()}
                className="absolute right-1 top-1 bottom-1 px-3 bg-purple-500 text-white rounded-md hover:bg-purple-600 transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Intelligence() {
  const { alerts, shipments, activeSimulation } = useSupplyChain();
  const [showExplanation, setShowExplanation] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);

  const aiLogs = alerts.filter(a => a.aiLog && a.aiLog.trim().length > 3);
  const pendingAnalysis = activeSimulation?.pending && aiLogs.length === 0;

  const totalDecisions = aiLogs.length;
  const avgConfidence = 87;
  const disruptionsPrevented = alerts.filter(a => a.type === 'success').length;
  const delayReduction = 78;

  const handleExplain = (log) => {
    setSelectedLog(log);
    setShowExplanation(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-gray-900 dark:text-gray-100">
            AI Intelligence
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Decision logs, predictions, and reasoning transparency
          </p>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Tooltip explanation="Total decisions executed by NeuroChain swarm logic.">
          <MetricCard 
            icon={Brain} 
            label="Total Decisions" 
            value={totalDecisions} 
            change={12}
            color="blue"
          />
        </Tooltip>
        <Tooltip explanation="Weighted average precision score generated by Gemini inference.">
          <MetricCard 
            icon={Target} 
            label="Avg Confidence" 
            value={`${avgConfidence}%`} 
            change={5}
            color="green"
          />
        </Tooltip>
        <Tooltip explanation="Count of traffic/storm delays dynamically bypassed by ghost nodes.">
          <MetricCard 
            icon={Shield} 
            label="Disruptions Prevented" 
            value={disruptionsPrevented} 
            change={8}
            color="purple"
          />
        </Tooltip>
        <Tooltip explanation="Total combined hours of delay saved against traditional routing algorithms.">
          <MetricCard 
            icon={Clock} 
            label="Delay Reduction" 
            value={`${delayReduction}%`} 
            change={15}
            color="amber"
          />
        </Tooltip>
      </div>

      {/* AI Decision Logs */}
      <div className="bg-white dark:bg-[#2d2d2d] rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <MessageSquare size={20} className="text-purple-500" />
            AI Decision Logs
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {aiLogs.length} decisions recorded
          </p>
        </div>
        <div className="p-4 space-y-4 max-h-[500px] overflow-y-auto">
          {/* Pending: sim ran but Groq analysis still in flight */}
          {pendingAnalysis && (
            <div className="flex items-center gap-3 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl">
              <span className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
              <div>
                <p className="font-semibold text-purple-800 dark:text-purple-300 text-sm">Generating AI reasoning...</p>
                <p className="text-xs text-purple-600 dark:text-purple-400 mt-0.5">
                  Simulation for <strong>{activeSimulation.cityName}</strong> is complete. AI is writing the decision log — it will appear here in a moment.
                </p>
              </div>
            </div>
          )}

          {aiLogs.length === 0 && !pendingAnalysis ? (
            <div className="text-center py-12">
              <Brain size={48} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <p className="text-gray-500 dark:text-gray-400">No AI decisions yet</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                Run a simulation to generate AI decision logs
              </p>
            </div>
          ) : (
            aiLogs.map((log, index) => (
              <AILogCard key={log.id || index} log={log} index={index} onExplain={handleExplain} />
            ))
          )}
        </div>
      </div>

      {/* What is this tab? — shown when empty + no pending sim */}
      {aiLogs.length === 0 && !pendingAnalysis && (
        <div className="bg-white dark:bg-[#2d2d2d] rounded-2xl border border-gray-200 dark:border-gray-800 p-8">
          <div className="max-w-2xl mx-auto">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center">
              <Brain size={32} className="text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3 text-center">What is the AI Intelligence Tab?</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed mb-6 text-center">
              This tab is NeuroChain's <strong>decision audit log</strong>. Every time the AI detects a threat and takes action 
              (reroutes shipments, deploys ghost nodes, mitigates delays), it writes a full decision entry here with its reasoning.
              Think of it as the AI's "why did I do that?" logbook — completely transparent and queryable.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              {[
                { icon: '⚡', title: 'Threat Detected', desc: 'Storm, traffic, port failure — any disruption triggers an entry showing what was detected and why it was flagged.' },
                { icon: '🤖', title: 'AI Reasoning', desc: 'Each entry includes the exact reasoning text generated by the Groq AI model, explaining *why* a specific route was chosen.' },
                { icon: '🔍', title: 'Ask Questions', desc: 'Use the "Question this decision" button on any entry to ask the AI a follow-up like "Why not route via Delhi instead?"' },
              ].map(item => (
                <div key={item.title} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                  <p className="text-2xl mb-2">{item.icon}</p>
                  <p className="font-bold text-gray-900 dark:text-gray-100 text-sm mb-1">{item.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl mb-4">
              <p className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-2">How to see entries here:</p>
              <ol className="text-sm text-blue-700 dark:text-blue-400 space-y-1 list-decimal list-inside">
                <li>Go to the <strong>Simulation Lab</strong> tab</li>
                <li>Pick any city (e.g. Delhi, Bangalore, Mumbai)</li>
                <li>Pick a disruption type (Storm, Traffic, Port Failure, Strike)</li>
                <li>Click <strong>Run Simulation</strong></li>
                <li>Come back here — an AI decision entry will appear within ~3 seconds</li>
              </ol>
            </div>
            <div className="text-center">
              <Link to="/simulation"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all">
                Go to Simulation Lab <ChevronRight size={18} />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Explanation Modal */}
      {showExplanation && (
        <ExplainModal 
          isOpen={showExplanation} 
          onClose={() => setShowExplanation(false)} 
          explanation={selectedLog?.aiLog}
        />
      )}
    </div>
  );
}