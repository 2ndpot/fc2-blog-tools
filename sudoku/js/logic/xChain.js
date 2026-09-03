/**
 * X-Chain & Grouped X-Chain (方便的7パターン) 検出モジュール (js/logic/xChain.js)
 */

// 7パターンのブロックから仮想強鎖(Virtual Link)を生成するヘルパー
function getVirtualStrongLinks(candCells, num) {
  const virtualLinks = [];

  for (let b = 0; b < 9; b++) {
    const boxCells = candCells.filter(c => c.box === b);
    
    // ブロック内の候補数が 2個〜4個 の場合に検証
    if (boxCells.length < 2 || boxCells.length > 4) continue;

    const rows = [...new Set(boxCells.map(c => c.row))];
    const cols = [...new Set(boxCells.map(c => c.col))];

    // 2x2グリッド（最大2行×2列）の範囲内に交点候補を探す
    for (const r of rows) {
      for (const c of cols) {
        // 交点マス(r, c)に候補数字 num が存在する場合は除外（黄色マスは空であること）
        const hasCandAtIntersection = boxCells.some(bc => bc.row === r && bc.col === c);
        if (hasCandAtIntersection) continue;

        // 交点 (r, c) から見た行方向・列方向の候補マス群
        const rowPeers = boxCells.filter(bc => bc.row === r && bc.col !== c);
        const colPeers = boxCells.filter(bc => bc.col === c && bc.row !== r);

        // ブロック内の全候補が、この交点(r, c)の行軸または列軸のどちらかに完全に収まっているか
        if (rowPeers.length + colPeers.length !== boxCells.length) continue;

        // 行側・列側ともに1マス以上（最大2マス）配置されている場合、L字/T字構造が成立
        if (rowPeers.length >= 1 && rowPeers.length <= 2 &&
            colPeers.length >= 1 && colPeers.length <= 2) {

          // 仮想ノード（黄色マス）を作成
          const virtualNode = { row: r, col: c, box: b, isVirtual: true, val: [num] };

          // 軸上の各リアルノードと仮想ノード間に双方向の強鎖を張る
          rowPeers.forEach(rp => {
            colPeers.forEach(cp => {
              virtualLinks.push({ from: rp, to: virtualNode, isVirtual: true });
              virtualLinks.push({ from: virtualNode, to: rp, isVirtual: true });
              virtualLinks.push({ from: cp, to: virtualNode, isVirtual: true });
              virtualLinks.push({ from: virtualNode, to: cp, isVirtual: true });
            });
          });
        }
      }
    }
  }

  return virtualLinks;
}

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

    // 2. 方便的7パターンによる「仮想強鎖」の検出と追加
    const virtualStrongLinks = getVirtualStrongLinks(candCells, num);
    const allStrongLinks = [...strongLinks, ...virtualStrongLinks];

    if (allStrongLinks.length === 0) continue;

    // 3. 各候補セルを始点として奇数個リンク（強→弱→強...→強）の連鎖を探索
    for (const startCell of candCells) {
      const queue = [{ current: startCell, path: [startCell], lastLink: null }];

      while (queue.length > 0) {
        const { current, path, lastLink } = queue.shift();

        // リンク数が奇数（ノード数 path.length が偶数 ≧ 4）で、最後が「強鎖」の場合に判定
        if (path.length >= 4 && path.length % 2 === 0 && lastLink === "strong") {
          const endCell = current;

          // 仮想ノードを通過したか判定
          const hasVirtual = path.some(c => c.isVirtual);

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

            // 仮想ノード通過の有無で手法名とログを切り替え
            const techniqueName = hasVirtual ? "Grouped X-Chain" : "X-Chain";
            const logIcon = hasVirtual ? "🔗✨" : "🔗";

            return {
              name: techniqueName,
              num: num,
              blueCells: [startCell, endCell],
              blueCands: path.filter(c => !c.isVirtual).map(c => ({ cell: c, num: num, row: c.row, col: c.col })),
              redCands: targetCells.map(c => ({ cell: c, num: num, row: c.row, col: c.col })),
              chainLinks: chainLinks,
              logMsg: `${logIcon} [${techniqueName}] 数字[${num}] : R${startCell.row+1}C${startCell.col+1} から R${endCell.row+1}C${endCell.col+1} への連鎖により、${targetCells.map(c=>`R${c.row+1}C${c.col+1}`).join(', ')} から[${num}]を除外できます。`,
              logClass: "xchain"
            };
          }
        }

        // 無限ループ防止（最大8マスまで探索）
        if (path.length >= 8) continue;

        // 展開処理
        if (lastLink === null || lastLink === "weak") {
          // 次は「強鎖（仮想強鎖を含む）」で繋がるセルへ
          const nextStrongs = allStrongLinks.filter(l => l.from === current && !path.includes(l.to));
          for (const l of nextStrongs) {
            queue.push({ current: l.to, path: [...path, l.to], lastLink: "strong" });
          }
        } 
        
        if (lastLink === "strong") {
          // 次は「弱鎖」で繋がるセルへ（仮想ノードからは弱鎖を伸ばさない）
          if (!current.isVirtual) {
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
  }

  return null;
}
