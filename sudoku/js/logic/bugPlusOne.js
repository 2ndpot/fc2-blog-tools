/**
 * 特殊構造手筋: BUG+1 (js/logic/bugPlusOne.js)
 */

/**
 * BUG+1 (Bivalue Universal Grave + 1) の検出
 */
export function findBUGPlusOne(grid) {
  const candCells = grid.filter(c => c.status === "candidate");
  if (candCells.length === 0) return null;

  const triCells = candCells.filter(c => c.val.length === 3);
  const biCells  = candCells.filter(c => c.val.length === 2);

  if (triCells.length !== 1 || biCells.length !== candCells.length - 1) return null;

  const targetCell = triCells[0];
  let solutionNum = null;

  for (const num of targetCell.val) {
    const rowCount  = grid.filter(c => c.status === "candidate" && c.row === targetCell.row && c.val.includes(num)).length;
    const colCount  = grid.filter(c => c.status === "candidate" && c.col === targetCell.col && c.val.includes(num)).length;
    const boxCount  = grid.filter(c => c.status === "candidate" && c.box === targetCell.box && c.val.includes(num)).length;

    if (rowCount === 3 || colCount === 3 || boxCount === 3) {
      solutionNum = num;
      break;
    }
  }

  if (!solutionNum) return null;

  const redCands = [];
  targetCell.val.forEach(n => {
    if (n !== solutionNum) {
      redCands.push({ cell: targetCell, num: n, row: targetCell.row, col: targetCell.col });
    }
  });

  grid.forEach(c => {
    if (c.status === "candidate" && c !== targetCell) {
      if (c.row === targetCell.row || c.col === targetCell.col || c.box === targetCell.box) {
        if (c.val.includes(solutionNum)) {
          redCands.push({ cell: c, num: solutionNum, row: c.row, col: c.col });
        }
      }
    }
  });

  return {
    name: "BUG+1",
    cell: targetCell,
    targetRow: targetCell.row,
    targetCol: targetCell.col,
    val: solutionNum,
    blueCells: [targetCell],
    blueCands: [{ cell: targetCell, num: solutionNum }],
    redCands: redCands,
    logMsg: `🐛 [BUG+1] R${targetCell.row+1}C${targetCell.col+1} を除くすべてのマスが二値候補です。\n  共役対の埒外にある数字「${solutionNum}」で確定し、多値不完全構造（BUG）を回避します！`,
    logClass: "bug"
  };
}
