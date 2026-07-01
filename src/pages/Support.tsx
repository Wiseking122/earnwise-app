import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, MessageSquare, HelpCircle, Mail, Send, CheckCircle2, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getApiUrl } from '../lib/config';
import { useAuth } from '../context/AuthContext';

export default function Support() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch(getApiUrl('/api/support/message'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          subject, 
          message, 
          email: user?.email || "anonymous-user@example.com" 
        })
      });
      setSubmitted(true);
      setSubject('');
      setMessage('');
    } catch (err) {
      console.error("Support form submission error:", err);
      // Optional: Add UI feedback for submission error
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent">
      <header className="p-6 flex items-center gap-4 bg-white sticky top-0 z-10 border-b border-slate-100">
        <button 
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-600 active:scale-95 transition-all"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-black text-slate-900">Help & Support</h1>
      </header>

      <div className="p-6 max-w-2xl mx-auto space-y-6 pb-20">
        {/* Contact Options */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center text-center gap-2">
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
              <Mail size={20} />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-[10px]">Email Support</h3>
              <p className="text-[8px] font-bold text-slate-400 mt-1 italic">Mail Team</p>
            </div>
          </div>
          <a href="https://t.me/Earnwise01" target="_blank" rel="noreferrer" className="bg-white p-4 rounded-3xl border border-blue-100 shadow-sm flex flex-col items-center text-center gap-2 transition-all hover:bg-slate-50 ring-1 ring-blue-50">
            <div className="w-10 h-10 bg-[#0088cc]/10 text-[#0088cc] rounded-xl flex items-center justify-center">
              <Users size={20} />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-[10px]">Telegram Chat</h3>
              <p className="text-[8px] font-bold text-[#0088cc] mt-1 italic">Community</p>
            </div>
          </a>
          <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center text-center gap-2">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
              <MessageSquare size={20} />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-[10px]">Live Chat</h3>
              <p className="text-[8px] font-bold text-slate-400 mt-1">Direct</p>
            </div>
          </div>
        </div>

        {/* Support Form */}
        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
              <HelpCircle size={20} />
            </div>
            <h2 className="text-xl font-black text-slate-900">Send us a message</h2>
          </div>

          {submitted ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-emerald-50 border border-emerald-100 rounded-3xl p-8 text-center space-y-4"
            >
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={32} />
              </div>
              <div>
                <h3 className="text-lg font-black text-emerald-900">Message Sent!</h3>
                <p className="text-emerald-700/70 text-sm font-bold mt-1">Our support team will get back to you within 24 hours.</p>
              </div>
              <button 
                onClick={() => setSubmitted(false)}
                className="text-emerald-600 font-black text-xs uppercase tracking-widest pt-4"
              >
                Send another message
              </button>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1 relative">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-4">Subject</p>
                <input 
                  type="text" 
                  placeholder="How can we help?"
                  required
                  className="w-full bg-white border border-slate-200 rounded-2xl py-4 px-5 text-sm font-semibold text-slate-900 focus:ring-4 focus:ring-blue-100 focus:bg-white transition-all outline-none"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
              <div className="space-y-1 relative">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-4">Message</p>
                <textarea 
                  placeholder="Describe your issue or question in detail..."
                  required
                  rows={4}
                  className="w-full bg-white border border-slate-200 rounded-[2rem] py-5 px-6 text-sm font-semibold text-slate-900 focus:ring-4 focus:ring-blue-100 focus:bg-white transition-all outline-none resize-none"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>
              <button 
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-4.5 rounded-[1.5rem] active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-lg shadow-slate-900/10"
              >
                <Send size={20} />
                <span className="text-base">Submit Support Ticket</span>
              </button>
            </form>
          )}
        </div>

        {/* FAQs */}
        <div className="space-y-4">
          <h3 className="text-lg font-black text-slate-900 pl-2">Common Questions</h3>
          {[
            { 
              q: "How do I upgrade my plan?", 
              a: "To upgrade, fund your wallet via the 'Deposit' tab on the Membership page using Paystack. Once your balance is updated, switch to the 'Plans' tab and click 'Activate Now' on your chosen tier. We do NOT use coupon codes or manual vendors." 
            },
            { 
              q: "What is the dual-wallet payout schedule and what are the fees?", 
              a: "Earnwise operates two separate wallets: (1) Referral Wallet payouts are processed on Saturdays (8:00 AM - 6:00 PM) with 0% (Free) processing fees. (2) Video Tasks Wallet payouts are processed on the 30th of every month with a 10% processing fee deducted automatically." 
            },
            { 
              q: "What are the daily earnings limits and total plan caps?", 
              a: "Each subscription tier comes with a fixed daily earning limit and a total package life cycle cap. Once your package's total earnings limit is reached, you must renew or upgrade your plan to continue unlocking daily video tasks." 
            },
            { 
              q: "Why was my video task proof rejected?", 
              a: "Tasks are usually rejected if the proof screenshot uploaded is duplicate, blur, incorrect, or doesn't verify completion. Ensure you watch the video and upload high-quality proof." 
            },
            { 
              q: "Can I use multiple accounts or proxies?", 
              a: "No, Earnwise enforces a strict one-account-per-individual policy. Using virtual machines, multiple devices with the same payment account, or duplicate profile signups is prohibited and results in permanent suspension." 
            }
          ].map((faq, i) => (
            <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
              <h4 className="font-black text-slate-900 text-sm mb-2">{faq.q}</h4>
              <p className="text-slate-500 text-[11px] font-bold leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
