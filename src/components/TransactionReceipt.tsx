import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Download, ShieldCheck, X, Share2, Info, Copy, MessageCircle, Send } from 'lucide-react';
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

// Incredibly robust utility to execute a function using original, un-poisoned Canvas prototypes
// This bypasses anti-bot/anti-fraud prototype modifications made by Monetag, Zeydoo or other ad networks
const runWithCleanCanvas = async <T,>(fn: () => Promise<T>): Promise<T> => {
  let iframe: HTMLIFrameElement | null = null;
  
  // Originals
  const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  const originalDrawImage = CanvasRenderingContext2D.prototype.drawImage;
  const originalFillText = CanvasRenderingContext2D.prototype.fillText;

  try {
    iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    
    const cleanWin = iframe.contentWindow as any;
    const cleanCanvasProto = cleanWin?.HTMLCanvasElement?.prototype;
    const cleanContextProto = cleanWin?.CanvasRenderingContext2D?.prototype;

    if (cleanCanvasProto?.toDataURL) HTMLCanvasElement.prototype.toDataURL = cleanCanvasProto.toDataURL;
    if (cleanCanvasProto?.getContext) HTMLCanvasElement.prototype.getContext = cleanCanvasProto.getContext;
    if (cleanContextProto?.drawImage) CanvasRenderingContext2D.prototype.drawImage = cleanContextProto.drawImage;
    if (cleanContextProto?.fillText) CanvasRenderingContext2D.prototype.fillText = cleanContextProto.fillText;

    return await fn();
  } catch (e) {
    console.error("Canvas prototype bypass error", e);
    return await fn();
  } finally {
    // Restore originals immediately
    HTMLCanvasElement.prototype.toDataURL = originalToDataURL;
    HTMLCanvasElement.prototype.getContext = originalGetContext;
    CanvasRenderingContext2D.prototype.drawImage = originalDrawImage;
    CanvasRenderingContext2D.prototype.fillText = originalFillText;
    
    if (iframe && iframe.parentNode) {
      iframe.parentNode.removeChild(iframe);
    }
  }
};

export default function TransactionReceipt({ receipt, onClose }: TransactionReceiptProps) {
  const { profile } = useAuth();
  const receiptRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState(false);
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

  const inviteLink = profile?.referralCode 
    ? `${window.location.origin}/invite/${profile.referralCode}` 
    : `${window.location.origin}`;

  const shareText = `I just successfully withdrew ₦${receipt.netPayout.toLocaleString()} from Earnwise! 🚀 Use my invite link to join and start earning daily: ${inviteLink}`;

  const generateCanvas = async (): Promise<HTMLCanvasElement | null> => {
    if (!receiptRef.current) return null;
    
    // Minor delay to ensure component render states are aligned
    await new Promise((resolve) => setTimeout(resolve, 120));

    const rect = receiptRef.current.getBoundingClientRect();
    
    return await runWithCleanCanvas(async () => {
      return await html2canvas(receiptRef.current!, {
        scale: 2, // 2x scale for crisp layout and perfect sizing
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
        width: rect.width,
        height: rect.height,
        scrollX: 0,
        scrollY: 0,
        windowWidth: document.documentElement.clientWidth,
        windowHeight: document.documentElement.clientHeight,
      });
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
      
      triggerToast("Receipt saved to Gallery! 💾");
    } catch (err) {
      console.error("Failed to generate receipt image:", err);
      triggerToast("Downloading failed. Copying details instead...");
      copyToClipboardFallback();
    } finally {
      setDownloading(false);
    }
  };

  const copyToClipboardFallback = async () => {
    const text = `Earnwise Transfer Proof\nRef: ${receipt.id}\nAmount: ₦${receipt.netPayout.toLocaleString()}\nBank: ${receipt.bankName || 'N/A'}\nDate: ${displayDate}\nJoin link: ${inviteLink}\nVerified Secure! 🚀`;
    try {
      await navigator.clipboard.writeText(text);
      triggerToast("Receipt details copied to clipboard! 📋");
    } catch (e) {
      triggerToast("Failed to copy. Please take a screenshot.");
    }
  };

  const shareToPlatform = (platform: 'whatsapp' | 'telegram' | 'copy') => {
    if (platform === 'whatsapp') {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, '_blank');
      triggerToast("Opening WhatsApp... 🟢");
    } else if (platform === 'telegram') {
      window.open(`https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(`I just successfully withdrew ₦${receipt.netPayout.toLocaleString()} from Earnwise! 🚀`)}`, '_blank');
      triggerToast("Opening Telegram... 🔵");
    } else {
      copyToClipboardFallback();
    }
  };

  const handleNativeShare = async () => {
    setSharing(true);
    try {
      const canvas = await generateCanvas();
      if (!canvas) throw new Error("Could not construct canvas");

      const dataUrl = canvas.toDataURL('image/png');
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const file = new File([blob], `earnwise_receipt_${receipt.id.slice(0, 8)}.png`, { type: 'image/png' });

      // Wrap in try catch to handle browser/iframe restriction issues seamlessly
      if (typeof navigator !== 'undefined' && navigator.share) {
        let canShareFiles = false;
        try {
          if (navigator.canShare) {
            canShareFiles = navigator.canShare({ files: [file] });
          }
        } catch (e) {
          console.warn("canShare files not supported", e);
        }

        if (canShareFiles) {
          await navigator.share({
            files: [file],
            title: 'Earnwise Proof of Payment',
            text: shareText
          });
          triggerToast("Shared successfully! 🎉");
          return;
        } else {
          await navigator.share({
            title: 'Earnwise Proof of Payment',
            text: shareText
          });
          triggerToast("Text proof shared! 🚀");
          return;
        }
      }
      
      // If native share is not available, open our custom platform sharing options!
      setShowShareOptions(true);
    } catch (err) {
      console.warn("Native sharing failed, using custom platform share tray:", err);
      setShowShareOptions(true);
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
        className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Floating Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -25, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -25, scale: 0.95 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 z-[300] bg-slate-900 border border-slate-800 text-white px-4 py-2.5 rounded-xl text-[11px] font-black shadow-2xl flex items-center gap-2 whitespace-nowrap"
          >
            <Info size={14} className="text-blue-400 animate-pulse" />
            <span>{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ scale: 0.95, y: 15, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        className="relative w-full max-w-[280px] sm:max-w-[300px] z-10"
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute -top-9 right-0 p-1.5 bg-white/10 text-white rounded-full hover:bg-white/25 transition-colors cursor-pointer"
        >
          <X size={16} />
        </button>

        {/* The Receipt Wrapper - Reduced sizing and padding for flawless mobile fit */}
        <div 
          ref={receiptRef}
          className="rounded-xl overflow-hidden shadow-xl relative p-0"
          style={{
            backgroundColor: '#ffffff',
            borderColor: '#e2e8f0',
            borderWidth: '1px',
            borderStyle: 'solid',
          }}
        >
          {/* Header Area */}
          <div 
            className="p-3.5 flex flex-col items-center justify-center relative"
            style={{
              backgroundColor: '#f0fdf4',
              borderBottomColor: '#d1fae5',
              borderBottomWidth: '1px',
              borderBottomStyle: 'solid'
            }}
          >
            <div className="absolute top-0 right-0 p-2 opacity-[0.03]" style={{ color: '#0f172a' }}>
              <ShieldCheck size={60} />
            </div>
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center mb-1.5"
              style={{
                backgroundColor: '#10b981',
                boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.3)'
              }}
            >
              <CheckCircle2 size={16} style={{ color: '#ffffff' }} />
            </div>
            <h2 className="text-base font-black tracking-tight" style={{ color: '#0f172a' }}>Transfer Success</h2>
            <p className="text-[8px] font-black uppercase tracking-widest mt-0.5" style={{ color: '#047857' }}>
              Earnwise Digital Media
            </p>
          </div>

          {/* Body Details */}
          <div className="p-3.5 space-y-2.5" style={{ backgroundColor: '#ffffff' }}>
            <div className="text-center py-0.5">
              <p className="text-[7.5px] font-bold uppercase tracking-widest mb-0.5" style={{ color: '#94a3b8' }}>Payout Disbursed</p>
              <h3 className="text-xl sm:text-2xl font-black tracking-tight" style={{ color: '#0f172a' }}>
                ₦{receipt.netPayout.toLocaleString()}
              </h3>
            </div>

            {/* Structured Table Info */}
            <div 
              className="space-y-1.5 pt-1.5 text-[10px] sm:text-[11px]"
              style={{
                borderTopColor: '#f1f5f9',
                borderTopWidth: '1px',
                borderTopStyle: 'solid'
              }}
            >
              <div className="flex justify-between items-center">
                <span className="font-semibold" style={{ color: '#64748b' }}>Reference ID</span>
                <span 
                  className="font-bold font-mono px-1 py-0.5 rounded text-[8.5px] uppercase"
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
                <span className="font-bold text-right max-w-[120px] truncate" style={{ color: '#0f172a' }}>
                  {receipt.accountName || 'N/A'}
                </span>
              </div>
            </div>

            {/* Breakdown */}
            <div 
              className="space-y-0.5 pt-2 text-[9px] sm:text-[10px]"
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
              className="pt-1.5 flex justify-center"
              style={{
                borderTopColor: '#f8fafc',
                borderTopWidth: '1px',
                borderTopStyle: 'solid'
              }}
            >
              <div className="flex items-center gap-1">
                <ShieldCheck size={10} style={{ color: '#10b981', opacity: 0.4 }} />
                <span className="text-[7px] uppercase tracking-widest font-black" style={{ color: '#94a3b8' }}>
                  Verified Secure Transaction
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-2.5 flex gap-2">
          <button
            onClick={handleDownload}
            disabled={downloading || sharing}
            className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 active:scale-95 transition-all text-white py-2 rounded-lg font-black text-[10px] uppercase tracking-wider shadow flex justify-center items-center gap-1 cursor-pointer"
          >
            {downloading ? (
              <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Download size={11} />
                <span>Save</span>
              </>
            )}
          </button>
          <button
            onClick={handleNativeShare}
            disabled={downloading || sharing}
            className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 active:scale-95 transition-all text-white py-2 rounded-lg font-black text-[10px] uppercase tracking-wider shadow flex justify-center items-center gap-1 cursor-pointer"
          >
            {sharing ? (
              <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Share2 size={11} />
                <span>Share Proof</span>
              </>
            )}
          </button>
        </div>

        {/* Social Share Drawer Options - Flawless multi-platform fallbacks */}
        <AnimatePresence>
          {showShareOptions && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-2.5 bg-slate-900 border border-slate-800 rounded-xl p-2.5 space-y-2 overflow-hidden shadow-2xl"
            >
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest text-center">
                Share Proof to Social Platforms
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => shareToPlatform('whatsapp')}
                  className="bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 rounded-lg p-2 flex flex-col items-center justify-center gap-1 active:scale-95 transition-all text-[9px] font-bold border border-emerald-500/20 cursor-pointer"
                >
                  <MessageCircle size={14} className="fill-emerald-400" />
                  <span>WhatsApp</span>
                </button>
                <button
                  onClick={() => shareToPlatform('telegram')}
                  className="bg-sky-600/10 hover:bg-sky-600/20 text-sky-400 rounded-lg p-2 flex flex-col items-center justify-center gap-1 active:scale-95 transition-all text-[9px] font-bold border border-sky-500/20 cursor-pointer"
                >
                  <Send size={14} />
                  <span>Telegram</span>
                </button>
                <button
                  onClick={() => shareToPlatform('copy')}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg p-2 flex flex-col items-center justify-center gap-1 active:scale-95 transition-all text-[9px] font-bold border border-slate-700 cursor-pointer"
                >
                  <Copy size={14} />
                  <span>Copy Link</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
