/**
 * L字(交点なし)パターン検索モジュール (js/experimental/lShapeFinder.js)
 * 群鎖の仮説検証用。ボックス内の1マス(交点)にnがなく、
 * そこから伸びる行・列のアームにnがどう立っているかでパターン1〜3を判定する。
 */
export function findLShapes(memoryGrid, writeLog) {
  const corners = [[0,0],[0,2],[2,0],[2,2]];
  let found = 0;

  for (let n = 1; n <= 9; n++) {
    for (let b = 0; b < 9; b++) {
      const boxRow = Math.floor(b / 3) * 3;
      const boxCol = (b % 3) * 3;
      const cellAt = (lr, lc) => memoryGrid.find(c => c.row === boxRow + lr && c.col === boxCol + lc);
      const hasN = (cell) => cell && cell.status === "candidate" && cell.val.includes(n);

      corners.forEach(([lr, lc]) => {
        const pivot = cellAt(lr, lc);
        if (hasN(pivot)) return;

        const nearA = cellAt(lr, 1);
        const farA  = cellAt(lr, 2 - lc);
        const nearB = cellAt(1, lc);
        const farB  = cellAt(2 - lr, lc);

        const aNear = hasN(nearA), aFar = hasN(farA);
        const bNear = hasN(nearB), bFar = hasN(farB);

        let patternNum = 0, cells = [];

        if (aNear && aFar && bNear && bFar) {
          patternNum = 1;
          cells = [nearA, farA, nearB, farB];
        } else if (aNear && aFar && (bNear !== bFar)) {
          patternNum = bNear ? 2 : 3;
          cells = [nearA, farA, bNear ? nearB : farB];
        } else if (bNear && bFar && (aNear !== aFar)) {
          patternNum = aNear ? 2 : 3;
          cells = [nearB, farB, aNear ? nearA : farA];
        }

        if (patternNum > 0) {
          found++;
          const cellStr = cells.map(c => `R${c.row+1}C${c.col+1}`).join(',');
          writeLog(`L字[${patternNum}] B${b+1}: 交点R${pivot.row+1}C${pivot.col+1}, セル${cellStr}, P${n}`, "info");
        }
      });
    }
  }
  if (found === 0) writeLog("L字パターンは見つかりませんでした。", "info");
}
