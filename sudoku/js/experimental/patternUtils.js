/**
 * パターン検出ユーティリティ (js/experimental/patternUtils.js)
 * ボックス内の候補数字配置からL字等の構造を検出する共通関数群
 */

/**
 * 指定したボックス(b)と数字(n)におけるL字パターンを検出する
 */
export function detectLShapesInBox(grid, b, n) {
  const corners = [[0,0], [0,2], [2,0], [2,2]];
  const boxRow = Math.floor(b / 3) * 3;
  const boxCol = (b % 3) * 3;

  const cellAt = (lr, lc) => grid.find(c => c.row === boxRow + lr && c.col === boxCol + lc);
  const hasN = (cell) => cell && cell.status === "candidate" && cell.val.includes(n);

  const results = [];

  for (const [lr, lc] of corners) {
    const pivot = cellAt(lr, lc);
    if (hasN(pivot)) continue; // 交点にnがある場合はL字対象外

    const nearA = cellAt(lr, 1), farA = cellAt(lr, 2 - lc);
    const nearB = cellAt(1, lc), farB = cellAt(2 - lr, lc);

    const aNear = hasN(nearA), aFar = hasN(farA);
    const bNear = hasN(nearB), bFar = hasN(farB);

    let patternNum = 0;
    let armCells = [];

    if (aNear && aFar && bNear && bFar) {
      patternNum = 1;
      armCells = [nearA, farA, nearB, farB];
    } else if (aNear && aFar && (bNear !== bFar)) {
      patternNum = bNear ? 2 : 3;
      armCells = [nearA, farA, bNear ? nearB : farB];
    } else if (bNear && bFar && (aNear !== aFar)) {
      patternNum = aNear ? 2 : 3;
      armCells = [nearB, farB, aNear ? nearA : farA];
    }

    if (patternNum > 0) {
      // 交点・アーム以外の余計な候補nを抽出
      const usedCells = new Set([pivot, ...armCells]);
      const extraCells = [];
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          const cell = cellAt(r, c);
          if (!usedCells.has(cell) && hasN(cell)) extraCells.push(cell);
        }
      }

      results.push({
        patternNum,
        pivot,
        armCells,
        extraCells
      });
    }
  }

  return results;
}
