import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { Level, Program, ProgramBlock } from '../engine/types';
import type { ExecutionStep } from '../engine/GameEngine';
import {
  createInitialExecutionState,
  generateExecutionPlan,
} from '../engine/GameEngine';
import { updateLevelProgress } from '../engine/storage';
import { BlockPalette } from './blocks/BlockPalette';
import { ProgramArea } from './blocks/ProgramArea';
import { GameGrid } from './game/GameGrid';
import { shareLevel, downloadLevel } from '../engine/storage';

interface GameScreenProps {
  level: Level;
  onBack: () => void;
  onNextLevel?: () => void;
  isCustom?: boolean;
  onDeleteCustom?: () => void;
}

const ResultModal: React.FC<{
  success: boolean;
  starsCollected: number;
  totalStars: number;
  steps: number;
  error?: string;
  onRetry: () => void;
  onNext?: () => void;
  onBack: () => void;
}> = ({ success, starsCollected, totalStars, steps, error, onRetry, onNext, onBack }) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fadeIn p-4">
    <div className={`game-card p-8 max-w-md w-full text-center animate-pop`}>
      {success ? (
        <>
          <div className="text-7xl mb-4 animate-bounce">🎉</div>
          <h2 className="text-3xl font-bold text-green-600 mb-2">太棒了！</h2>
          <p className="text-gray-600 mb-4">你成功完成了关卡！</p>
          <div className="flex justify-center gap-1 mb-6">
            {Array.from({ length: totalStars }).map((_, i) => (
              <span
                key={i}
                className={`text-4xl ${i < starsCollected ? 'text-yellow-400' : 'text-gray-300'} transition-all duration-500`}
                style={{ animationDelay: `${i * 0.2}s` }}
              >
                {i < starsCollected ? '⭐' : '☆'}
              </span>
            ))}
          </div>
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <div className="text-sm text-gray-500">执行步数</div>
            <div className="text-2xl font-bold text-primary-600">{steps}</div>
          </div>
          <div className="flex gap-3 justify-center">
            <button onClick={onBack} className="btn-secondary">
              选关
            </button>
            <button onClick={onRetry} className="btn-secondary">
              再玩一次
            </button>
            {onNext && (
              <button onClick={onNext} className="btn-success">
                下一关 →
              </button>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="text-7xl mb-4">😢</div>
          <h2 className="text-3xl font-bold text-red-500 mb-2">失败了</h2>
          <p className="text-gray-600 mb-4">{error || '再试一次吧！'}</p>
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <div className="text-sm text-gray-500">已收集星星</div>
            <div className="text-2xl font-bold text-yellow-500">
              {starsCollected} / {totalStars}
            </div>
          </div>
          <div className="flex gap-3 justify-center">
            <button onClick={onBack} className="btn-secondary">
              选关
            </button>
            <button onClick={onRetry} className="btn-primary">
              重试
            </button>
          </div>
        </>
      )}
    </div>
  </div>
);

export const GameScreen: React.FC<GameScreenProps> = ({
  level,
  onBack,
  onNextLevel,
  isCustom,
  onDeleteCustom,
}) => {
  const [mainBlocks, setMainBlocks] = useState<ProgramBlock[]>([]);
  const [executionSteps, setExecutionSteps] = useState<ExecutionStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [speed, setSpeed] = useState(500);
  const animationRef = useRef<number | null>(null);

  const currentState = executionSteps[currentStepIndex]?.state || createInitialExecutionState(level);

  const program: Program = useMemo(() => {
    return {
      main: mainBlocks,
      functions: {},
    };
  }, [mainBlocks]);

  const cellSize = useMemo(() => {
    const maxWidth = Math.min(window.innerWidth * 0.4, 500);
    const maxHeight = Math.min(window.innerHeight * 0.6, 500);
    const byWidth = Math.floor(maxWidth / level.width);
    const byHeight = Math.floor(maxHeight / level.height);
    return Math.max(40, Math.min(70, Math.min(byWidth, byHeight)));
  }, [level.width, level.height]);

  const runProgram = () => {
    if (mainBlocks.length === 0) return;

    try {
      const steps = generateExecutionPlan(level, program);
      setExecutionSteps(steps);
      setCurrentStepIndex(0);
      setIsRunning(true);
      setShowResult(false);
    } catch (e) {
      alert('程序执行出错：' + (e as Error).message);
    }
  };

  useEffect(() => {
    if (!isRunning || executionSteps.length === 0) return;

    if (currentStepIndex >= executionSteps.length - 1) {
      setIsRunning(false);
      const finalState = executionSteps[executionSteps.length - 1].state;
      setShowResult(true);

      if (finalState.status === 'success') {
        const stars = level.stars.length - finalState.robot.stars.length;
        updateLevelProgress(level.id, stars, finalState.currentStep);
      }
      return;
    }

    animationRef.current = window.setTimeout(() => {
      setCurrentStepIndex((prev) => prev + 1);
    }, speed);

    return () => {
      if (animationRef.current) clearTimeout(animationRef.current);
    };
  }, [isRunning, currentStepIndex, executionSteps, speed, level]);

  const handleReset = () => {
    if (animationRef.current) clearTimeout(animationRef.current);
    setIsRunning(false);
    setExecutionSteps([]);
    setCurrentStepIndex(0);
    setShowResult(false);
  };

  const handleStepThrough = () => {
    if (executionSteps.length === 0) {
      try {
        const steps = generateExecutionPlan(level, program);
        setExecutionSteps(steps);
        setCurrentStepIndex(0);
      } catch (e) {
        alert('程序执行出错：' + (e as Error).message);
      }
      return;
    }

    if (currentStepIndex < executionSteps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
      if (currentStepIndex === executionSteps.length - 2) {
        const finalState = executionSteps[executionSteps.length - 1].state;
        setShowResult(true);
        if (finalState.status === 'success') {
          const stars = level.stars.length - finalState.robot.stars.length;
          updateLevelProgress(level.id, stars, finalState.currentStep);
        }
      }
    }
  };

  const handleShare = async () => {
    const success = await shareLevel(level);
    if (success) {
      alert('关卡JSON已复制到剪贴板！分享给朋友吧~');
    } else {
      downloadLevel(level);
    }
  };

  const finalState = executionSteps.length > 0 ? executionSteps[executionSteps.length - 1].state : null;

  return (
    <div className="min-h-screen py-4 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="game-card p-4 mb-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="btn-secondary !py-2 !px-4 flex items-center gap-2"
              >
                ← 返回
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-800">{level.name}</h1>
                <p className="text-sm text-gray-500">{level.description}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 bg-yellow-50 px-4 py-2 rounded-xl">
                <span className="text-xl">⭐</span>
                <span className="font-bold text-yellow-700">
                  {level.stars.length - currentState.robot.stars.length} / {level.stars.length}
                </span>
              </div>

              <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-2 py-1">
                <span className="text-xs text-gray-500 px-2">速度</span>
                {[200, 500, 1000].map((s) => (
                  <button
                    key={s}
                    onClick={() => setSpeed(s)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-all
                      ${speed === s ? 'bg-primary-500 text-white' : 'hover:bg-gray-200 text-gray-600'}`}
                  >
                    {s === 200 ? '快' : s === 500 ? '中' : '慢'}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setShowHint(!showHint)}
                className="btn-secondary !py-2 !px-4"
              >
                💡 提示
              </button>

              {isCustom && (
                <>
                  <button onClick={handleShare} className="btn-secondary !py-2 !px-4">
                    📤 分享
                  </button>
                  {onDeleteCustom && (
                    <button
                      onClick={() => {
                        if (confirm('确定要删除这个自定义关卡吗？')) onDeleteCustom();
                      }}
                      className="btn-danger !py-2 !px-4 !text-sm"
                    >
                      🗑️ 删除
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {showHint && level.hint && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-800 text-sm animate-pop">
              💡 {level.hint}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-2">
            <BlockPalette
              allowedBlocks={level.allowedBlocks}
              disabled={isRunning}
            />
          </div>

          <div className="lg:col-span-5">
            <div className="game-card p-4 h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <span>🗺️</span> 游戏地图
                </h3>
                <div className="text-sm text-gray-500">
                  {isRunning && executionSteps.length > 0 && (
                    <span>
                      步骤 {currentStepIndex + 1} / {executionSteps.length}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex-1 flex items-center justify-center">
                <GameGrid
                  level={level}
                  robotState={currentState.robot}
                  collectedStars={currentState.collectedStars}
                  cellSize={cellSize}
                  isAnimating={isRunning}
                />
              </div>

              <div className="mt-4 flex gap-3 justify-center flex-wrap">
                <button
                  onClick={runProgram}
                  disabled={isRunning || mainBlocks.length === 0}
                  className="btn-success flex items-center gap-2"
                >
                  ▶️ 运行
                </button>
                <button
                  onClick={handleStepThrough}
                  disabled={isRunning || mainBlocks.length === 0}
                  className="btn-primary flex items-center gap-2"
                >
                  ⏭️ 单步
                </button>
                <button
                  onClick={handleReset}
                  className="btn-danger flex items-center gap-2"
                >
                  🔄 重置
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="game-card p-4 h-full">
              <ProgramArea
                blocks={mainBlocks}
                onBlocksChange={setMainBlocks}
                highlightedBlockId={currentState.highlightedBlockId}
                disabled={isRunning}
                maxBlocks={level.maxBlocks}
              />
            </div>
          </div>
        </div>
      </div>

      {showResult && finalState && (
        <ResultModal
          success={finalState.status === 'success'}
          starsCollected={level.stars.length - finalState.robot.stars.length}
          totalStars={level.stars.length}
          steps={finalState.currentStep}
          error={finalState.error}
          onRetry={() => {
            handleReset();
          }}
          onNext={onNextLevel}
          onBack={onBack}
        />
      )}
    </div>
  );
};

export default GameScreen;
