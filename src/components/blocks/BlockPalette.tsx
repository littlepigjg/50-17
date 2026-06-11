import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { BlockType } from '../../engine/types';
import { BLOCK_CONFIGS } from '../../engine/blocks';

interface BlockPaletteItemProps {
  type: BlockType;
  disabled?: boolean;
}

export const BlockPaletteItem: React.FC<BlockPaletteItemProps> = ({ type, disabled }) => {
  const config = BLOCK_CONFIGS[type];
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `palette-${type}`,
    data: { type, fromPalette: true },
    disabled,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`
        ${config.color} block-shadow-sm text-white rounded-lg px-3 py-2
        flex items-center gap-2 cursor-grab active:cursor-grabbing
        transition-all duration-150 hover:scale-105 select-none
        ${disabled ? 'opacity-40 cursor-not-allowed !cursor-not-allowed' : ''}
        ${isDragging ? 'z-50 scale-110' : ''}
      `}
      title={config.description}
    >
      <span className="text-lg">{config.icon}</span>
      <span className="text-sm font-bold">{config.label}</span>
      {config.type === 'loop' && (
        <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded">×N</span>
      )}
    </div>
  );
};

interface BlockPaletteProps {
  allowedBlocks: BlockType[];
  disabled?: boolean;
}

export const BlockPalette: React.FC<BlockPaletteProps> = ({ allowedBlocks, disabled }) => {
  const categories = ['basic', 'control', 'condition', 'function'] as const;
  const categoryNames: Record<string, string> = {
    basic: '基础指令',
    control: '流程控制',
    condition: '条件判断',
    function: '函数',
  };

  return (
    <div className="bg-white/90 rounded-2xl p-4 shadow-xl h-full overflow-y-auto">
      <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
        <span>🧩</span> 指令块
      </h3>
      <div className="space-y-4">
        {categories.map((category) => {
          const blocks = allowedBlocks.filter(
            (b) => BLOCK_CONFIGS[b].category === category
          );
          if (blocks.length === 0) return null;
          return (
            <div key={category}>
              <p className="text-xs text-gray-500 mb-2 font-semibold uppercase tracking-wide">
                {categoryNames[category]}
              </p>
              <div className="flex flex-wrap gap-2">
                {blocks.map((type) => (
                  <BlockPaletteItem
                    key={type}
                    type={type}
                    disabled={disabled}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 leading-relaxed">
          💡 拖拽指令块到右侧的"程序区域"，编排你的程序吧！
        </p>
      </div>
    </div>
  );
};

export default BlockPalette;
