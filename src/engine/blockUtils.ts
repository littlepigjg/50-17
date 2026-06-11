import { v4 as uuidv4 } from 'uuid';
import type { BlockType, ProgramBlock } from './types';

export function createBlock(type: BlockType, extras: Partial<ProgramBlock> = {}): ProgramBlock {
  const block: ProgramBlock = {
    id: uuidv4(),
    type,
    ...extras,
  };

  if (type === 'loop') {
    block.repeatCount = extras.repeatCount || 2;
    block.children = [];
  } else if (
    type === 'ifWall' ||
    type === 'ifStar' ||
    type === 'ifEmpty' ||
    type === 'function'
  ) {
    block.children = [];
  }

  if (type === 'function') {
    block.functionId = extras.functionId || 'func1';
  }

  if (type === 'callFunction') {
    block.functionId = extras.functionId || 'func1';
  }

  return block;
}

export function cloneBlock(block: ProgramBlock): ProgramBlock {
  return {
    ...block,
    id: uuidv4(),
    children: block.children ? block.children.map(cloneBlock) : undefined,
  };
}

export function findBlockById(
  blocks: ProgramBlock[],
  id: string
): ProgramBlock | null {
  for (const block of blocks) {
    if (block.id === id) return block;
    if (block.children) {
      const found = findBlockById(block.children, id);
      if (found) return found;
    }
  }
  return null;
}

export function removeBlockById(
  blocks: ProgramBlock[],
  id: string
): ProgramBlock[] {
  return blocks
    .filter((b) => b.id !== id)
    .map((b) => ({
      ...b,
      children: b.children ? removeBlockById(b.children, id) : undefined,
    }));
}

export function insertBlockAfter(
  blocks: ProgramBlock[],
  targetId: string,
  newBlock: ProgramBlock
): ProgramBlock[] {
  const result: ProgramBlock[] = [];
  for (const block of blocks) {
    result.push({
      ...block,
      children: block.children
        ? insertBlockAfter(block.children, targetId, newBlock)
        : undefined,
    });
    if (block.id === targetId) {
      result.push(newBlock);
    }
  }
  return result;
}

export function insertBlockIntoContainer(
  blocks: ProgramBlock[],
  containerId: string,
  newBlock: ProgramBlock,
  index: number = -1
): ProgramBlock[] {
  return blocks.map((block) => {
    if (block.id === containerId && block.children) {
      const newChildren = [...block.children];
      if (index >= 0 && index <= newChildren.length) {
        newChildren.splice(index, 0, newBlock);
      } else {
        newChildren.push(newBlock);
      }
      return { ...block, children: newChildren };
    }
    return {
      ...block,
      children: block.children
        ? insertBlockIntoContainer(block.children, containerId, newBlock, index)
        : undefined,
    };
  });
}

export function updateBlock(
  blocks: ProgramBlock[],
  id: string,
  updates: Partial<ProgramBlock>
): ProgramBlock[] {
  return blocks.map((block) => {
    if (block.id === id) {
      return { ...block, ...updates };
    }
    return {
      ...block,
      children: block.children ? updateBlock(block.children, id, updates) : undefined,
    };
  });
}
