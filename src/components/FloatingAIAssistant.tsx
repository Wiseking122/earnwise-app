import { useState, useRef, useEffect } from 'react';
import { getApiUrl, WS_BASE_URL } from '../lib/config';
import { motion, AnimatePresence } from 'motion/react';
import { Bot, X, Send, Sparkles } from 'lucide-react';

export default function FloatingAIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'ai', content: string, image?: string}[]>([
    { role: 'ai', content: "Welcome to EarnWise! I am Wise AI, your mentor proudly owned by EarnWise and sponsored by Google, CPX Limited, Giminai, Adsense, Dune & Oak. I'm here to help you maximize your earnings on Nigeria's largest digital task network.\n\nTo activate your account and start earning, simply fund your wallet via Paystack on the Upgrade page and select your preferred tier!" }
  ]);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const connect = () => {
    const socket = new WebSocket(WS_BASE_URL);
    
    socket.onopen = () => console.log('WS Connection Open');
    
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'chunk') {
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last && last.role === 'ai' && !last.image) {
            const updated = [...prev];
            updated[updated.length - 1] = { ...last, content: last.content + data.content };
            return updated;
          } else {
            return [...prev, { role: 'ai', content: data.content }];
          }
        });
      } else if (data.type === 'image') {
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last && last.role === 'ai') {
            const updated = [...prev];
            updated[updated.length - 1] = { ...last, image: data.url };
            return updated;
          } else {
            return [...prev, { role: 'ai', content: '', image: data.url }];
          }
        });
      } else if (data.type === 'status') {
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last && last.role === 'ai' && last.content.includes(data.message)) return prev;
          return [...prev, { role: 'ai', content: `✨ ${data.message}` }];
        });
      } else if (data.type === 'done') {
        setLoading(false);
      } else if (data.type === 'error') {
        setMessages(prev => [...prev, { role: 'ai', content: "I'm having a little trouble with the connection right now. Please try again in a moment, or refresh the page if the issue persists." }]);
        setLoading(false);
      }
    };

    socket.onerror = (err) => {
      console.error('WS Connection Error:', err);
    };

    socket.onclose = () => {
      console.log('WS Shared Connection Closed. Reconnecting in 3s...');
      setTimeout(connect, 3000);
    };
    
    wsRef.current = socket;
  };

  useEffect(() => {
    connect();
    return () => wsRef.current?.close();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const sendMessage = async (action: 'generate-text', p: string) => {
    if (!p.trim()) return;

    setLoading(true);
    setMessages(prev => [...prev, { role: 'user', content: p }]);
    setPrompt("");

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        message: p,
        history: messages.map(m => ({ 
          role: m.role === 'user' ? 'user' : 'model', 
          parts: [{ text: m.content }] 
        }))
      }));
    } else {
      // Fallback to HTTP POST with real-time stream reading
      try {
        const response = await fetch(getApiUrl('/api/ai/assistant'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'generate-text',
            payload: { 
              prompt: p,
              history: messages.map(m => ({
                role: m.role === 'user' ? 'user' : 'model',
                content: m.content
              }))
            }
          })
        });

        if (!response.body) {
          throw new Error("No response stream available");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let done = false;

        // Initialize empty AI message to start streaming content into
        setMessages(prev => [...prev, { role: 'ai', content: "" }]);
        setLoading(false);

        while (!done) {
          const { value, done: doneReading } = await reader.read();
          done = doneReading;
          const chunkValue = decoder.decode(value, { stream: !done });
          
          if (chunkValue) {
            setMessages(prev => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last && last.role === 'ai') {
                updated[updated.length - 1] = { ...last, content: last.content + chunkValue };
              }
              return updated;
            });
          }
        }
      } catch (err: any) {
        console.error("HTTP streaming error:", err);
        setMessages(prev => [...prev, { role: 'ai', content: "I'm experiencing a minor connectivity issue right now, but I'm here to help. Please try sending your message again in a moment, or ensure your network connection is stable." }]);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 left-6 bg-blue-600 text-white p-4 rounded-full shadow-2xl z-[2000] hover:scale-110 transition-transform"
      >
        <Bot size={24} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed bottom-40 left-6 w-80 h-[450px] bg-slate-900 border border-blue-500/30 rounded-3xl shadow-2xl z-[2001] flex flex-col overflow-hidden"
          >
            <div className="p-4 bg-slate-950 flex items-center justify-between border-b border-blue-500/20">
              <h3 className="text-white font-bold flex items-center gap-2"><Sparkles size={16} className="text-blue-400"/> EarnWise AI</h3>
              <button onClick={() => setIsOpen(false)}><X size={18} className="text-slate-400"/></button>
            </div>
            <div 
              ref={scrollRef}
              className="flex-1 p-4 overflow-y-auto space-y-4 scroll-smooth"
            >
              {messages.map((m, i) => (
                <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`p-3 rounded-2xl text-xs max-w-[85%] shadow-sm ${
                    m.role === 'user' 
                      ? 'bg-blue-600 text-white rounded-tr-none' 
                      : 'bg-slate-800 text-slate-100 rounded-tl-none border border-white/5'
                  }`}>
                    {m.image && (
                      <div className="mb-2 overflow-hidden rounded-lg bg-slate-900 border border-white/10">
                        <img 
                          src={m.image} 
                          alt="AI Guide"
                          className="w-full h-auto object-cover max-h-40"
                          referrerPolicy="no-referrer" 
                        />
                        <div className="p-1 px-2 bg-blue-600/20 flex items-center gap-1.5">
                          <Sparkles size={8} className="text-blue-400" />
                          <span className="text-[7px] font-black uppercase text-blue-400">Wise AI Visual Guide</span>
                        </div>
                      </div>
                    )}
                    <p className="leading-relaxed">{m.content}</p>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex items-center gap-2 p-3 bg-slate-800/50 rounded-2xl w-fit animate-pulse border border-blue-500/10">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></span>
                  </div>
                  <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest italic">Wise AI is writing...</span>
                </div>
              )}
            </div>
            <div className="p-3 border-t border-blue-500/20 bg-slate-950 flex gap-2">
              <input 
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                className="flex-1 bg-slate-900 border-none text-white rounded-lg p-2 text-xs"
                placeholder="Ask..."
                onKeyDown={(e) => e.key === 'Enter' && sendMessage('generate-text', prompt)}
              />
              <button 
                onClick={() => sendMessage('generate-text', prompt)} 
                className="p-2 bg-blue-600 rounded-lg"
              >
                <Send size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
