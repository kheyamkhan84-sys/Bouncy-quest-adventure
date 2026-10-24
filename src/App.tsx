/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { StorageService } from './services/storage';
import { SaveData, GameSettings } from './types/game';
import { Navbar } from './components/Navbar';
import { HomeHero } from './components/HomeHero';
import { WorldSelect } from './components/WorldSelect';
import { GameCanvas } from './components/GameCanvas';
import { AboutPage } from './components/AboutPage';
import { PrivacyPage } from './components/PrivacyPage';
import { ContactPage } from './components/ContactPage';
import { Footer } from './components/Footer';
import { SettingsModal } from './components/SettingsModal';

export default function App() {
  const [saveData, setSaveData] = useState<SaveData>(() => StorageService.load());
  const [currentView, setCurrentView] = useState<'home' | 'worlds' | 'game' | 'about' | 'privacy' | 'contact'>('home');
  const [activeLevelNumber, setActiveLevelNumber] = useState<number>(saveData.currentLevel || 1);
  const [selectedWorldId, setSelectedWorldId] = useState<number>(saveData.currentWorld || 1);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  useEffect(() => {
    // Reload/sync storage
    const loaded = StorageService.load();
    setSaveData(loaded);
  }, []);

  const handlePlayLevel = (lvlNum: number) => {
    setActiveLevelNumber(lvlNum);
    setCurrentView('game');
  };

  const handleLevelComplete = (nextLevelNumber: number) => {
    const updated = StorageService.load();
    setSaveData(updated);
    setActiveLevelNumber(nextLevelNumber);
  };

  const handleExitToWorlds = (worldId?: number) => {
    if (worldId) {
      setSelectedWorldId(worldId);
    }
    const updated = StorageService.load();
    setSaveData(updated);
    setCurrentView('worlds');
  };

  const handleUpdateSettings = (partial: Partial<GameSettings>) => {
    const updated = StorageService.updateSettings(partial);
    setSaveData(updated);
  };

  const handleResetProgress = () => {
    const fresh = StorageService.resetProgress();
    setSaveData(fresh);
    setActiveLevelNumber(1);
    setSelectedWorldId(1);
    setCurrentView('home');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-ui antialiased selection:bg-red-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        currentView={currentView}
        onNavigate={(view) => setCurrentView(view)}
        saveData={saveData}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main View Router */}
      <main className="flex-1 flex flex-col items-center justify-center w-full">
        {currentView === 'home' && (
          <HomeHero
            saveData={saveData}
            onPlayCurrent={() => handlePlayLevel(saveData.currentLevel || 1)}
            onStartNew={() => handlePlayLevel(1)}
            onOpenWorlds={() => setCurrentView('worlds')}
          />
        )}

        {currentView === 'worlds' && (
          <WorldSelect
            saveData={saveData}
            initialWorldId={selectedWorldId}
            onSelectLevel={(lvl) => handlePlayLevel(lvl)}
            onBackToHome={() => setCurrentView('home')}
          />
        )}

        {currentView === 'game' && (
          <GameCanvas
            levelNumber={activeLevelNumber}
            saveData={saveData}
            onLevelComplete={handleLevelComplete}
            onExitToWorlds={handleExitToWorlds}
          />
        )}

        {currentView === 'about' && (
          <AboutPage
            onBackToHome={() => setCurrentView('home')}
            onOpenWorlds={() => setCurrentView('worlds')}
          />
        )}

        {currentView === 'privacy' && (
          <PrivacyPage onBackToHome={() => setCurrentView('home')} />
        )}

        {currentView === 'contact' && (
          <ContactPage onBackToHome={() => setCurrentView('home')} />
        )}
      </main>

      {/* Footer */}
      <Footer onNavigate={(view) => setCurrentView(view)} />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        saveData={saveData}
        onUpdateSettings={handleUpdateSettings}
        onResetProgress={handleResetProgress}
      />
    </div>
  );
}
