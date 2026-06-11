import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { ProgramBlock } from '../../engine/types';
import { BLOCK_CONFIGS } from '../../engine/blocks';
import { updateBlock } from '../../engine/blockUtils';

interface DraggableBlockProps {
  block: ProgramBlock;
  isHighlighted?: boolean;
  onDelete?: (id: string) => void;
  onUpdate?: (blocks: ProgramBlock[]) => void;
  allBlocks?: ProgramBlock[];
  depth?: number;
}

const BlockChildrenContainer: React.FC<{
  containerId: string;
  children?: React.ReactNode;
  color: string;
  isEmpty?: boolean;
}> = ({ containerId, children, color, isEmpty }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `container-${containerId}`,
    data: { containerId, isContainer: true },
  });

  return (
    <div
      ref={setNodeRef}
      className={`
        min-h-[48px] m-2 p-2 rounded-lg border-2 border-dashed
        ${isOver ? 'drag-over border-blue-500' : 'border-white/40'}
        ${isEmpty ? 'flex items-center justify-center text-white/60 text-xs' : ''}
        transition-all duration-200
      `}
      style={{ backgroundColor: `${color}33` }}
    >
      {isEmpty ? <span>拖入指令...</span> : children}
    </div>
  );
};

export const DraggableBlock: React.FC<DraggableBlockProps> = ({
  block,
  isHighlighted,
  onDelete,
  onUpdate,
  allBlocks = [],
  depth = 0,
}) => {
  const config = BLOCK_CONFIGS[block.type];
  const [showRepeatInput, setShowRepeatInput] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: block.id,
    data: { block, fromProgram: true },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 100 : 1,
    marginLeft: depth > 0 ? `${depth * 4}px` : 0,
  };

  const handleRepeatChange = (value: number) => {
    if (onUpdate && allBlocks) {
      const updated = updateBlock(allBlocks, block.id, { repeatCount: value });
      onUpdate(updated);
    }
  };

  const hasChildren = config.hasChildren && block.children !== undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        relative ${config.color} block-shadow-sm text-white rounded-lg
        transition-all duration-200 my-1
        ${isHighlighted ? 'ring-4 ring-yellow-400 ring-offset-2 scale-105 z-10' : ''}
        ${isDragging ? 'rotate-2 scale-105' : ''}
      `}
    >
      <div className="flex items-center gap-2 p-2 pr-8">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing flex items-center gap-2 flex-1 min-w-0"
        >
          <span className="text-lg flex-shrink-0">{config.icon}</span>
          <span className="text-sm font-bold truncate">{config.label}</span>

          {block.type === 'loop' && (
            <div className="flex items-center gap-1 flex-shrink-0">
              {showRepeatInput ? (
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={block.repeatCount || 2}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    const v = parseInt(e.target.value) || 1;
                    handleRepeatChange(Math.max(1, Math.min(99, v)));
                  }}
                  onBlur={() => setShowRepeatInput(false)}
                  className="w-12 text-xs bg-white/20 text-white rounded px-2 py-0.5 text-center border-none outline-none"
                  autoFocus
                />
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowRepeatInput(true);
                  }}
                  className="text-xs bg-white/20 px-2 py-0.5 rounded hover:bg-white/30 transition-colors"
                >
                  ×{block.repeatCount || 2}
                </button>
              )}
            </div>
          )}

          {block.type === 'function' && (
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded flex-shrink-0">
              {block.functionId || 'func1'}
            </span>
          )}

          {block.type === 'callFunction' && (
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded flex-shrink-0">
              {block.functionId || 'func1'}
            </span>
          )}
        </div>

        {onDelete && depth >= 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(block.id);
            }}
            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-white/20 hover:bg-red-500
                     flex items-center justify-center text-xs transition-colors"
            title="删除"
          >
            ✕
          </button>
        )}
      </div>

      {hasChildren && (
        <BlockChildrenContainer
          containerId={block.id}
          color={config.color.replace('bg-', '')}
          isEmpty={!block.children || block.children.length === 0}
        >
          {block.children && block.children.length > 0 && (
            <div className="space-y-0">
              {block.children.map((child) => (
                <DraggableBlock
                  key={child.id}
                  block={child}
                  isHighlighted={isHighlighted}
                  onDelete={onDelete}
                  onUpdate={onUpdate}
                  allBlocks={allBlocks}
                  depth={depth + 1}
                />
              ))}
            </div>
          )}
        </BlockChildrenContainer>
      )}
    </div>
  );
};

export default DraggableBlock;
