import { describe, it, expect } from 'vitest';
import type { CellType, Position } from './types';
import {
  createEmptyGrid,
} from './GameEngine';
import {
  clampPosition,
  getCell,
  setCell,
  toggleObstacle,
  handleEditorToolClick,
  resizeEditorGrid,
  toggleStarAt,
  removeStarAt,
  isObstacle,
  isPositionBlockedForStar,
  isPositionBlockedForStartOrGoal,
} from './gridEditor';

const W = 8;
const H = 8;

function makeGrid(): CellType[][] {
  return createEmptyGrid(W, H);
}

function gridWithCell(x: number, y: number, type: CellType): CellType[][] {
  const g = makeGrid();
  g[y][x] = type;
  return g;
}

const START: Position = { x: 0, y: 0 };
const GOAL: Position = { x: 7, y: 7 };

describe('isObstacle', () => {
  it('识别墙壁和陷阱为障碍物', () => {
    expect(isObstacle('wall')).toBe(true);
    expect(isObstacle('pit')).toBe(true);
    expect(isObstacle('empty')).toBe(false);
    expect(isObstacle('start')).toBe(false);
    expect(isObstacle('goal')).toBe(false);
  });
});

describe('setCell / getCell', () => {
  it('setCell 返回新的grid（不修改原数组）', () => {
    const g = makeGrid();
    const newG = setCell(g, { x: 3, y: 4 }, 'wall');
    expect(g[4][3]).toBe('empty');
    expect(newG[4][3]).toBe('wall');
    expect(g).not.toBe(newG);
  });

  it('getCell 越界返回 null', () => {
    const g = makeGrid();
    expect(getCell(g, { x: -1, y: 0 })).toBeNull();
    expect(getCell(g, { x: W, y: 0 })).toBeNull();
    expect(getCell(g, { x: 0, y: -1 })).toBeNull();
    expect(getCell(g, { x: 0, y: H })).toBeNull();
  });

  it('getCell 正常返回格子内容', () => {
    const g = gridWithCell(2, 5, 'pit');
    expect(getCell(g, { x: 2, y: 5 })).toBe('pit');
    expect(getCell(g, { x: 0, y: 0 })).toBe('empty');
  });
});

describe('clampPosition', () => {
  it('将越界位置限制在合法范围内', () => {
    expect(clampPosition({ x: -5, y: 3 }, W, H)).toEqual({ x: 0, y: 3 });
    expect(clampPosition({ x: 100, y: 3 }, W, H)).toEqual({ x: W - 1, y: 3 });
    expect(clampPosition({ x: 3, y: -1 }, W, H)).toEqual({ x: 3, y: 0 });
    expect(clampPosition({ x: 3, y: 99 }, W, H)).toEqual({ x: 3, y: H - 1 });
  });

  it('合法位置不被改变', () => {
    expect(clampPosition({ x: 3, y: 4 }, W, H)).toEqual({ x: 3, y: 4 });
  });
});

describe('resizeEditorGrid', () => {
  it('从小到大扩展保持原内容，新区域为empty', () => {
    const small = createEmptyGrid(4, 4);
    small[2][3] = 'wall';
    const big = resizeEditorGrid(small, 4, 4, 6, 6);
    expect(big.length).toBe(6);
    expect(big[0].length).toBe(6);
    expect(big[2][3]).toBe('wall');
    expect(big[5][5]).toBe('empty');
  });

  it('从大到小收缩，截断外部内容', () => {
    const big = createEmptyGrid(8, 8);
    big[5][5] = 'pit';
    big[7][7] = 'wall';
    const small = resizeEditorGrid(big, 8, 8, 6, 6);
    expect(small.length).toBe(6);
    expect(small[5][5]).toBe('pit');
    expect(small[0].length).toBe(6);
  });

  it('空输入仍然生成合法的grid', () => {
    const g = resizeEditorGrid([], 0, 0, 5, 5);
    expect(g.length).toBe(5);
    expect(g[0].every((c) => c === 'empty')).toBe(true);
  });
});

describe('toggleStarAt / removeStarAt', () => {
  it('toggleStarAt 在empty添加，存在时删除', () => {
    const stars: Position[] = [];
    const afterAdd = toggleStarAt(stars, { x: 2, y: 3 });
    expect(afterAdd).toHaveLength(1);
    expect(afterAdd[0]).toEqual({ x: 2, y: 3 });

    const afterRemove = toggleStarAt(afterAdd, { x: 2, y: 3 });
    expect(afterRemove).toHaveLength(0);
  });

  it('removeStarAt 只移除目标位置的星星', () => {
    const stars: Position[] = [
      { x: 1, y: 1 },
      { x: 2, y: 3 },
      { x: 5, y: 5 },
    ];
    const result = removeStarAt(stars, { x: 2, y: 3 });
    expect(result).toHaveLength(2);
    expect(result.find((s) => s.x === 2 && s.y === 3)).toBeUndefined();
    expect(result.find((s) => s.x === 1 && s.y === 1)).toBeDefined();
  });

  it('星星数组不被修改（返回新数组）', () => {
    const stars: Position[] = [{ x: 1, y: 1 }];
    const newStars = toggleStarAt(stars, { x: 2, y: 2 });
    expect(stars).toHaveLength(1);
    expect(newStars).toHaveLength(2);
  });
});

describe('isPositionBlockedForStartOrGoal', () => {
  it('越界、墙壁、陷阱都算blocked', () => {
    const g = makeGrid();
    g[1][1] = 'wall';
    g[2][2] = 'pit';
    expect(isPositionBlockedForStartOrGoal(g, { x: 1, y: 1 })).toBe(true);
    expect(isPositionBlockedForStartOrGoal(g, { x: 2, y: 2 })).toBe(true);
    expect(isPositionBlockedForStartOrGoal(g, { x: 3, y: 3 })).toBe(false);
    expect(isPositionBlockedForStartOrGoal(g, { x: -1, y: 0 })).toBe(true);
  });
});

describe('isPositionBlockedForStar', () => {
  it('墙壁/陷阱/起点/终点/越界都不能放星星', () => {
    const g = makeGrid();
    g[1][1] = 'wall';
    g[2][2] = 'pit';
    const start: Position = { x: 0, y: 0 };
    const goal: Position = { x: 7, y: 7 };
    expect(isPositionBlockedForStar(g, { x: 1, y: 1 }, start, goal)).toBe(true);
    expect(isPositionBlockedForStar(g, { x: 2, y: 2 }, start, goal)).toBe(true);
    expect(isPositionBlockedForStar(g, start, start, goal)).toBe(true);
    expect(isPositionBlockedForStar(g, goal, start, goal)).toBe(true);
    expect(isPositionBlockedForStar(g, { x: 3, y: 3 }, start, goal)).toBe(false);
  });
});

// ============================================================
// 核心：toggleObstacle 测试（用户反馈的陷阱工具bug所在）
// ============================================================
describe('toggleObstacle - 核心障碍物切换逻辑', () => {
  describe('墙壁(wall)放置/删除', () => {
    it('empty → wall：放置成功', () => {
      const g = makeGrid();
      const res = toggleObstacle(g, { x: 2, y: 3 }, 'wall');
      expect(res.changed).toBe(true);
      expect(res.blocked).toBe(false);
      expect(res.previousType).toBe('empty');
      expect(res.newType).toBe('wall');
      expect(res.grid[3][2]).toBe('wall');
    });

    it('wall → empty：再次点击删除成功', () => {
      const g = gridWithCell(2, 3, 'wall');
      const res = toggleObstacle(g, { x: 2, y: 3 }, 'wall');
      expect(res.changed).toBe(true);
      expect(res.blocked).toBe(false);
      expect(res.previousType).toBe('wall');
      expect(res.newType).toBe('empty');
      expect(res.grid[3][2]).toBe('empty');
    });
  });

  describe('陷阱(pit)放置/删除', () => {
    it('empty → pit：放置成功', () => {
      const g = makeGrid();
      const res = toggleObstacle(g, { x: 5, y: 5 }, 'pit');
      expect(res.changed).toBe(true);
      expect(res.blocked).toBe(false);
      expect(res.newType).toBe('pit');
      expect(res.grid[5][5]).toBe('pit');
    });

    it('pit → empty：再次点击删除成功', () => {
      const g = gridWithCell(5, 5, 'pit');
      const res = toggleObstacle(g, { x: 5, y: 5 }, 'pit');
      expect(res.changed).toBe(true);
      expect(res.blocked).toBe(false);
      expect(res.newType).toBe('empty');
    });
  });

  // 用户反馈的核心bug：用陷阱工具点击已有墙壁的位置，不应该直接覆盖，应该阻止
  describe('跨类型覆盖 - 阻止覆盖逻辑（用户核心bug修复）', () => {
    it('wall → 陷阱工具：阻止覆盖，返回blocked=true并有中文提示', () => {
      const g = gridWithCell(4, 4, 'wall');
      const res = toggleObstacle(g, { x: 4, y: 4 }, 'pit');
      expect(res.changed).toBe(false);
      expect(res.blocked).toBe(true);
      expect(res.newType).toBe('wall');
      expect(res.previousType).toBe('wall');
      // grid 不被修改
      expect(res.grid[4][4]).toBe('wall');
      // 有提示信息
      expect(res.message).toBeDefined();
      expect(res.message).toContain('墙壁');
      expect(res.message).toContain('陷阱');
      expect(res.message).toContain('擦除');
    });

    it('pit → 墙壁工具：阻止覆盖，返回blocked=true并有中文提示', () => {
      const g = gridWithCell(3, 3, 'pit');
      const res = toggleObstacle(g, { x: 3, y: 3 }, 'wall');
      expect(res.changed).toBe(false);
      expect(res.blocked).toBe(true);
      expect(res.newType).toBe('pit');
      expect(res.grid[3][3]).toBe('pit');
      expect(res.message).toBeDefined();
      expect(res.message).toContain('陷阱');
      expect(res.message).toContain('墙壁');
    });

    it('越界位置：返回blocked=false, changed=false（无内容可操作）', () => {
      const g = makeGrid();
      const res = toggleObstacle(g, { x: -1, y: -1 }, 'wall');
      expect(res.changed).toBe(false);
      expect(res.blocked).toBe(false);
    });
  });
});

// ============================================================
// handleEditorToolClick 集成测试
// ============================================================
describe('handleEditorToolClick - 编辑器工具分派集成测试', () => {
  function baseParams(overrides: Partial<{
    tool: any; pos: Position; grid: CellType[][];
    start: Position; goal: Position; stars: Position[];
    width: number; height: number;
  }> = {}) {
    return {
      tool: 'wall' as const,
      pos: { x: 3, y: 3 } as Position,
      grid: makeGrid(),
      start: { ...START },
      goal: { ...GOAL },
      stars: [],
      width: W,
      height: H,
      ...overrides,
    };
  }

  describe('墙壁工具 wall', () => {
    it('empty 放置墙壁 → consumed=true，info 级别 message', () => {
      const p = baseParams({ tool: 'wall', pos: { x: 3, y: 3 } });
      const res = handleEditorToolClick(p);
      expect(res.consumed).toBe(true);
      expect(res.grid![3][3]).toBe('wall');
      expect(res.messageType).toBe('info');
      expect(res.message).toContain('(3,3)');
      expect(res.message).toContain('墙壁');
    });

    it('已有墙壁的位置再次点击 → 删除， consumed=true', () => {
      const g = gridWithCell(3, 3, 'wall');
      const p = baseParams({ tool: 'wall', pos: { x: 3, y: 3 }, grid: g });
      const res = handleEditorToolClick(p);
      expect(res.consumed).toBe(true);
      expect(res.grid![3][3]).toBe('empty');
      expect(res.message).toContain('移除');
    });

    it('起点位置放墙 → 阻止blocked，warning message', () => {
      const p = baseParams({ tool: 'wall', pos: { x: 0, y: 0 } });
      const res = handleEditorToolClick(p);
      expect(res.consumed).toBe(false);
      expect(res.blocked).toBe(true);
      expect(res.messageType).toBe('warning');
      expect(res.message).toContain('起点');
    });

    it('终点位置放墙 → 阻止blocked，warning message', () => {
      const p = baseParams({ tool: 'wall', pos: { x: 7, y: 7 } });
      const res = handleEditorToolClick(p);
      expect(res.consumed).toBe(false);
      expect(res.blocked).toBe(true);
      expect(res.message).toContain('终点');
    });

    it('已有陷阱的位置用墙工具 → 阻止（用户bug修复）', () => {
      const g = gridWithCell(4, 4, 'pit');
      const p = baseParams({ tool: 'wall', pos: { x: 4, y: 4 }, grid: g });
      const res = handleEditorToolClick(p);
      expect(res.consumed).toBe(false);
      expect(res.blocked).toBe(true);
      expect(res.messageType).toBe('warning');
      // 内容不变
      expect(res.grid).toBeUndefined();
      expect(g[4][4]).toBe('pit');
      expect(res.message).toContain('陷阱');
      expect(res.message).toContain('擦除');
    });
  });

  describe('陷阱工具 pit（用户反馈bug的核心工具）', () => {
    it('empty 放置陷阱 → consumed=true，info message', () => {
      const p = baseParams({ tool: 'pit', pos: { x: 2, y: 2 } });
      const res = handleEditorToolClick(p);
      expect(res.consumed).toBe(true);
      expect(res.grid![2][2]).toBe('pit');
      expect(res.messageType).toBe('info');
      expect(res.message).toContain('(2,2)');
    });

    it('已有陷阱再点击 → 删除成功', () => {
      const g = gridWithCell(2, 2, 'pit');
      const p = baseParams({ tool: 'pit', pos: { x: 2, y: 2 }, grid: g });
      const res = handleEditorToolClick(p);
      expect(res.consumed).toBe(true);
      expect(res.grid![2][2]).toBe('empty');
      expect(res.message).toContain('移除');
    });

    it('起点位置放陷阱 → 阻止', () => {
      const p = baseParams({ tool: 'pit', pos: { x: 0, y: 0 } });
      const res = handleEditorToolClick(p);
      expect(res.consumed).toBe(false);
      expect(res.blocked).toBe(true);
      expect(res.message).toContain('起点');
    });

    it('核心bug：已有墙壁的位置用陷阱工具 → 阻止覆盖不丢失wall', () => {
      const g = gridWithCell(4, 4, 'wall');
      const p = baseParams({ tool: 'pit', pos: { x: 4, y: 4 }, grid: g });
      const res = handleEditorToolClick(p);
      // 操作被拒绝
      expect(res.consumed).toBe(false);
      expect(res.blocked).toBe(true);
      expect(res.messageType).toBe('warning');
      // 墙壁未被修改
      expect(res.grid).toBeUndefined();
      expect(g[4][4]).toBe('wall');
      // 提示信息明确
      expect(res.message).toBeDefined();
      expect(res.message).toContain('墙壁');
      expect(res.message).toContain('陷阱');
      expect(res.message).toContain('擦除');
    });

    it('陷阱放在有星星的位置 → 星星被移除', () => {
      const stars: Position[] = [{ x: 5, y: 5 }];
      const p = baseParams({ tool: 'pit', pos: { x: 5, y: 5 }, stars });
      const res = handleEditorToolClick(p);
      expect(res.consumed).toBe(true);
      expect(res.grid![5][5]).toBe('pit');
      expect(res.stars).toHaveLength(0);
    });
  });

  describe('起点工具 start', () => {
    it('empty位置设置起点 → consumed=true，有移动消息', () => {
      const p = baseParams({ tool: 'start', pos: { x: 3, y: 3 } });
      const res = handleEditorToolClick(p);
      expect(res.consumed).toBe(true);
      expect(res.start).toEqual({ x: 3, y: 3 });
      expect(res.messageType).toBe('info');
    });

    it('墙壁位置设置起点 → 阻止，说明原因', () => {
      const g = gridWithCell(3, 3, 'wall');
      const p = baseParams({ tool: 'start', pos: { x: 3, y: 3 }, grid: g });
      const res = handleEditorToolClick(p);
      expect(res.consumed).toBe(false);
      expect(res.blocked).toBe(true);
      expect(res.message).toContain('墙壁');
    });

    it('陷阱位置设置起点 → 阻止，说明原因', () => {
      const g = gridWithCell(3, 3, 'pit');
      const p = baseParams({ tool: 'start', pos: { x: 3, y: 3 }, grid: g });
      const res = handleEditorToolClick(p);
      expect(res.consumed).toBe(false);
      expect(res.message).toContain('陷阱');
    });

    it('设置到当前终点位置 → 阻止', () => {
      const p = baseParams({ tool: 'start', pos: { x: 7, y: 7 } });
      const res = handleEditorToolClick(p);
      expect(res.consumed).toBe(false);
      expect(res.message).toContain('终点');
    });

    it('设置后该位置的星星被移除', () => {
      const stars: Position[] = [{ x: 3, y: 3 }];
      const p = baseParams({ tool: 'start', pos: { x: 3, y: 3 }, stars });
      const res = handleEditorToolClick(p);
      expect(res.stars).toHaveLength(0);
    });
  });

  describe('终点工具 goal', () => {
    it('empty位置设置终点 → consumed=true，移动消息', () => {
      const p = baseParams({ tool: 'goal', pos: { x: 5, y: 5 } });
      const res = handleEditorToolClick(p);
      expect(res.consumed).toBe(true);
      expect(res.goal).toEqual({ x: 5, y: 5 });
      expect(res.messageType).toBe('info');
    });

    it('墙壁位置设置终点 → 阻止', () => {
      const g = gridWithCell(2, 2, 'wall');
      const p = baseParams({ tool: 'goal', pos: { x: 2, y: 2 }, grid: g });
      const res = handleEditorToolClick(p);
      expect(res.consumed).toBe(false);
      expect(res.message).toContain('墙壁');
    });

    it('设置到当前起点位置 → 阻止', () => {
      const p = baseParams({ tool: 'goal', pos: { x: 0, y: 0 } });
      const res = handleEditorToolClick(p);
      expect(res.consumed).toBe(false);
      expect(res.message).toContain('起点');
    });
  });

  describe('星星工具 star', () => {
    it('empty 放星星 → consumed=true，添加消息', () => {
      const p = baseParams({ tool: 'star', pos: { x: 4, y: 4 } });
      const res = handleEditorToolClick(p);
      expect(res.consumed).toBe(true);
      expect(res.stars).toHaveLength(1);
      expect(res.stars![0]).toEqual({ x: 4, y: 4 });
      expect(res.message).toContain('添加');
    });

    it('已有星星位置再次点击 → 删除', () => {
      const stars: Position[] = [{ x: 4, y: 4 }];
      const p = baseParams({ tool: 'star', pos: { x: 4, y: 4 }, stars });
      const res = handleEditorToolClick(p);
      expect(res.consumed).toBe(true);
      expect(res.stars).toHaveLength(0);
      expect(res.message).toContain('移除');
    });

    it('墙壁上放星星 → 阻止', () => {
      const g = gridWithCell(4, 4, 'wall');
      const p = baseParams({ tool: 'star', pos: { x: 4, y: 4 }, grid: g });
      const res = handleEditorToolClick(p);
      expect(res.consumed).toBe(false);
      expect(res.blocked).toBe(true);
      expect(res.message).toContain('墙壁');
    });

    it('陷阱上放星星 → 阻止', () => {
      const g = gridWithCell(4, 4, 'pit');
      const p = baseParams({ tool: 'star', pos: { x: 4, y: 4 }, grid: g });
      const res = handleEditorToolClick(p);
      expect(res.consumed).toBe(false);
      expect(res.message).toContain('陷阱');
    });

    it('起点上放星星 → 阻止', () => {
      const p = baseParams({ tool: 'star', pos: { x: 0, y: 0 } });
      const res = handleEditorToolClick(p);
      expect(res.consumed).toBe(false);
      expect(res.message).toContain('起点');
    });

    it('终点上放星星 → 阻止', () => {
      const p = baseParams({ tool: 'star', pos: { x: 7, y: 7 } });
      const res = handleEditorToolClick(p);
      expect(res.consumed).toBe(false);
      expect(res.message).toContain('终点');
    });
  });

  describe('擦除工具 erase', () => {
    it('擦除墙壁 → 变为empty，有清除消息', () => {
      const g = gridWithCell(4, 4, 'wall');
      const p = baseParams({ tool: 'erase', pos: { x: 4, y: 4 }, grid: g });
      const res = handleEditorToolClick(p);
      expect(res.consumed).toBe(true);
      expect(res.grid![4][4]).toBe('empty');
      expect(res.message).toContain('墙壁');
    });

    it('擦除陷阱 → 变为empty', () => {
      const g = gridWithCell(4, 4, 'pit');
      const p = baseParams({ tool: 'erase', pos: { x: 4, y: 4 }, grid: g });
      const res = handleEditorToolClick(p);
      expect(res.consumed).toBe(true);
      expect(res.grid![4][4]).toBe('empty');
      expect(res.message).toContain('陷阱');
    });

    it('擦除有星星的格子 → 星星也被清除，消息包含两者', () => {
      const g = gridWithCell(4, 4, 'wall');
      const stars: Position[] = [{ x: 4, y: 4 }];
      const p = baseParams({ tool: 'erase', pos: { x: 4, y: 4 }, grid: g, stars });
      const res = handleEditorToolClick(p);
      expect(res.grid![4][4]).toBe('empty');
      expect(res.stars).toHaveLength(0);
      expect(res.message).toContain('墙壁');
      expect(res.message).toContain('星星');
    });

    it('空格子擦除 → consumed=true 但无消息（无变化可提示）', () => {
      const p = baseParams({ tool: 'erase', pos: { x: 1, y: 1 } });
      const res = handleEditorToolClick(p);
      expect(res.consumed).toBe(true);
      expect(res.message).toBeUndefined();
    });
  });

  describe('选择工具 select', () => {
    it('任何位置点击都不消费，不修改', () => {
      const p = baseParams({ tool: 'select', pos: { x: 2, y: 2 } });
      const res = handleEditorToolClick(p);
      expect(res.consumed).toBe(false);
      expect(res.grid).toBeUndefined();
      expect(res.start).toBeUndefined();
    });
  });

  describe('边界位置', () => {
    it('越界点击自动clamp处理不崩溃', () => {
      const p = baseParams({ tool: 'wall', pos: { x: 99, y: 99 } });
      const res = handleEditorToolClick(p);
      // 被 clamp 到 (7,7)，而 (7,7) 是 goal 位置 → 阻止
      expect(res.blocked).toBe(true);
      expect(res.message).toContain('终点');
    });

    it('负坐标点击被自动clamp', () => {
      const p = baseParams({ tool: 'wall', pos: { x: -5, y: -5 } });
      const res = handleEditorToolClick(p);
      // clamp 到 (0,0)，是 start 位置 → 阻止
      expect(res.blocked).toBe(true);
      expect(res.message).toContain('起点');
    });
  });
});
