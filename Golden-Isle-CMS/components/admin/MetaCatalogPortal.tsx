'use client';

import { useState, useEffect } from 'react';
import { 
  Share2, Copy, Check, RefreshCw, Smartphone, Code, Info, 
  CheckCircle2, AlertTriangle, Play, Save, ChevronRight, Eye 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { Product } from '@/types';

interface EnvConfig {
  metaCatalogId: string;
  whatsappCatalogId: string;
  isWhatsAppTokenConfigured: boolean;
}

export default function MetaCatalogPortal() {
  const [config, setConfig] = useState<EnvConfig>({
    metaCatalogId: '',
    whatsappCatalogId: '',
    isWhatsAppTokenConfigured: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  
  // Terminal logs state
  const [logs, setLogs] = useState<string[]>([]);
  const [isSimulated, setIsSimulated] = useState(false);

  // Products preview
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // WhatsApp mockup state
  const [waMessages, setWaMessages] = useState<Array<{ sender: 'user' | 'bot'; text: string; hasCatalog?: boolean; catalogProduct?: Product }>>([
    { sender: 'bot', text: 'Selamat datang ke Golden Isle Wholesale! Ada apa-apa yang saya boleh bantu bosku? 🍻' }
  ]);
  const [waInput, setWaInput] = useState('');

  const [appUrl, setAppUrl] = useState('https://goldenisle-wholesale.vercel.app');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setAppUrl(window.location.origin);
    }

    const fetchData = async () => {
      try {
        // Load config
        const res = await fetch('/api/catalog/config');
        if (res.ok) {
          const data = await res.json();
          setConfig(data);
        }

        // Load some products for schema mapping and simulator
        const { data: dbProducts } = await supabase
          .from('products')
          .select('*')
          .order('name');
        
        if (dbProducts && dbProducts.length > 0) {
          const formattedProducts = dbProducts.map(p => ({
            ...p,
            images: p.image_url ? [p.image_url] : []
          }));
          setProducts(formattedProducts);
          setSelectedProduct(formattedProducts[0]);
        }
      } catch (err) {
        console.error('Error fetching catalog assets:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/catalog/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metaCatalogId: config.metaCatalogId,
          whatsappCatalogId: config.whatsappCatalogId,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Meta Catalog configurations updated successfully!');
      } else {
        toast.error(data.error || 'Failed to save configuration.');
      }
    } catch (err) {
      console.error(err);
      toast.error('An error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    toast.success('Link copied to clipboard!');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `[${timestamp}] ${message}`]);
  };

  const runSync = async (simulateOnly = false) => {
    setSyncing(true);
    setLogs([]);
    setIsSimulated(simulateOnly);

    if (simulateOnly) {
      addLog('📡 Initiating PITCH SIMULATION mode...');
      await new Promise(r => setTimeout(r, 800));
      addLog('📦 Loading catalog products from Supabase...');
      await new Promise(r => setTimeout(r, 600));
      addLog(`✅ Successfully loaded ${products.length || 8} products.`);
      await new Promise(r => setTimeout(r, 800));
      addLog('🔄 Mapping products to Meta Commerce XML/JSON specifications...');
      products.slice(0, 3).forEach(p => {
        addLog(`   👉 Mapped: ID: ${p.id.slice(0, 8)}... | Name: "${p.name}" | Price: RM ${p.price}`);
      });
      if (products.length > 3) {
        addLog(`   ... and ${products.length - 3} other items mapped.`);
      }
      await new Promise(r => setTimeout(r, 1000));
      addLog('🚀 Pushing batch payload to Graph API: https://graph.facebook.com/v20.0/[CATALOG_ID]/batch');
      await new Promise(r => setTimeout(r, 1200));
      addLog('🟢 Response Status: 200 OK');
      addLog('📄 Meta API Response: ' + JSON.stringify({
        handles: ['meta_batch_handle_9921374'],
        success: true,
        items_processed: products.length || 8,
        errors: []
      }, null, 2));
      addLog('🎉 Simulation successfully completed! All catalog items synced.');
      setSyncing(false);
      toast.success('Simulated catalog sync finished successfully!');
      return;
    }

    addLog('📡 Starting connection to Meta Graph API...');
    await new Promise(r => setTimeout(r, 500));
    
    try {
      const res = await fetch('/api/catalog/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync_all' }),
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        addLog('📦 Fetching products from local database...');
        addLog('🚀 Sending catalog payload to Meta batch endpoint...');
        addLog(`🟢 Response Status: ${res.status}`);
        addLog('📄 Response Body:\n' + JSON.stringify(data, null, 2));
        addLog('✅ Meta Commerce Catalog successfully synchronized!');
        toast.success('Meta Catalog synced successfully!');
      } else {
        addLog(`❌ Sync failed: ${data.error || 'Unknown error'}`);
        addLog(`🔴 Response Status: ${res.status}`);
        if (data.error === 'WHATSAPP_TOKEN not configured' || data.error === 'META_CATALOG_ID not configured') {
          addLog('💡 TIP: Configure your IDs above or check .env.local configuration. Run a "Pitch Simulation" to demo without API keys.');
        }
        toast.error(data.error || 'Failed to sync Meta Catalog.');
      }
    } catch (err: any) {
      console.error(err);
      addLog(`❌ Network error: ${err.message || 'Connection timeout'}`);
      toast.error('Connection error occurred.');
    } finally {
      setSyncing(false);
    }
  };

  const handleSendMessage = (text: string) => {
    if (!text.trim()) return;
    
    const userMsg = text.trim();
    const newMsgs = [...waMessages, { sender: 'user' as const, text: userMsg }];
    setWaMessages(newMsgs);
    setWaInput('');

    const lower = userMsg.toLowerCase();
    
    setTimeout(() => {
      if (lower.includes('catalog') || lower.includes('katalog') || lower.includes('lihat') || lower.includes('beli') || lower.includes('produk')) {
        setWaMessages(prev => [
          ...prev,
          { 
            sender: 'bot', 
            text: 'Ini senarai katalog produk borong terpilih kami. Boleh lihat terus di bawah dan tambah ke bakul! 🛒👇', 
            hasCatalog: true 
          }
        ]);
      } else if (lower.includes('harga') || lower.includes('berapa')) {
        const matchingProduct = products.find(p => lower.includes(p.name.toLowerCase())) || products[0];
        setWaMessages(prev => [
          ...prev,
          { 
            sender: 'bot', 
            text: `Harga borong untuk ${matchingProduct?.name || 'produk kami'} adalah RM ${matchingProduct?.price || 'terbaik'}. Nak saya hantar butang katalog?`,
            catalogProduct: matchingProduct
          }
        ]);
      } else {
        setWaMessages(prev => [
          ...prev,
          { 
            sender: 'bot', 
            text: 'Baik bosku, taip "katalog" untuk melihat senarai penuh barangan minuman keras borong kami secara terus dari Meta Catalog.' 
          }
        ]);
      }
    }, 800);
  };

  const xmlFeedUrl = `${appUrl}/api/catalog/feed`;
  const csvFeedUrl = `${appUrl}/api/catalog-feed`;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px]">
        <RefreshCw className="animate-spin text-blue-600 mb-2" size={40} />
        <p className="text-slate-600 dark:text-gray-400">Loading catalog portal details...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 transition-colors duration-300">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded-2xl text-white shadow-lg">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Share2 size={28} />
            Meta Commerce & WhatsApp Catalog
          </h1>
          <p className="text-blue-100 mt-1 text-sm md:text-base">
            Synchronize your Supabase product database directly with Facebook Shops, Instagram Shopping, and WhatsApp Commerce Catalog.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => runSync(false)}
            disabled={syncing}
            className="flex items-center gap-2 bg-white text-blue-600 px-4 py-2 rounded-xl font-semibold hover:bg-blue-50 transition disabled:opacity-50"
          >
            <RefreshCw size={18} className={syncing && !isSimulated ? 'animate-spin' : ''} />
            Sync Catalog
          </button>
          <button
            onClick={() => runSync(true)}
            disabled={syncing}
            className="flex items-center gap-2 bg-blue-700 text-white px-4 py-2 rounded-xl font-semibold hover:bg-blue-800 transition disabled:opacity-50 border border-blue-500"
          >
            <Play size={18} />
            Pitch Sim
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: SETUP & INTEGRATION LINKS */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* CONFIGURATION CARD */}
          <div className="bg-white dark:bg-[#111111] p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Code className="text-blue-600" size={20} />
              Commerce Integration Config
            </h2>
            <p className="text-xs text-slate-500 dark:text-gray-400">
              Configure your catalog identifiers to enable instant, real-time push syncing via the Meta Graph API.
            </p>

            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                    Meta Commerce Catalog ID
                  </label>
                  <input
                    type="text"
                    value={config.metaCatalogId}
                    onChange={(e) => setConfig({ ...config, metaCatalogId: e.target.value })}
                    placeholder="e.g. 813470812349021"
                    className="w-full bg-white dark:bg-[#111111] border border-slate-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                    WhatsApp Business Catalog ID
                  </label>
                  <input
                    type="text"
                    value={config.whatsappCatalogId}
                    onChange={(e) => setConfig({ ...config, whatsappCatalogId: e.target.value })}
                    placeholder="e.g. 1928059012371"
                    className="w-full bg-white dark:bg-[#111111] border border-slate-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Status checklist */}
              <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-xl space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-gray-300">WhatsApp System Authentication Token:</span>
                  {config.isWhatsAppTokenConfigured ? (
                    <span className="flex items-center gap-1 text-green-600 font-medium text-xs">
                      <CheckCircle2 size={14} /> Active (.env.local)
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-amber-600 font-medium text-xs">
                      <AlertTriangle size={14} /> Missing Token
                    </span>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white rounded-xl py-3 font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition"
              >
                {saving ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                Save Configurations
              </button>
            </form>
          </div>

          {/* DATA FEED CHANNELS CARD */}
          <div className="bg-white dark:bg-[#111111] p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Share2 className="text-blue-600" size={20} />
              Meta Data Feed Channels (Scheduled Pull)
            </h2>
            <p className="text-sm text-slate-600 dark:text-gray-400">
              Provide these endpoints to Facebook Commerce Manager under <strong>Data Sources &gt; Data Feed</strong> to let Meta pull and sync your catalog automatically on a daily schedule.
            </p>

            <div className="space-y-4">
              {/* XML Feed */}
              <div className="border border-slate-200 dark:border-white/10 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                  <span className="bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 text-xs px-2.5 py-1 rounded-full font-semibold">
                    XML Feed (RSS/Google Format)
                  </span>
                  <p className="text-xs text-slate-500 dark:text-gray-400 break-all select-all font-mono pt-1">
                    {xmlFeedUrl}
                  </p>
                </div>
                <button
                  onClick={() => copyToClipboard(xmlFeedUrl, 'xml')}
                  className="flex items-center gap-1.5 self-start md:self-center bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 px-4 py-2 rounded-xl text-sm font-semibold transition"
                >
                  {copiedField === 'xml' ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                  Copy
                </button>
              </div>

              {/* CSV Feed */}
              <div className="border border-slate-200 dark:border-white/10 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                  <span className="bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-xs px-2.5 py-1 rounded-full font-semibold">
                    CSV Feed (Tabular Meta Feed)
                  </span>
                  <p className="text-xs text-slate-500 dark:text-gray-400 break-all select-all font-mono pt-1">
                    {csvFeedUrl}
                  </p>
                </div>
                <button
                  onClick={() => copyToClipboard(csvFeedUrl, 'csv')}
                  className="flex items-center gap-1.5 self-start md:self-center bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 px-4 py-2 rounded-xl text-sm font-semibold transition"
                >
                  {copiedField === 'csv' ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                  Copy
                </button>
              </div>
            </div>
          </div>

          {/* REAL-TIME TERMINAL CONSOLE */}
          <div className="bg-slate-950 rounded-2xl border border-slate-800 shadow-lg p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-red-500" />
                <span className="w-3.5 h-3.5 rounded-full bg-yellow-500" />
                <span className="w-3.5 h-3.5 rounded-full bg-green-500" />
                <span className="text-xs font-mono text-slate-400 ml-2">Meta Batch Sync Engine (Terminal)</span>
              </div>
              {logs.length > 0 && (
                <button
                  onClick={() => setLogs([])}
                  className="text-xs font-mono text-red-400 hover:text-red-300"
                >
                  Clear Console
                </button>
              )}
            </div>

            <div className="min-h-[180px] max-h-[280px] overflow-y-auto font-mono text-xs text-green-400 space-y-1.5 p-1 bg-slate-950">
              {logs.length === 0 ? (
                <div className="text-slate-600 flex flex-col items-center justify-center min-h-[160px]">
                  <RefreshCw className="mb-2 opacity-30" size={32} />
                  <span>No sync history. Tap "Sync Catalog" or "Pitch Sim" to start.</span>
                </div>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className="whitespace-pre-wrap leading-relaxed">
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: WHATSAPP SIMULATOR */}
        <div className="space-y-6">
          
          {/* PHONE MOCKUP */}
          <div className="bg-slate-900 border-[10px] border-slate-800 rounded-[40px] shadow-2xl relative overflow-hidden aspect-[9/19] flex flex-col max-w-[340px] mx-auto">
            
            {/* Camera notch */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-5 bg-slate-800 rounded-full z-20 flex items-center justify-center">
              <span className="w-3 h-3 rounded-full bg-black mr-2" />
              <span className="w-1.5 h-1.5 rounded-full bg-slate-900" />
            </div>

            {/* Status bar */}
            <div className="h-10 bg-[#075e54] text-white flex items-end justify-between px-6 pb-1.5 z-10 text-[10px]">
              <span>12:35 PM</span>
              <div className="flex items-center gap-1.5">
                <span>5G</span>
                <span className="w-4 h-2 bg-white/70 rounded-xs inline-block" />
              </div>
            </div>

            {/* Chat header */}
            <div className="bg-[#075e54] text-white px-4 py-2 flex items-center gap-3 shadow-md z-10">
              <div className="w-9 h-9 rounded-full bg-teal-800 flex items-center justify-center font-bold text-sm text-teal-200">
                GI
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-xs truncate">Golden Isle Wholesale</p>
                <p className="text-[10px] text-teal-100 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full inline-block animate-pulse" />
                  Online
                </p>
              </div>
            </div>

            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-[#ece5dd] dark:bg-slate-900 dark:bg-opacity-50 text-[11px] flex flex-col">
              {waMessages.map((msg, i) => (
                <div 
                  key={i} 
                  className={`max-w-[85%] rounded-lg p-2.5 shadow-xs flex flex-col gap-1.5 ${
                    msg.sender === 'user' 
                      ? 'bg-[#dcf8c6] self-end text-slate-800' 
                      : 'bg-white self-start text-slate-800'
                  }`}
                >
                  <p>{msg.text}</p>
                  
                  {/* Native Catalog Bubble Simulator */}
                  {msg.hasCatalog && (
                    <div className="border border-teal-600 rounded-lg overflow-hidden bg-white mt-1">
                      <div className="bg-teal-700 text-white p-2 text-center text-xs font-bold flex items-center justify-center gap-1">
                        <Smartphone size={12} />
                        Catalog Message
                      </div>
                      <div className="p-2 space-y-2 text-[10px] text-slate-700">
                        {products.slice(0, 3).map((p) => (
                          <div key={p.id} className="flex gap-2 items-center border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                            <img 
                              src={p.images[0] || '/images/placeholder-product.png'} 
                              alt={p.name}
                              className="w-10 h-10 object-cover rounded-md bg-slate-100 flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-bold truncate">{p.name}</p>
                              <p className="text-teal-600 font-semibold">RM {p.price}</p>
                            </div>
                            <button 
                              onClick={() => toast.success(`Simulated added: ${p.name}`)}
                              className="bg-teal-600 text-white rounded-md px-2 py-1 font-bold text-[9px] hover:bg-teal-700"
                            >
                              Add
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="bg-slate-50 p-2 text-center text-[10px] font-bold text-teal-700 border-t border-slate-100">
                        View Full Catalog
                      </div>
                    </div>
                  )}

                  {/* Single Product Card */}
                  {msg.catalogProduct && (
                    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white mt-1 w-full max-w-[200px]">
                      <img 
                        src={msg.catalogProduct.images[0] || '/images/placeholder-product.png'} 
                        alt={msg.catalogProduct.name}
                        className="w-full h-24 object-cover"
                      />
                      <div className="p-2 space-y-1">
                        <p className="font-bold text-xs truncate">{msg.catalogProduct.name}</p>
                        <p className="text-teal-600 font-bold">RM {msg.catalogProduct.price}</p>
                        <p className="text-[9px] text-slate-500 line-clamp-2">{msg.catalogProduct.description}</p>
                        <button 
                          onClick={() => toast.success(`Simulated order: ${msg.catalogProduct?.name}`)}
                          className="w-full bg-teal-600 hover:bg-teal-700 text-white rounded-md py-1 mt-1 font-bold text-[10px]"
                        >
                          Send Message / Order
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Quick action chips */}
            <div className="p-2 bg-[#ece5dd] border-t border-slate-200 flex gap-1.5 overflow-x-auto select-none no-scrollbar">
              <button 
                onClick={() => handleSendMessage('🛍️ Lihat Katalog')}
                className="bg-white hover:bg-slate-50 text-teal-800 rounded-full px-3 py-1 shadow-sm font-semibold whitespace-nowrap text-[10px]"
              >
                🛍️ Lihat Katalog
              </button>
              <button 
                onClick={() => handleSendMessage('Berapa harga Tiger Beer?')}
                className="bg-white hover:bg-slate-50 text-teal-800 rounded-full px-3 py-1 shadow-sm font-semibold whitespace-nowrap text-[10px]"
              >
                🍻 Tiger Beer Price?
              </button>
            </div>

            {/* Chat Input Bar */}
            <div className="p-2 bg-slate-100 flex items-center gap-2">
              <input
                type="text"
                value={waInput}
                onChange={(e) => setWaInput(e.target.value)}
                placeholder="Type a message"
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(waInput)}
                className="flex-1 bg-white border border-slate-300 rounded-full px-3 py-1.5 outline-none text-[11px] text-slate-800"
              />
              <button 
                onClick={() => handleSendMessage(waInput)}
                className="w-8 h-8 rounded-full bg-teal-700 text-white flex items-center justify-center flex-shrink-0 hover:bg-teal-800 transition"
              >
                <ChevronRight size={16} />
              </button>
            </div>
            
            {/* Phone bottom bar */}
            <div className="h-6 bg-slate-900 flex items-center justify-center z-10">
              <span className="w-24 h-1 bg-white/40 rounded-full" />
            </div>

          </div>

          <p className="text-center text-xs text-slate-500 dark:text-gray-400">
            Interactive phone simulation demonstrates the native <strong>Meta catalog message</strong> &amp; <strong>direct orders</strong> client flow.
          </p>

        </div>

      </div>

      {/* SCHEMA MAPPER GRID */}
      <div className="bg-white dark:bg-[#111111] p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Info className="text-blue-600" size={20} />
            Data Schema Mapping Preview (Supabase &rarr; Meta)
          </h2>
          <span className="text-xs bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-gray-400 px-3 py-1 rounded-full flex items-center gap-1.5">
            <Check size={12} className="text-green-500" /> Active Mapper
          </span>
        </div>
        <p className="text-sm text-slate-600 dark:text-gray-400">
          Facebook Commerce catalogs require strict data fields. The platform automatically converts your dynamic database schema into compliant formats. Choose a product below to preview the live mapping:
        </p>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="border border-slate-200 dark:border-white/10 rounded-xl p-3 max-h-[300px] overflow-y-auto space-y-1">
            <label className="block text-xs font-bold text-slate-500 uppercase px-2 mb-2">Select Product</label>
            {products.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedProduct(p)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition flex items-center justify-between ${
                  selectedProduct?.id === p.id 
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400' 
                    : 'hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-gray-300'
                }`}
              >
                <span className="truncate mr-2">{p.name}</span>
                <span className="text-slate-400 flex-shrink-0">RM {p.price}</span>
              </button>
            ))}
          </div>

          <div className="md:col-span-2 border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden text-xs">
            <div className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 p-3 font-semibold text-slate-700 dark:text-gray-300 grid grid-cols-3">
              <div>Supabase Key</div>
              <div>Meta Catalog Key</div>
              <div>Live Value Mapping</div>
            </div>
            
            {selectedProduct && (
              <div className="divide-y divide-slate-100 dark:divide-white/5 leading-relaxed font-mono">
                <div className="p-3 grid grid-cols-3">
                  <span className="text-blue-600 dark:text-blue-400">id (uuid)</span>
                  <span className="text-indigo-600 dark:text-indigo-400">id</span>
                  <span className="truncate text-slate-800 dark:text-gray-300 font-bold">{selectedProduct.id}</span>
                </div>
                <div className="p-3 grid grid-cols-3">
                  <span className="text-blue-600 dark:text-blue-400">name</span>
                  <span className="text-indigo-600 dark:text-indigo-400">title</span>
                  <span className="truncate text-slate-800 dark:text-gray-300 font-bold">"{selectedProduct.name}"</span>
                </div>
                <div className="p-3 grid grid-cols-3">
                  <span className="text-blue-600 dark:text-blue-400">description</span>
                  <span className="text-indigo-600 dark:text-indigo-400">description</span>
                  <span className="line-clamp-1 text-slate-500 dark:text-gray-400">
                    "{selectedProduct.description || `Premium wholesale beverage...`}"
                  </span>
                </div>
                <div className="p-3 grid grid-cols-3">
                  <span className="text-blue-600 dark:text-blue-400">price (numeric)</span>
                  <span className="text-indigo-600 dark:text-indigo-400">price</span>
                  <span className="text-slate-800 dark:text-gray-300 font-bold">{selectedProduct.price.toFixed(2)} MYR</span>
                </div>
                <div className="p-3 grid grid-cols-3">
                  <span className="text-blue-600 dark:text-blue-400">image_url</span>
                  <span className="text-indigo-600 dark:text-indigo-400">image_link</span>
                  <span className="truncate text-blue-500 underline select-all">
                    {(selectedProduct.images && selectedProduct.images.length > 0)
                      ? (selectedProduct.images[0].startsWith('/') ? `${appUrl}${selectedProduct.images[0]}` : selectedProduct.images[0])
                      : `${appUrl}/images/placeholder-product.png`}
                  </span>
                </div>
                <div className="p-3 grid grid-cols-3">
                  <span className="text-blue-600 dark:text-blue-400">stock_status</span>
                  <span className="text-indigo-600 dark:text-indigo-400">availability</span>
                  <span className="text-slate-800 dark:text-gray-300">
                    {selectedProduct.stock_status === 'out_of_stock' ? 'out of stock' : 'in stock'}
                  </span>
                </div>
                <div className="p-3 grid grid-cols-3">
                  <span className="text-slate-400">(hardcoded)</span>
                  <span className="text-indigo-600 dark:text-indigo-400">brand</span>
                  <span className="text-slate-800 dark:text-gray-300">Golden Isle</span>
                </div>
                <div className="p-3 grid grid-cols-3">
                  <span className="text-slate-400">(hardcoded)</span>
                  <span className="text-indigo-600 dark:text-indigo-400">condition</span>
                  <span className="text-slate-800 dark:text-gray-300">new</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
