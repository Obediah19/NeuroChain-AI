import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogIn, Mail, Layers, Network } from 'lucide-react';

export default function LandingPage() {
  const { loginWithGoogle, loginWithEmail, signupWithEmail } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (isRegistering) {
        await signupWithEmail(email, password);
        alert("Registration Successful! Securing connection...");
      } else {
        await loginWithEmail(email, password);
        alert("Login Successful! Initializing Swarm Network...");
      }
    } catch (err) {
      alert(`Access Denied: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setIsLoading(true);
    try {
      await loginWithGoogle();
      alert("Google Identity Confirmed! Initializing...");
    } catch (err) {
       alert(`Google verification failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center w-full px-4 animate-fade-in">
      
      {/* Dynamic Headline Block */}
      <div className="mb-10 text-center max-w-2xl">
        <div className="inline-flex items-center justify-center w-20 h-20 mb-6 rounded-3xl bg-white dark:bg-[#3b3b3b] shadow-2xl shadow-blue-500/20 border border-gray-100 dark:border-[#4b4b4d]">
           <Network size={36} className="text-blue-500" />
        </div>
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-4 text-gray-900 dark:text-white">
          Self-Healing <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-teal-400">Logistics</span>
        </h1>
        <p className="text-lg md:text-xl text-gray-500 dark:text-gray-400 font-medium">
          NeuroChain AI is a swarm-inspired supply chain engine. Dispatch intelligent agents that can predict weather risks, orchestrate dynamic ghost-nodes, and bypass global congestion securely in real-time.
        </p>
      </div>

      {/* Modern Authentication Block */}
      <div className="premium-card p-10 w-full max-w-md flex flex-col gap-6 relative">
        {isLoading && (
           <div className="absolute inset-0 bg-white/50 dark:bg-black/50 backdrop-blur-[2px] rounded-3xl z-10 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
           </div>
        )}

        <div className="text-center">
           <h2 className="text-2xl font-extrabold tracking-tight mb-1 text-gray-900 dark:text-white">Commander Portal</h2>
           <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Verify your identity to deploy agents.</p>
        </div>

        <form onSubmit={handleAuth} className="flex flex-col gap-4">
          <input 
            type="email" placeholder="Email Address" required
            className="premium-input w-full p-4 text-sm focus:outline-none"
            value={email} onChange={e => setEmail(e.target.value)}
          />
          <input 
            type="password" placeholder="Password Phase" required
            className="premium-input w-full p-4 text-sm focus:outline-none"
            value={password} onChange={e => setPassword(e.target.value)}
          />
          <button type="submit" disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-4 rounded-2xl shadow-[0_8px_16px_rgb(37_99_235_/_0.2)] hover:shadow-[0_12px_20px_rgb(37_99_235_/_0.3)] transition-all transform hover:-translate-y-0.5 active:translate-y-0 active:shadow-none flex justify-center items-center gap-2 mt-2 tracking-wide disabled:opacity-50 disabled:hover:translate-y-0">
             {isRegistering ? 'Register Credentials' : 'Login Securely'} <LogIn size={18} className="stroke-[2.5]" />
          </button>
        </form>

        <div className="flex items-center gap-4 text-center text-sm font-medium text-gray-400">
           <div className="flex-1 h-px bg-gray-200 dark:bg-[#4b4b4d]"></div>
           Standard Access
           <div className="flex-1 h-px bg-gray-200 dark:bg-[#4b4b4d]"></div>
        </div>

        <button onClick={handleGoogleAuth} disabled={isLoading} className="w-full bg-white dark:bg-[#38383a] text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-transparent hover:bg-gray-50 dark:hover:bg-[#404042] font-semibold py-4 rounded-2xl transition-all shadow-sm flex justify-center items-center gap-3 disabled:opacity-50">
           <Mail size={18} className="stroke-[2.5]" /> Link Google Identity
        </button>
        
        <button onClick={() => setIsRegistering(!isRegistering)} className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 text-center mt-2 transition-colors">
          {isRegistering ? "Existing Commander? Login here." : "New to Swarm Logistics? Register now."}
        </button>
      </div>

    </div>
  );
}
