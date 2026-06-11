import React from 'react';
import type { EditorTool } from '../../engine/types';

export interface ToolConfig {
  tool: EditorTool;
  label: string;
  icon: string;
  color: string;
  description: string;
}

export const EDITOR_TOOLS: ToolConfig[] = [
  {
    tool: 'select',
    label: '选择',
    icon: '👆',
    color: 'bg-gray-400',
    description: '仅查看，不做修改',
  },
  {
    tool: 'wall',
    label: '墙壁',
    icon: '🧱',
    color: 'bg-gray-700',
    description: '点击格子放置/移除墙壁（阻挡机器人）',
  },
  {
    tool: 'start',
    label: '起点',
    icon: '🚩',
    color: 'bg-blue-500',
    description: '设置机器人起始位置',
  },
  {
    tool: 'goal',
    label: '终点',
    icon: '🏁',
    color: 'bg-green-500',
    description: '设置关卡目标位置',
  },
  {
    tool: 'star',
    label: '星星',
    icon: '⭐',
    color: 'bg-yellow-400',
    description: '放置/移除收集物（需要全部收集）',
  },
  {
    tool: 'pit',
    label: '陷阱',
    icon: '🕳️',
    color: 'bg-red-600',
    description: '放置/移除陷阱（掉入即失败）',
  },
  {
    tool: 'erase',
    label: '擦除',
    icon: '🧹',
    color: 'bg-pink-400',
    description: '清除格子上的所有元素',
  },
];

interface EditorToolbarProps {
  currentTool: EditorTool;
  onToolChange: (tool: EditorTool) => void;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  currentTool,
  onToolChange,
}) => {
  const activeConfig = EDITOR_TOOLS.find((t) => t.tool === currentTool);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {EDITOR_TOOLS.map(({ tool, label, icon, color }) => (
          <button
            key={tool}
            onClick={() => onToolChange(tool)}
            className={`
              px-3 py-2 rounded-lg flex items-center gap-1.5 text-sm font-medium transition-all
              ${currentTool === tool
                ? 'ring-2 ring-offset-2 ring-primary-500 scale-105 shadow-md'
                : 'hover:scale-105 bg-white border border-gray-200 hover:border-primary-300 hover:bg-primary-50'
              }
            `}
            title={label}
          >
            <span
              className={`px-2 py-0.5 rounded text-white text-xs shadow-sm ${color}`}
            >
              {icon}
            </span>
            <span className="whitespace-nowrap">{label}</span>
          </button>
        ))}
      </div>

      {activeConfig && (
        <div className="text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 flex items-start gap-2">
          <span className="text-blue-500 font-bold">💡</span>
          <span>
            <strong className="text-blue-700">{activeConfig.label}：</strong>
            {activeConfig.description}
            {activeConfig.tool === 'wall' || activeConfig.tool === 'pit' || activeConfig.tool === 'star' ? (
              <span className="text-blue-600 ml-1">（再次点击同一格可移除）</span>
            ) : null}
          </span>
        </div>
      )}
    </div>
  );
};

export default EditorToolbar;
