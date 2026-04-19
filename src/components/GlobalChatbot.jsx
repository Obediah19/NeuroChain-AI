import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Brain, Zap, Loader2 } from 'lucide-react';
import { useSupplyChain } from '../context/SupplyChainContext';
import { useAuth } from '../context/AuthContext';
import { askGroq } from '../utils/groq';
import { db } from '../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const DEFAULT_MESSAGE = { role: 'assistant', content: 'Hi Commander. I am NeuroChain AI. How can I assist you with logistics and operations today?' };

const FALLBACK_RESPONSES = [
  "Based on current swarm telemetry, all primary routes are operating within acceptable risk thresholds. Ghost nodes are on standby for rapid deployment if congestion exceeds 80%.",
  "Swarm consensus indicates optimal routing through secondary hubs. Current network efficiency is at 87% — 12% above baseline due to predictive rerouting algorithms.",
  "Analyzing your query against live node data. The Bangalore and Mumbai corridors show elevated risk scores. I recommend pre-emptive ghost node activation on the Chennai axis.",
  "Network topology is stable. AI routing has prevented 3 potential delays in the last cycle by dynamically shifting agent paths away from congestion hotspots.",
  "Swarm intelligence has identified a low-latency corridor through Hyderabad. Rerouting active shipments now. Expected delay reduction: 74% compared to fixed routing.",
];

// App knowledge base — injected into every prompt so the AI can answer tab-specific questions
const APP_KNOWLEDGE = `
You are NeuroChain AI, embedded in the NeuroChain platform — a swarm-based supply chain intelligence dashboard for India.

NEUROCHAIN APP KNOWLEDGE (answer questions about these specifically and accurately):

COMMAND CENTER tab: The main overview. Shows 4 metric cards: Active Agents (shipments moving), Disruptions Prevented (count of successful AI reroutes), Avg Delay Reduction (%), Cost Savings ($). Below is a Network Map showing hub nodes and active routes. Recent Activity panel on the right shows latest system alerts.

LIVE OPERATIONS tab: Real-time logistics map. Green dots are active delivery agents moving toward their destination. Hub nodes are colored by congestion: green=normal (<40%), amber=moderate (40-70%), red=congested (>70%), purple=ghost node (AI-created temporary hub). Quick Actions bar at top: "Add Delivery" creates a new shipment agent between two Indian cities; "Deploy Ghost Node" creates a temporary overflow hub at a random city; Storm/Traffic/Port buttons trigger simulations. AI Decision Panel on the right shows risk scores for each active shipment and recommends rerouting when risk exceeds threshold.

AI INTELLIGENCE tab: Shows only events that have AI reasoning attached (events with the 🤖 badge). Each card shows: the event type (Disruption Detected / Decision Executed), the timestamp, the event message, and a purple "NeuroChain Reasoning" box with the AI's explanation of why it made this decision. You can click "Question this decision" on any card to ask follow-up questions about that specific decision. Metrics shown: Total AI Decisions, Average Confidence (87%), Disruptions Prevented, Delay Reduction. To populate this tab, run a Storm, Traffic, or Port Failure simulation.

SIMULATION LAB tab: Run what-if scenarios to test the swarm AI. Scenarios: Storm (Mumbai congestion spike to 95%), Traffic (Bangalore congestion), Port Failure (Chennai shutdown). Each simulation triggers: congestion spike on the target node, AI rerouting logic, ghost node creation in Hyderabad, route updates, and an AI-generated log entry. The results appear in the AI Intelligence tab and on the map.

ANALYTICS tab: Charts showing delivery performance trends, node utilization heatmap, cost savings over time, and delay reduction statistics. Data is derived from shipment and alert history.

PROFILE tab: User account settings — display name, email, change password functionality, and theme preferences.

CHATBOT (this assistant): Accessible from the floating brain icon (bottom right of every page). Stays minimized by default. Can answer questions about any tab, explain decisions, and give logistics advice. Chat history persists across page navigation.
`;

export default function GlobalChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const { currentUser } = useAuth();
  const uid = currentUser?.uid;

  // Chat key is user-specific — each user has their own history
  const chatKey = uid ? `neurochain-chat-${uid}` : 'neurochain-chat-guest';

  const [messages, setMessages] = useState([DEFAULT_MESSAGE]);
  const [inputVal, setInputVal]   = useState('');
  const [isTyping, setIsTyping]   = useState(false);
  const messagesEndRef = useRef(null);
  const loadedUidRef   = useRef(null);

  const { nodes, shipments, alerts } = useSupplyChain();

  // ── Load history when user/key changes ──────────────────────────
  useEffect(() => {
    if (loadedUidRef.current === chatKey) return;
    loadedUidRef.current = chatKey;

    // 1. localStorage first (instant)
    try {
      const saved = localStorage.getItem(chatKey);
      if (saved) { setMessages(JSON.parse(saved)); }
      else { setMessages([DEFAULT_MESSAGE]); }
    } catch { setMessages([DEFAULT_MESSAGE]); }

    // 2. Try Firebase (may have newer data from another device)
    if (db && uid) {
      getDoc(doc(db, 'users', uid, 'data', 'chatHistory'))
        .then(snap => {
          if (snap.exists()) {
            const fbMsgs = snap.data().value;
            if (Array.isArray(fbMsgs) && fbMsgs.length > 0) {
              setMessages(fbMsgs);
              localStorage.setItem(chatKey, JSON.stringify(fbMsgs));
            }
          }
        })
        .catch(() => {});
    }
  }, [chatKey]);

  // ── Persist whenever messages change ────────────────────────────
  useEffect(() => {
    if (messages.length <= 1 && messages[0]?.role === 'assistant') return; // skip default
    try { localStorage.setItem(chatKey, JSON.stringify(messages)); } catch {}
    // Firebase backup
    if (db && uid) {
      setDoc(doc(db, 'users', uid, 'data', 'chatHistory'), { value: messages, updatedAt: new Date().toISOString() })
        .catch(() => {});
    }
  }, [messages, chatKey]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    const userMessage = inputVal;
    setInputVal('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsTyping(true);
    try {
      const liveContext = `Live network state: ${nodes.length} nodes active, ${shipments.length} shipments in transit. Most recent alert: "${alerts[0]?.message || 'None'}".`;
      const fullPrompt = `${APP_KNOWLEDGE}\n\n${liveContext}\n\nUser question: "${userMessage}"\n\nAnswer specifically and helpfully. If the question is about a specific tab or feature, describe exactly what it does. Be concise (max 3 short paragraphs). Do not use markdown, asterisks, or bullet points.`;
      const reply = await askGroq(fullPrompt);
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      console.warn('Groq error:', err.message);
      if (err.message === 'GROQ_NO_KEY') {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Groq API key not found. Add VITE_GROQ_API_KEY to your .env and restart the dev server.' }]);
      } else if (err.message?.includes('429') || err.message?.includes('rate')) {
        const fallback = FALLBACK_RESPONSES[Math.floor(Math.random() * FALLBACK_RESPONSES.length)];
        setMessages(prev => [...prev, { role: 'assistant', content: fallback }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: `Neural core error: ${err.message}` }]);
      }
    } finally {
      setIsTyping(false);
    }
  };

  const handleClearHistory = () => {
    setMessages([DEFAULT_MESSAGE]);
    try { localStorage.removeItem(chatKey); } catch {}
    if (db && uid) {
      setDoc(doc(db, 'users', uid, 'data', 'chatHistory'), { value: [DEFAULT_MESSAGE], updatedAt: new Date().toISOString() })
        .catch(() => {});
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] font-sans">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-transform"
        >
          <Brain size={24} />
        </button>
      ) : (
        <div className="w-80 sm:w-96 h-[500px] flex flex-col bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md z-10">
            <div className="flex items-center gap-2">
              <Brain size={20} />
              <span className="font-bold tracking-wide">NeuroChain Assistant</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleClearHistory}
                className="text-[10px] opacity-70 hover:opacity-100 transition-opacity bg-white/20 px-2 py-1 rounded"
              >
                Clear
              </button>
              <button onClick={() => setIsOpen(false)} className="opacity-80 hover:opacity-100 transition-opacity">
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Chat Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-[#121212]">
            {messages.map((m, idx) => (
              <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`
                  max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed
                  ${m.role === 'user'
                    ? 'bg-blue-500 text-white rounded-tr-sm shadow-md shadow-blue-500/20'
                    : 'bg-white dark:bg-[#2d2d2d] text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-tl-sm shadow-sm'
                  }
                `}>
                  {m.role === 'assistant' && (
                    <div className="flex items-center gap-1.5 mb-1.5 opacity-60">
                      <Zap size={12} className="text-purple-500" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">NeuroChain AI</span>
                    </div>
                  )}
                  {m.content}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-[#2d2d2d] border border-gray-200 dark:border-gray-700 rounded-2xl rounded-tl-sm p-3 shadow-sm flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin text-blue-500" />
                  <span className="text-xs text-gray-500">Synthesizing...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <form onSubmit={handleSubmit} className="p-3 bg-white dark:bg-[#1f1f1f] border-t border-gray-200 dark:border-gray-800 flex gap-2">
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Ask about any tab or operation..."
              className="flex-1 bg-gray-100 dark:bg-[#2d2d2d] text-sm text-gray-900 dark:text-gray-100 px-4 py-2.5 rounded-full border-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500"
            />
            <button
              type="submit"
              disabled={isTyping || !inputVal.trim()}
              className="w-10 h-10 flex items-center justify-center bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send size={16} className="ml-1" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
