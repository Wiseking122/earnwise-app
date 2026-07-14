import Layout from '../components/Layout';
import { motion } from 'motion/react';
import { 
  CheckCircle2, 
  Users, 
  Zap, 
  Trophy, 
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Target,
  Sparkles,
  Award
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function EarningsOutline() {
  const steps = [
    {
      icon: Target,
      title: "1. Complete Daily Tasks",
      color: "bg-blue-500",
      description: "Log in daily to perform simple tasks like liking posts, following accounts, or watching ads. Each task pays real cash into your balance instantly.",
      features: ["Social Media Tasks", "Premium CPA Offers", "Ad Viewing"]
    },
    {
      icon: Users,
      title: "2. Build Your Team",
      color: "bg-purple-500",
      description: "Invite your friends using your unique referral code. You earn a 30% commission on every friend who activates a plan.",
      features: ["Passive Income", "30% Commission"]
    },
    {
      icon: Zap,
      title: "3. Upgrade Your Plan",
      color: "bg-indigo-500",
      description: "Unlock up to 5x higher rewards by upgrading to a Pro Plan. Pro members get priority access to exclusive, high-value tasks.",
      features: ["Multiplier Bonuses", "Exclusive Jobs", "Priority Support"]
    },
    {
      icon: Trophy,
      title: "4. Dominate the Rankings",
      color: "bg-amber-500",
      description: "Compete with other earners on the global leaderboard. The top 10 earners every week receive massive cash bonuses and legendary badges.",
      features: ["Weekly Payouts", "Elite Badges", "Global Recognition"]
    }
  ];

  return (
    <Layout title="Earnings Outline">
      <div className="p-6 space-y-10 max-w-2xl mx-auto pb-32">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-20 h-20 bg-emerald-500 rounded-[2rem] flex items-center justify-center mx-auto shadow-xl shadow-emerald-200"
          >
            <TrendingUp size={40} className="text-white" />
          </motion.div>
          <div className="space-y-2">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">The Earnings Outline</h1>
            <p className="text-slate-500 font-medium max-w-xs mx-auto">Follow these 4 proven steps to build consistent digital wealth with Earnwise.</p>
          </div>
        </div>

        {/* Outline Steps */}
        <div className="space-y-8">
          {steps.map((step, index) => (
            <motion.div 
              key={index}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="relative group pb-8 last:pb-0"
            >
              {index !== steps.length - 1 && (
                <div className="absolute left-[23px] top-12 bottom-0 w-[2px] bg-slate-100 group-hover:bg-blue-100 transition-colors" />
              )}
              
              <div className="flex gap-6">
                <div className={`w-12 h-12 shrink-0 ${step.color} text-white rounded-2xl flex items-center justify-center shadow-lg transform group-hover:rotate-6 transition-transform z-10`}>
                  <step.icon size={24} />
                </div>
                <div className="space-y-3 pt-1">
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">{step.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed font-medium">
                    {step.description}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {step.features.map((feature, fIndex) => (
                      <span key={fIndex} className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Trust & Verification */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          className="bg-slate-900 rounded-[3rem] p-8 text-white relative overflow-hidden group"
        >
          <div className="relative z-10 space-y-6">
             <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-500 rounded-2xl">
                  <ShieldCheck size={28} />
                </div>
                <div>
                  <h4 className="text-lg font-black tracking-tight">Verified Real Money</h4>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Secure Withdrawals via Paystack</p>
                </div>
             </div>
             
             <p className="text-sm text-slate-300 font-medium leading-relaxed">
               Every kobo you earn on Earnwise is real money. You can withdraw directly to any Nigerian bank account once you hit the minimum withdrawal threshold.
             </p>

             <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 bg-white/5 p-3 rounded-2xl border border-white/10">
                  <Award size={18} className="text-emerald-400" />
                  <span className="text-xs font-black text-white uppercase tracking-tighter">Instant Approval</span>
                </div>
                <div className="flex items-center gap-2 bg-white/5 p-3 rounded-2xl border border-white/10">
                  <Sparkles size={18} className="text-blue-400" />
                  <span className="text-xs font-black text-white uppercase tracking-tighter">Premium Support</span>
                </div>
             </div>
          </div>
          <div className="absolute top-0 right-0 w-48 h-48 rounded-full pointer-events-none -mr-12 -mt-12" style={{ background: 'radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%)' }} />
        </motion.div>

        {/* Action Button */}
        <div className="pt-6">
          <Link 
            to="/tasks"
            className="flex items-center justify-center gap-3 w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-[2rem] shadow-xl shadow-blue-200 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Start Earning Real Money
            <ArrowRight size={20} />
          </Link>
        </div>
      </div>
    </Layout>
  );
}
