import React, { useMemo, useState } from 'react';
import type { SandboxCreation } from '../engine/types';
import {
  loadSandboxCreations,
  deleteSandboxCreation,
  shareSandbox,
  downloadSandbox,
} from '../engine/storage';

interface SandboxGalleryProps {
  onBack: () => void;
  onNewCreation: () => void;
  onOpenCreation: (creation: SandboxCreation) => void;
}

const CreationThumbnail: React.FC<{ creation: SandboxCreation }> = ({ creation }) => {
  const cellSize = Math.max(4, Math.floor(72 / Math.max(creation.width, creation.height)));

  return (
    <div
      className="relative bg-slate-100 rounded-lg overflow-hidden border border-gray-200 shadow-inner"
      style={{
        width: creation.width * cellSize,
        height: creation.height * cellSize,
      }}
    >
      {creation.grid.map((row, y) =>
        row.map((cell, x) => {
          const isStart = creation.start?.x === x && creation.start?.y === y;
          const isGoal = creation.goal?.x === x && creation.goal?.y === y;
          const hasStar = creation.stars.some((s) => s.x === x && s.y === y);

          let bg = (x + y) % 2 === 0 ? '#f8fafc' : '#f1f5f9';
          if (cell === 'wall') bg = 'linear-gradient(135deg, #4b5563, #1f2937)';
          if (cell === 'pit') bg = '#111827';
          if (isStart) bg = '#dbeafe';
          if (isGoal) bg = '#6ee7b7';

          return (
            <div
              key={`thumb-${x}-${y}`}
              className="absolute"
              style={{
                left: x * cellSize,
                top: y * cellSize,
                width: cellSize,
                height: cellSize,
                background: bg,
                borderRight: x < creation.width - 1 ? '1px solid rgba(148,163,184,0.2)' : 'none',
                borderBottom: y < creation.height - 1 ? '1px solid rgba(148,163,184,0.2)' : 'none',
              }}
            >
              {hasStar && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span style={{ fontSize: cellSize * 0.8 }}>⭐</span>
                </div>
              )}
              {isStart && (
                <div className="absolute inset-0 flex items-center justify-center text-blue-600 font-bold"
                  style={{ fontSize: cellSize * 0.6 }}>
                  起
                </div>
              )}
              {isGoal && (
                <div className="absolute inset-0 flex items-center justify-center"
                  style={{ fontSize: cellSize * 0.7 }}>
                  🏁
                </div>
              )}
              {cell === 'pit' && (
                <div className="absolute inset-0 flex items-center justify-center text-red-400"
                  style={{ fontSize: cellSize * 0.6 }}>
                  ⚠
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};

export const SandboxGallery: React.FC<SandboxGalleryProps> = ({
  onBack,
  onNewCreation,
  onOpenCreation,
}) => {
  const [creations, setCreations] = useState<SandboxCreation[]>(() => loadSandboxCreations());
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'updated' | 'created' | 'name'>('updated');

  const filteredCreations = useMemo(() => {
    let result = [...creations];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          c.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }
    result.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'created') return b.createdAt - a.createdAt;
      return b.updatedAt - a.updatedAt;
    });
    return result;
  }, [creations, search, sortBy]);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('确定要删除这个创作吗？此操作不可撤销。')) {
      deleteSandboxCreation(id);
      setCreations(loadSandboxCreations());
    }
  };

  const handleShare = async (creation: SandboxCreation, e: React.MouseEvent) => {
    e.stopPropagation();
    const success = await shareSandbox(creation);
    if (success) {
      alert('✅ 创作 JSON 已复制到剪贴板！\n分享给朋友，他们可以在沙盒模式中导入。');
    } else {
      downloadSandbox(creation);
    }
  };

  const handleDownload = (creation: SandboxCreation, e: React.MouseEvent) => {
    e.stopPropagation();
    downloadSandbox(creation);
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="game-card p-6 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <button onClick={onBack} className="btn-secondary">
                ← 返回
              </button>
              <div className="flex items-center gap-3">
                <span className="text-4xl">📚</span>
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">沙盒作品库</h1>
                  <p className="text-sm text-gray-500">管理和分享你的自由创作</p>
                </div>
              </div>
            </div>
            <button onClick={onNewCreation} className="btn-success flex items-center gap-2">
              ➕ 新建创作
            </button>
          </div>
        </div>

        <div className="game-card p-6">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
            <div className="flex items-center gap-3 flex-1 max-w-md">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索作品名称、描述或标签..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">排序：</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
              >
                <option value="updated">最近更新</option>
                <option value="created">创建时间</option>
                <option value="name">名称</option>
              </select>
            </div>
          </div>

          {filteredCreations.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">
                {creations.length === 0 ? '🎨' : '🔍'}
              </div>
              <p className="text-gray-500 text-lg mb-2">
                {creations.length === 0 ? '还没有任何创作' : '没有找到匹配的作品'}
              </p>
              <p className="text-gray-400 text-sm mb-6">
                {creations.length === 0
                  ? '点击"新建创作"开始你的第一个沙盒作品吧！'
                  : '试试其他关键词'}
              </p>
              {creations.length === 0 && (
                <button onClick={onNewCreation} className="btn-primary">
                  🎨 开始创作
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCreations.map((creation) => (
                <div
                  key={creation.id}
                  onClick={() => onOpenCreation(creation)}
                  className="group bg-white border-2 border-gray-200 rounded-xl p-4 cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-xl hover:border-primary-400"
                >
                  <div className="flex items-start justify-between mb-3 gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-800 truncate group-hover:text-primary-600 transition-colors">
                        {creation.name || '未命名'}
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        更新于 {formatDate(creation.updatedAt)}
                      </p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleShare(creation, e)}
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600"
                        title="分享"
                      >
                        📤
                      </button>
                      <button
                        onClick={(e) => handleDownload(creation, e)}
                        className="p-1.5 rounded-lg hover:bg-green-50 text-green-600"
                        title="下载"
                      >
                        💾
                      </button>
                      <button
                        onClick={(e) => handleDelete(creation.id, e)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-600"
                        title="删除"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-center mb-3 py-2 bg-slate-50 rounded-lg">
                    <CreationThumbnail creation={creation} />
                  </div>

                  {creation.description && (
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                      {creation.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>
                      {creation.width}×{creation.height}
                    </span>
                    <div className="flex items-center gap-2">
                      {creation.start && (
                        <span className="flex items-center gap-0.5">
                          <span className="w-2 h-2 rounded bg-blue-400" />起
                        </span>
                      )}
                      {creation.goal && (
                        <span className="flex items-center gap-0.5">
                          <span className="w-2 h-2 rounded bg-green-400" />终
                        </span>
                      )}
                      {creation.stars.length > 0 && (
                        <span>⭐ {creation.stars.length}</span>
                      )}
                    </div>
                  </div>

                  {creation.tags && creation.tags.length > 0 && (
                    <div className="flex gap-1 flex-wrap mt-2">
                      {creation.tags.slice(0, 4).map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs"
                        >
                          #{tag}
                        </span>
                      ))}
                      {creation.tags.length > 4 && (
                        <span className="text-xs text-gray-400">
                          +{creation.tags.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="text-center mt-8 text-white/70 text-sm">
          💡 提示：在沙盒中创作的作品会自动保存在本地，你可以随时导出 JSON 分享给朋友
        </div>
      </div>
    </div>
  );
};

export default SandboxGallery;
