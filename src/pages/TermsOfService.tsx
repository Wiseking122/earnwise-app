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
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Last updated: May 2026</p>
        </div>

        <section className="space-y-4">
          <h2 className="text-2xl font-black text-slate-900">1. Agreement to Terms</h2>
          <p className="text-slate-600 leading-relaxed font-medium">
            By accessing or using our services, you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the services.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-black text-slate-900">2. Eligibility</h2>
          <p className="text-slate-600 leading-relaxed font-medium">
            You must be at least 18 years old to use our services. By using our services, you represent and warrant that you meet this age requirement.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-black text-slate-900">3. User Accounts</h2>
          <p className="text-slate-600 leading-relaxed font-medium">
            You are responsible for maintaining the confidentiality of your account and password and for restricting access to your account. You agree to accept responsibility for all activities that occur under your account.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-black text-slate-900">4. Prohibited Conduct</h2>
          <p className="text-slate-600 leading-relaxed font-medium">
            You agree not to use the services for any illegal or unauthorized purpose and not to violate any laws in your jurisdiction.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-black text-slate-900">5. Termination</h2>
          <p className="text-slate-600 leading-relaxed font-medium">
            We reserve the right to terminate or suspend your account and access to the services at our sole discretion, without notice, for conduct that we believe violates these terms or is harmful to other users or us.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-black text-slate-900">6. Contact Us</h2>
          <p className="text-slate-600 leading-relaxed font-medium">
            For any questions regarding these Terms, please contact us at earnwise29@gmail.com.
          </p>
        </section>
      </div>
    </div>
  );
}
