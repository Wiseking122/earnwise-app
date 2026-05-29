import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { TrendingUp, Sparkles } from 'lucide-react';
import { safeStorage } from '../lib/storage';

export default function Invite() {
  const { code } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (code) {
      safeStorage.setItem('referralCode', code);
      console.log('Referral code saved:', code);
    }
    // Small delay for better UX feel
    const timer = setTimeout(() => {
      navigate('/welcome', { replace: true });
    }, 1500);
    return () => clearTimeout(timer);
  }, [code, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="text-center space-y-6">
        <motion.div 
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-24 h-24 bg-blue-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl shadow-blue-200"
        >
          <TrendingUp size={48} className="text-white" />
        </motion.div>
        
        <div className="space-y-2">
          <h2 className="text-3xl font-black text-gray-900">Welcome to Earnwise</h2>
          <p className="text-gray-500 font-medium flex items-center justify-center gap-2">
            <Sparkles size={16} className="text-blue-500" />
            Preparing your invitation...
          </p>
        </div>

        <div className="flex justify-center gap-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ 
                scale: [1, 1.5, 1],
                opacity: [0.3, 1, 0.3]
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.2
              }}
              className="w-3 h-3 bg-blue-600 rounded-full"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
