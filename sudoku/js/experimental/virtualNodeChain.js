/**
 * 仮想ノード(L字)を利用したグループx-chain検出モジュール (js/experimental/virtualNodeChain.js)
 * 検出専用。盤面への候補削除はまだ行わない。
 */
export function findVirtualNodeChains(grid, writeLog) {
  const corners = [[0,0],[0,2],[2,0],[2,2]];
  let foundCount = 0;

  for (let n = 1; n <= 9; n++) {
    for (let b = 0; b < 9; b++) {
      const boxRow = Math.floor(b / 3) * 3;
      const boxCol = (b % 3) * 3;
      const cellAt = (lr, lc) => grid.find(c => c.row === boxRow + lr && c.col === boxCol + lc);
      const hasN = (cell) => cell && cell.status === "candidate" && cell.val.includes(n);

      for (const [lr, lc] of corners) {
        const pivot = cellAt(lr, lc);
        if (hasN(pivot)) continue;

        const nearA = cellAt(lr, 1), farA = cellAt(lr, 2 - lc);
        const nearB = cellAt(1, lc), farB = cellAt(2 - lr, lc);
        const aNear = hasN(nearA), aFar = hasN(farA);
        const bNear = hasN(nearB), bFar = hasN(farB);

        let armCells = null;
        if (aNear && aFar && bNear && bFar) armCells = [nearA, farA, nearB, farB];
        else if (aNear && aFar && (bNear !== bFar)) armCells = [nearA, farA, bNear ? nearB : farB];
        else if (bNear && bFar && (aNear !== aFar)) armCells = [nearB, farB, aNear ? nearA : farA];

        if (!armCells) continue;

        const result = searchWithVirtualNode(grid, n, pivot);
        if (result) {
          foundCount++;
          writeLog(`L字仮説[${n}]: ${result.desc}`, "info");
        }
      }
    }
  }

  if (foundCount === 0) writeLog("L字仮説による除外は見つかりませんでした。", "info");
}

function searchWithVirtualNode(grid, n, pivot) {
  // ボックス内で候補nを持つマスは(アーム以外も含めて)全部マスキングし、交点を仮想ノードに差し替える
  const boxRow = Math.floor(pivot.row / 3) * 3;
  const boxCol = Math.floor(pivot.col / 3) * 3;
  const masked = new Set();
  for (let r = boxRow; r < boxRow + 3; r++) {
    for (let c = boxCol; c < boxCol + 3; c++) {
      const cell = grid.find(g => g.row === r && g.col === c);
      if (cell && cell.status === "candidate" && cell.val.includes(n)) masked.add(cell);
    }
  }

  const virtualCell = { row: pivot.row, col: pivot.col, box: -1, isVirtual: true };
  const candCells = grid
    .filter(c => c.status === "candidate" && c.val.includes(n) && !masked.has(c))
    .concat([virtualCell]);

  if (candCells.length < 3) return null;

  const strongLinks = [];
  ["row", "col", "box"].forEach(houseType => {
    for (let i = 0; i < 9; i++) {
      const house = candCells.filter(c => c[houseType] === i);
      if (house.length === 2) {
        strongLinks.push({ from: house[0], to: house[1] });
        strongLinks.push({ from: house[1], to: house[0] });
      }
    }
  });
  if (strongLinks.length === 0) return null;

  for (const startCell of candCells) {
    if (startCell.isVirtual) continue; // 仮想ノードは起点にしない

    const queue = [{ current: startCell, path: [startCell], lastLink: null }];

    while (queue.length > 0) {
      const { current, path, lastLink } = queue.shift();

      if (current.isVirtual) {
        // 通過点専用: 強リンクのまま反対側へ素通り。弱リンクの分岐はしない。
        if (path.length >= 8) continue;
        const prev = path[path.length - 2];
        strongLinks
          .filter(l => l.from === current && l.to !== prev && !path.includes(l.to))
          .forEach(l => queue.push({ current: l.to, path: [...path, l.to], lastLink: "strong" }));
        continue;
      }

      if (path.length >= 4 && path.length % 2 === 0 && lastLink === "strong") {
        const endCell = current;
        const targetCells = grid.filter(c => {
          if (c.status !== "candidate" || !c.val.includes(n)) return false;
          if (c === startCell || c === endCell || path.includes(c)) return false;
          const seesStart = (c.row === startCell.row || c.col === startCell.col || c.box === startCell.box);
          const seesEnd   = (c.row === endCell.row || c.col === endCell.col || c.box === endCell.box);
          return seesStart && seesEnd;
        });

        if (targetCells.length > 0) {
          const routeStr = path.map(c => c.isVirtual ? `(仮想R${c.row+1}C${c.col+1})` : `R${c.row+1}C${c.col+1}`).join('-');
          return { desc: `${routeStr} の連鎖により、${targetCells.map(c=>`R${c.row+1}C${c.col+1}`).join(', ')} の[${n}]を除外できます。` };
        }
      }

      if (path.length >= 8) continue;

      if (lastLink === null || lastLink === "weak") {
        strongLinks
          .filter(l => l.from === current && !path.includes(l.to))
          .forEach(l => queue.push({ current: l.to, path: [...path, l.to], lastLink: "strong" }));
      }

      if (lastLink === "strong") {
        candCells
          .filter(c => c !== current && !c.isVirtual && !path.includes(c) &&
                       (c.row === current.row || c.col === current.col || c.box === current.box))
          .forEach(c => queue.push({ current: c, path: [...path, c], lastLink: "weak" }));
      }
    }
  }

  return null;
}
