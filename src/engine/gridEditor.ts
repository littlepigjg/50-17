import type { CellType, EditorTool, Level, Position } from './types';
import { positionEquals } from './GameEngine';
import { createEmptyGrid } from './GameEngine';

export type ObstacleType = 'wall' | 'pit';
export const OBSTACLE_TYPES: ObstacleType[] = ['wall', 'pit'];

export function isObstacle(type: CellType): boolean {
  return type === 'wall' || type === 'pit';
}

export function setCell(
  grid: CellType[][],
  pos: Position,
  type: CellType
): CellType[][] {
  return grid.map((row, ry) =>
    row.map((cell, rx) => {
      if (rx === pos.x && ry === pos.y) return type;
      return cell;
    })
  );
}

export function getCell(grid: CellType[][], pos: Position): CellType | null {
  if (pos.y < 0 || pos.y >= grid.length) return null;
  if (pos.x < 0 || pos.x >= grid[0].length) return null;
  return grid[pos.y][pos.x];
}

export function resizeEditorGrid(
  oldGrid: CellType[][],
  oldWidth: number,
  oldHeight: number,
  newWidth: number,
  newHeight: number
): CellType[][] {
  const newGrid = createEmptyGrid(newWidth, newHeight);
  for (let y = 0; y < Math.min(oldHeight, newHeight); y++) {
    for (let x = 0; x < Math.min(oldWidth, newWidth); x++) {
      newGrid[y][x] = oldGrid[y][x];
    }
  }
  return newGrid;
}

export function clampPosition(pos: Position, width: number, height: number): Position {
  return {
    x: Math.max(0, Math.min(width - 1, pos.x)),
    y: Math.max(0, Math.min(height - 1, pos.y)),
  };
}

export function removeStarAt(stars: Position[], pos: Position): Position[] {
  return stars.filter((s) => !positionEquals(s, pos));
}

export function toggleStarAt(stars: Position[], pos: Position): Position[] {
  if (stars.some((s) => positionEquals(s, pos))) {
    return removeStarAt(stars, pos);
  }
  return [...stars, { ...pos }];
}

export interface ToggleObstacleResult {
  grid: CellType[][];
  changed: boolean;
  blocked: boolean;
  previousType: CellType;
  newType: CellType;
  message?: string;
}

export function toggleObstacle(
  grid: CellType[][],
  pos: Position,
  obstacleType: ObstacleType
): ToggleObstacleResult {
  const current = getCell(grid, pos);
  if (current === null) {
    return {
      grid,
      changed: false,
      blocked: false,
      previousType: 'empty',
      newType: 'empty',
    };
  }

  const OTHER_LABEL: Record<ObstacleType, string> = {
    wall: '墙壁',
    pit: '陷阱',
  };
  const selfLabel = OTHER_LABEL[obstacleType];
  const otherLabel = obstacleType === 'wall' ? OTHER_LABEL.pit : OTHER_LABEL.wall;

  if (current !== obstacleType && current !== 'empty') {
    return {
      grid,
      changed: false,
      blocked: true,
      previousType: current,
      newType: current,
      message: `该位置已有${otherLabel}，请先用擦除工具清除后再放置${selfLabel}`,
    };
  }

  let newType: CellType;
  if (current === obstacleType) {
    newType = 'empty';
  } else {
    newType = obstacleType;
  }

  return {
    grid: setCell(grid, pos, newType),
    changed: true,
    blocked: false,
    previousType: current,
    newType,
  };
}

export function isPositionBlockedForStartOrGoal(
  grid: CellType[][],
  pos: Position
): boolean {
  const cell = getCell(grid, pos);
  return cell === null || isObstacle(cell);
}

export function isPositionBlockedForStar(
  grid: CellType[][],
  pos: Position,
  start: Position,
  goal: Position
): boolean {
  const cell = getCell(grid, pos);
  if (cell === null) return true;
  if (isObstacle(cell)) return true;
  if (positionEquals(pos, start)) return true;
  if (positionEquals(pos, goal)) return true;
  return false;
}

export interface HandleEditorToolParams {
  tool: EditorTool;
  pos: Position;
  grid: CellType[][];
  start: Position;
  goal: Position;
  stars: Position[];
  width: number;
  height: number;
}

export interface EditorToolResult {
  grid?: CellType[][];
  start?: Position;
  goal?: Position;
  stars?: Position[];
  consumed: boolean;
  blocked?: boolean;
  message?: string;
  messageType?: 'info' | 'warning' | 'error';
}

export function handleEditorToolClick(params: HandleEditorToolParams): EditorToolResult {
  const { tool, pos, grid, start, goal, stars, width, height } = params;

  const clampedPos = clampPosition(pos, width, height);

  switch (tool) {
    case 'wall': {
      if (positionEquals(clampedPos, start)) {
        return {
          consumed: false,
          blocked: true,
          messageType: 'warning',
          message: '不能在起点位置放置墙壁',
        };
      }
      if (positionEquals(clampedPos, goal)) {
        return {
          consumed: false,
          blocked: true,
          messageType: 'warning',
          message: '不能在终点位置放置墙壁',
        };
      }
      const toggleResult = toggleObstacle(grid, clampedPos, 'wall');
      if (toggleResult.blocked) {
        return {
          consumed: false,
          blocked: true,
          messageType: 'warning',
          message: toggleResult.message,
        };
      }
      if (!toggleResult.changed) return { consumed: false };
      const newStars = removeStarAt(stars, clampedPos);
      return {
        grid: toggleResult.grid,
        stars: newStars,
        consumed: true,
        message:
          toggleResult.previousType === 'wall'
            ? '已移除墙壁'
            : `已在 (${clampedPos.x},${clampedPos.y}) 放置墙壁`,
        messageType: 'info',
      };
    }

    case 'pit': {
      if (positionEquals(clampedPos, start)) {
        return {
          consumed: false,
          blocked: true,
          messageType: 'warning',
          message: '不能在起点位置放置陷阱',
        };
      }
      if (positionEquals(clampedPos, goal)) {
        return {
          consumed: false,
          blocked: true,
          messageType: 'warning',
          message: '不能在终点位置放置陷阱',
        };
      }
      const toggleResult = toggleObstacle(grid, clampedPos, 'pit');
      if (toggleResult.blocked) {
        return {
          consumed: false,
          blocked: true,
          messageType: 'warning',
          message: toggleResult.message,
        };
      }
      if (!toggleResult.changed) return { consumed: false };
      const newStars = removeStarAt(stars, clampedPos);
      return {
        grid: toggleResult.grid,
        stars: newStars,
        consumed: true,
        message:
          toggleResult.previousType === 'pit'
            ? '已移除陷阱'
            : `已在 (${clampedPos.x},${clampedPos.y}) 放置陷阱`,
        messageType: 'info',
      };
    }

    case 'start': {
      if (isPositionBlockedForStartOrGoal(grid, clampedPos)) {
        const cell = getCell(grid, clampedPos);
        const blockName = cell === 'wall' ? '墙壁' : cell === 'pit' ? '陷阱' : '障碍物';
        return {
          consumed: false,
          blocked: true,
          messageType: 'warning',
          message: `该位置有${blockName}，不能设置为起点`,
        };
      }
      if (positionEquals(clampedPos, goal)) {
        return {
          consumed: false,
          blocked: true,
          messageType: 'warning',
          message: '起点和终点不能在同一位置',
        };
      }
      const moved = !positionEquals(start, clampedPos);
      return {
        start: { ...clampedPos },
        stars: removeStarAt(stars, clampedPos),
        consumed: true,
        message: moved ? `起点已移至 (${clampedPos.x},${clampedPos.y})` : undefined,
        messageType: moved ? 'info' : undefined,
      };
    }

    case 'goal': {
      if (isPositionBlockedForStartOrGoal(grid, clampedPos)) {
        const cell = getCell(grid, clampedPos);
        const blockName = cell === 'wall' ? '墙壁' : cell === 'pit' ? '陷阱' : '障碍物';
        return {
          consumed: false,
          blocked: true,
          messageType: 'warning',
          message: `该位置有${blockName}，不能设置为终点`,
        };
      }
      if (positionEquals(clampedPos, start)) {
        return {
          consumed: false,
          blocked: true,
          messageType: 'warning',
          message: '起点和终点不能在同一位置',
        };
      }
      const moved = !positionEquals(goal, clampedPos);
      return {
        goal: { ...clampedPos },
        stars: removeStarAt(stars, clampedPos),
        consumed: true,
        message: moved ? `终点已移至 (${clampedPos.x},${clampedPos.y})` : undefined,
        messageType: moved ? 'info' : undefined,
      };
    }

    case 'star': {
      if (isPositionBlockedForStar(grid, clampedPos, start, goal)) {
        const cell = getCell(grid, clampedPos);
        let reason = '该位置不能放置星星';
        if (cell === 'wall') reason = '墙壁位置不能放置星星';
        else if (cell === 'pit') reason = '陷阱位置不能放置星星';
        else if (positionEquals(clampedPos, start)) reason = '起点位置不能放置星星';
        else if (positionEquals(clampedPos, goal)) reason = '终点位置不能放置星星';
        return {
          consumed: false,
          blocked: true,
          messageType: 'warning',
          message: reason,
        };
      }
      const hasStar = stars.some((s) => positionEquals(s, clampedPos));
      return {
        stars: toggleStarAt(stars, clampedPos),
        consumed: true,
        message: hasStar
          ? `已移除 (${clampedPos.x},${clampedPos.y}) 的星星`
          : `在 (${clampedPos.x},${clampedPos.y}) 添加了星星`,
        messageType: 'info',
      };
    }

    case 'erase': {
      let newGrid = grid;
      const current = getCell(grid, clampedPos);
      const erasedWhat: string[] = [];
      if (current && current !== 'empty') {
        newGrid = setCell(grid, clampedPos, 'empty');
        erasedWhat.push(current === 'wall' ? '墙壁' : '陷阱');
      }
      const hadStar = stars.some((s) => positionEquals(s, clampedPos));
      if (hadStar) erasedWhat.push('星星');
      const newStars = removeStarAt(stars, clampedPos);
      return {
        grid: newGrid,
        stars: newStars,
        consumed: true,
        message: erasedWhat.length > 0
          ? `已清除 (${clampedPos.x},${clampedPos.y}) 的${erasedWhat.join('和')}`
          : undefined,
        messageType: erasedWhat.length > 0 ? 'info' : undefined,
      };
    }

    case 'select':
    default:
      return { consumed: false };
  }
}

export function computeBlockedPositions(
  level: Pick<Level, 'grid' | 'start' | 'goal'>
): { walls: Set<string>; pits: Set<string> } {
  const walls = new Set<string>();
  const pits = new Set<string>();
  level.grid.forEach((row, y) => {
    row.forEach((cell, x) => {
      const key = `${x},${y}`;
      if (cell === 'wall') walls.add(key);
      if (cell === 'pit') pits.add(key);
    });
  });
  return { walls, pits };
}
