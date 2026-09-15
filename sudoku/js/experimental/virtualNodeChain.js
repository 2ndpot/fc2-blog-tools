/**
 * 仮想ノード(L字)を利用したグループx-chain検出モジュール (js/experimental/virtualNodeChain.js)
 */
import { detectLShapesInBox } from './patternUtils.js';

export function findVirtualNodeChains(grid, writeLog) {
  let foundCount = 0;

  for (let n = 1; n <= 9; n++) {
    for (let b = 0; b < 9; b++) {
      // 共通関数を使ってL字パターンを取得
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
 * 仮想ノードを組み込んだ強鎖・弱鎖グラフの構築とBFS連鎖探索
 */
function searchChainWithVirtualNode(grid, n, pivot, armCells) {
  const armSet = new Set(armCells);
  const realCands = grid.filter(c => c.status === "candidate" && c.val.includes(n));
  const virtualCell = { row: pivot.row, col: pivot.col, box: -1, isVirtual: true };

  // 1. 強鎖（Strong Link）グラフの生成
  const strongLinks = [];
  
  for (let r = 0; r < 9; r++) {
    let house = realCands.filter(c => c.row === r);
    if (r === pivot.row) house = [...house.filter(c => !armSet.has(c)), virtualCell];
    if (house.length === 2) {
      strongLinks.push({ from: house[0], to: house[1] }, { from: house[1], to: house[0] });
    }
  }
  for (let cIdx = 0; cIdx < 9; cIdx++) {
    let house = realCands.filter(c => c.col === cIdx);
    if (cIdx === pivot.col) house = [...house.filter(c => !armSet.has(c)), virtualCell];
    if (house.length === 2) {
      strongLinks.push({ from: house[0], to: house[1] }, { from: house[1], to: house[0] });
    }
  }
  for (let b = 0; b < 9; b++) {
    const house = realCands.filter(c => c.box === b);
    if (house.length === 2) {
      strongLinks.push({ from: house[0], to: house[1] }, { from: house[1], to: house[0] });
    }
  }

  if (strongLinks.length === 0) return null;

  // 2. BFSによる連鎖（Chain）探索
  const candCells = [...realCands, virtualCell];

  for (const startCell of candCells) {
    if (startCell.isVirtual) continue;

    const queue = [{ current: startCell, path: [startCell], lastLink: null }];

    while (queue.length > 0) {
      const { current, path, lastLink } = queue.shift();
      const realLen = path.filter(c => !c.isVirtual).length;

      // 仮想ノード通過時の処理
      if (current.isVirtual) {
        if (realLen >= 8) continue;
        const prev = path[path.length - 2];
        strongLinks
          .filter(l => l.from === current && l.to !== prev && !path.includes(l.to))
          .forEach(l => queue.push({ current: l.to, path: [...path, l.to], lastLink: "strong" }));
        continue;
      }

      // 条件を満たす連鎖が成立したか判定
      if (realLen >= 2 && realLen % 2 === 0 && lastLink === "strong") {
        if (path.some(c => c.isVirtual)) {
          const endCell = current;
          const targetCells = grid.filter(c => {
            if (c.status !== "candidate" || !c.val.includes(n)) return false;
            if (c === startCell || c === endCell || path.includes(c)) return false;
            return (c.row === startCell.row || c.col === startCell.col || c.box === startCell.box) &&
                   (c.row === endCell.row || c.col === endCell.col || c.box === endCell.box);
          });

          if (targetCells.length > 0) {
            const routeStr = path.map(c => c.isVirtual ? `(仮想R${c.row+1}C${c.col+1})` : `R${c.row+1}C${c.col+1}`).join('-');
            return { desc: `${routeStr} の連鎖により、${targetCells.map(c=>`R${c.row+1}C${c.col+1}`).join(', ')} の[${n}]を除外できます。` };
          }
        }
      }

      if (realLen >= 8) continue;

      // 次のリンクへの展開（強鎖／弱鎖）
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
