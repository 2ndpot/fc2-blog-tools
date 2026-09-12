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

        const result = searchWithVirtualNode(grid, n, pivot, armCells);
        if (result) {
          foundCount++;
          writeLog(`L字仮説[${n}]: ${result.desc}`, "info");
        }
      }
    }
  }

  if (foundCount === 0) writeLog("L字仮説による除外は見つかりませんでした。", "info");
}

function searchWithVirtualNode(grid, n, pivot, armCells) {
  const armSet = new Set(armCells);
  const realCands = grid.filter(c => c.status === "candidate" && c.val.includes(n));
  const virtualCell = { row: pivot.row, col: pivot.col, box: -1, isVirtual: true };

  // 強リンクは「行・列・ボックス」ごとに、交点の行/列のときだけアームを除いて仮想ノードを差し込む
  const strongLinks = [];
  for (let r = 0; r < 9; r++) {
    let house = realCands.filter(c => c.row === r);
    if (r === pivot.row) house = [...house.filter(c => !armSet.has(c)), virtualCell];
    if (house.length === 2) { strongLinks.push({ from: house[0], to: house[1] }); strongLinks.push({ from: house[1], to: house[0] }); }
  }
  for (let cIdx = 0; cIdx < 9; cIdx++) {
    let house = realCands.filter(c => c.col === cIdx);
    if (cIdx === pivot.col) house = [...house.filter(c => !armSet.has(c)), virtualCell];
    if (house.length === 2) { strongLinks.push({ from: house[0], to: house[1] }); strongLinks.push({ from: house[1], to: house[0] }); }
  }
  for (let b = 0; b < 9; b++) {
    const house = realCands.filter(c => c.box === b); // ボックスは仮想ノード無関係、通常通り
    if (house.length === 2) { strongLinks.push({ from: house[0], to: house[1] }); strongLinks.push({ from: house[1], to: house[0] }); }
  }
  if (strongLinks.length === 0) return null;

  const candCells = [...realCands, virtualCell];

  for (const startCell of candCells) {
    if (startCell.isVirtual) continue;

    const queue = [{ current: startCell, path: [startCell], lastLink: null }];

    while (queue.length > 0) {
      const { current, path, lastLink } = queue.shift();

      if (current.isVirtual) {
        if (path.length >= 8) continue;
        const prev = path[path.length - 2];
        strongLinks
          .filter(l => l.from === current && l.to !== prev && !path.includes(l.to))
          .forEach(l => queue.push({ current: l.to, path: [...path, l.to], lastLink: "strong" }));
        continue;
      }

      if (path.length >= 4 && path.length % 2 === 0 && lastLink === "strong") {
        const hasVirtual = path.some(c => c.isVirtual);
        if (hasVirtual) {
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
      }

      if (path.length >= 8) continue;

      if (lastLink === null || lastLink === "weak") {
        strongLinks
          .filter(l => l.from === current && !path.includes(l.to))
          .forEach(l => queue.push({ current: l.to, path: [...path, l.to], lastLink: "strong" }));
      }

      if (lastLink === "strong") {
        realCands
          .filter(c => c !== current && !path.includes(c) &&
                       (c.row === current.row || c.col === current.col || c.box === current.box))
          .forEach(c => queue.push({ current: c, path: [...path, c], lastLink: "weak" }));
      }
    }
  }

  return null;
}
