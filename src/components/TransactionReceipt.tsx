import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Download, ShieldCheck, X, Share2, Info } from 'lucide-react';
import html2canvas from 'html2canvas';
import { useAuth } from '../context/AuthContext';

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
  const { profile } = useAuth();
  const receiptRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  const displayDate = receipt.processedAt instanceof Date 
    ? receipt.processedAt.toLocaleDateString()
    : (receipt.processedAt as any)?.toDate 
    ? (receipt.processedAt as any).toDate().toLocaleDateString()
    : receipt.processedAt 
    ? new Date(receipt.processedAt).toLocaleDateString()
    : new Date().toLocaleDateString();

  const generateCanvas = async (): Promise<HTMLCanvasElement | null> => {
    if (!receiptRef.current) return null;
    
    // Slight pause to ensure animations are fully settled
    await new Promise((resolve) => setTimeout(resolve, 100));

    const rect = receiptRef.current.getBoundingClientRect();
    
    return await html2canvas(receiptRef.current, {
      scale: 3, // Ultra crisp premium output scale
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
      width: rect.width,
      height: rect.height,
      scrollX: -window.scrollX,
      scrollY: -window.scrollY,
      windowWidth: document.documentElement.clientWidth,
      windowHeight: document.documentElement.clientHeight,
    });
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const canvas = await generateCanvas();
      if (!canvas) throw new Error("Could not construct canvas element");
      
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `earnwise_receipt_${receipt.id.slice(0, 8)}.png`;
      link.href = dataUrl;
      link.click();
      
      triggerToast("Receipt saved to Downloads! 💾");
    } catch (err) {
      console.error("Failed to generate receipt:", err);
      triggerToast("Failed to save as image. Copying details instead...");
      copyToClipboardFallback();
    } finally {
      setDownloading(false);
    }
  };

  const copyToClipboardFallback = async () => {
    const inviteText = profile?.referralCode 
      ? `\n\nJoin Earnwise using my link to start earning: ${window.location.origin}/invite/${profile.referralCode}` 
      : '';
    const text = `Earnwise Transfer Proof\nRef: ${receipt.id}\nAmount: ₦${receipt.netPayout.toLocaleString()}\nBank: ${receipt.bankName || 'N/A'}\nDate: ${displayDate}\nVerified Secure! 🚀${inviteText}`;
    try {
      await navigator.clipboard.writeText(text);
      triggerToast("Receipt details copied to clipboard! 📋");
    } catch (e) {
      triggerToast("Failed to copy. Please screenshot the screen.");
    }
  };

  const handleShare = async () => {
    setSharing(true);
    try {
      const canvas = await generateCanvas();
      if (!canvas) throw new Error("Could not construct canvas");

      const dataUrl = canvas.toDataURL('image/png');
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const file = new File([blob], `earnwise_receipt_${receipt.id.slice(0, 8)}.png`, { type: 'image/png' });
      
      const inviteMsg = profile?.referralCode 
        ? `\n\nJoin Earnwise to start earning too! Register here: ${window.location.origin}/invite/${profile.referralCode}`
        : '';

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Earnwise Proof of Payment',
          text: `My payout of ₦${receipt.netPayout.toLocaleString()} from Earnwise was successful! 🚀${inviteMsg}`
        });
        triggerToast("Receipt proof shared successfully! 🎉");
      } else if (navigator.share) {
        await navigator.share({
          title: 'Earnwise Proof of Payment',
          text: `My payout of ₦${receipt.netPayout.toLocaleString()} from Earnwise was successful! Ref: ${receipt.id.slice(0, 10)}${inviteMsg}`
        });
        triggerToast("Receipt shared! 🚀");
      } else {
        await copyToClipboardFallback();
      }
    } catch (err) {
      console.error("Failed to share receipt:", err);
      await copyToClipboardFallback();
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 select-none">
      {/* Dark Ambient Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Floating Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -25, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -25, scale: 0.95 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 z-[300] bg-slate-900 border border-slate-800 text-white px-4 py-2 rounded-2xl text-[11px] font-black shadow-2xl flex items-center gap-2 whitespace-nowrap"
          >
            <Info size={14} className="text-amber-400" />
            <span>{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ scale: 0.95, y: 15, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        className="relative w-full max-w-[290px] sm:max-w-[310px] z-10"
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute -top-10 right-0 p-1.5 bg-white/10 text-white rounded-full hover:bg-white/20 transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* The Receipt Wrapper (Fully styled using explicit fallback colors to bypass OKLCH canvas rendering limitations) */}
        <div 
          ref={receiptRef}
          className="rounded-2xl overflow-hidden shadow-2xl relative p-0"
          style={{
            backgroundColor: '#ffffff',
            borderColor: '#f1f5f9',
            borderWidth: '1px',
            borderStyle: 'solid',
            boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.15)'
          }}
        >
          {/* Header Area */}
          <div 
            className="p-4 flex flex-col items-center justify-center relative"
            style={{
              backgroundColor: '#f0fdf4',
              borderBottomColor: '#d1fae5',
              borderBottomWidth: '1px',
              borderBottomStyle: 'solid'
            }}
          >
            <div className="absolute top-0 right-0 p-2 opacity-[0.03]" style={{ color: '#0f172a' }}>
              <ShieldCheck size={80} />
            </div>
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center mb-2"
              style={{
                backgroundColor: '#10b981',
                boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.3)'
              }}
            >
              <CheckCircle2 size={20} style={{ color: '#ffffff' }} />
            </div>
            <h2 className="text-lg font-bold tracking-tight" style={{ color: '#0f172a' }}>Transfer Success</h2>
            <p className="text-[9px] font-black uppercase tracking-widest mt-0.5" style={{ color: '#047857' }}>
              Earnwise Digital Media
            </p>
          </div>

          {/* Body Details */}
          <div className="p-4 space-y-3.5" style={{ backgroundColor: '#ffffff' }}>
            <div className="text-center py-1">
              <p className="text-[8px] font-bold uppercase tracking-widest mb-0.5" style={{ color: '#94a3b8' }}>Total Payout Disbursed</p>
              <h3 className="text-2xl font-black tracking-tight" style={{ color: '#0f172a' }}>
                ₦{receipt.netPayout.toLocaleString()}
              </h3>
            </div>

            {/* Structured Table Info */}
            <div 
              className="space-y-2 pt-2 text-[11px] sm:text-xs"
              style={{
                borderTopColor: '#f1f5f9',
                borderTopWidth: '1px',
                borderTopStyle: 'solid'
              }}
            >
              <div className="flex justify-between items-center">
                <span className="font-semibold" style={{ color: '#64748b' }}>Transaction Ref</span>
                <span 
                  className="font-bold font-mono px-1.5 py-0.5 rounded text-[9px] uppercase"
                  style={{
                    color: '#0f172a',
                    backgroundColor: '#f8fafc',
                    borderColor: '#e2e8f0',
                    borderWidth: '1px',
                    borderStyle: 'solid'
                  }}
                >
                  {receipt.id.slice(0, 10)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold" style={{ color: '#64748b' }}>Date</span>
                <span className="font-bold" style={{ color: '#0f172a' }}>
                  {displayDate}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold" style={{ color: '#64748b' }}>Bank Name</span>
                <span className="font-bold" style={{ color: '#0f172a' }}>{receipt.bankName || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold" style={{ color: '#64748b' }}>Account Name</span>
                <span className="font-bold text-right max-w-[130px] truncate" style={{ color: '#0f172a' }}>
                  {receipt.accountName || 'N/A'}
                </span>
              </div>
            </div>

            {/* Breakdown */}
            <div 
              className="space-y-1 pt-2.5 text-[10px] sm:text-[11px]"
              style={{
                borderTopColor: '#f1f5f9',
                borderTopWidth: '1px',
                borderTopStyle: 'solid'
              }}
            >
              <div className="flex justify-between items-center">
                <span style={{ color: '#94a3b8' }}>Requested Amount</span>
                <span className="font-bold" style={{ color: '#475569' }}>₦{receipt.amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span style={{ color: '#94a3b8' }}>Processing Fee (5%)</span>
                <span className="font-bold" style={{ color: '#f43f5e' }}>-₦{receipt.fee.toLocaleString()}</span>
              </div>
            </div>

            {/* Verified Indicator */}
            <div 
              className="pt-2 flex justify-center"
              style={{
                borderTopColor: '#f8fafc',
                borderTopWidth: '1px',
                borderTopStyle: 'solid'
              }}
            >
              <div className="flex items-center gap-1">
                <ShieldCheck size={11} style={{ color: '#10b981', opacity: 0.4 }} />
                <span className="text-[7.5px] uppercase tracking-widest font-black" style={{ color: '#94a3b8' }}>
                  Verified Secure Transaction
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-3 flex gap-2.5">
          <button
            onClick={handleDownload}
            disabled={downloading || sharing}
            className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 active:scale-95 transition-all text-white py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider shadow-lg flex justify-center items-center gap-1.5 cursor-pointer"
          >
            {downloading ? (
              <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Download size={13} />
                <span>Save</span>
              </>
            )}
          </button>
          <button
            onClick={handleShare}
            disabled={downloading || sharing}
            className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 active:scale-95 transition-all text-white py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider shadow-lg flex justify-center items-center gap-1.5 cursor-pointer"
          >
            {sharing ? (
              <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Share2 size={13} />
                <span>Share Proof</span>
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
