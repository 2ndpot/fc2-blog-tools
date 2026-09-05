/**
 * 交差手筋: Locked Candidates (Pointing & Claiming) (js/logic/lockedCandidates.js)
 */

/**
 * Locked Candidates（Pointing & Claiming）の検出
 */
export function findLockedCandidates(grid) {
  for (let boxIdx = 0; boxIdx < 9; boxIdx++) {
    const boxCells = grid.filter(c => c.status === "candidate" && c.box === boxIdx);
    for (let num = 1; num <= 9; num++) {
      const numCells = boxCells.filter(c => c.val.includes(num));
      if (numCells.length >= 2 && numCells.length <= 3) {
        
        // Pointing (Row): ブロック内の特定数字が同じ行に閉じ込められている場合
        const sameRow = numCells.every(c => c.row === numCells[0].row);
        if (sameRow) {
          const r = numCells[0].row;
          const redCands = grid.filter(c => c.status === "candidate" && c.row === r && c.box !== boxIdx && c.val.includes(num))
                               .map(c => ({ cell: c, num: num, row: c.row, col: c.col }));
          if (redCands.length > 0) {
            const blueCands = numCells.map(c => ({ cell: c, num: num }));
            return {
              type: "clean",
              blueCells: numCells,
              blueCands: blueCands,
              redCands: redCands,
              logMsg: `👉 [Locked Candidates (Pointing)] 第${boxIdx+1}ブロックの数字「${num}」は第${r+1}行に限定。第${r+1}行の他ブロックの「${num}」を削除します。`,
              logClass: "lock"
            };
          }
        }

        // Pointing (Col): ブロック内の特定数字が同じ列に閉じ込められている場合
        const sameCol = numCells.every(c => c.col === numCells[0].col);
        if (sameCol) {
          const cIdx = numCells[0].col;
          const redCands = grid.filter(c => c.status === "candidate" && c.col === cIdx && c.box !== boxIdx && c.val.includes(num))
                               .map(c => ({ cell: c, num: num, row: c.row, col: c.col }));
          if (redCands.length > 0) {
            const blueCands = numCells.map(c => ({ cell: c, num: num }));
            return {
              type: "clean",
              blueCells: numCells,
              blueCands: blueCands,
              redCands: redCands,
              logMsg: `👉 [Locked Candidates (Pointing)] 第${boxIdx+1}ブロックの数字「${num}」は第${cIdx+1}列に限定。第${cIdx+1}列の他ブロックの「${num}」を削除します。`,
              logClass: "lock"
            };
          }
        }
      }
    }
  }

  // Claiming (Row / Col -> Box): 行・列内の特定数字が同じブロックに閉じ込められている場合
  for (let num = 1; num <= 9; num++) {
    for (let r = 0; r < 9; r++) {
      const rowCells = grid.filter(c => c.status === "candidate" && c.row === r && c.val.includes(num));
      if (rowCells.length >= 2 && rowCells.length <= 3) {
        const targetBox = rowCells[0].box;
        if (rowCells.every(c => c.box === targetBox)) {
          const redCands = grid.filter(c => c.status === "candidate" && c.box === targetBox && c.row !== r && c.val.includes(num))
                               .map(c => ({ cell: c, num: num, row: c.row, col: c.col }));
          if (redCands.length > 0) {
            const blueCands = rowCells.map(c => ({ cell: c, num: num }));
            return {
              type: "clean",
              blueCells: rowCells,
              blueCands: blueCands,
              redCands: redCands,
              logMsg: `👉 [Locked Candidates (Claiming)] 第${r+1}行の数字「${num}」は第${targetBox+1}ブロックに限定。同ブロックの他行の「${num}」を削除します。`,
              logClass: "lock"
            };
          }
        }
      }
    }

    for (let cIdx = 0; cIdx < 9; cIdx++) {
      const colCells = grid.filter(c => c.status === "candidate" && c.col === cIdx && c.val.includes(num));
      if (colCells.length >= 2 && colCells.length <= 3) {
        const targetBox = colCells[0].box;
        if (colCells.every(c => c.box === targetBox)) {
          const redCands = grid.filter(c => c.status === "candidate" && c.box === targetBox && c.col !== cIdx && c.val.includes(num))
                               .map(c => ({ cell: c, num: num, row: c.row, col: c.col }));
          if (redCands.length > 0) {
            const blueCands = colCells.map(c => ({ cell: c, num: num }));
            return {
              type: "clean",
              blueCells: colCells,
              blueCands: blueCands,
              redCands: redCands,
              logMsg: `👉 [Locked Candidates (Claiming)] 第${cIdx+1}列の数字「${num}」は第${targetBox+1}ブロックに限定。同ブロックの他列の「${num}」を削除します。`,
              logClass: "lock"
            };
          }
        }
      }
    }
  }

  return null;
}
