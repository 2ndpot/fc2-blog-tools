/**
 * 仮想ノード(L字)を利用したグループx-chain検出モジュール (js/experimental/virtualNodeChain.js)
 */
import { detectLShapesInBox } from './patternUtils.js';

export function findVirtualNodeChains(grid, writeLog) {
  let foundCount = 0;

  for (let n = 1; n <= 9; n++) {
    for (let b = 0; b < 9; b++) {
      // L字パターンの取得（パターン1〜3すべて対象）
      const lShapes = detectLShapesInBox(grid, b, n);

      for (const shape of lShapes) {
        const result = searchChainWithVirtualNode(grid, n, shape.pivot, shape.armCells);
        if (result) {
          foundCount++;
          writeLog(`L字仮説[${n}]: ${result.desc}`, "info");
        }
      }
    }
  }

  if (foundCount === 0) writeLog("L字仮説による除外は見つかりませんでした。", "info");
}

/**
 * 仮想ノードを組み込んだグラフの構築とBFS連鎖探索
 */
function searchChainWithVirtualNode(grid, n, pivot, armCells) {
  const armSet = new Set(armCells);
  const realCands = grid.filter(c => c.status === "candidate" && c.val.includes(n));
  const virtualCell = { row: pivot.row, col: pivot.col, box: pivot.box, isVirtual: true };

  // エウレカ記法用のセル文字列生成関数
  const fmtCell = (c) => c.isVirtual ? `(i${n})R${c.row + 1}C${c.col + 1}` : `(${n})R${c.row + 1}C${c.col + 1}`;

  // 1. 強鎖（Strong Link）の抽出
  const strongLinks = [];
  const addStrongPair = (c1, c2) => {
    strongLinks.push({ from: c1, to: c2 }, { from: c2, to: c1 });
  };

  // 行の強鎖（アームセルを仮想ノードに置き換えて判定）
  for (let r = 0; r < 9; r++) {
    let house = realCands.filter(c => c.row === r);
    if (r === pivot.row) house = [...house.filter(c => !armSet.has(c)), virtualCell];
    if (house.length === 2) addStrongPair(house[0], house[1]);
  }
  // 列の強鎖
  for (let cIdx = 0; cIdx < 9; cIdx++) {
    let house = realCands.filter(c => c.col === cIdx);
    if (cIdx === pivot.col) house = [...house.filter(c => !armSet.has(c)), virtualCell];
    if (house.length === 2) addStrongPair(house[0], house[1]);
  }
  // ボックスの強鎖
  for (let b = 0; b < 9; b++) {
    const house = realCands.filter(c => c.box === b);
    if (house.length === 2) addStrongPair(house[0], house[1]);
  }

  // 2. BFSによる連鎖（Chain）探索
  for (const startCell of realCands) {
    // キューの初期化: { current, path: [{cell, linkToPrev}], lastLink }
    const queue = [{ current: startCell, path: [{ cell: startCell, linkToPrev: null }], lastLink: null }];

    while (queue.length > 0) {
      const { current, path, lastLink } = queue.shift();
      const visitedCells = path.map(p => p.cell);
      const realLen = visitedCells.filter(c => !c.isVirtual).length;

      // --- 仮想ノード通過時の処理 ---
      if (current.isVirtual) {
        if (realLen >= 8) continue;
        const prevCell = visitedCells[visitedCells.length - 2];
        const cameFromRow = (prevCell.row === current.row);

        if (lastLink === "strong") {
          // 【強・強 通過】強鎖で入った場合は、反対側の次元へ強鎖でのみ抜ける
          strongLinks
            .filter(l => l.from === current && !visitedCells.includes(l.to))
            .filter(l => cameFromRow ? l.to.col === current.col : l.to.row === current.row)
            .forEach(l => {
              queue.push({
                current: l.to,
                path: [...path, { cell: l.to, linkToPrev: "=" }],
                lastLink: "strong"
              });
            });
        } else if (lastLink === "weak") {
          // 【弱・弱 通過】弱鎖で入った場合は、反対側の次元へ弱鎖でのみ抜ける
          realCands
            .filter(c => !visitedCells.includes(c) && !armSet.has(c))
            .filter(c => cameFromRow ? c.col === current.col : c.row === current.row)
            .forEach(c => {
              queue.push({
                current: c,
                path: [...path, { cell: c, linkToPrev: "-" }],
                lastLink: "weak"
              });
            });
        }
        continue;
      }

      // --- 連鎖成立・除外判定 ---
      if (realLen >= 2 && realLen % 2 === 0 && lastLink === "strong") {
        if (visitedCells.some(c => c.isVirtual)) {
          const endCell = current;
          const targetCells = grid.filter(c => {
            if (c.status !== "candidate" || !c.val.includes(n)) return false;
            if (c === startCell || c === endCell || visitedCells.includes(c)) return false;
            const seesStart = (c.row === startCell.row || c.col === startCell.col || c.box === startCell.box);
            const seesEnd = (c.row === endCell.row || c.col === endCell.col || c.box === endCell.box);
            return seesStart && seesEnd;
          });

          if (targetCells.length > 0) {
            // エウレカ記法で経路文字列を作成
            const routeStr = path.map(p => (p.linkToPrev || "") + fmtCell(p.cell)).join("");
            const targetStr = targetCells.map(c => `(${n})R${c.row + 1}C${c.col + 1}`).join(", ");
            return { desc: `${routeStr} の連鎖により、${targetStr}を除外できます。` };
          }
        }
      }

      if (realLen >= 8) continue;

      // --- 通常ノードからの展開 ---
      // 1. 強鎖の展開
      if (lastLink === null || lastLink === "weak") {
        strongLinks
          .filter(l => l.from === current && !visitedCells.includes(l.to))
          .forEach(l => {
            queue.push({
              current: l.to,
              path: [...path, { cell: l.to, linkToPrev: "=" }],
              lastLink: "strong"
            });
          });
      }

      // 2. 弱鎖の展開
      if (lastLink === "strong") {
        // 実ノードへの弱鎖
        realCands
          .filter(c => c !== current && !visitedCells.includes(c) &&
                       (c.row === current.row || c.col === current.col || c.box === current.box))
          .forEach(c => {
            queue.push({
              current: c,
              path: [...path, { cell: c, linkToPrev: "-" }],
              lastLink: "weak"
            });
          });

        // 仮想ノードへの弱鎖（アームセルでなく、交点と同じ行または列にある場合）
        if (!armSet.has(current) && !visitedCells.includes(virtualCell)) {
          if (current.row === pivot.row || current.col === pivot.col) {
            queue.push({
              current: virtualCell,
              path: [...path, { cell: virtualCell, linkToPrev: "-" }],
              lastLink: "weak"
            });
          }
        }
      }
    }
  }

  return null;
}
