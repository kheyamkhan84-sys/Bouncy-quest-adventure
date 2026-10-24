/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Layers, Compass, Award, Shield, Sparkles } from 'lucide-react';

interface AboutPageProps {
  onBackToHome: () => void;
  onOpenWorlds: () => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({ onBackToHome, onOpenWorlds }) => {
  return (
    <div className="w-full min-h-[calc(100vh-4rem)] py-12 px-4 sm:px-6 max-w-4xl mx-auto">
      <div className="text-center mb-10">
        <h1 className="font-game text-4xl sm:text-5xl font-bold text-white mb-3">
          About <span className="text-red-500">Bouncy World</span>
        </h1>
        <p className="text-slate-300 text-sm sm:text-base max-w-xl mx-auto">
          An epic 2D physics-based platformer built for desktop and mobile web browsers with 50 unique worlds and 1,000 progressive challenges.
        </p>
      </div>

      <div className="space-y-8 text-slate-300 text-sm leading-relaxed mb-12">
        <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8">
          <h2 className="font-game text-2xl font-bold text-white mb-3 flex items-center gap-2">
            <Compass className="w-5 h-5 text-emerald-400" />
            The 1,000-Level Adventure
          </h2>
          <p className="mb-4">
            Bouncy World Adventure is divided into <strong>50 distinct thematic worlds</strong>, each featuring 20 handcrafted progressive stages. Players guide the iconic red bouncy ball through lush meadows, treacherous cavern spikes, underwater deep ruins, zero-gravity lunar basins, and molten lava fortresses.
          </p>
          <p>
            Every single world introduces a signature new mechanic—such as wind currents, moving platforms, teleportation portals, reverse-control fields, and dynamic puzzle locks.
          </p>
        </section>

        <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8">
          <h2 className="font-game text-2xl font-bold text-white mb-3 flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-400" />
            Fair Checkpoint & Elimination Architecture
          </h2>
          <p className="mb-4">
            We believe in high-difficulty platforming without frustrating punishment. Falling into chasms or hazards triggers a brief one-second cartoon respawn at your latest activated glowing checkpoint, maintaining collected stars, coins, and health with two seconds of temporary invulnerability.
          </p>
          <p>
            Your progress is preserved continuously with a versioned, resilient local storage system, allowing you to return and resume your quest at any time.
          </p>
        </section>

        <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8">
          <h2 className="font-game text-2xl font-bold text-white mb-3 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-rose-400" />
            Original Audio & Cartoon Graphics
          </h2>
          <p>
            All sound effects and chiptune background themes are synthesized on-the-fly using the Web Audio API without bulky downloads or external dependencies. Play smoothly across Android phones, tablets, and desktop workstations.
          </p>
        </section>
      </div>

      <div className="flex items-center justify-center gap-4">
        <button
          onClick={onBackToHome}
          className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-game text-sm rounded-xl border border-slate-700 cursor-pointer"
        >
          Back to Home
        </button>
        <button
          onClick={onOpenWorlds}
          className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-game text-sm rounded-xl shadow-lg shadow-red-500/20 cursor-pointer"
        >
          Explore 50 Worlds
        </button>
      </div>
    </div>
  );
};
