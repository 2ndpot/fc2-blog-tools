/**
 * X-Chain 検出モジュール (js/logic/xChain.js)
 */

export function findXChain(grid) {
  for (let num = 1; num <= 9; num++) {
    const candCells = grid.filter(c => c.status === "candidate" && c.val.includes(num));
    if (candCells.length < 3) continue;

    // 1. 標準の強鎖（Strong Link）の検出（同じ行・列・ブロック内に候補が2つだけ）
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

    if (strongLinks.length === 0) continue;

    // 2. 各候補セルを始点として奇数個リンク（強→弱→強...→強）の連鎖を探索
    for (const startCell of candCells) {
      const queue = [{ current: startCell, path: [startCell], lastLink: null }];

      while (queue.length > 0) {
        const { current, path, lastLink } = queue.shift();

        // リンク数が奇数（ノード数 path.length が偶数 ≧ 4）で、最後が「強鎖」の場合に判定
        if (path.length >= 4 && path.length % 2 === 0 && lastLink === "strong") {
          const endCell = current;

          // 始点と終点から同時につき合わさる（交差する）消去対象セルを特定
          const targetCells = candCells.filter(c => {
            if (c === startCell || c === endCell || path.includes(c)) return false;
            const seesStart = (c.row === startCell.row || c.col === startCell.col || c.box === startCell.box);
            const seesEnd   = (c.row === endCell.row || c.col === endCell.col || c.box === endCell.box);
            return seesStart && seesEnd;
          });

          if (targetCells.length > 0) {
            // 描画用のリンクデータ生成
            const chainLinks = [];
            for (let i = 0; i < path.length - 1; i++) {
              chainLinks.push({
                from: { row: path[i].row, col: path[i].col },
                to:   { row: path[i+1].row, col: path[i+1].col },
                type: (i % 2 === 0) ? "strong" : "weak",
                num: num
              });
            }

            return {
              name: "X-Chain",
              num: num,
              blueCells: [startCell, endCell],
              blueCands: path.map(c => ({ cell: c, num: num, row: c.row, col: c.col })),
              redCands: targetCells.map(c => ({ cell: c, num: num, row: c.row, col: c.col })),
              chainLinks: chainLinks,
              logMsg: `🔗 [X-Chain] 数字[${num}] : R${startCell.row+1}C${startCell.col+1} から R${endCell.row+1}C${endCell.col+1} への連鎖により、${targetCells.map(c=>`R${c.row+1}C${c.col+1}`).join(', ')} から[${num}]を除外できます。`,
              logClass: "xchain"
            };
          }
        }

        // 無限ループ防止（最大8マスまで探索）
        if (path.length >= 8) continue;

        // 展開処理
        if (lastLink === null || lastLink === "weak") {
          // 次は「強鎖」で繋がるセルへ
          const nextStrongs = strongLinks.filter(l => l.from === current && !path.includes(l.to));
          for (const l of nextStrongs) {
            queue.push({ current: l.to, path: [...path, l.to], lastLink: "strong" });
          }
        } 
        
        if (lastLink === "strong") {
          // 次は「弱鎖」で繋がるセルへ
          const nextWeaks = candCells.filter(c => 
            c !== current && !path.includes(c) &&
            (c.row === current.row || c.col === current.col || c.box === current.box)
          );
          for (const nextCell of nextWeaks) {
            queue.push({ current: nextCell, path: [...path, nextCell], lastLink: "weak" });
          }
        }
      }
    }
  }

  return null;
}
