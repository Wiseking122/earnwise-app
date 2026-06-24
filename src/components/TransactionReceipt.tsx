import { useRef, useState } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, Download, ShieldCheck, X } from 'lucide-react';
import html2canvas from 'html2canvas';

interface TransactionReceiptProps {
  receipt: {
    id: string;
    amount: number;
    fee: number;
    netPayout: number;
    processedAt: Date;
    accountName?: string;
    bankName?: string;
  };
  onClose: () => void;
}

export default function TransactionReceipt({ receipt, onClose }: TransactionReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!receiptRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
      });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `earnwise_receipt_${receipt.id.slice(0, 8)}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Failed to generate receipt:", err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ scale: 0.95, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        className="relative w-full max-w-sm"
      >
        <button 
          onClick={onClose}
          className="absolute -top-12 right-0 p-2 bg-white/10 text-white rounded-full hover:bg-white/20 transition-colors"
        >
          <X size={20} />
        </button>

        {/* The Receipt Wrapper to capture */}
        <div 
          ref={receiptRef}
          className="bg-white rounded-[2rem] overflow-hidden shadow-2xl relative"
        >
          {/* Header */}
          <div className="bg-emerald-50 p-6 flex flex-col items-center justify-center border-b border-emerald-100 relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <ShieldCheck size={100} />
            </div>
            <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/30">
              <CheckCircle2 size={32} className="text-white" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-1">Transfer Success</h2>
            <p className="text-emerald-600 text-xs font-bold uppercase tracking-widest">
              Earnwise Digital Media
            </p>
          </div>

          {/* Body Details */}
          <div className="p-8 space-y-6">
            <div className="text-center">
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Total Payout Disbursed</p>
              <h3 className="text-4xl font-black text-slate-900">
                ₦{receipt.netPayout.toLocaleString()}
              </h3>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 font-bold">Transaction Ref</span>
                <span className="text-slate-900 font-black font-mono bg-slate-100 px-2 py-1 rounded uppercase">
                  {receipt.id.slice(0, 10)}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 font-bold">Date</span>
                <span className="text-slate-900 font-black">
                  {receipt.processedAt.toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 font-bold">Bank Name</span>
                <span className="text-slate-900 font-black">{receipt.bankName || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 font-bold">Account Name</span>
                <span className="text-slate-900 font-black text-right max-w-[150px] truncate">
                  {receipt.accountName || 'N/A'}
                </span>
              </div>
            </div>

            <div className="space-y-2 pt-4 border-t border-slate-100">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Requested Amount</span>
                <span className="text-slate-700 font-bold">₦{receipt.amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Processing Fee (5%)</span>
                <span className="text-rose-500 font-bold">-₦{receipt.fee.toLocaleString()}</span>
              </div>
            </div>

            <div className="pt-6 flex justify-center text-slate-300">
              <div className="flex items-center gap-2">
                <ShieldCheck size={14} />
                <span className="text-[9px] uppercase tracking-widest font-bold">Verified SECURE TRANSACTION</span>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={handleDownload}
          disabled={downloading}
          className="w-full mt-6 bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl flex justify-center items-center gap-2"
        >
          {downloading ? (
            <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Download size={18} /> Share Proof / Download Receipt
            </>
          )}
        </button>
      </motion.div>
    </div>
  );
}
