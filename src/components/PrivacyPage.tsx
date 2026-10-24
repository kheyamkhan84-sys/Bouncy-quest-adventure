/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ShieldCheck, Lock, HardDrive, EyeOff } from 'lucide-react';

interface PrivacyPageProps {
  onBackToHome: () => void;
}

export const PrivacyPage: React.FC<PrivacyPageProps> = ({ onBackToHome }) => {
  return (
    <div className="w-full min-h-[calc(100vh-4rem)] py-12 px-4 sm:px-6 max-w-4xl mx-auto">
      <div className="text-center mb-10">
        <h1 className="font-game text-4xl sm:text-5xl font-bold text-white mb-3">
          Privacy <span className="text-red-500">Policy</span>
        </h1>
        <p className="text-slate-300 text-sm sm:text-base max-w-xl mx-auto">
          Your privacy is sacred. Bouncy World Adventure operates with zero tracking and stores all progress on your local device.
        </p>
      </div>

      <div className="space-y-6 text-slate-300 text-sm leading-relaxed mb-12">
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
          <h2 className="font-game text-xl font-bold text-white mb-2 flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-emerald-400" />
            1. Local Storage Only
          </h2>
          <p>
            All game data—including your current world, completed levels (1 to 1,000), star counts, high scores, checkpoints, and audio preferences—is saved exclusively in your browser's private <code>localStorage</code>. No personal data is transmitted to external servers.
          </p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
          <h2 className="font-game text-xl font-bold text-white mb-2 flex items-center gap-2">
            <EyeOff className="w-5 h-5 text-amber-400" />
            2. No Tracking or Advertisements
          </h2>
          <p>
            We do not use third-party analytics trackers, advertising networks, tracking beacons, or invasive cookies. The game delivers a pure, distraction-free gaming experience.
          </p>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
          <h2 className="font-game text-xl font-bold text-white mb-2 flex items-center gap-2">
            <Lock className="w-5 h-5 text-rose-400" />
            3. Data Erasure & Control
          </h2>
          <p>
            You have full control over your saved campaign. You can reset your campaign progress at any time through the in-game Settings menu or by clearing your browser cache.
          </p>
        </div>
      </div>

      <div className="text-center">
        <button
          onClick={onBackToHome}
          className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-game text-sm rounded-xl border border-slate-700 cursor-pointer"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
};
