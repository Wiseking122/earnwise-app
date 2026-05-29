import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      <header className="p-6 flex items-center gap-4 bg-white sticky top-0 z-10 border-b border-slate-100">
        <button 
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-600 active:scale-95 transition-all"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-black text-slate-900">Privacy Policy</h1>
      </header>

      <div className="p-8 max-w-2xl mx-auto space-y-8 pb-20">
        <div className="flex flex-col items-center gap-4 py-8">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center">
            <Shield size={32} />
          </div>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Last updated: May 2026</p>
        </div>

        <section className="space-y-4">
          <h2 className="text-2xl font-black text-slate-900">1. Information We Collect</h2>
          <p className="text-slate-600 leading-relaxed font-medium">
            We collect information you provide directly to us when you create an account, such as your name, email address, phone number, and any other information you choose to provide.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-black text-slate-900">2. How We Use Your Information</h2>
          <p className="text-slate-600 leading-relaxed font-medium">
            We use the information we collect to provide, maintain, and improve our services, including processing transactions, providing customer support, and sending you technical notices and security alerts.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-black text-slate-900">3. Data Security</h2>
          <p className="text-slate-600 leading-relaxed font-medium">
            We take reasonable measures to help protect information about you from loss, theft, misuse, and unauthorized access, disclosure, alteration, and destruction.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-black text-slate-900">4. Sharing of Information</h2>
          <p className="text-slate-600 leading-relaxed font-medium">
            We do not share your personal information with third parties except as described in this policy, such as with your consent or for legal purposes.
          </p>Section
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-black text-slate-900">5. Contact Us</h2>
          <p className="text-slate-600 leading-relaxed font-medium">
            If you have any questions about this Privacy Policy, please contact us at earnwise29@gmail.com.
          </p>
        </section>
      </div>
    </div>
  );
}
