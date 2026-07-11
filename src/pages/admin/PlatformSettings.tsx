import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Settings, 
  Save, 
  RefreshCcw, 
  Shield, 
  Globe, 
  Mail, 
  Send, 
  HelpCircle, 
  Plus, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  Loader2,
  Coins,
  Wallet,
  Bot
} from 'lucide-react';
import { db } from '../../lib/firebase';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { PlatformSettings } from '../../types';

export default function PlatformSettingsPage() {
  const { profile } = useAuth();
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'system_settings', 'platform'), (snap) => {
      if (snap.exists()) {
        setSettings(snap.data() as PlatformSettings);
      } else {
        // Initialize with defaults if not exists
        const defaults: PlatformSettings = {
          wiseCoinName: 'WiseCoin',
          wiseCoinSymbol: 'WC',
          exchangeRate: 1,
          minConversion: 500,
          maxConversion: 100000,
          exchangeEnabled: true,
          websiteName: 'EarnWise',
          supportEmail: 'support@earnwise.com',
          telegramLink: 'https://t.me/earnwise',
          aiKnowledge: 'EarnWise is a premier earning platform...',
          faqs: [],
          withdrawalSettings: {
            minWithdrawal: 1000,
            maxWithdrawal: 50000,
            feePercentage: 10
          },
          ogadsConversionRate: 1000
        };
        setSettings(defaults);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setMessage(null);
    try {
      await setDoc(doc(db, 'system_settings', 'platform'), {
        ...settings,
        updatedAt: serverTimestamp()
      });
      setMessage({ type: 'success', text: 'Platform settings updated successfully!' });
    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: 'Failed to update settings.' });
    } finally {
      setSaving(false);
    }
  };

  const addFaq = () => {
    if (!settings) return;
    setSettings({
      ...settings,
      faqs: [...settings.faqs, { question: '', answer: '' }]
    });
  };

  const removeFaq = (index: number) => {
    if (!settings) return;
    const newFaqs = [...settings.faqs];
    newFaqs.splice(index, 1);
    setSettings({ ...settings, faqs: newFaqs });
  };

  if (loading) {
    return (
      <Layout title="Platform Settings">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="animate-spin text-blue-500" size={32} />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Platform Settings">
      <div className="p-3 sm:p-5 pb-24 space-y-6 max-w-4xl mx-auto relative">
        <div className="flex items-center justify-between mb-2">
          <div className="space-y-1">
            <h2 className="text-2xl font-display font-black text-white uppercase italic tracking-tight">System Config</h2>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">Manage platform rules and information</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition shadow-lg shadow-blue-600/20 flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save Changes
          </button>
        </div>

        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`p-4 rounded-2xl flex items-center gap-3 border ${
                message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
              }`}
            >
              {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              <span className="text-xs font-bold uppercase tracking-wider">{message.text}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* WiseCoin Settings */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-3xl p-6 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-white/5">
              <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500">
                <Coins size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">WiseCoin Asset</h3>
                <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Rewards & Exchange rules</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 px-1">Asset Name</label>
                  <input
                    type="text"
                    value={settings?.wiseCoinName}
                    onChange={(e) => setSettings({ ...settings!, wiseCoinName: e.target.value })}
                    className="w-full bg-slate-950/50 border border-white/5 rounded-xl py-2.5 px-4 text-xs font-bold text-white focus:border-amber-500 outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 px-1">Symbol</label>
                  <input
                    type="text"
                    value={settings?.wiseCoinSymbol}
                    onChange={(e) => setSettings({ ...settings!, wiseCoinSymbol: e.target.value })}
                    className="w-full bg-slate-950/50 border border-white/5 rounded-xl py-2.5 px-4 text-xs font-bold text-white focus:border-amber-500 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 px-1">Exchange Rate (1 {settings?.wiseCoinSymbol} = ₦X)</label>
                <input
                  type="number"
                  value={settings?.exchangeRate}
                  onChange={(e) => setSettings({ ...settings!, exchangeRate: Number(e.target.value) })}
                  className="w-full bg-slate-950/50 border border-white/5 rounded-xl py-2.5 px-4 text-xs font-bold text-white focus:border-amber-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 px-1">Min Conversion</label>
                  <input
                    type="number"
                    value={settings?.minConversion}
                    onChange={(e) => setSettings({ ...settings!, minConversion: Number(e.target.value) })}
                    className="w-full bg-slate-950/50 border border-white/5 rounded-xl py-2.5 px-4 text-xs font-bold text-white focus:border-amber-500 outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 px-1">Max Conversion</label>
                  <input
                    type="number"
                    value={settings?.maxConversion}
                    onChange={(e) => setSettings({ ...settings!, maxConversion: Number(e.target.value) })}
                    className="w-full bg-slate-950/50 border border-white/5 rounded-xl py-2.5 px-4 text-xs font-bold text-white focus:border-amber-500 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 px-1">OGAds Conversion Rate (1 USD = X {settings?.wiseCoinSymbol || 'WC'})</label>
                <input
                  type="number"
                  value={settings?.ogadsConversionRate !== undefined ? settings.ogadsConversionRate : 1000}
                  onChange={(e) => setSettings({ ...settings!, ogadsConversionRate: Number(e.target.value) })}
                  className="w-full bg-slate-950/50 border border-white/5 rounded-xl py-2.5 px-4 text-xs font-bold text-white focus:border-amber-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-950/50 rounded-xl border border-white/5">
                <div className="space-y-0.5">
                  <p className="text-[10px] font-black text-white uppercase tracking-wider">Enable Exchange</p>
                  <p className="text-[8px] text-slate-500 font-bold uppercase">Allow conversion to Naira</p>
                </div>
                <button
                  onClick={() => setSettings({ ...settings!, exchangeEnabled: !settings?.exchangeEnabled })}
                  className={`w-10 h-6 rounded-full transition-colors relative ${settings?.exchangeEnabled ? 'bg-amber-500' : 'bg-slate-800'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings?.exchangeEnabled ? 'left-5' : 'left-1'}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Withdrawal Settings */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-3xl p-6 space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-white/5">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500">
                <Wallet size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Naira Wallet (₦)</h3>
                <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Withdrawal & Fee rules</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 px-1">Min Withdrawal</label>
                  <input
                    type="number"
                    value={settings?.withdrawalSettings.minWithdrawal}
                    onChange={(e) => setSettings({ 
                      ...settings!, 
                      withdrawalSettings: { ...settings!.withdrawalSettings, minWithdrawal: Number(e.target.value) } 
                    })}
                    className="w-full bg-slate-950/50 border border-white/5 rounded-xl py-2.5 px-4 text-xs font-bold text-white focus:border-emerald-500 outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 px-1">Max Withdrawal</label>
                  <input
                    type="number"
                    value={settings?.withdrawalSettings.maxWithdrawal}
                    onChange={(e) => setSettings({ 
                      ...settings!, 
                      withdrawalSettings: { ...settings!.withdrawalSettings, maxWithdrawal: Number(e.target.value) } 
                    })}
                    className="w-full bg-slate-950/50 border border-white/5 rounded-xl py-2.5 px-4 text-xs font-bold text-white focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 px-1">Fee Percentage (%)</label>
                <input
                  type="number"
                  value={settings?.withdrawalSettings.feePercentage}
                  onChange={(e) => setSettings({ 
                    ...settings!, 
                    withdrawalSettings: { ...settings!.withdrawalSettings, feePercentage: Number(e.target.value) } 
                  })}
                  className="w-full bg-slate-950/50 border border-white/5 rounded-xl py-2.5 px-4 text-xs font-bold text-white focus:border-emerald-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* AI Knowledge Base */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-3xl p-6 space-y-6 md:col-span-2">
            <div className="flex items-center gap-3 pb-4 border-b border-white/5">
              <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500">
                <Bot size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">AI Assistant Knowledge</h3>
                <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Train Wise AI with platform rules</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 px-1">AI Context / Knowledge Base</label>
              <textarea
                value={settings?.aiKnowledge}
                onChange={(e) => setSettings({ ...settings!, aiKnowledge: e.target.value })}
                rows={6}
                className="w-full bg-slate-950/50 border border-white/5 rounded-2xl py-3 px-5 text-xs font-medium text-slate-300 focus:border-blue-500 outline-none resize-none leading-relaxed"
                placeholder="Describe platform rules, wallets, and earning mechanisms here..."
              />
              <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest text-right">The AI assistant reads this field to stay accurate.</p>
            </div>
          </div>

          {/* Website Info */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-3xl p-6 space-y-6">
             <div className="flex items-center gap-3 pb-4 border-b border-white/5">
              <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-500">
                <Globe size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Website Info</h3>
                <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Public profile details</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 px-1">Platform Name</label>
                <input
                  type="text"
                  value={settings?.websiteName}
                  onChange={(e) => setSettings({ ...settings!, websiteName: e.target.value })}
                  className="w-full bg-slate-950/50 border border-white/5 rounded-xl py-2.5 px-4 text-xs font-bold text-white focus:border-purple-500 outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 px-1">Support Email</label>
                <input
                  type="email"
                  value={settings?.supportEmail}
                  onChange={(e) => setSettings({ ...settings!, supportEmail: e.target.value })}
                  className="w-full bg-slate-950/50 border border-white/5 rounded-xl py-2.5 px-4 text-xs font-bold text-white focus:border-purple-500 outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 px-1">Telegram Group Link</label>
                <input
                  type="text"
                  value={settings?.telegramLink}
                  onChange={(e) => setSettings({ ...settings!, telegramLink: e.target.value })}
                  className="w-full bg-slate-950/50 border border-white/5 rounded-xl py-2.5 px-4 text-xs font-bold text-white focus:border-purple-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* FAQs Manager */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-3xl p-6 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-500">
                  <HelpCircle size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">FAQ Manager</h3>
                  <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Platform questions</p>
                </div>
              </div>
              <button onClick={addFaq} className="w-8 h-8 bg-indigo-500/10 text-indigo-400 rounded-lg flex items-center justify-center hover:bg-indigo-500 hover:text-white transition-all">
                <Plus size={16} />
              </button>
            </div>

            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {settings?.faqs.map((faq, index) => (
                <div key={index} className="p-4 bg-slate-950/50 border border-white/5 rounded-2xl space-y-3 relative group">
                  <button
                    onClick={() => removeFaq(index)}
                    className="absolute top-2 right-2 w-7 h-7 bg-red-500/10 text-red-400 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white"
                  >
                    <Trash2 size={12} />
                  </button>
                  <div className="space-y-1">
                    <input
                      type="text"
                      placeholder="Question"
                      value={faq.question}
                      onChange={(e) => {
                        const newFaqs = [...settings!.faqs];
                        newFaqs[index].question = e.target.value;
                        setSettings({ ...settings!, faqs: newFaqs });
                      }}
                      className="w-full bg-transparent border-b border-white/10 py-1 text-[10px] font-black text-white uppercase tracking-widest outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <textarea
                      placeholder="Answer"
                      value={faq.answer}
                      onChange={(e) => {
                        const newFaqs = [...settings!.faqs];
                        newFaqs[index].answer = e.target.value;
                        setSettings({ ...settings!, faqs: newFaqs });
                      }}
                      rows={2}
                      className="w-full bg-transparent text-[10px] font-medium text-slate-400 outline-none resize-none leading-relaxed"
                    />
                  </div>
                </div>
              ))}
              {settings?.faqs.length === 0 && (
                <p className="text-center py-10 text-[9px] font-black uppercase tracking-widest text-slate-600">No FAQs added yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
