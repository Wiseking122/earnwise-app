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
        setTopUsers(snap.docs.map(doc => doc.data() as UserProfile));
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
            <Crown className="text-yellow-500" size={32} />
            Hall of Fame
          </h2>
          <p className="text-gray-500 font-medium">Top earners and legends of Earnwise</p>
        </div>

        {/* Top 3 Podium */}
        {!loading && topUsers.length >= 3 && (
          <div className="flex items-end justify-center gap-4 py-8">
            {/* Rank 2 */}
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 border-4 border-gray-200 flex items-center justify-center mb-2 overflow-hidden">
                <span className="text-xl font-bold">{topUsers[1].displayName[0]}</span>
              </div>
              <div className="h-24 w-20 bg-gray-200 rounded-t-xl flex flex-col items-center justify-center p-2">
                <span className="text-2xl font-black text-gray-600">2nd</span>
              </div>
              <p className="text-xs font-bold mt-2 truncate w-20 text-center">{topUsers[1].displayName}</p>
            </div>

            {/* Rank 1 */}
            <div className="flex flex-col items-center scale-110">
              <div className="w-20 h-20 rounded-full bg-yellow-50 border-4 border-yellow-400 flex items-center justify-center mb-2 overflow-hidden shadow-lg shadow-yellow-100">
                <span className="text-2xl font-bold">{topUsers[0].displayName[0]}</span>
              </div>
              <div className="h-32 w-24 bg-yellow-400 rounded-t-xl flex flex-col items-center justify-center p-2 text-white">
                <Medal size={32} className="mb-1" />
                <span className="text-3xl font-black">1st</span>
              </div>
              <p className="text-sm font-black mt-2 truncate w-24 text-center">{topUsers[0].displayName}</p>
            </div>

            {/* Rank 3 */}
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-orange-50 border-4 border-orange-200 flex items-center justify-center mb-2 overflow-hidden">
                <span className="text-xl font-bold">{topUsers[2].displayName[0]}</span>
              </div>
              <div className="h-20 w-20 bg-orange-200 rounded-t-xl flex flex-col items-center justify-center p-2">
                <span className="text-2xl font-black text-orange-600">3rd</span>
              </div>
              <p className="text-xs font-bold mt-2 truncate w-20 text-center">{topUsers[2].displayName}</p>
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
                  {user.displayName[0]}
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900 text-sm">{user.displayName}</h4>
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
