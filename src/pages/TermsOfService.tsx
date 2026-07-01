import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function TermsOfService() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-transparent">
      <header className="p-6 flex items-center gap-4 bg-white sticky top-0 z-10 border-b border-slate-100">
        <button 
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-600 active:scale-95 transition-all"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-black text-slate-900">Terms of Service</h1>
      </header>

      <div className="p-8 max-w-2xl mx-auto space-y-8 pb-20">
        <div className="flex flex-col items-center gap-4 py-8">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center">
            <FileText size={32} />
          </div>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Last updated: July 1, 2026</p>
        </div>

        <section className="space-y-4">
          <h2 className="text-2xl font-black text-slate-900">1. Agreement to Terms</h2>
          <p className="text-slate-600 leading-relaxed font-medium">
            By accessing or using our services, you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the services.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-black text-slate-900">2. Eligibility & Account Security</h2>
          <p className="text-slate-600 leading-relaxed font-medium">
            You must be at least 18 years old to use our services. You are responsible for maintaining the confidentiality of your account credentials. You agree to accept responsibility for all activities that occur under your account. Multiple account creation or sybil exploits will result in immediate termination.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-black text-slate-900">3. Earnings & Membership Plans</h2>
          <p className="text-slate-600 leading-relaxed font-medium">
            Users may activate subscription plans to unlock multiplier rewards and video tasks. Each plan contains strict daily task limits and a total life cycle earnings cap. Once a plan reaches its total payout capacity, users must renew or upgrade their tier to continue earning. Coupon codes or third-party sellers are unauthorized.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-black text-slate-900">4. Dual-Wallet Payout & Processing Fees</h2>
          <p className="text-slate-600 leading-relaxed font-medium">
            Earnwise manages user earnings through two dedicated channels:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-slate-600 font-medium text-sm">
            <li><strong>Referral Wallet</strong>: Weekly payouts occur on <strong>Saturdays (8:00 AM - 6:00 PM UTC+1)</strong>. Processing is free (0% fee).</li>
            <li><strong>Video Tasks Wallet</strong>: Monthly payouts are processed on the <strong>30th of every month</strong>. A 10% maintenance and network processing fee is deducted from task withdrawals.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-black text-slate-900">5. Prohibited Conduct</h2>
          <p className="text-slate-600 leading-relaxed font-medium">
            You agree not to bypass device fingerprints, use virtual machines or automation scripts, upload manipulated task proof screenshots, or use the platform for unauthorized commercial advertising. Violations lead to asset forfeiture and account banning.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-black text-slate-900">6. Termination & Disclaimers</h2>
          <p className="text-slate-600 leading-relaxed font-medium">
            We reserve the right to terminate or suspend your account and access to the services at our sole discretion, without notice, for conduct that we believe violates these terms or is harmful to other users or us.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-black text-slate-900">7. Contact Us</h2>
          <p className="text-slate-600 leading-relaxed font-medium">
            For any questions regarding these Terms, please contact us at earnwise29@gmail.com.
          </p>
        </section>
      </div>
    </div>
  );
}
