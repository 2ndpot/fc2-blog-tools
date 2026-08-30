/**
 * 単一候補手筋: Naked Single & Hidden Single (js/logic/singles.js)
 */
import { getHouseName } from './utils.js';

/**
 * Naked Single（確定マス）の検出
 */
export function findNakedSingle(grid) {
  const target = grid.find(c => c.status === "candidate" && c.val.length === 1);
  if (!target) return null;

  const val = target.val[0];
  const redCands = [];
  grid.forEach(c => {
    if (c.status === "candidate" && c !== target) {
      if (c.row === target.row || c.col === target.col || c.box === target.box) {
        if (c.val.includes(val)) {
          redCands.push({ cell: c, num: val, row: c.row, col: c.col });
        }
      }
    }
  });

  return {
    name: "Naked Single",
    cell: target,
    targetRow: target.row,
    targetCol: target.col,
    val: val,
    blueCells: [target],
    blueCands: [{ cell: target, num: val }],
    redCands: redCands,
    logMsg: `💡 [Naked Single] R${target.row+1}C${target.col+1} は「${val}」で確定。関連する他マスの「${val}」を削除します。`,
    logClass: "ok"
  };
}

/**
 * Hidden Single（限定マス）の検出
 */
export function findHiddenSingle(grid) {
  for (const houseType of ["row", "col", "box"]) {
    for (let hIdx = 0; hIdx < 9; hIdx++) {
      const houseCells = grid.filter(c => c.status === "candidate" && c[houseType] === hIdx);
      const counts = Array(10).fill(0);
      houseCells.forEach(c => c.val.forEach(n => counts[n]++));

      for (let num = 1; num <= 9; num++) {
        if (counts[num] === 1) {
          const target = houseCells.find(c => c.val.includes(num));
          if (target) {
            const redCands = [];
            target.val.forEach(n => {
              if (n !== num) redCands.push({ cell: target, num: n, row: target.row, col: target.col });
            });
            grid.forEach(c => {
              if (c.status === "candidate" && c !== target) {
                if (c.row === target.row || c.col === target.col || c.box === target.box) {
                  if (c.val.includes(num)) redCands.push({ cell: c, num: num, row: c.row, col: c.col });
                }
              }
            });

            return {
              name: "Hidden Single",
              cell: target,
              targetRow: target.row,
              targetCol: target.col,
              val: num,
              blueCells: [target],
              blueCands: [{ cell: target, num: num }],
              redCands: redCands,
              logMsg: `💡 [Hidden Single] 第${hIdx+1}${getHouseName(houseType)} で「${num}」が入る唯一のマス R${target.row+1}C${target.col+1} を発見しました。`,
              logClass: "ok"
            };
          }
        }
      }
    }
  }
  return null;
}
