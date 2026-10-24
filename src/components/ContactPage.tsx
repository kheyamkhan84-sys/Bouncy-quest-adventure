/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Mail, MessageSquare, Send, CheckCircle2 } from 'lucide-react';

interface ContactPageProps {
  onBackToHome: () => void;
}

export const ContactPage: React.FC<ContactPageProps> = ({ onBackToHome }) => {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
    levelFeedback: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] py-12 px-4 sm:px-6 max-w-2xl mx-auto">
      <div className="text-center mb-10">
        <h1 className="font-game text-4xl sm:text-5xl font-bold text-white mb-3">
          Contact & <span className="text-red-500">Feedback</span>
        </h1>
        <p className="text-slate-300 text-sm sm:text-base max-w-md mx-auto">
          Encountered a bug on level 428? Have an idea for a new world mechanic? We would love to hear from you.
        </p>
      </div>

      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
        {submitted ? (
          <div className="text-center py-8">
            <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
            <h3 className="font-game text-2xl font-bold text-white mb-2">Message Received!</h3>
            <p className="text-slate-300 text-sm mb-6">
              Thank you for helping make Bouncy World Adventure the best 1,000-level platformer on the web.
            </p>
            <button
              onClick={() => {
                setSubmitted(false);
                setFormData({ name: '', email: '', message: '', levelFeedback: '' });
                onBackToHome();
              }}
              className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white font-game text-sm rounded-xl cursor-pointer"
            >
              Return to Game
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Player Name
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. RedBallMaster"
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="player@example.com"
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Level or World Number (Optional)
              </label>
              <input
                type="text"
                value={formData.levelFeedback}
                onChange={(e) => setFormData({ ...formData, levelFeedback: e.target.value })}
                placeholder="e.g. World 14 / Level 275"
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Feedback / Bug Report
              </label>
              <textarea
                required
                rows={4}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Describe your suggestion or feedback here..."
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-game text-base rounded-xl shadow-lg shadow-red-500/20 flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <Send className="w-4 h-4" />
              <span>Send Message</span>
            </button>
          </form>
        )}
      </div>

      <div className="text-center mt-6">
        <button
          onClick={onBackToHome}
          className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          ← Back to Home
        </button>
      </div>
    </div>
  );
};
