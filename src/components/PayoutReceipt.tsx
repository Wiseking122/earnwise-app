import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, Share2, Download, X, Wallet, Building2, User, Calendar } from 'lucide-react';
import { Logo } from './Logo';

interface PayoutReceiptProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    amount: number;
    netAmount: number;
    fee: number;
    bankName: string;
    accountNumber: string;
    accountName: string;
    withdrawalType: string;
    date: string;
  } | null;
}

export const PayoutReceipt: React.FC<PayoutReceiptProps> = ({ isOpen, onClose, data }) => {
  if (!isOpen || !data) return null;

  const handleShare = async () => {
    const text = `🚀 Just requested a withdrawal of ₦${data.amount.toLocaleString()} on Earnwise! \n\nJoin me and start earning today: ${window.location.origin}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Earnwise Payout Proof',
          text: text,
          url: window.location.origin,
        });
      } catch (err) {
        console.log('Share failed:', err);
      }
    } else {
      // Fallback: Copy to clipboard
      await navigator.clipboard.writeText(text);
      alert('Proof text copied to clipboard! Share it on your status.');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="bg-white rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl border border-slate-100 flex flex-col"
      >
        {/* Receipt Header */}
        <div className="bg-slate-950 p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl" />
          
          <div className="relative z-10 flex flex-col items-center gap-3">
             <div className="w-16 h-16 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 flex items-center justify-center mb-2">
                <Logo size={40} />
             </div>
             <div className="space-y-1">
                <h2 className="text-white font-display font-black text-xl uppercase tracking-tighter italic">Settlement Receipt</h2>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full mx-auto w-fit">
                   <CheckCircle2 size={12} className="text-emerald-400" />
                   <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Transaction Pending</span>
                </div>
             </div>
          </div>
        </div>

        {/* Receipt Body */}
        <div className="p-8 space-y-6">
          <div className="text-center space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Net Credit Amount</p>
            <h3 className="text-4xl font-display font-black text-slate-950 tracking-tighter">
              ₦{data.netAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </h3>
          </div>

          <div className="space-y-4 border-t border-dashed border-slate-200 pt-6">
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-2 text-slate-500 font-bold uppercase tracking-wider">
                <Wallet size={14} />
                <span>Gross Request</span>
              </div>
              <span className="text-slate-900 font-black">₦{data.amount.toLocaleString()}</span>
            </div>
            
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-2 text-slate-500 font-bold uppercase tracking-wider">
                <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-200" />
                <span>Processing Fee ({data.withdrawalType === 'referral' ? 'Free' : '10%'})</span>
              </div>
              <span className="text-rose-500 font-black">-₦{data.fee.toLocaleString()}</span>
            </div>

            <div className="flex justify-between items-center text-xs pt-4 border-t border-slate-50">
              <div className="flex items-center gap-2 text-slate-500 font-bold uppercase tracking-wider">
                <Building2 size={14} />
                <span>Bank Name</span>
              </div>
              <span className="text-slate-900 font-black">{data.bankName}</span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-2 text-slate-500 font-bold uppercase tracking-wider">
                <User size={14} />
                <span>Account</span>
              </div>
              <span className="text-slate-900 font-black truncate max-w-[150px]">{data.accountName}</span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-2 text-slate-500 font-bold uppercase tracking-wider">
                <Calendar size={14} />
                <span>Timestamp</span>
              </div>
              <span className="text-slate-900 font-black">{new Date(data.date).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Social Proof CTA */}
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-center space-y-2">
             <p className="text-[10px] font-bold text-blue-800 uppercase tracking-wide leading-relaxed">
               Share this receipt to your Status to inspire your referrals & grow your network!
             </p>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="p-6 pt-0 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-4 px-4 bg-slate-100 hover:bg-slate-200 text-slate-900 font-display font-black text-xs uppercase tracking-widest rounded-2xl transition-all"
          >
            Close
          </button>
          <button
            onClick={handleShare}
            className="flex-[2] py-4 px-4 bg-blue-600 hover:bg-blue-700 text-white font-display font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
          >
            <Share2 size={14} />
            Share Proof
          </button>
        </div>
      </motion.div>
    </div>
  );
};
