import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type {
  BlockType,
  CellType,
  Direction,
  EditorTool,
  Level,
  Position,
  ProgramBlock,
  SandboxCreation,
} from '../engine/types';
import {
  createInitialExecutionState,
  generateExecutionPlan,
  createEmptyGrid,
  positionEquals,
  type ExecutionStep,
} from '../engine/GameEngine';
import {
  saveSandboxCreation,
  downloadSandbox,
  shareSandbox,
  importSandboxFromJson,
} from '../engine/storage';
import {
  clampPosition,
  resizeEditorGrid,
  setCell,
  getCell,
  isObstacle,
  removeStarAt,
  toggleStarAt,
  toggleObstacle,
} from '../engine/gridEditor';
import { EditorToolbar } from './editor/EditorToolbar';
import { SandboxGrid } from './editor/SandboxGrid';
import { BlockPalette } from './blocks/BlockPalette';
import { ProgramArea } from './blocks/ProgramArea';
import { GameGrid } from './game/GameGrid';

interface SandboxModeProps {
  onBack: () => void;
  onOpenGallery: () => void;
  editCreation?: SandboxCreation;
}

const DIRECTIONS: { dir: Direction; label: string; icon: string }[] = [
  { dir: 0, label: '上', icon: '⬆️' },
  { dir: 1, label: '右', icon: '➡️' },
  { dir: 2, label: '下', icon: '⬇️' },
  { dir: 3, label: '左', icon: '⬅️' },
];

const ALL_BLOCK_TYPES: BlockType[] = [
  'move',
  'turnLeft',
  'turnRight',
  'loop',
  'ifWall',
  'ifStar',
  'ifEmpty',
  'function',
  'callFunction',
];

type ViewMode = 'edit' | 'play';

export const SandboxMode: React.FC<SandboxModeProps> = ({
  onBack,
  onOpenGallery,
  editCreation,
}) => {
  const [name, setName] = useState(editCreation?.name || '未命名创作');
  const [description, setDescription] = useState(editCreation?.description || '');
  const [width, setWidth] = useState(editCreation?.width || 10);
  const [height, setHeight] = useState(editCreation?.height || 10);
  const [grid, setGrid] = useState<CellType[][]>(
    editCreation?.grid || createEmptyGrid(editCreation?.width || 10, editCreation?.height || 10)
  );
  const [start, setStart] = useState<Position | undefined>(editCreation?.start);
  const [startDirection, setStartDirection] = useState<Direction>(editCreation?.startDirection || 1);
  const [goal, setGoal] = useState<Position | undefined>(editCreation?.goal);
  const [stars, setStars] = useState<Position[]>(editCreation?.stars || []);
  const [tool, setTool] = useState<EditorTool>('wall');
  const [viewMode, setViewMode] = useState<ViewMode>('edit');
  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [tags, setTags] = useState<string[]>(editCreation?.tags || []);
  const [tagInput, setTagInput] = useState('');

  const [mainBlocks, setMainBlocks] = useState<ProgramBlock[]>([]);
  const [executionSteps, setExecutionSteps] = useState<ExecutionStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState(500);
  const animationRef = useRef<number | null>(null);

  interface ToastItem {
    id: number;
    message: string;
    type: 'info' | 'warning' | 'error' | 'success';
  }
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const showToast = useCallback(
    (message: string, type: 'info' | 'warning' | 'error' | 'success' = 'info') => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 2600);
    },
    []
  );

  const handleResize = useCallback(
    (newWidth: number, newHeight: number) => {
      const resizedGrid = resizeEditorGrid(grid, width, height, newWidth, newHeight);
      setGrid(resizedGrid);
      setWidth(newWidth);
      setHeight(newHeight);
      if (start) setStart(clampPosition(start, newWidth, newHeight));
      if (goal) setGoal(clampPosition(goal, newWidth, newHeight));
      setStars(stars.filter((s) => s.x < newWidth && s.y < newHeight));
    },
    [grid, width, height, start, goal, stars]
  );

  const handleCellClick = useCallback(
    (x: number, y: number) => {
      const pos = clampPosition({ x, y }, width, height);

      switch (tool) {
        case 'wall':
        case 'pit': {
          const obstacleType = tool;
          const toggleResult = toggleObstacle(grid, pos, obstacleType);
          if (toggleResult.blocked) {
            showToast(toggleResult.message || '无法放置', 'warning');
            return;
          }
          if (!toggleResult.changed) return;
          setGrid(toggleResult.grid);
          setStars(removeStarAt(stars, pos));
          if (start && positionEquals(pos, start)) setStart(undefined);
          if (goal && positionEquals(pos, goal)) setGoal(undefined);
          showToast(
            toggleResult.previousType === obstacleType
              ? `已移除${obstacleType === 'wall' ? '墙壁' : '陷阱'}`
              : `已放置${obstacleType === 'wall' ? '墙壁' : '陷阱'}`,
            'info'
          );
          break;
        }

        case 'start': {
          const cell = getCell(grid, pos);
          if (cell && isObstacle(cell)) {
            showToast('该位置有障碍物，不能设置为起点', 'warning');
            return;
          }
          if (start && positionEquals(start, pos)) {
            setStart(undefined);
            showToast('已移除起点', 'info');
          } else {
            setStart({ ...pos });
            setStars(removeStarAt(stars, pos));
            if (goal && positionEquals(pos, goal)) setGoal(undefined);
            showToast(`起点已设置 (${pos.x},${pos.y})`, 'info');
          }
          break;
        }

        case 'goal': {
          const cell = getCell(grid, pos);
          if (cell && isObstacle(cell)) {
            showToast('该位置有障碍物，不能设置为终点', 'warning');
            return;
          }
          if (goal && positionEquals(goal, pos)) {
            setGoal(undefined);
            showToast('已移除终点', 'info');
          } else {
            setGoal({ ...pos });
            setStars(removeStarAt(stars, pos));
            if (start && positionEquals(pos, start)) setStart(undefined);
            showToast(`终点已设置 (${pos.x},${pos.y})`, 'info');
          }
          break;
        }

        case 'star': {
          const cell = getCell(grid, pos);
          if (cell && isObstacle(cell)) {
            showToast('障碍物位置不能放置星星', 'warning');
            return;
          }
          const hasStar = stars.some((s) => positionEquals(s, pos));
          setStars(toggleStarAt(stars, pos));
          showToast(
            hasStar ? '已移除星星' : '已添加星星',
            'info'
          );
          break;
        }

        case 'erase': {
          let newGrid = grid;
          const current = getCell(grid, pos);
          const erased: string[] = [];
          if (current && current !== 'empty') {
            newGrid = setCell(grid, pos, 'empty');
            erased.push(current === 'wall' ? '墙壁' : '陷阱');
          }
          const hadStar = stars.some((s) => positionEquals(s, pos));
          if (hadStar) erased.push('星星');
          const newStars = removeStarAt(stars, pos);
          setGrid(newGrid);
          setStars(newStars);
          let newStart = start;
          let newGoal = goal;
          if (start && positionEquals(pos, start)) {
            newStart = undefined;
            erased.push('起点');
          }
          if (goal && positionEquals(pos, goal)) {
            newGoal = undefined;
            erased.push('终点');
          }
          setStart(newStart);
          setGoal(newGoal);
          if (erased.length > 0) {
            showToast(`已清除 ${erased.join('、')}`, 'info');
          }
          break;
        }
      }
    },
    [tool, grid, width, height, start, goal, stars, showToast]
  );

  const creation: SandboxCreation = useMemo(
    () => ({
      id: editCreation?.id || `sandbox-${uuidv4().slice(0, 8)}`,
      name,
      description,
      createdAt: editCreation?.createdAt || Date.now(),
      updatedAt: Date.now(),
      width,
      height,
      grid,
      start,
      startDirection,
      goal,
      stars,
      tags,
    }),
    [editCreation, name, description, width, height, grid, start, startDirection, goal, stars, tags]
  );

  const playableLevel: Level | null = useMemo(() => {
    if (!start || !goal) return null;
    return {
      id: `sandbox-play-${Date.now()}`,
      name,
      description,
      difficulty: 0,
      width,
      height,
      grid,
      start,
      startDirection,
      goal,
      stars,
      allowedBlocks: ALL_BLOCK_TYPES,
    };
  }, [name, description, width, height, grid, start, startDirection, goal, stars]);

  const currentState = executionSteps[currentStepIndex]?.state ||
    (playableLevel ? createInitialExecutionState(playableLevel) : null);

  const cellSize = useMemo(() => {
    const maxWidth = Math.min(window.innerWidth * 0.4, 500);
    const maxHeight = Math.min(window.innerHeight * 0.6, 500);
    const byWidth = Math.floor(maxWidth / width);
    const byHeight = Math.floor(maxHeight / height);
    return Math.max(40, Math.min(70, Math.min(byWidth, byHeight)));
  }, [width, height]);

  const runProgram = () => {
    if (!playableLevel) {
      showToast('需要先设置起点和终点才能运行', 'warning');
      return;
    }
    if (mainBlocks.length === 0) return;

    try {
      const program = { main: mainBlocks, functions: {} };
      const steps = generateExecutionPlan(playableLevel, program);
      setExecutionSteps(steps);
      setCurrentStepIndex(0);
      setIsRunning(true);
    } catch (e) {
      alert('程序执行出错：' + (e as Error).message);
    }
  };

  useEffect(() => {
    if (!isRunning || executionSteps.length === 0) return;

    if (currentStepIndex >= executionSteps.length - 1) {
      setIsRunning(false);
      const finalState = executionSteps[executionSteps.length - 1].state;
      if (finalState.status === 'success') {
        showToast('🎉 成功完成！', 'success');
      } else if (finalState.status === 'failed') {
        showToast('❌ ' + (finalState.error || '执行失败'), 'error');
      }
      return;
    }

    animationRef.current = window.setTimeout(() => {
      setCurrentStepIndex((prev) => prev + 1);
    }, speed);

    return () => {
      if (animationRef.current) clearTimeout(animationRef.current);
    };
  }, [isRunning, currentStepIndex, executionSteps, speed, showToast]);

  const handleReset = () => {
    if (animationRef.current) clearTimeout(animationRef.current);
    setIsRunning(false);
    setExecutionSteps([]);
    setCurrentStepIndex(0);
  };

  const handleStepThrough = () => {
    if (!playableLevel) {
      showToast('需要先设置起点和终点', 'warning');
      return;
    }
    if (executionSteps.length === 0) {
      try {
        const program = { main: mainBlocks, functions: {} };
        const steps = generateExecutionPlan(playableLevel, program);
        setExecutionSteps(steps);
        setCurrentStepIndex(0);
      } catch (e) {
        alert('程序执行出错：' + (e as Error).message);
      }
      return;
    }

    if (currentStepIndex < executionSteps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handleSave = () => {
    saveSandboxCreation(creation);
    showToast('✅ 创作已保存！', 'success');
  };

  const handleExport = () => {
    downloadSandbox(creation);
    showToast('已导出 JSON 文件', 'info');
  };

  const handleShare = async () => {
    const success = await shareSandbox(creation);
    if (success) {
      showToast('✅ JSON 已复制到剪贴板！分享给朋友吧~', 'success');
    } else {
      downloadSandbox(creation);
      showToast('已下载 JSON 文件', 'info');
    }
  };

  const handleClearAll = () => {
    if (confirm('确定要清空画布吗？此操作不可撤销。')) {
      setGrid(createEmptyGrid(width, height));
      setStart(undefined);
      setGoal(undefined);
      setStars([]);
      setMainBlocks([]);
      handleReset();
      showToast('画布已清空', 'info');
    }
  };

  const handleImport = () => {
    const imported = importSandboxFromJson(importText);
    if (imported) {
      setName(imported.name);
      setDescription(imported.description);
      setWidth(imported.width);
      setHeight(imported.height);
      setGrid(imported.grid);
      setStart(imported.start);
      setStartDirection(imported.startDirection || 1);
      setGoal(imported.goal);
      setStars(imported.stars);
      setTags(imported.tags || []);
      setShowImport(false);
      setImportText('');
      showToast('✅ 导入成功！', 'success');
    } else {
      showToast('导入失败，请检查 JSON 格式', 'error');
    }
  };

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const canPlay = !!playableLevel;

  return (
    <div className="min-h-screen py-4 px-4 relative">
      <div className="fixed top-4 right-4 z-50 space-y-2 w-80 pointer-events-none">
        {toasts.map((t) => {
          const styleBase =
            'px-4 py-3 rounded-xl shadow-lg border flex items-start gap-2 animate-slide-in';
          const typeStyle =
            t.type === 'warning'
              ? 'bg-amber-50 border-amber-200 text-amber-800'
              : t.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-800'
                : t.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-sky-50 border-sky-200 text-sky-800';
          const icon =
            t.type === 'warning' ? '⚠️' : t.type === 'error' ? '❌' : t.type === 'success' ? '✅' : 'ℹ️';
          return (
            <div key={t.id} className={`${styleBase} ${typeStyle}`}>
              <span className="text-base leading-5">{icon}</span>
              <span className="text-sm font-medium flex-1 leading-5">{t.message}</span>
            </div>
          );
        })}
      </div>

      <div className="max-w-7xl mx-auto">
        <div className="game-card p-4 mb-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4 flex-wrap">
              <button onClick={onBack} className="btn-secondary !py-2 !px-4">
                ← 返回
              </button>
              <div className="flex items-center gap-2">
                <span className="text-3xl">🎨</span>
                <div>
                  <h1 className="text-xl font-bold text-gray-800">自由创作沙盒</h1>
                  <p className="text-xs text-gray-500">不受规则限制，尽情发挥创意！</p>
                </div>
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('edit')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all
                    ${viewMode === 'edit' ? 'bg-white shadow text-primary-600' : 'text-gray-600 hover:text-gray-800'}`}
                >
                  🖌️ 编辑
                </button>
                <button
                  onClick={() => {
                    if (canPlay) {
                      setViewMode('play');
                      handleReset();
                    } else {
                      showToast('需要先设置起点和终点才能进入运行模式', 'warning');
                    }
                  }}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all
                    ${viewMode === 'play' ? 'bg-white shadow text-primary-600' : 'text-gray-600 hover:text-gray-800'}`}
                >
                  ▶️ 运行
                </button>
              </div>

              <button onClick={onOpenGallery} className="btn-secondary !py-2 !px-3">
                📚 作品库
              </button>
              <button onClick={() => setShowImport(true)} className="btn-secondary !py-2 !px-3">
                📥 导入
              </button>
              <button onClick={handleClearAll} className="btn-secondary !py-2 !px-3">
                🗑️ 清空
              </button>
              <button onClick={handleExport} className="btn-secondary !py-2 !px-3">
                💾 导出
              </button>
              <button onClick={handleShare} className="btn-secondary !py-2 !px-3">
                📤 分享
              </button>
              <button onClick={handleSave} className="btn-success !py-2 !px-4">
                ✅ 保存
              </button>
            </div>
          </div>
        </div>

        {viewMode === 'edit' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-3 space-y-4">
              <div className="game-card p-4">
                <h3 className="font-bold text-gray-700 mb-3">📋 作品信息</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-gray-600 block mb-1">作品名称</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                      placeholder="为你的创作命名"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 block mb-1">描述</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none resize-none"
                      rows={2}
                      placeholder="描述你的创作"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 block mb-1">标签</label>
                    <div className="flex gap-2 mb-2 flex-wrap">
                      {tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs"
                        >
                          #{tag}
                          <button
                            onClick={() => handleRemoveTag(tag)}
                            className="hover:text-purple-900"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddTag();
                          }
                        }}
                        className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                        placeholder="添加标签"
                      />
                      <button
                        onClick={handleAddTag}
                        className="btn-secondary !py-1.5 !px-3 text-sm"
                      >
                        添加
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="game-card p-4">
                <h3 className="font-bold text-gray-700 mb-3">📐 画布设置</h3>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="text-sm text-gray-600 block mb-1">宽度</label>
                    <input
                      type="number"
                      min={3}
                      max={30}
                      value={width}
                      onChange={(e) =>
                        handleResize(
                          Math.max(3, Math.min(30, parseInt(e.target.value) || 3)),
                          height
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 block mb-1">高度</label>
                    <input
                      type="number"
                      min={3}
                      max={30}
                      value={height}
                      onChange={(e) =>
                        handleResize(
                          width,
                          Math.max(3, Math.min(30, parseInt(e.target.value) || 3))
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-600 block mb-2">
                    起始方向 {start ? '' : '(设置起点后可用)'}
                  </label>
                  <div className="grid grid-cols-4 gap-1">
                    {DIRECTIONS.map(({ dir, icon }) => (
                      <button
                        key={dir}
                        onClick={() => setStartDirection(dir)}
                        disabled={!start}
                        className={`p-2 rounded-lg text-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed
                          ${startDirection === dir
                            ? 'bg-primary-500 text-white shadow-md'
                            : 'bg-white border border-gray-200 hover:border-primary-300'
                          }`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="game-card p-4">
                <h3 className="font-bold text-gray-700 mb-3">🎯 状态概览</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-1 border-b border-gray-100">
                    <span className="text-gray-600">起点</span>
                    <span className={`font-medium ${start ? 'text-blue-600' : 'text-gray-400'}`}>
                      {start ? `(${start.x}, ${start.y})` : '未设置'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-100">
                    <span className="text-gray-600">终点</span>
                    <span className={`font-medium ${goal ? 'text-green-600' : 'text-gray-400'}`}>
                      {goal ? `(${goal.x}, ${goal.y})` : '未设置'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-100">
                    <span className="text-gray-600">星星</span>
                    <span className="font-medium text-yellow-600">{stars.length} 颗</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-600">指令块</span>
                    <span className="font-medium text-purple-600">{mainBlocks.length} 个</span>
                  </div>
                </div>
                {!canPlay && (
                  <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                    💡 设置起点和终点后即可切换到运行模式测试程序
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="game-card p-4 h-full flex flex-col">
                <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <span>🗺️</span> 画布编辑
                </h3>

                <EditorToolbar currentTool={tool} onToolChange={setTool} />

                <div className="my-4 flex-1 flex items-center justify-center">
                  <SandboxGrid
                    width={width}
                    height={height}
                    grid={grid}
                    start={start}
                    goal={goal}
                    stars={stars}
                    startDirection={startDirection}
                    tool={tool}
                    onCellClick={handleCellClick}
                  />
                </div>

                <div className="mt-2 p-3 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-100 rounded-lg text-xs text-purple-700">
                  ✨ <strong>沙盒模式：</strong>自由放置任何元素，起点和终点都是可选的。
                  可以用作艺术品创作、关卡原型设计、或编程实验！
                </div>
              </div>
            </div>

            <div className="lg:col-span-3">
              <div className="game-card p-4 h-full">
                <ProgramArea
                  blocks={mainBlocks}
                  onBlocksChange={setMainBlocks}
                  highlightedBlockId={undefined}
                  disabled={false}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-2">
              <BlockPalette allowedBlocks={ALL_BLOCK_TYPES} disabled={isRunning} />
            </div>

            <div className="lg:col-span-5">
              <div className="game-card p-4 h-full flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <span>🗺️</span> 运行预览
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
                  {playableLevel && currentState && (
                    <GameGrid
                      level={playableLevel}
                      robotState={currentState.robot}
                      collectedStars={currentState.collectedStars}
                      cellSize={cellSize}
                      isAnimating={isRunning}
                    />
                  )}
                </div>

                <div className="mt-4 flex gap-3 justify-center flex-wrap">
                  <button
                    onClick={runProgram}
                    disabled={isRunning || mainBlocks.length === 0}
                    className="btn-success flex items-center gap-2 !py-2 !px-4"
                  >
                    ▶️ 运行
                  </button>
                  <button
                    onClick={handleStepThrough}
                    disabled={isRunning || mainBlocks.length === 0}
                    className="btn-primary flex items-center gap-2 !py-2 !px-4"
                  >
                    ⏭️ 单步
                  </button>
                  <button
                    onClick={handleReset}
                    className="btn-danger flex items-center gap-2 !py-2 !px-4"
                  >
                    🔄 重置
                  </button>
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
                </div>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="game-card p-4 h-full">
                <ProgramArea
                  blocks={mainBlocks}
                  onBlocksChange={setMainBlocks}
                  highlightedBlockId={currentState?.highlightedBlockId}
                  disabled={isRunning}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {showImport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="game-card p-6 max-w-lg w-full animate-pop">
            <h2 className="text-xl font-bold text-gray-800 mb-4">📥 导入创作</h2>
            <p className="text-sm text-gray-500 mb-3">
              粘贴沙盒创作 JSON 数据，或从 .json 文件读取：
            </p>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              className="w-full h-48 p-3 border border-gray-300 rounded-lg font-mono text-xs focus:ring-2 focus:ring-primary-500 outline-none resize-none"
              placeholder='{"id":"sandbox-xxx","name":"我的创作",...}'
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
                      setImportText(content);
                    }
                  }}
                  className="hidden"
                />
                <div className="btn-secondary text-center cursor-pointer w-full">
                  📁 选择文件
                </div>
              </label>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => setShowImport(false)}
                className="btn-secondary"
              >
                取消
              </button>
              <button
                onClick={handleImport}
                disabled={!importText.trim()}
                className="btn-primary"
              >
                导入
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SandboxMode;
