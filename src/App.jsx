import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  Search, 
  Database, 
  AlertTriangle, 
  FileWarning, 
  BookOpen, 
  Send,
  UserX,
  Activity,
  Sparkles,
  Loader2,
  Wand2,
  Wifi,
  DatabaseZap,
  Share2,
  Flame,
  Copy,
  CheckCircle2
} from 'lucide-react';

// --- FIREBASE CLOUD ARCHITECTURE ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, query, onSnapshot, addDoc, serverTimestamp, writeBatch, doc } from 'firebase/firestore';

// ⚠️ STEP 4: PASTE YOUR FIREBASE CONFIG OBJECT HERE ⚠️
const firebaseConfig = {
  // apiKey: "AIzaSyDOCAbC123dEf456GhI789jKl01-MnO",
  // authDomain: "scam-stopper-os.firebaseapp.com",
  // projectId: "scam-stopper-os",
  // storageBucket: "scam-stopper-os.appspot.com",
  // messagingSenderId: "1234567890",
  // appId: "1:1234567890:web:abcdef123456"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'scam-stopper-os'; // Global app identifier

// --- GEMINI API HELPER (Wired for Vite .env) ---
const callGeminiAPI = async (prompt, systemInstruction = "You are a helpful assistant.", isJson = false) => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
  
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    systemInstruction: { parts: [{ text: systemInstruction }] },
  };

  if (isJson) {
    payload.generationConfig = { responseMimeType: "application/json" };
  }

  let retries = 5;
  let delay = 1000;
  while (retries > 0) {
    try {
      const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      const result = await response.json();
      return result.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } catch (err) {
      retries--;
      if (retries === 0) throw err;
      await new Promise(res => setTimeout(res, delay));
      delay *= 2;
    }
  }
};

// --- CORE INTEL (For Seeding the Live DB) ---
const INITIAL_THREAT_ACTORS = [
  { alias: "David Terry (aka Anna Bella Lynn)", platform: "Fire Kirin", cashtag: "$Unknown", tactic: "Withholding payouts; communication blackout", status: "Burned" },
  { alias: "Rebecca Jean", platform: "Fire Kirin", cashtag: "$Unknown", tactic: "Strong-arming; upfront fee extortion", status: "Active" },
  { alias: "Cash Bandit Gameroom", platform: "Fire Kirin", cashtag: "$Unknown", tactic: "Refusing legitimate wins", status: "Active" },
  { alias: "Vagabond Whisperers (Justin Sweeney)", platform: "Multiple", cashtag: "$Unknown", tactic: "Referral grooming; sunk cost manipulation", status: "Active" },
  { alias: "Pappuqr (Telegram)", platform: "Juwa, GameVault", cashtag: "Crypto/Various", tactic: "Agent recruitment; mass scaling", status: "Active" },
  { alias: "Winnerrush Casino", platform: "General Social Casino", cashtag: "BTC Wallet", tactic: "Crypto verification fee extortion", status: "Active" },
  { alias: "Asore Corp / Zion / jeajamhacker", platform: "Recovery Scam", cashtag: "Various", tactic: "Secondary refund fraud; fake hacker fees", status: "Active" }
];

export default function ScamStopperApp() {
  const [activeTab, setActiveTab] = useState('verify');
  const [user, setUser] = useState(null);
  const [threatDatabase, setThreatDatabase] = useState([]);
  const [isDbConnected, setIsDbConnected] = useState(false);
  const [burnNoticeData, setBurnNoticeData] = useState(null);

  useEffect(() => {
    // Standard Anonymous Auth for real-world deployment
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (err) {
        console.error("Auth failed:", err);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const scammersRef = collection(db, 'artifacts', appId, 'public', 'data', 'scammers');
    const q = query(scammersRef);
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      docs.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setThreatDatabase(docs);
      setIsDbConnected(true);
    }, (error) => {
      console.error("Sync error:", error);
      setIsDbConnected(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleLogThreat = async (newRecord) => {
    if (!user) return;
    const scammersRef = collection(db, 'artifacts', appId, 'public', 'data', 'scammers');
    await addDoc(scammersRef, {
      ...newRecord,
      createdAt: serverTimestamp(),
      submitterId: user.uid
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 font-sans selection:bg-red-900 selection:text-white">
      {/* HEADER WITH VIRAL WAR TICKER */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-col">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-8 h-8 text-red-500" />
              <div>
                <h1 className="text-xl font-bold text-white tracking-wider flex items-center gap-2">
                  SCAM<span className="text-red-500">STOPPER</span> OS
                </h1>
                <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold flex items-center gap-1">
                  <Wifi size={10} className={isDbConnected ? "text-emerald-500 animate-pulse" : "text-red-500"} />
                  {isDbConnected ? "Global Grid Connected" : "Initializing Link..."}
                </p>
              </div>
            </div>
            {isDbConnected && threatDatabase.length > 0 && (
              <div className="mt-2 text-[10px] font-mono text-emerald-400/80 uppercase tracking-widest flex items-center gap-2 animate-in fade-in">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Tracking {threatDatabase.length} Syndicate Nodes Worldwide
              </div>
            )}
          </div>
          
          <nav className="flex flex-wrap justify-center gap-2">
            <NavButton active={activeTab === 'verify'} onClick={() => setActiveTab('verify')} icon={<Search size={16}/>} text="KYC Verifier" />
            <NavButton active={activeTab === 'database'} onClick={() => setActiveTab('database')} icon={<Database size={16}/>} text="Threat DB" />
            <NavButton active={activeTab === 'report'} onClick={() => setActiveTab('report')} icon={<FileWarning size={16}/>} text="Log Threat" />
            <NavButton active={activeTab === 'hub'} onClick={() => setActiveTab('hub')} icon={<BookOpen size={16}/>} text="Security Hub" />
          </nav>
        </div>
      </header>

      {burnNoticeData && (
        <BurnNoticeModal data={burnNoticeData} onClose={() => setBurnNoticeData(null)} />
      )}

      <main className="max-w-6xl mx-auto px-4 py-8">
        {!user ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" />
            <p>Establishing encrypted connection to threat network...</p>
          </div>
        ) : (
          <>
            {activeTab === 'verify' && <AgentVerifier database={threatDatabase} onShare={setBurnNoticeData} />}
            {activeTab === 'database' && <ThreatDatabase data={threatDatabase} user={user} onShare={setBurnNoticeData} />}
            {activeTab === 'report' && <ReportForm onSubmit={handleLogThreat} />}
            {activeTab === 'hub' && <SecurityHub />}
          </>
        )}
      </main>
    </div>
  );
}

// ==========================================
// VIRAL ENGINE: THE BURN NOTICE (Shareable Artifact)
// ==========================================
function BurnNoticeModal({ data, onClose }) {
  const [copied, setCopied] = useState(false);

  // ⚠️ UPDATE THIS LINE WITH YOUR REAL URL LATER ⚠️
  const deployUrl = "[YOUR_VERCEL_URL_HERE]"; 

  const viralText = `🚨 SCAMMER ALERT / BURN NOTICE 🚨

DO NOT SEND MONEY TO:
❌ Name/Alias: ${data.alias}
❌ CashApp/Crypto: ${data.cashtag}
❌ Platform: ${data.platform}

⚠️ KNOWN TACTIC: ${data.tactic}

This agent has been logged in the global Scam Stopper OS database. If they ask you for a "verification fee" or refuse to pay out your winnings, DO NOT PAY THEM. 

Search this agent's history and verify who you are dealing with before you send cash:
👉 Search the Global Threat DB here: ${deployUrl}

#ScamAlert #FireKirin #OrionStars #Juwa #ScamStopperOS`;

  const handleCopy = () => {
    navigator.clipboard.writeText(viralText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-red-900 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col relative">
        <div className="bg-red-950/50 border-b border-red-900/50 p-4 flex justify-between items-center">
          <h3 className="text-red-500 font-bold flex items-center gap-2">
            <Flame size={20} /> Generate Burn Notice
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-300">
            Weaponize this intelligence. Copy the text below and post it in Facebook Casino Groups, Reddit, or send it directly to people engaging with this scammer.
          </p>
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono text-xs text-slate-300 whitespace-pre-wrap relative h-64 overflow-y-auto">
            {viralText}
          </div>
          <button 
            onClick={handleCopy}
            className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${
              copied ? 'bg-emerald-600 text-white' : 'bg-red-600 hover:bg-red-500 text-white'
            }`}
          >
            {copied ? <CheckCircle2 size={18} /> : <Copy size={18} />}
            {copied ? 'Copied to Clipboard! Now paste it on Facebook.' : 'Copy Warning for Social Media'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// TAB 1: AGENT VERIFIER (AML / KYC)
// ==========================================
function AgentVerifier({ database, onShare }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [result, setResult] = useState(null);

  const handleVerify = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const query = searchQuery.toLowerCase();
    const foundMatch = database.find(
      actor => actor.alias.toLowerCase().includes(query) || actor.cashtag.toLowerCase().includes(query)
    );
    if (foundMatch) {
      setResult({ status: 'DANGER', data: foundMatch });
    } else {
      setResult({ status: 'WARNING', query: searchQuery });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 md:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Activity size={120} />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2 relative z-10">
          <Activity className="text-blue-500" />
          Agent KYC / AML Verification Engine
        </h2>
        <p className="text-slate-400 mb-6 max-w-3xl relative z-10">
          Enter a Facebook Messenger alias, Page name, or <span className="text-emerald-400 font-mono">$Cashtag</span> to run against the live global threat intelligence database. 
        </p>
        <form onSubmit={handleVerify} className="flex flex-col sm:flex-row gap-3 relative z-10">
          <input 
            type="text" 
            placeholder="e.g., $CashBandit, David Terry, FB Profile Link..." 
            className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors shadow-inner"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 whitespace-nowrap shadow-lg">
            <Search size={18} />
            Run Diagnostics
          </button>
        </form>
      </div>

      {result && result.status === 'DANGER' && (
        <div className="bg-red-950/30 border border-red-900 rounded-xl p-6 shadow-2xl backdrop-blur-sm animate-in slide-in-from-bottom-4 relative">
          <div className="flex items-start gap-4 flex-col md:flex-row">
            <div className="p-3 bg-red-900/50 text-red-500 rounded-full shrink-0">
              <UserX size={32} />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-red-400 mb-1">CRITICAL MATCH FOUND IN LIVE GRID</h3>
              <p className="text-slate-300 mb-4">The entity you queried matches a known threat actor in our incident database.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950 rounded-lg p-4 border border-red-900/30">
                <div><span className="block text-xs text-slate-500 uppercase tracking-wider">Known Alias</span><span className="font-semibold text-white">{result.data.alias}</span></div>
                <div><span className="block text-xs text-slate-500 uppercase tracking-wider">Platform Affiliation</span><span className="font-semibold text-white">{result.data.platform}</span></div>
                <div className="md:col-span-2"><span className="block text-xs text-slate-500 uppercase tracking-wider">Documented Extortion Tactics</span><span className="font-semibold text-red-300">{result.data.tactic}</span></div>
              </div>
            </div>
            <div className="w-full md:w-auto mt-4 md:mt-0 flex justify-end shrink-0">
              <button 
                onClick={() => onShare(result.data)}
                className="w-full md:w-auto bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded shadow-lg shadow-red-900/50 transition-all flex items-center justify-center gap-2 animate-pulse"
              >
                <Flame size={18} /> Generate Burn Notice
              </button>
            </div>
          </div>
        </div>
      )}

      {result && result.status === 'WARNING' && (
        <div className="bg-amber-950/20 border border-amber-900/50 rounded-xl p-6 shadow-2xl backdrop-blur-sm animate-in slide-in-from-bottom-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-900/30 text-amber-500 rounded-full shrink-0">
              <AlertTriangle size={32} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-amber-500 mb-1">NO EXACT MATCH — EXTREME CAUTION ADVISED</h3>
              <p className="text-slate-300 mb-4">
                "<span className="font-bold text-white">{result.query}</span>" is not currently in our global database. However, this does <strong>NOT</strong> mean they are safe. Threat actors rapidly rotate Cashtags and FB profiles.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// TAB 2: THREAT DATABASE
// ==========================================
function ThreatDatabase({ data, user, onShare }) {
  const [filter, setFilter] = useState('');
  const [isSeeding, setIsSeeding] = useState(false);

  const filteredData = useMemo(() => {
    return data.filter(actor => 
      actor.alias.toLowerCase().includes(filter.toLowerCase()) || 
      actor.platform.toLowerCase().includes(filter.toLowerCase()) ||
      actor.tactic.toLowerCase().includes(filter.toLowerCase())
    );
  }, [data, filter]);

  const handleSeedDatabase = async () => {
    if (!user) return;
    setIsSeeding(true);
    try {
      const batch = writeBatch(db);
      const scammersRef = collection(db, 'artifacts', appId, 'public', 'data', 'scammers');
      INITIAL_THREAT_ACTORS.forEach((actor) => {
        const newDocRef = doc(scammersRef);
        batch.set(newDocRef, { ...actor, createdAt: serverTimestamp(), submitterId: 'SYSTEM_GENESIS' });
      });
      await batch.commit();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Aggregated Threat Intelligence</h2>
          <p className="text-slate-400 text-sm">Tracking live syndicate nodes and recovery scammers on the global grid.</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input 
            type="text" placeholder="Filter live database..."
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            value={filter} onChange={(e) => setFilter(e.target.value)}
          />
        </div>
      </div>

      {data.length === 0 && !filter && (
        <div className="bg-indigo-950/30 border border-indigo-900/50 rounded-xl p-8 text-center mb-4">
          <DatabaseZap className="w-12 h-12 text-indigo-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">The Global Grid is Empty</h3>
          <p className="text-slate-400 text-sm mb-6 max-w-lg mx-auto">
            You are the first agent to connect. Inject the initial core threat intelligence gathered from our research to kickstart the network.
          </p>
          <button 
            onClick={handleSeedDatabase} disabled={isSeeding}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-6 rounded-lg transition-colors flex items-center gap-2 mx-auto disabled:opacity-50"
          >
            {isSeeding ? <Loader2 size={16} className="animate-spin" /> : <DatabaseZap size={16} />}
            {isSeeding ? "Injecting Payload..." : "Inject Core Intel"}
          </button>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/50 border-b border-slate-800 text-xs uppercase tracking-wider text-slate-500">
                <th className="p-4 font-semibold">Entity / Alias</th>
                <th className="p-4 font-semibold">Platform Vector</th>
                <th className="p-4 font-semibold hidden md:table-cell">Financial Node</th>
                <th className="p-4 font-semibold hidden sm:table-cell">Primary Tactic</th>
                <th className="p-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-sm">
              {filteredData.map((row) => (
                <tr key={row.id} className="hover:bg-slate-800/50 transition-colors group">
                  <td className="p-4 font-medium text-slate-200">{row.alias}</td>
                  <td className="p-4 text-slate-400">{row.platform}</td>
                  <td className="p-4 font-mono text-emerald-400/80 hidden md:table-cell">{row.cashtag}</td>
                  <td className="p-4 text-slate-400 hidden sm:table-cell">{row.tactic}</td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => onShare(row)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-red-600/20 text-slate-300 hover:text-red-400 hover:border-red-500/30 border border-transparent rounded text-xs font-semibold transition-all"
                      title="Generate Burn Notice"
                    >
                      <Share2 size={14} /> <span className="hidden lg:inline">Expose</span>
                    </button>
                  </td>
                </tr>
              ))}
              {filteredData.length === 0 && data.length > 0 && (
                <tr><td colSpan="5" className="p-8 text-center text-slate-500">No threat nodes match your search criteria.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// TAB 3: REPORT A SCAMMER 
// ==========================================
function ReportForm({ onSubmit }) {
  const [formData, setFormData] = useState({ alias: '', platform: '', cashtag: '', tactic: '', details: '' });
  const [submitted, setSubmitted] = useState(false);
  const [rawLogs, setRawLogs] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [extractError, setExtractError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newRecord = {
      alias: formData.alias,
      platform: formData.platform || "Unknown",
      cashtag: formData.cashtag || "Unknown",
      tactic: formData.tactic,
      details: formData.details,
      status: "Active (Unverified)"
    };
    await onSubmit(newRecord);
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setFormData({ alias: '', platform: '', cashtag: '', tactic: '', details: '' });
      setRawLogs('');
    }, 3000);
  };

  const handleAnalyzeLogs = async () => {
    if (!rawLogs.trim()) return;
    setIsAnalyzing(true);
    setExtractError(null);
    try {
      const systemInstruction = `Extract intelligence from the user's raw input. Map it to this JSON schema:
      {"alias": "Scammer's name", "cashtag": "Payment handle", "platform": "App used", "tactic": "Withdrawal Denial / Blackout, Tip Extortion, Verification Deposit, Recovery Fraud", "details": "Concise summary"}`;
      
      const responseText = await callGeminiAPI(`Raw input: ${rawLogs}`, systemInstruction, true);
      const extracted = JSON.parse(responseText);
      setFormData({
        alias: extracted.alias || '',
        platform: extracted.platform || 'Other / Multiple',
        cashtag: extracted.cashtag || '',
        tactic: extracted.tactic || '',
        details: extracted.details || ''
      });
    } catch (error) {
      setExtractError("Analysis failed. Please fill manually.");
    } finally { setIsAnalyzing(false); }
  };

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 md:p-8 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg"><Send size={24} /></div>
          <div>
            <h2 className="text-2xl font-bold text-white">Upload Threat Data to Global Grid</h2>
            <p className="text-slate-400 text-sm">Contribute to the live intelligence database. Submissions are instantly synced worldwide.</p>
          </div>
        </div>

        {submitted ? (
          <div className="bg-emerald-950/30 border border-emerald-900/50 rounded-lg p-6 text-center">
            <ShieldCheck className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-emerald-400">Intelligence Uploaded</h3>
            <p className="text-slate-400 text-sm">The node has been broadcast to the global grid.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-blue-950/10 border border-blue-900/30 rounded-xl p-5 mb-2">
              <label className="block text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Sparkles size={14} /> AI Threat Extractor
              </label>
              <textarea 
                rows="3" value={rawLogs} onChange={e => setRawLogs(e.target.value)} 
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 resize-none mb-3 text-sm" 
                placeholder="Paste raw chat logs or rant here. Our AI will extract the data..."
              />
              <button 
                type="button" onClick={handleAnalyzeLogs} disabled={isAnalyzing || !rawLogs.trim()}
                className="w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-blue-400 border border-blue-900/50 font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
              >
                {isAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {isAnalyzing ? "Processing unstructured data..." : "✨ Auto-Extract Intel"}
              </button>
              {extractError && <p className="text-red-400 text-xs mt-2">{extractError}</p>}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Agent/Profile Alias *</label>
                  <input required type="text" value={formData.alias} onChange={e=>setFormData({...formData, alias: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Payment Handle (Cashtag)</label>
                  <input type="text" value={formData.cashtag} onChange={e=>setFormData({...formData, cashtag: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white font-mono focus:outline-none focus:border-blue-500" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Software Platform</label>
                  <select value={formData.platform} onChange={e=>setFormData({...formData, platform: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 appearance-none">
                    <option value="">Select Platform...</option>
                    <option value="Fire Kirin">Fire Kirin</option>
                    <option value="Orion Stars">Orion Stars</option>
                    <option value="Juwa">Juwa</option>
                    <option value="Milky Way">Milky Way</option>
                    <option value="Vblink">Vblink</option>
                    <option value="Other / Multiple">Other / Multiple</option>
                    <option value="Recovery Scam">Secondary Recovery Scam</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Extortion Tactic *</label>
                  <select required value={formData.tactic} onChange={e=>setFormData({...formData, tactic: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 appearance-none">
                    <option value="">Select Tactic...</option>
                    <option value="Withdrawal Denial / Blackout">Blocked after winning / Blackout</option>
                    <option value="Tip Extortion">Demanded tip to process withdrawal</option>
                    <option value="Verification Deposit">Demanded deposit to 'verify' account</option>
                    <option value="Recovery Fraud">Offered to 'hack' money back for a fee</option>
                  </select>
                </div>
              </div>
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition-colors mt-4 flex justify-center items-center gap-2">
                <Wifi size={18} /> Broadcast to Global Database
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// TAB 4: SECURITY HUB
// ==========================================
function SecurityHub() {
  const [draftContext, setDraftContext] = useState('');
  const [ftcDraft, setFtcDraft] = useState('');
  const [isDrafting, setIsDrafting] = useState(false);

  const handleDraftComplaint = async () => {
    if (!draftContext.trim()) return;
    setIsDrafting(true);
    try {
      const systemInstruction = `You are a consumer protection advocate. Generate a formal, professional complaint draft suitable for submission to the FTC or FBI IC3. Keep it highly structured.`;
      const responseText = await callGeminiAPI(`Incident context: ${draftContext}`, systemInstruction);
      setFtcDraft(responseText);
    } catch (error) {
      console.error(error);
      setFtcDraft("Failed to connect to AI engine. Please ensure your API key is correct.");
    } finally { setIsDrafting(false); }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2"><AlertTriangle className="text-amber-500"/> Cash App Exploitation</h3>
          <p className="text-slate-400 text-sm mb-4">Platforms like Cash App lack buyer protection. Sending money to an agent's `$Cashtag` is legally identical to handing physical cash to a stranger.</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2"><ShieldAlert className="text-blue-500"/> RTP Manipulation</h3>
          <p className="text-slate-400 text-sm mb-4">Agents manipulate Return to Player (RTP) probability on a per-user basis. They create fake "hot streaks" to hook you, then crash the software.</p>
        </div>
      </div>

      <div className="bg-gradient-to-r from-slate-900 to-indigo-950/30 border border-indigo-900/50 rounded-xl p-6 shadow-lg">
        <h3 className="text-xl font-bold text-indigo-400 mb-2 flex items-center gap-2"><Sparkles size={20}/> AI Legal Complaint Drafter</h3>
        <div className="space-y-4">
          <textarea 
            rows="3" value={draftContext} onChange={(e) => setDraftContext(e.target.value)}
            className="w-full bg-slate-950 border border-indigo-900/30 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500 resize-none text-sm" 
            placeholder="Briefly describe the incident..."
          />
          <button 
            onClick={handleDraftComplaint} disabled={isDrafting || !draftContext.trim()}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-2.5 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
          >
            {isDrafting ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
            {isDrafting ? "Drafting Document..." : "✨ Draft Official Complaint"}
          </button>
          {ftcDraft && (
            <div className="mt-4 bg-slate-950 rounded-lg border border-slate-800 p-4 relative">
              <textarea readOnly value={ftcDraft} className="w-full h-64 bg-transparent text-slate-300 text-sm focus:outline-none resize-none" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NavButton({ active, onClick, icon, text }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 ${
        active 
          ? 'bg-blue-600/10 text-blue-400 border border-blue-500/30 shadow-inner' 
          : 'bg-transparent text-slate-400 hover:text-white hover:bg-slate-800/50 border border-transparent'
      }`}
    >
      {icon}
      {text}
    </button>
  );
}