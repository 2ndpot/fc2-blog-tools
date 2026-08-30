/**
 * 同盟手筋: Naked/Hidden Pairs, Triples, Quads (js/logic/subsets.js)
 */
import { getHouseName, getCombinations } from './utils.js';

/**
 * Naked N (Naked Pair / Triple / Quad) の検出
 */
export function findNakedN(grid, size, labelName, logClass) {
  for (const houseType of ["row", "col", "box"]) {
    for (let hIdx = 0; hIdx < 9; hIdx++) {
      const houseCells = grid.filter(c => c.status === "candidate" && c[houseType] === hIdx);
      const targetCandidates = houseCells.filter(c => c.val.length >= 2 && c.val.length <= size);
      if (targetCandidates.length < size) continue;

      const combinations = getCombinations(targetCandidates, size);
      for (const group of combinations) {
        const unionSet = new Set(group.flatMap(c => c.val));

        if (unionSet.size === size) {
          const tupleVals = Array.from(unionSet).sort((a, b) => a - b);
          const redCands = [];

          houseCells.forEach(otherCell => {
            if (group.includes(otherCell)) return;
            tupleVals.forEach(num => {
              if (otherCell.val.includes(num)) redCands.push({ cell: otherCell, num: num, row: otherCell.row, col: otherCell.col });
            });
          });

          const extraHouses = [];
          if (houseType !== "box" && group.every(c => c.box === group[0].box)) {
            extraHouses.push({ type: "box", idx: group[0].box });
          }
          if (houseType !== "row" && group.every(c => c.row === group[0].row)) {
            extraHouses.push({ type: "row", idx: group[0].row });
          }
          if (houseType !== "col" && group.every(c => c.col === group[0].col)) {
            extraHouses.push({ type: "col", idx: group[0].col });
          }

          extraHouses.forEach(eh => {
            const extraCells = grid.filter(c => c.status === "candidate" && c[eh.type] === eh.idx);
            extraCells.forEach(otherCell => {
              if (group.includes(otherCell)) return;
              tupleVals.forEach(num => {
                if (otherCell.val.includes(num) && !redCands.some(rc => rc.cell === otherCell && rc.num === num)) {
                  redCands.push({ cell: otherCell, num: num, row: otherCell.row, col: otherCell.col });
                }
              });
            });
          });

          if (redCands.length > 0) {
            const blueCands = [];
            group.forEach(c => tupleVals.forEach(n => { if(c.val.includes(n)) blueCands.push({cell: c, num: n}); }));
            const coords = group.map(c => `R${c.row+1}C${c.col+1}`).join(', ');

            let houseDesc = `第${hIdx+1}${getHouseName(houseType)}`;
            if (extraHouses.length > 0) {
              const extraNames = extraHouses.map(eh => `第${eh.idx+1}${getHouseName(eh.type)}`).join('・');
              houseDesc += `（および${extraNames}）`;
            }

            return {
              type: "clean",
              blueCells: group,
              blueCands: blueCands,
              redCands: redCands,
              logMsg: `✨ [${labelName}] ${houseDesc}の ${coords} で {${tupleVals.join(',')}} が同盟状態。赤色の候補数字を削除できます。`,
              logClass: logClass
            };
          }
        }
      }
    }
  }
  return null;
}

/**
 * Hidden N (Hidden Pair / Triple / Quad) の検出
 */
export function findHiddenN(grid, size, labelName, logClass) {
  for (const houseType of ["row", "col", "box"]) {
    for (let hIdx = 0; hIdx < 9; hIdx++) {
      const houseCells = grid.filter(c => c.status === "candidate" && c[houseType] === hIdx);
      const numAppearances = Array.from({ length: 10 }, () => []);
      
      houseCells.forEach(cell => cell.val.forEach(num => numAppearances[num].push(cell)));

      const targetNums = [];
      for (let n = 1; n <= 9; n++) {
        if (numAppearances[n].length >= 2 && numAppearances[n].length <= size) targetNums.push(n);
      }
      if (targetNums.length < size) continue;

      const numCombinations = getCombinations(targetNums, size);
      for (const numGroup of numCombinations) {
        const cellSet = new Set(numGroup.flatMap(n => numAppearances[n]));

        if (cellSet.size === size) {
          const groupCells = Array.from(cellSet);
          const redCands = [];
          const blueCands = [];

          groupCells.forEach(targetCell => {
            targetCell.val.forEach(num => {
              if (numGroup.includes(num)) {
                blueCands.push({ cell: targetCell, num: num });
              } else {
                redCands.push({ cell: targetCell, num: num, row: targetCell.row, col: targetCell.col });
              }
            });
          });

          const extraHouses = [];
          if (houseType !== "box" && groupCells.every(c => c.box === groupCells[0].box)) {
            extraHouses.push({ type: "box", idx: groupCells[0].box });
          }
          if (houseType !== "row" && groupCells.every(c => c.row === groupCells[0].row)) {
            extraHouses.push({ type: "row", idx: groupCells[0].row });
          }
          if (houseType !== "col" && groupCells.every(c => c.col === groupCells[0].col)) {
            extraHouses.push({ type: "col", idx: groupCells[0].col });
          }

          extraHouses.forEach(eh => {
            const extraCells = grid.filter(c => c.status === "candidate" && c[eh.type] === eh.idx);
            extraCells.forEach(otherCell => {
              if (groupCells.includes(otherCell)) return;
              numGroup.forEach(num => {
                if (otherCell.val.includes(num) && !redCands.some(rc => rc.cell === otherCell && rc.num === num)) {
                  redCands.push({ cell: otherCell, num: num, row: otherCell.row, col: otherCell.col });
                }
              });
            });
          });

          if (redCands.length > 0) {
            const coords = groupCells.map(c => `R${c.row+1}C${c.col+1}`).join(', ');
            let houseDesc = `第${hIdx+1}${getHouseName(houseType)}`;
            if (extraHouses.length > 0) {
              const extraNames = extraHouses.map(eh => `第${eh.idx+1}${getHouseName(eh.type)}`).join('・');
              houseDesc += `（および ${extraNames}）`;
            }

            return {
              type: "clean",
              blueCells: groupCells,
              blueCands: blueCands,
              redCands: redCands,
              logMsg: `🌸 [${labelName}] ${houseDesc} にて 数字 {${numGroup.join(',')}} が [ ${coords} ] に限定。関連領域の不要な候補数字を削除します。`,
              logClass: logClass
            };
          }
        }
      }
    }
  }
  return null;
}
