import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile } from '../types';
import { motion } from 'motion/react';
import { Trophy, Medal, Star, Crown } from 'lucide-react';

export default function Leaderboard() {
  const [topUsers, setTopUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const q = query(
          collection(db, 'users'), 
          orderBy('xp', 'desc'), 
          limit(20)
        );
        const snap = await getDocs(q);
        setTopUsers(snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
      } catch (err) {
        console.error("Error fetching leaderboard:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchLeaderboard();
  }, []);

  return (
    <Layout>
      <div className="p-4 space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-black text-gray-900 flex items-center justify-center gap-2">
            <Crown className="text-yellow-500 animate-bounce" size={32} />
            Hall of Fame
          </h2>
          <p className="text-gray-500 font-medium">Top earners and legends of Earnwise</p>
        </div>

        {/* Weekly Family Leaderboard Cash Prizes Promo Card */}
        <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-blue-950 rounded-[2.5rem] p-6 text-white border border-white/10 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl" />
          
          <div className="relative space-y-4">
            <div className="flex items-center justify-between">
              <span className="bg-blue-500/20 text-blue-300 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-blue-500/30">
                Weekly Family Event
              </span>
              <span className="text-[10px] font-bold text-slate-400">Resets: Every Sunday 11:59 PM</span>
            </div>
            
            <div className="space-y-1">
              <h3 className="text-xl font-black tracking-tight flex items-center gap-2">
                🏆 Leaderboard Cash Prizes
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Earn XP by watching video tasks, performing social media campaigns, and inviting active members. The top performers are automatically credited cash prizes weekly!
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="bg-white/5 border border-white/5 rounded-2xl p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-yellow-400/20 text-yellow-400 flex items-center justify-center font-black">
                  1st
                </div>
                <div>
                  <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Weekly Cash</p>
                  <p className="text-sm font-black text-yellow-400">₦15,000</p>
                </div>
              </div>
              
              <div className="bg-white/5 border border-white/5 rounded-2xl p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-300/20 text-slate-300 flex items-center justify-center font-black">
                  2nd
                </div>
                <div>
                  <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Weekly Cash</p>
                  <p className="text-sm font-black text-slate-300">₦8,000</p>
                </div>
              </div>

              <div className="bg-white/5 border border-white/5 rounded-2xl p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-600/20 text-amber-500 flex items-center justify-center font-black">
                  3rd
                </div>
                <div>
                  <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Weekly Cash</p>
                  <p className="text-sm font-black text-amber-500">₦4,000</p>
                </div>
              </div>

              <div className="bg-white/5 border border-white/5 rounded-2xl p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-400/20 text-blue-400 flex items-center justify-center font-black">
                  4-10
                </div>
                <div>
                  <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Consolation</p>
                  <p className="text-sm font-black text-blue-400">₦1,000</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Top 3 Podium */}
        {!loading && topUsers.length >= 3 && (
          <div className="flex items-end justify-center gap-4 py-8">
            {/* Rank 2 */}
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 border-4 border-slate-200 flex items-center justify-center mb-1 overflow-hidden">
                <span className="text-xl font-bold">{(topUsers[1]?.displayName || 'U')[0]}</span>
              </div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-tight bg-slate-200/50 px-2 py-0.5 rounded-full mb-1">
                ₦8,000 Prize
              </p>
              <div className="h-24 w-20 bg-gray-200 rounded-t-xl flex flex-col items-center justify-center p-2 shadow-sm">
                <span className="text-2xl font-black text-gray-600">2nd</span>
              </div>
              <p className="text-xs font-bold mt-2 truncate w-20 text-center">{topUsers[1]?.displayName || 'User'}</p>
            </div>

            {/* Rank 1 */}
            <div className="flex flex-col items-center scale-110">
              <div className="w-20 h-20 rounded-full bg-yellow-50 border-4 border-yellow-400 flex items-center justify-center mb-1 overflow-hidden shadow-lg shadow-yellow-100">
                <span className="text-2xl font-bold">{(topUsers[0]?.displayName || 'U')[0]}</span>
              </div>
              <p className="text-[9px] font-black text-yellow-600 uppercase tracking-tight bg-yellow-100 px-2.5 py-0.5 rounded-full mb-1">
                👑 ₦15,000 Prize
              </p>
              <div className="h-32 w-24 bg-yellow-400 rounded-t-xl flex flex-col items-center justify-center p-2 text-white shadow-md">
                <Medal size={32} className="mb-1" />
                <span className="text-3xl font-black">1st</span>
              </div>
              <p className="text-sm font-black mt-2 truncate w-24 text-center">{topUsers[0]?.displayName || 'User'}</p>
            </div>

            {/* Rank 3 */}
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-orange-50 border-4 border-orange-200 flex items-center justify-center mb-1 overflow-hidden">
                <span className="text-xl font-bold">{(topUsers[2]?.displayName || 'U')[0]}</span>
              </div>
              <p className="text-[9px] font-black text-orange-600 uppercase tracking-tight bg-orange-100 px-2 py-0.5 rounded-full mb-1">
                ₦4,000 Prize
              </p>
              <div className="h-20 w-20 bg-orange-200 rounded-t-xl flex flex-col items-center justify-center p-2 shadow-sm">
                <span className="text-2xl font-black text-orange-600">3rd</span>
              </div>
              <p className="text-xs font-bold mt-2 truncate w-20 text-center">{topUsers[2]?.displayName || 'User'}</p>
            </div>
          </div>
        )}

        {/* List of Rankings */}
        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
            <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Global Rankings</span>
            <Trophy size={16} className="text-gray-300" />
          </div>

          <div className="divide-y divide-gray-50">
            {loading ? (
              [1, 2, 3, 4, 5].map(i => (
                <div key={i} className="p-4 animate-pulse flex items-center gap-4">
                  <div className="w-6 h-6 bg-gray-100 rounded" />
                  <div className="w-10 h-10 bg-gray-100 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-100 rounded w-1/3" />
                  </div>
                </div>
              ))
            ) : topUsers.map((user, index) => (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                key={user.uid} 
                className="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors"
              >
                <span className={`w-6 text-center font-black ${
                  index === 0 ? 'text-yellow-500' : 
                  index === 1 ? 'text-gray-400' : 
                  index === 2 ? 'text-orange-400' : 
                  'text-gray-300'
                }`}>
                  {index + 1}
                </span>
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-600">
                  {(user.displayName || 'U')[0]}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-gray-900 text-sm">{user.displayName || 'Anonymous User'}</h4>
                    {index === 0 && (
                      <span className="bg-yellow-100 text-yellow-800 text-[9px] font-black px-1.5 py-0.5 rounded uppercase">
                        ₦15k Prize
                      </span>
                    )}
                    {index === 1 && (
                      <span className="bg-slate-100 text-slate-800 text-[9px] font-black px-1.5 py-0.5 rounded uppercase">
                        ₦8k Prize
                      </span>
                    )}
                    {index === 2 && (
                      <span className="bg-amber-100 text-amber-800 text-[9px] font-black px-1.5 py-0.5 rounded uppercase">
                        ₦4k Prize
                      </span>
                    )}
                    {index >= 3 && index < 10 && (
                      <span className="bg-blue-50 text-blue-700 text-[9px] font-black px-1.5 py-0.5 rounded uppercase">
                        ₦1k Prize
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase">Level {user.level || 1}</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-blue-600 flex items-center gap-1 justify-end">
                    <Star size={14} className="fill-blue-600" />
                    {(user.xp || 0).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase">XP</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
