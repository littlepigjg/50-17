import React, { useState, useEffect } from 'react';
import type { Level, GameMode } from './engine/types';
import { LEVELS } from './engine/levels';
import { loadCustomLevels, deleteCustomLevel, importLevelFromJson, saveCustomLevel } from './engine/storage';
import { LevelSelect } from './components/LevelSelect';
import { GameScreen } from './components/GameScreen';
import { LevelEditor } from './components/LevelEditor';
import { v4 as uuidv4 } from 'uuid';

const ImportModal: React.FC<{
  onClose: () => void;
  onImport: (level: Level) => void;
}> = ({ onClose, onImport }) => {
  const [text, setText] = useState('');

  const handleImport = () => {
    const level = importLevelFromJson(text);
    if (level) {
      level.id = `custom-${uuidv4().slice(0, 8)}`;
      saveCustomLevel(level);
      onImport(level);
      onClose();
    } else {
      alert('导入失败：JSON 格式不正确');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="game-card p-6 max-w-lg w-full animate-pop">
        <h2 className="text-xl font-bold text-gray-800 mb-4">📥 导入关卡</h2>
        <p className="text-sm text-gray-500 mb-3">
          粘贴关卡 JSON 数据，或从 .json 文件读取：
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full h-48 p-3 border border-gray-300 rounded-lg font-mono text-xs focus:ring-2 focus:ring-primary-500 outline-none resize-none"
          placeholder='{"id":"level-1","name":"第1关",...}'
        />
        <div className="flex items-center gap-2 mt-3">
          <label className="flex-1">
            <input
              type="file"
              accept=".json,application/json"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const content = await file.text();
                  setText(content);
                }
              }}
              className="hidden"
            />
            <div className="btn-secondary text-center cursor-pointer">
              📁 选择文件
            </div>
          </label>
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <button onClick={onClose} className="btn-secondary">
            取消
          </button>
          <button
            onClick={handleImport}
            disabled={!text.trim()}
            className="btn-primary"
          >
            导入
          </button>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [mode, setMode] = useState<GameMode>('menu');
  const [currentLevel, setCurrentLevel] = useState<Level | null>(null);
  const [customLevels, setCustomLevels] = useState<Level[]>([]);
  const [showImport, setShowImport] = useState(false);
  const [editLevel, setEditLevel] = useState<Level | undefined>(undefined);

  useEffect(() => {
    setCustomLevels(loadCustomLevels());
  }, []);

  const refreshCustomLevels = () => {
    setCustomLevels(loadCustomLevels());
  };

  const handleSelectLevel = (level: Level) => {
    setCurrentLevel(level);
    setMode('play');
  };

  const handleBack = () => {
    setCurrentLevel(null);
    setMode('menu');
    refreshCustomLevels();
  };

  const handleNextLevel = () => {
    if (!currentLevel) return;
    const index = LEVELS.findIndex((l) => l.id === currentLevel.id);
    if (index >= 0 && index < LEVELS.length - 1) {
      setCurrentLevel(LEVELS[index + 1]);
    }
  };

  const handleDeleteCustom = () => {
    if (currentLevel) {
      deleteCustomLevel(currentLevel.id);
      refreshCustomLevels();
      handleBack();
    }
  };

  const handleOpenEditor = () => {
    setEditLevel(undefined);
    setMode('editor');
  };

  const handleImportDone = () => {
    refreshCustomLevels();
    setShowImport(false);
  };

  const isCustom = currentLevel ? customLevels.some((l) => l.id === currentLevel.id) : false;

  return (
    <div className="min-h-screen">
      {mode === 'menu' && (
        <LevelSelect
          onSelectLevel={handleSelectLevel}
          onOpenEditor={handleOpenEditor}
          onImportLevel={() => setShowImport(true)}
          customLevels={customLevels}
        />
      )}

      {mode === 'play' && currentLevel && (
        <GameScreen
          level={currentLevel}
          onBack={handleBack}
          onNextLevel={
            LEVELS.findIndex((l) => l.id === currentLevel.id) < LEVELS.length - 1
              ? handleNextLevel
              : undefined
          }
          isCustom={isCustom}
          onDeleteCustom={isCustom ? handleDeleteCustom : undefined}
        />
      )}

      {mode === 'editor' && (
        <LevelEditor
          onBack={() => {
            setMode('menu');
            refreshCustomLevels();
          }}
          onPlayLevel={(level) => {
            setCurrentLevel(level);
            setMode('play');
          }}
          editLevel={editLevel}
        />
      )}

      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onImport={handleImportDone}
        />
      )}
    </div>
  );
};

export default App;
