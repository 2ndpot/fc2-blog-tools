/**
 * L字(交点なし)パターン検索モジュール (js/experimental/lShapeFinder.js)
 */
import { detectLShapesInBox } from './patternUtils.js';

export function findLShapes(memoryGrid, writeLog) {
  let found = 0;

  for (let n = 1; n <= 9; n++) {
    for (let b = 0; b < 9; b++) {
      const lShapes = detectLShapesInBox(memoryGrid, b, n);

      lShapes.forEach(shape => {
        found++;
        const extraStr = shape.extraCells.length > 0
          ? `余計な候補あり(${shape.extraCells.map(c => `R${c.row+1}C${c.col+1}`).join(',')})`
          : "余計な候補なし";

        const cellStr = shape.armCells.map(c => `R${c.row+1}C${c.col+1}`).join(',');
        writeLog(`L字[${shape.patternNum}] B${b+1}: 交点R${shape.pivot.row+1}C${shape.pivot.col+1}, セル${cellStr}, P${n} [${extraStr}]`, "info");
      });
    }
  }

  if (found === 0) writeLog("L字パターンは見つかりませんでした。", "info");
}
