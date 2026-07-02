import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Download, ShieldCheck, X, Share2, Info, Copy, MessageCircle, Send, Check } from 'lucide-react';
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
    withdrawalType?: string;
  };
  onClose: () => void;
}

// Robust utility to convert a Base64 data URL to a Blob
const dataURLtoBlob = (dataurl: string): Blob => {
  try {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)![1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  } catch (err) {
    console.error("Failed to parse base64 to blob:", err);
    throw err;
  }
};

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

const convertOklchToHex = (oklchStr: string): string => {
  try {
    const oklchRegex = /oklch\(\s*([0-9.%]+)\s+([0-9.%]+)\s+([0-9.]+)(?:\s*\/\s*([0-9.%]+))?\s*\)/gi;
    return oklchStr.replace(oklchRegex, (match, lStr, cStr, hStr, aStr) => {
      const l = lStr.endsWith('%') ? parseFloat(lStr) / 100 : parseFloat(lStr);
      const c = cStr.endsWith('%') ? parseFloat(cStr) / 100 : parseFloat(cStr);
      const h = parseFloat(hStr);
      const a = aStr ? (aStr.endsWith('%') ? parseFloat(aStr) / 100 : parseFloat(aStr)) : 1;
      
      if (c < 0.04) {
        const val = Math.round(l * 255);
        return `rgba(${val}, ${val}, ${val}, ${a})`;
      }
      if (h >= 110 && h <= 170) {
        return `rgba(${Math.round(l * 16)}, ${Math.round(l * 185)}, ${Math.round(l * 129)}, ${a})`;
      }
      if (h >= 180 && h <= 280) {
        return `rgba(${Math.round(l * 59)}, ${Math.round(l * 130)}, ${Math.round(l * 246)}, ${a})`;
      }
      if (h < 60 || h > 300) {
        return `rgba(${Math.round(l * 239)}, ${Math.round(l * 68)}, ${Math.round(l * 68)}, ${a})`;
      }
      if (l > 0.5) {
        return `rgba(241, 245, 249, ${a})`;
      }
      return `rgba(15, 23, 42, ${a})`;
    });
  } catch (err) {
    return '#1e293b';
  }
};

export default function TransactionReceipt({ receipt, onClose }: TransactionReceiptProps) {
  const { profile } = useAuth();
  const receiptRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [downloadedImage, setDownloadedImage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  const displayDate = receipt.processedAt instanceof Date 
    ? receipt.processedAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : (receipt.processedAt as any)?.toDate 
    ? (receipt.processedAt as any).toDate().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : receipt.processedAt 
    ? new Date(receipt.processedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  const displayTime = receipt.processedAt instanceof Date 
    ? receipt.processedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : (receipt.processedAt as any)?.toDate 
    ? (receipt.processedAt as any).toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : receipt.processedAt 
    ? new Date(receipt.processedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const inviteLink = profile?.referralCode 
    ? `${window.location.origin}/invite/${profile.referralCode}` 
    : `${window.location.origin}`;

  const shareText = `🧾 *EARNWISE OFFICIAL WITHDRAWAL* 🧾\n\n💰 Amount: ₦${receipt.netPayout.toLocaleString()}\n🏦 Bank: ${receipt.bankName || 'N/A'}\n🆔 Ref ID: EW-${receipt.id.toUpperCase().slice(0, 10)}\n📅 Date: ${displayDate} • ${displayTime}\n⚡ Status: SUCCESSFUL ✅\n\n🔗 Join & Start Earning Daily:\n${inviteLink}\n\n🎁 My Invitation Code: ${profile?.referralCode || 'N/A'}`;

  const generateCanvas = async (): Promise<HTMLCanvasElement | null> => {
    if (!receiptRef.current) return null;
    
    // Minor delay to ensure component render states are aligned
    await new Promise((resolve) => setTimeout(resolve, 150));

    const element = receiptRef.current;
    
    // Intercept main window getComputedStyle
    const originalGCS = window.getComputedStyle;
    window.getComputedStyle = function(el: Element, pseudoElt?: string | null) {
      const style = originalGCS.call(window, el, pseudoElt);
      return new Proxy(style, {
        get(target, prop) {
          const val = target[prop as any];
          if (typeof val === 'string' && val.includes('oklch')) {
            return convertOklchToHex(val);
          }
          return typeof val === 'function' ? val.bind(target) : val;
        }
      });
    };
    
    try {
      return await runWithCleanCanvas(async () => {
        return await html2canvas(element, {
          scale: 3, // 3x scale for ultra-sharp high-definition output
          backgroundColor: '#ffffff',
          useCORS: true,
          logging: false,
          width: element.offsetWidth,
          height: element.offsetHeight,
          scrollX: 0,
          scrollY: 0,
          windowWidth: document.documentElement.clientWidth,
          windowHeight: document.documentElement.clientHeight,
          onclone: (clonedDoc) => {
            // Intercept cloned iframe window getComputedStyle
            const clonedWin = clonedDoc.defaultView;
            if (clonedWin) {
              const originalClonedGCS = clonedWin.getComputedStyle;
              clonedWin.getComputedStyle = function(el: Element, pseudoElt?: string | null) {
                const style = originalClonedGCS.call(clonedWin, el, pseudoElt);
                return new Proxy(style, {
                  get(target, prop) {
                    const val = target[prop as any];
                    if (typeof val === 'string' && val.includes('oklch')) {
                      return convertOklchToHex(val);
                    }
                    return typeof val === 'function' ? val.bind(target) : val;
                  }
                });
              };
            }

            // 1. Sanitize all style tag innerHTMLs to replace 'oklch' which causes html2canvas to fail
            try {
              const styleTags = clonedDoc.getElementsByTagName('style');
              for (let i = 0; i < styleTags.length; i++) {
                try {
                  let css = styleTags[i].innerHTML;
                  if (css && css.includes('oklch')) {
                    css = css.replace(/oklch\([^)]+\)/g, '#1e293b');
                    styleTags[i].innerHTML = css;
                  }
                } catch (styleErr) {
                  console.warn("Could not clean style tag innerHTML:", styleErr);
                }
              }
            } catch (err) {
              console.warn("Error finding style tags:", err);
            }

            // 2. Sanitize all styleSheets rules to delete rules containing 'oklch'
            try {
              const sheets = clonedDoc.styleSheets;
              for (let i = 0; i < sheets.length; i++) {
                try {
                  const sheet = sheets[i];
                  const rules = sheet.cssRules || sheet.rules;
                  if (!rules) continue;
                  for (let j = rules.length - 1; j >= 0; j--) {
                    try {
                      const rule = rules[j];
                      if (rule && rule.cssText && rule.cssText.includes('oklch')) {
                        sheet.deleteRule(j);
                      }
                    } catch (ruleErr) {
                      // Ignore individual rule access errors (e.g., cross-origin style limits)
                    }
                  }
                } catch (sheetErr) {
                  console.warn("Could not access sheet rules (CORS restricted?):", sheetErr);
                }
              }
            } catch (err) {
              console.warn("Error sanitizing document stylesheets:", err);
            }

            // 3. Sanitize inline style attributes for any element containing 'oklch'
            try {
              const allEls = clonedDoc.getElementsByTagName('*');
              for (let i = 0; i < allEls.length; i++) {
                const el = allEls[i] as HTMLElement;
                if (el && el.style) {
                  const inlineStyle = el.getAttribute('style') || '';
                  if (inlineStyle.includes('oklch')) {
                    el.setAttribute('style', inlineStyle.replace(/oklch\([^)]+\)/g, '#1e293b'));
                  }
                }
              }
            } catch (err) {
              console.warn("Error sanitizing inline styles:", err);
            }

            // 4. Inside the cloned document, find our receipt card and reset transforms/scales
            const clonedCard = clonedDoc.getElementById('earnwise-receipt-card');
            if (clonedCard) {
              (clonedCard as HTMLElement).style.transform = 'none';
              (clonedCard as HTMLElement).style.margin = '0';
              (clonedCard as HTMLElement).style.padding = '0';
              (clonedCard as HTMLElement).style.width = `${element.offsetWidth}px`;
              (clonedCard as HTMLElement).style.height = `${element.offsetHeight}px`;
            }
          }
        });
      });
    } finally {
      // Restore main window getComputedStyle
      window.getComputedStyle = originalGCS;
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const canvas = await generateCanvas();
      if (!canvas) throw new Error("Could not construct canvas element");
      
      const dataUrl = canvas.toDataURL('image/png');
      
      // Attempt standard browser download first
      try {
        const link = document.createElement('a');
        link.download = `earnwise_receipt_${receipt.id.slice(0, 8)}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (clickErr) {
        console.warn("Programmatic anchor click failed, relying on visual image pop-up:", clickErr);
      }
      
      // Display the high-fidelity image in the bulletproof modal overlay so users can easily save it via long press
      setDownloadedImage(dataUrl);
      triggerToast("Receipt Generated! 💾");
    } catch (err) {
      console.error("Failed to generate receipt image:", err);
      triggerToast("Downloading failed. Copying details instead...");
      copyBothToClipboard();
    } finally {
      setDownloading(false);
    }
  };

  const copyBothToClipboard = async () => {
    setSharing(true);
    try {
      const canvas = await generateCanvas();
      if (!canvas) throw new Error("Could not construct canvas");
      
      const dataUrl = canvas.toDataURL('image/png');
      const blob = dataURLtoBlob(dataUrl);
      const textBlob = new Blob([shareText], { type: 'text/plain' });

      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard && navigator.clipboard.write) {
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/plain': textBlob,
            [blob.type]: blob
          })
        ]);
        triggerToast("Receipt image & text copied! Paste it in your chat! 📋✨");
      } else {
        await navigator.clipboard.writeText(shareText);
        triggerToast("Text copied! Save the image to share both.");
      }
    } catch (e) {
      console.warn("ClipboardItem not supported or writing failed:", e);
      try {
        await navigator.clipboard.writeText(shareText);
        triggerToast("Text copied! Save the image to share both.");
      } catch (innerErr) {
        triggerToast("Failed to copy. Please take a screenshot.");
      }
    } finally {
      setSharing(false);
    }
  };

  const shareToPlatform = async (platform: 'whatsapp' | 'telegram' | 'copy') => {
    if (platform === 'whatsapp') {
      try {
        const canvas = await generateCanvas();
        if (canvas) {
          const dataUrl = canvas.toDataURL('image/png');
          const blob = dataURLtoBlob(dataUrl);
          const textBlob = new Blob([shareText], { type: 'text/plain' });
          if (typeof ClipboardItem !== 'undefined' && navigator.clipboard && navigator.clipboard.write) {
            await navigator.clipboard.write([
              new ClipboardItem({
                'text/plain': textBlob,
                [blob.type]: blob
              })
            ]);
            triggerToast("Receipt & text copied! Opening WhatsApp... 🟢📋");
          } else {
            await navigator.clipboard.writeText(shareText);
            triggerToast("Text copied! Opening WhatsApp... 🟢");
          }
        }
      } catch (e) {
        try {
          await navigator.clipboard.writeText(shareText);
        } catch (err) {}
      }
      setTimeout(() => {
        const isMobileDevice = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        const url = isMobileDevice 
          ? `whatsapp://send?text=${encodeURIComponent(shareText)}`
          : `https://wa.me/?text=${encodeURIComponent(shareText)}`;
        
        if (isMobileDevice) {
          window.location.href = url;
        } else {
          window.open(url, '_blank');
        }
      }, 800);
    } else if (platform === 'telegram') {
      try {
        const canvas = await generateCanvas();
        if (canvas) {
          const dataUrl = canvas.toDataURL('image/png');
          const blob = dataURLtoBlob(dataUrl);
          const textBlob = new Blob([shareText], { type: 'text/plain' });
          if (typeof ClipboardItem !== 'undefined' && navigator.clipboard && navigator.clipboard.write) {
            await navigator.clipboard.write([
              new ClipboardItem({
                'text/plain': textBlob,
                [blob.type]: blob
              })
            ]);
            triggerToast("Receipt & text copied! Opening Telegram... 🔵📋");
          } else {
            await navigator.clipboard.writeText(shareText);
            triggerToast("Text copied! Opening Telegram... 🔵");
          }
        }
      } catch (e) {
        try {
          await navigator.clipboard.writeText(shareText);
        } catch (err) {}
      }
      setTimeout(() => {
        const isMobileDevice = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        const url = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(shareText)}`;
        
        if (isMobileDevice) {
          window.location.href = url;
        } else {
          window.open(url, '_blank');
        }
      }, 800);
    } else {
      await copyBothToClipboard();
    }
  };

  const handleNativeShare = async () => {
    setSharing(true);
    try {
      const canvas = await generateCanvas();
      if (!canvas) throw new Error("Could not construct canvas");

      const dataUrl = canvas.toDataURL('image/png');
      const blob = dataURLtoBlob(dataUrl);
      const file = new File([blob], `earnwise_receipt_${receipt.id.slice(0, 8)}.png`, { type: 'image/png' });

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
          triggerToast("Text proof shared! Choose options below to copy receipt.");
        }
      }
      
      // Fallback
      setDownloadedImage(dataUrl);
      setShowShareOptions(true);
      triggerToast("Choose options below!");
    } catch (err) {
      console.warn("Native sharing failed, opening options:", err);
      setShowShareOptions(true);
      triggerToast("Choose sharing option below!");
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-2.5 select-none">
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
            className="absolute top-4 left-1/2 -translate-x-1/2 z-[300] bg-slate-900 border border-slate-800 text-white px-4 py-2 rounded-xl text-[10px] font-black shadow-2xl flex items-center gap-2 whitespace-nowrap"
          >
            <Info size={12} className="text-blue-400 animate-pulse" />
            <span>{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ scale: 0.95, y: 15, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        className="relative w-full max-w-[240px] xs:max-w-[260px] sm:max-w-[300px] z-10"
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute -top-9 right-0 p-1.5 bg-white/10 text-white rounded-full hover:bg-white/25 transition-colors cursor-pointer"
        >
          <X size={14} />
        </button>

        {/* The Receipt Wrapper - Reduced sizing and padding for flawless mobile fit */}
        <div 
          ref={receiptRef}
          id="earnwise-receipt-card"
          className="rounded-xl overflow-hidden shadow-xl relative p-0"
          style={{
            backgroundColor: '#ffffff',
            borderColor: '#e2e8f0',
            borderWidth: '1px',
            borderStyle: 'solid',
            fontFamily: '"Inter", sans-serif'
          }}
        >
          {/* Top Decorative Payout Bar */}
          <div style={{ height: '4px', backgroundColor: '#10b981' }} />

          {/* Header Area */}
          <div 
            className="p-2 sm:p-2.5 flex flex-col items-center justify-center relative"
            style={{
              backgroundColor: '#f8fafc',
              borderBottomColor: '#f1f5f9',
              borderBottomWidth: '1px',
              borderBottomStyle: 'solid'
            }}
          >
            <div className="absolute top-1.5 right-1.5 opacity-[0.05]" style={{ color: '#0f172a' }}>
              <ShieldCheck size={36} />
            </div>

            {/* Official Logo Text */}
            <div className="flex items-center gap-1 mb-0.5">
              <span className="text-[11px] sm:text-xs font-black tracking-tight" style={{ color: '#0f172a' }}>EARN</span>
              <span className="text-[9px] sm:text-[10px] font-black tracking-tight px-1 py-0.5 rounded text-white" style={{ backgroundColor: '#10b981' }}>WISE</span>
            </div>

            <p className="text-[6.5px] sm:text-[7px] font-black uppercase tracking-widest text-slate-400 mt-0.5">
              OFFICIAL DISBURSEMENT RECEIPT
            </p>
          </div>

          {/* Success Status Banner */}
          <div className="py-1.5 px-2 flex items-center justify-center gap-1" style={{ backgroundColor: '#f0fdf4' }}>
            <div 
              className="w-3 h-3 rounded-full flex items-center justify-center"
              style={{ backgroundColor: '#10b981' }}
            >
              <Check size={7} style={{ color: '#ffffff' }} />
            </div>
            <span className="text-[7.5px] sm:text-[8px] font-black uppercase tracking-widest" style={{ color: '#166534' }}>
              TRANSACTION SUCCESSFUL
            </span>
          </div>

          {/* Body Details */}
          <div className="p-2.5 sm:p-3 space-y-2.5 sm:space-y-3" style={{ backgroundColor: '#ffffff' }}>
            {/* Net Amount Display */}
            <div className="text-center py-0.5">
              <p className="text-[7px] sm:text-[7.5px] font-bold uppercase tracking-widest mb-0.5 animate-pulse" style={{ color: '#10b981' }}>
                🟢 Disbursed Successfully
              </p>
              <h3 className="text-lg sm:text-xl font-black tracking-tighter" style={{ color: '#0f172a' }}>
                ₦{receipt.netPayout.toLocaleString()}
              </h3>
              <p className="text-[7.5px] sm:text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                NET PAYOUT AMOUNT
              </p>
            </div>

            {/* Dash Divider */}
            <div style={{ borderTop: '1px dashed #cbd5e1', height: '1px' }} />

            {/* Transaction Data Table */}
            <div className="space-y-1.5 text-[8.5px] sm:text-[9.5px]">
              <div className="flex justify-between items-start gap-1.5">
                <span className="font-bold uppercase tracking-wide text-[7px] sm:text-[7.5px] whitespace-nowrap pt-[2px]" style={{ color: '#64748b' }}>Reference ID</span>
                <span 
                  className="font-black font-mono px-1 py-0.5 rounded text-[7.5px] sm:text-[8px] uppercase break-all text-right max-w-[110px] sm:max-w-[140px]"
                  style={{
                    color: '#0f172a',
                    backgroundColor: '#f8fafc',
                    borderColor: '#e2e8f0',
                    borderWidth: '1px',
                    borderStyle: 'solid'
                  }}
                >
                  EW-{receipt.id.toUpperCase().slice(0, 10)}
                </span>
              </div>
              <div className="flex justify-between items-center gap-1.5">
                <span className="font-bold uppercase tracking-wide text-[7px] sm:text-[7.5px] whitespace-nowrap" style={{ color: '#64748b' }}>Date & Time</span>
                <span className="font-extrabold text-[8px] sm:text-[9px] text-right" style={{ color: '#0f172a' }}>
                  {displayDate} • {displayTime}
                </span>
              </div>
              <div className="flex justify-between items-center gap-1.5">
                <span className="font-bold uppercase tracking-wide text-[7px] sm:text-[7.5px] whitespace-nowrap" style={{ color: '#64748b' }}>Payout Type</span>
                <span className={`font-extrabold text-[8px] sm:text-[9px] text-right uppercase ${receipt.withdrawalType === 'referral' ? 'text-emerald-600' : 'text-blue-600'}`}>
                  {receipt.withdrawalType === 'referral' ? 'Referral Payout' : 'Video Task Payout'}
                </span>
              </div>
              <div className="flex justify-between items-center gap-1.5">
                <span className="font-bold uppercase tracking-wide text-[7px] sm:text-[7.5px] whitespace-nowrap" style={{ color: '#64748b' }}>Recipient Bank</span>
                <span className="font-extrabold text-[8px] sm:text-[9px] text-right" style={{ color: '#0f172a' }}>{receipt.bankName || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-start gap-1.5">
                <span className="font-bold uppercase tracking-wide text-[7px] sm:text-[7.5px] whitespace-nowrap pt-[1px]" style={{ color: '#64748b' }}>Account Name</span>
                <span className="font-extrabold text-right break-words text-[8px] sm:text-[9px] leading-tight max-w-[110px] sm:max-w-[140px]" style={{ color: '#0f172a' }}>
                  {receipt.accountName || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center gap-1.5">
                <span className="font-bold uppercase tracking-wide text-[7px] sm:text-[7.5px] whitespace-nowrap" style={{ color: '#64748b' }}>Payment Engine</span>
                <span className="font-extrabold text-emerald-600 flex items-center gap-1 text-[8px] sm:text-[9px]">
                  <ShieldCheck size={9} className="text-emerald-500" />
                  Paystack Secure
                </span>
              </div>
            </div>

            {/* Dash Divider */}
            <div style={{ borderTop: '1px dashed #cbd5e1', height: '1px' }} />

            {/* Financial Calculations breakdown */}
            <div className="p-2 sm:p-2.5 rounded-lg space-y-1 text-[8px] sm:text-[9px]" style={{ backgroundColor: '#f8fafc' }}>
              <div className="flex justify-between items-center">
                <span style={{ color: '#64748b' }} className="font-bold">Gross Amount</span>
                <span className="font-black" style={{ color: '#334155' }}>₦{receipt.amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span style={{ color: '#64748b' }} className="font-bold">
                  {receipt.withdrawalType === 'referral' ? 'Processing Fee (Free)' : 'Processing Fee (10%)'}
                </span>
                <span className="font-black" style={{ color: receipt.fee > 0 ? '#ef4444' : '#10b981' }}>
                  {receipt.fee > 0 ? `-₦${receipt.fee.toLocaleString()}` : 'Free'}
                </span>
              </div>
              <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '2px', marginBottom: '2px' }} />
              <div className="flex justify-between items-center pt-0.5">
                <span style={{ color: '#0f172a' }} className="font-black uppercase tracking-wider text-[7.5px] sm:text-[8px]">Total Disbursed</span>
                <span className="font-black text-[10px] sm:text-[11px]" style={{ color: '#10b981' }}>₦{receipt.netPayout.toLocaleString()}</span>
              </div>
            </div>

            {/* Simulated Secure Barcode Element for realistic official appearance */}
            <div className="flex flex-col items-center justify-center pt-0.5 pb-0.5 space-y-0.5">
              <div className="flex items-center justify-center gap-[1px] h-4 opacity-80">
                <div style={{ width: '1.5px', height: '100%', backgroundColor: '#0f172a' }} />
                <div style={{ width: '1px', height: '100%', backgroundColor: '#0f172a' }} />
                <div style={{ width: '2px', height: '100%', backgroundColor: '#0f172a' }} />
                <div style={{ width: '1px', height: '100%', backgroundColor: '#0f172a' }} />
                <div style={{ width: '1.5px', height: '100%', backgroundColor: '#0f172a' }} />
                <div style={{ width: '3px', height: '100%', backgroundColor: '#0f172a' }} />
                <div style={{ width: '1px', height: '100%', backgroundColor: '#0f172a' }} />
                <div style={{ width: '2px', height: '100%', backgroundColor: '#0f172a' }} />
                <div style={{ width: '1.5px', height: '100%', backgroundColor: '#0f172a' }} />
                <div style={{ width: '1px', height: '100%', backgroundColor: '#0f172a' }} />
                <div style={{ width: '2px', height: '100%', backgroundColor: '#0f172a' }} />
                <div style={{ width: '1.5px', height: '100%', backgroundColor: '#0f172a' }} />
                <div style={{ width: '1px', height: '100%', backgroundColor: '#0f172a' }} />
                <div style={{ width: '3px', height: '100%', backgroundColor: '#0f172a' }} />
              </div>
              <span className="text-[6px] sm:text-[6.5px] font-mono uppercase tracking-[0.2em]" style={{ color: '#64748b' }}>
                SECURE-PAY-EW-{receipt.id.toUpperCase().slice(0, 8)}
              </span>
            </div>

            {/* Verified Indicator Badge */}
            <div className="flex justify-center pt-0.5">
              <div className="flex items-center gap-1 py-0.5 px-2 rounded-full" style={{ backgroundColor: '#f0fdf4' }}>
                <ShieldCheck size={9} style={{ color: '#10b981' }} />
                <span className="text-[6.5px] sm:text-[7px] uppercase tracking-widest font-black" style={{ color: '#15803d' }}>
                  Secured & Escrow Verified
                </span>
              </div>
            </div>
          </div>

          {/* Footer Branding Area */}
          <div 
            className="p-2 text-center"
            style={{
              backgroundColor: '#f8fafc',
              borderTopColor: '#f1f5f9',
              borderTopWidth: '1px',
              borderTopStyle: 'solid'
            }}
          >
            <p className="text-[6.5px] sm:text-[7px] font-black uppercase tracking-wider" style={{ color: '#94a3b8' }}>
              Earnwise Digital Media Limited • RC 1794021
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-2.5 flex gap-1.5">
          <button
            onClick={handleDownload}
            disabled={downloading || sharing}
            className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 active:scale-95 transition-all text-white py-2 rounded-lg font-black text-[9px] uppercase tracking-wider shadow flex justify-center items-center gap-1 cursor-pointer"
          >
            {downloading ? (
              <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Download size={10} />
                <span>Save to Gallery</span>
              </>
            )}
          </button>
          <button
            onClick={handleNativeShare}
            disabled={downloading || sharing}
            className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 active:scale-95 transition-all text-white py-2 rounded-lg font-black text-[9px] uppercase tracking-wider shadow flex justify-center items-center gap-1 cursor-pointer"
          >
            {sharing ? (
              <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Share2 size={10} />
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
              className="mt-2.5 bg-slate-900 border border-slate-800 rounded-xl p-2.5 space-y-2.5 overflow-hidden shadow-2xl"
            >
              <div className="space-y-0.5">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest text-center">
                  Share Proof to Social Platforms
                </p>
                <p className="text-[7.5px] font-bold text-emerald-400 text-center animate-pulse">
                  💡 Tip: Sharing copies BOTH the official receipt image & text!
                </p>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => shareToPlatform('whatsapp')}
                  className="bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 rounded-lg p-2 flex flex-col items-center justify-center gap-1 active:scale-95 transition-all text-[8.5px] font-black uppercase tracking-wide border border-emerald-500/20 cursor-pointer"
                >
                  <MessageCircle size={13} className="fill-emerald-400" />
                  <span>WhatsApp</span>
                </button>
                <button
                  onClick={() => shareToPlatform('telegram')}
                  className="bg-sky-600/10 hover:bg-sky-600/20 text-sky-400 rounded-lg p-2 flex flex-col items-center justify-center gap-1 active:scale-95 transition-all text-[8.5px] font-black uppercase tracking-wide border border-sky-500/20 cursor-pointer"
                >
                  <Send size={13} />
                  <span>Telegram</span>
                </button>
                <button
                  onClick={() => shareToPlatform('copy')}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg p-2 flex flex-col items-center justify-center gap-1 active:scale-95 transition-all text-[8.5px] font-black uppercase tracking-wide border border-slate-700 cursor-pointer"
                >
                  <Copy size={13} />
                  <span>Copy Text</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Bulletproof generated-image overlay (Fallback overlay) */}
      <AnimatePresence>
        {downloadedImage && (
          <div className="fixed inset-0 z-[300] flex flex-col items-center justify-center p-3 bg-slate-950/95 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-[280px] sm:max-w-[320px] flex flex-col items-center text-center space-y-3"
            >
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Download className="animate-bounce" size={16} />
              </div>
              
              <div className="space-y-0.5">
                <h3 className="text-xs font-black text-white uppercase tracking-wider">Receipt Generated! 💾</h3>
                <p className="text-[9px] text-slate-300 font-bold px-3 leading-relaxed">
                  To save to your Gallery or share directly, <span className="text-emerald-400 font-black">press and hold</span> the image below and select <span className="text-emerald-400 font-black">"Save Image"</span> or <span className="text-emerald-400 font-black">"Share"</span>.
                </p>
              </div>

              {/* High-definition rendered image */}
              <div className="bg-white rounded-xl overflow-hidden shadow-2xl border border-slate-800 max-h-[50vh] overflow-y-auto w-full">
                <img 
                  src={downloadedImage} 
                  alt="Earnwise Official Receipt" 
                  className="w-full h-auto object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="flex gap-1.5 w-full pt-1">
                <button
                  onClick={() => setDownloadedImage(null)}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-white font-black text-[9px] uppercase tracking-widest rounded-lg border border-slate-700 active:scale-95 transition-all cursor-pointer"
                >
                  Close Preview
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

