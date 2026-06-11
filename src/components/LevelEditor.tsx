import React, { useState, useMemo, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { BlockType, Direction, EditorTool, Level, Position } from '../engine/types';
import { validateLevel } from '../engine/GameEngine';
import { BLOCK_CONFIGS } from '../engine/blocks';
import {
  saveCustomLevel,
  downloadLevel,
  shareLevel,
  importLevelFromJson,
} from '../engine/storage';
import {
  clampPosition,
  handleEditorToolClick,
  resizeEditorGrid,
} from '../engine/gridEditor';
import { EditorGrid } from './editor/EditorGrid';
import { EditorToolbar } from './editor/EditorToolbar';

interface LevelEditorProps {
  onBack: () => void;
  onPlayLevel: (level: Level) => void;
  editLevel?: Level;
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

export const LevelEditor: React.FC<LevelEditorProps> = ({
  onBack,
  onPlayLevel,
  editLevel,
}) => {
  const [name, setName] = useState(editLevel?.name || '我的关卡');
  const [description, setDescription] = useState(editLevel?.description || '');
  const [difficulty, setDifficulty] = useState(editLevel?.difficulty || 3);
  const [width, setWidth] = useState(editLevel?.width || 8);
  const [height, setHeight] = useState(editLevel?.height || 8);
  const [grid, setGrid] = useState(editLevel?.grid || resizeEditorGrid([], 0, 0, editLevel?.width || 8, editLevel?.height || 8));
  const [start, setStart] = useState<Position>(editLevel?.start || { x: 0, y: 0 });
  const [startDirection, setStartDirection] = useState<Direction>(editLevel?.startDirection || 1);
  const [goal, setGoal] = useState<Position>(editLevel?.goal || { x: 7, y: 7 });
  const [stars, setStars] = useState<Position[]>(editLevel?.stars || []);
  const [allowedBlocks, setAllowedBlocks] = useState<BlockType[]>(
    editLevel?.allowedBlocks || ALL_BLOCK_TYPES
  );
  const [tool, setTool] = useState<EditorTool>('wall');
  const [errors, setErrors] = useState<string[]>([]);
  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [hint, setHint] = useState(editLevel?.hint || '');

  interface ToastItem {
    id: number;
    message: string;
    type: 'info' | 'warning' | 'error';
  }
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const showToast = useCallback(
    (message: string, type: 'info' | 'warning' | 'error' = 'info') => {
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

      setStart(clampPosition(start, newWidth, newHeight));
      setGoal(clampPosition(goal, newWidth, newHeight));
      setStars(stars.filter((s) => s.x < newWidth && s.y < newHeight));
    },
    [grid, width, height, start, goal, stars]
  );

  const handleCellClick = useCallback(
    (x: number, y: number) => {
      const result = handleEditorToolClick({
        tool,
        pos: { x, y },
        grid,
        start,
        goal,
        stars,
        width,
        height,
      });

      if (result.message) {
        showToast(result.message, result.messageType || 'info');
      }

      if (!result.consumed) return;
      if (result.grid) setGrid(result.grid);
      if (result.start) setStart(result.start);
      if (result.goal) setGoal(result.goal);
      if (result.stars) setStars(result.stars);

      if (errors.length > 0) setErrors([]);
    },
    [tool, grid, start, goal, stars, width, height, errors.length, showToast]
  );

  const level: Level = useMemo(
    () => ({
      id: editLevel?.id || `custom-${uuidv4().slice(0, 8)}`,
      name,
      description,
      difficulty,
      width,
      height,
      grid,
      start,
      startDirection,
      goal,
      stars,
      allowedBlocks,
      hint: hint || undefined,
    }),
    [editLevel, name, description, difficulty, width, height, grid, start, startDirection, goal, stars, allowedBlocks, hint]
  );

  const runValidation = (): boolean => {
    const validationErrors = validateLevel(level);
    setErrors(validationErrors);
    return validationErrors.length === 0;
  };

  const handleSave = () => {
    if (!runValidation()) return;
    saveCustomLevel(level);
    alert('关卡已保存！');
    onBack();
  };

  const handleExport = () => {
    if (!runValidation()) return;
    downloadLevel(level);
  };

  const handleShare = async () => {
    if (!runValidation()) return;
    const success = await shareLevel(level);
    if (success) {
      alert('关卡JSON已复制到剪贴板！');
    } else {
      downloadLevel(level);
    }
  };

  const handleTest = () => {
    if (!runValidation()) return;
    onPlayLevel({ ...level, id: `test-${Date.now()}` });
  };

  const handleImport = () => {
    const imported = importLevelFromJson(importText);
    if (imported) {
      setName(imported.name);
      setDescription(imported.description);
      setDifficulty(imported.difficulty);
      setWidth(imported.width);
      setHeight(imported.height);
      setGrid(imported.grid);
      setStart(imported.start);
      setStartDirection(imported.startDirection);
      setGoal(imported.goal);
      setStars(imported.stars);
      setAllowedBlocks(imported.allowedBlocks);
      setHint(imported.hint || '');
      setShowImport(false);
      setImportText('');
      alert('关卡导入成功！');
    } else {
      alert('导入失败，请检查JSON格式是否正确。');
    }
  };

  return (
    <div className="min-h-screen py-6 px-4 relative">
      {/* Toast 提示容器 */}
      <div className="fixed top-4 right-4 z-50 space-y-2 w-80 pointer-events-none">
        {toasts.map((t) => {
          const styleBase =
            'px-4 py-3 rounded-xl shadow-lg border flex items-start gap-2 animate-slide-in';
          const typeStyle =
            t.type === 'warning'
              ? 'bg-amber-50 border-amber-200 text-amber-800'
              : t.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-sky-50 border-sky-200 text-sky-800';
          const icon =
            t.type === 'warning' ? '⚠️' : t.type === 'error' ? '❌' : 'ℹ️';
          return (
            <div key={t.id} className={`${styleBase} ${typeStyle}`}>
              <span className="text-base leading-5">{icon}</span>
              <span className="text-sm font-medium flex-1 leading-5">{t.message}</span>
            </div>
          );
        })}
      </div>

      <div className="max-w-7xl mx-auto">
        <div className="game-card p-6 mb-4">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <button onClick={onBack} className="btn-secondary">
                ← 返回
              </button>
              <h1 className="text-2xl font-bold text-gray-800">🎨 关卡编辑器</h1>
            </div>
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => setShowImport(true)}
                className="btn-secondary"
              >
                📥 导入
              </button>
              <button onClick={handleTest} className="btn-primary">
                ▶️ 试玩
              </button>
              <button onClick={handleExport} className="btn-secondary">
                💾 导出
              </button>
              <button onClick={handleShare} className="btn-secondary">
                📤 分享
              </button>
              <button onClick={handleSave} className="btn-success">
                ✅ 保存
              </button>
            </div>
          </div>

          {errors.length > 0 && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <h3 className="font-bold text-red-700 mb-2">⚠️ 请修正以下问题：</h3>
              <ul className="list-disc list-inside text-red-600 text-sm space-y-1">
                {errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-3 space-y-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-bold text-gray-700 mb-3">📋 基本信息</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-gray-600 block mb-1">关卡名称</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                      placeholder="输入关卡名称"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 block mb-1">描述</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none resize-none"
                      rows={2}
                      placeholder="描述关卡目标"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 block mb-1">提示（可选）</label>
                    <textarea
                      value={hint}
                      onChange={(e) => setHint(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none resize-none"
                      rows={2}
                      placeholder="给玩家的提示"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 block mb-1">
                      难度：{difficulty}
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={8}
                      value={difficulty}
                      onChange={(e) => setDifficulty(parseInt(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>简单</span>
                      <span>困难</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-bold text-gray-700 mb-3">📐 地图设置</h3>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="text-sm text-gray-600 block mb-1">宽度</label>
                    <input
                      type="number"
                      min={3}
                      max={20}
                      value={width}
                      onChange={(e) =>
                        handleResize(
                          Math.max(3, Math.min(20, parseInt(e.target.value) || 3)),
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
                      max={20}
                      value={height}
                      onChange={(e) =>
                        handleResize(
                          width,
                          Math.max(3, Math.min(20, parseInt(e.target.value) || 3))
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-600 block mb-2">起始方向</label>
                  <div className="grid grid-cols-4 gap-1">
                    {DIRECTIONS.map(({ dir, label: _label, icon }) => (
                      <button
                        key={dir}
                        onClick={() => setStartDirection(dir)}
                        className={`p-2 rounded-lg text-lg transition-all
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

              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-bold text-gray-700 mb-3">🧩 允许的指令块</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {ALL_BLOCK_TYPES.map((type) => {
                    const config = BLOCK_CONFIGS[type];
                    const checked = allowedBlocks.includes(type);
                    return (
                      <label
                        key={type}
                        className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all
                          ${checked ? `${config.color} text-white shadow-sm` : 'bg-white hover:bg-gray-100'}
                        `}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setAllowedBlocks([...allowedBlocks, type]);
                            } else {
                              setAllowedBlocks(allowedBlocks.filter((b) => b !== type));
                            }
                          }}
                          className="w-4 h-4"
                        />
                        <span>{config.icon}</span>
                        <span className="text-sm font-medium">{config.label}</span>
                      </label>
                    );
                  })}
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => setAllowedBlocks(ALL_BLOCK_TYPES)}
                    className="flex-1 text-xs py-1.5 bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 transition-colors"
                  >
                    全选
                  </button>
                  <button
                    onClick={() => setAllowedBlocks([])}
                    className="flex-1 text-xs py-1.5 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    清空
                  </button>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-bold text-gray-700 mb-3">🗺️ 地图编辑</h3>

                <EditorToolbar currentTool={tool} onToolChange={setTool} />

                <div className="my-4">
                  <EditorGrid
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

                <div className="mt-4 flex flex-wrap gap-4 justify-center text-sm text-gray-600 bg-white rounded-lg py-3">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-blue-100 border border-dashed border-blue-400" />
                    起点 ({start.x}, {start.y})
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-emerald-400" />
                    终点 ({goal.x}, {goal.y})
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="text-yellow-400">★</span>
                    星星 {stars.length}颗
                  </span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-3">
              <div className="bg-gray-50 rounded-xl p-4 h-full flex flex-col">
                <h3 className="font-bold text-gray-700 mb-3">📖 使用说明</h3>
                <div className="space-y-2 text-sm text-gray-600 flex-1">
                  <p>
                    <strong>1. 选择工具：</strong>点击上方工具栏
                  </p>
                  <p>
                    <strong>2. 点击格子：</strong>放置或移除元素
                  </p>
                  <p>
                    <strong>3. 墙壁/陷阱/星星：</strong>
                    <span className="text-green-600 font-medium">
                      再次点击同一格即可删除
                    </span>
                  </p>
                  <p>
                    <strong>4. 擦除工具：</strong>一键清除任意元素
                  </p>
                  <p>
                    <strong>5. 设置方向：</strong>在左侧选择起始朝向
                  </p>
                  <p>
                    <strong>6. 试玩测试：</strong>先试玩再保存
                  </p>
                </div>

                <div className="mt-6 p-3 bg-blue-50 rounded-lg text-sm text-blue-700 border border-blue-100">
                  <strong>⚠️ 注意：</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>墙壁和陷阱不能放在起点/终点上</li>
                    <li>星星必须放在可通行的格子</li>
                    <li>陷阱会让机器人直接失败</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showImport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="game-card p-6 max-w-lg w-full animate-pop">
            <h2 className="text-xl font-bold text-gray-800 mb-4">📥 导入关卡</h2>
            <p className="text-sm text-gray-500 mb-3">
              粘贴关卡 JSON 数据，或从 .json 文件读取：
            </p>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
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

export default LevelEditor;
