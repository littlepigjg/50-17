import React from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import type { BlockType, ProgramBlock } from '../../engine/types';
import { BLOCK_CONFIGS } from '../../engine/blocks';
import {
  cloneBlock,
  createBlock,
  insertBlockAfter,
  insertBlockIntoContainer,
  removeBlockById,
} from '../../engine/blockUtils';
import { DraggableBlock } from './DraggableBlock';

interface ProgramAreaProps {
  blocks: ProgramBlock[];
  onBlocksChange: (blocks: ProgramBlock[]) => void;
  highlightedBlockId?: string;
  disabled?: boolean;
  maxBlocks?: number;
  title?: string;
  emptyText?: string;
  functionId?: string;
  allowFunctionDef?: boolean;
}

const DropZone: React.FC<{
  id: string;
  children?: React.ReactNode;
  className?: string;
  label?: string;
}> = ({ id, children, className = '', label }) => {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: { isMainDropZone: id === 'main-drop-zone' || id.startsWith('func-zone-') },
  });

  return (
    <div
      ref={setNodeRef}
      className={`
        min-h-[200px] rounded-xl border-2 border-dashed p-3 transition-all duration-200
        ${isOver ? 'drag-over border-4' : 'border-gray-300 bg-gray-50/50'}
        ${className}
      `}
    >
      {label && !children && (
        <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
          <div className="text-center">
            <div className="text-4xl mb-2">📝</div>
            <p>{label}</p>
          </div>
        </div>
      )}
      {children}
    </div>
  );
};

export const ProgramArea: React.FC<ProgramAreaProps> = ({
  blocks,
  onBlocksChange,
  highlightedBlockId,
  disabled,
  maxBlocks,
  title = '📝 程序区域',
  emptyText = '从左侧拖拽指令块到这里开始编程！',
  functionId,
  allowFunctionDef = true,
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const [activeBlock, setActiveBlock] = React.useState<{
    block?: ProgramBlock;
    type?: BlockType;
    fromPalette?: boolean;
  } | null>(null);

  const handleDragStart = (event: DragStartEvent) => {
    if (disabled) return;
    const { active } = event;
    const data = active.data.current;

    if (data?.fromPalette) {
      setActiveBlock({ type: data.type as BlockType, fromPalette: true });
    } else if (data?.fromProgram) {
      setActiveBlock({ block: data.block as ProgramBlock, fromPalette: false });
    }
  };

  const findContainerAndIndex = (
    allBlocks: ProgramBlock[],
    targetId: string
  ): { containerId: string | null; index: number; isContainer: boolean } | null => {
    for (const block of allBlocks) {
      if (block.id === targetId) {
        return { containerId: null, index: allBlocks.indexOf(block), isContainer: false };
      }
      if (block.children) {
        const childIndex = block.children.findIndex((c) => c.id === targetId);
        if (childIndex !== -1) {
          return { containerId: block.id, index: childIndex, isContainer: false };
        }
        if (`container-${block.id}` === targetId) {
          return { containerId: block.id, index: -1, isContainer: true };
        }
        const found = findContainerAndIndex(block.children, targetId);
        if (found) return found;
      }
    }
    return null;
  };

  const removeFromOriginal = (allBlocks: ProgramBlock[], blockId: string): ProgramBlock[] => {
    return removeBlockById(allBlocks, blockId);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    if (disabled) {
      setActiveBlock(null);
      return;
    }

    const { active, over } = event;
    setActiveBlock(null);

    if (!over) return;

    const activeData = active.data.current;
    const overId = over.id.toString();

    let newBlock: ProgramBlock | null = null;
    let updatedBlocks = [...blocks];

    if (activeData?.fromPalette) {
      const type = activeData.type as BlockType;
      if (!allowFunctionDef && type === 'function') return;
      if (functionId && type === 'function') return;

      newBlock = createBlock(type, functionId ? { functionId } : undefined);
    } else if (activeData?.fromProgram) {
      const block = activeData.block as ProgramBlock;
      newBlock = cloneBlock(block);
      updatedBlocks = removeFromOriginal(updatedBlocks, block.id);
    }

    if (!newBlock) return;

    if (maxBlocks && countBlocks(updatedBlocks) >= maxBlocks && activeData?.fromPalette) {
      return;
    }

    const isMainDropZone = overId === 'main-drop-zone' || overId === `func-zone-${functionId}`;

    if (isMainDropZone) {
      updatedBlocks = [...updatedBlocks, newBlock];
      onBlocksChange(updatedBlocks);
      return;
    }

    if (overId.startsWith('container-')) {
      const containerId = overId.replace('container-', '');
      updatedBlocks = insertBlockIntoContainer(updatedBlocks, containerId, newBlock);
      onBlocksChange(updatedBlocks);
      return;
    }

    const targetInfo = findContainerAndIndex(updatedBlocks, overId);
    if (targetInfo) {
      if (targetInfo.isContainer) {
        updatedBlocks = insertBlockIntoContainer(
          updatedBlocks,
          targetInfo.containerId!,
          newBlock
        );
      } else if (targetInfo.containerId) {
        updatedBlocks = insertBlockIntoContainer(
          updatedBlocks,
          targetInfo.containerId,
          newBlock,
          targetInfo.index + 1
        );
      } else {
        updatedBlocks = insertBlockAfter(updatedBlocks, overId, newBlock);
      }
      onBlocksChange(updatedBlocks);
    }
  };

  const handleDelete = (blockId: string) => {
    if (disabled) return;
    const updated = removeBlockById(blocks, blockId);
    onBlocksChange(updated);
  };

  const handleUpdate = (updated: ProgramBlock[]) => {
    onBlocksChange(updated);
  };

  const dropZoneId = functionId ? `func-zone-${functionId}` : 'main-drop-zone';

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-bold text-gray-800">{title}</h3>
        {maxBlocks && (
          <span className={`text-sm font-medium ${countBlocks(blocks) >= maxBlocks ? 'text-red-500' : 'text-gray-500'}`}>
            {countBlocks(blocks)} / {maxBlocks} 块
          </span>
        )}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 overflow-y-auto">
          <DropZone id={dropZoneId} label={emptyText}>
            {blocks.length > 0 && (
              <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                {blocks.map((block) => (
                  <DraggableBlock
                    key={block.id}
                    block={block}
                    isHighlighted={highlightedBlockId === block.id}
                    onDelete={handleDelete}
                    onUpdate={handleUpdate}
                    allBlocks={blocks}
                    depth={0}
                  />
                ))}
              </SortableContext>
            )}
          </DropZone>
        </div>

        <DragOverlay>
          {activeBlock?.fromPalette && activeBlock.type ? (
            <div className={`${BLOCK_CONFIGS[activeBlock.type].color} block-shadow text-white rounded-lg px-4 py-2 flex items-center gap-2 opacity-90 rotate-3 scale-110`}>
              <span className="text-lg">{BLOCK_CONFIGS[activeBlock.type].icon}</span>
              <span className="text-sm font-bold">{BLOCK_CONFIGS[activeBlock.type].label}</span>
            </div>
          ) : activeBlock?.block ? (
            <div className={`${BLOCK_CONFIGS[activeBlock.block.type].color} block-shadow text-white rounded-lg px-4 py-2 flex items-center gap-2 opacity-90 rotate-3 scale-110`}>
              <span className="text-lg">{BLOCK_CONFIGS[activeBlock.block.type].icon}</span>
              <span className="text-sm font-bold">{BLOCK_CONFIGS[activeBlock.block.type].label}</span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {blocks.length > 0 && !disabled && (
        <button
          onClick={() => onBlocksChange([])}
          className="mt-2 text-sm text-red-500 hover:text-red-700 transition-colors self-end"
        >
          🗑️ 清空所有
        </button>
      )}
    </div>
  );
};

function countBlocks(blocks: ProgramBlock[]): number {
  let count = 0;
  for (const block of blocks) {
    count++;
    if (block.children) {
      count += countBlocks(block.children);
    }
  }
  return count;
}

export default ProgramArea;
