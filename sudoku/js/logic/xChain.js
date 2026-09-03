/**
 * X-Chain & Grouped X-Chain (方便的7パターン) 検出モジュール (js/logic/xChain.js)
 */

// 7パターンのブロックから「仮想ノードを経由する強鎖(Virtual Link)」を生成するヘルパー
function getVirtualStrongLinks(candCells, num) {
  const virtualLinks = [];

  for (let b = 0; b < 9; b++) {
    const boxCells = candCells.filter(c => c.box === b);
    
    // ブロック内の候補数が 2個〜4個 の場合に検証
    if (boxCells.length < 2 || boxCells.length > 4) continue;

    const rows = [...new Set(boxCells.map(c => c.row))];
    const cols = [...new Set(boxCells.map(c => c.col))];

    // 2x2の交差範囲内で仮想ノード（空の交点）を探す
    for (const r of rows) {
      for (const c of cols) {
        // ★【大前提】交点マス(r, c)に候補数字 num が存在する場合は除外（黄色マスは空）
        const hasCandAtIntersection = boxCells.some(bc => bc.row === r && bc.col === c);
        if (hasCandAtIntersection) continue;

        // 交点 (r, c) から見た行方向・列方向の候補マス群（リアルノード）
        const rowPeers = boxCells.filter(bc => bc.row === r && bc.col !== c);
        const colPeers = boxCells.filter(bc => bc.col === c && bc.row !== r);

        // ブロック内の全候補が、この交点(r, c)の行軸または列軸のどちらかに完全に収まっているか
        if (rowPeers.length + colPeers.length !== boxCells.length) continue;

        // L字/T字構造の成立条件（両軸に1〜2個のリアルノードが存在）
        if (rowPeers.length >= 1 && rowPeers.length <= 2 &&
            colPeers.length >= 1 && colPeers.length <= 2) {

          // 仮想ノード(r, c)を経由して「その場ジャンプ」する強リンクを登録
          // 描画用に中間経由地(vNode)の情報を持たせる
          const vNode = { row: r, col: c, box: b, isVirtual: true };

          rowPeers.forEach(rp => {
            colPeers.forEach(cp => {
              virtualLinks.push({ from: rp, to: cp, via: vNode, isVirtual: true });
              virtualLinks.push({ from: cp, to: rp, via: vNode, isVirtual: true });
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
          strongLinks.push({ from: house[0], to: house[1], via: null, isVirtual: false });
          strongLinks.push({ from: house[1], to: house[0], via: null, isVirtual: false });
        }
      }
    });

    // 2. 方便的7パターンによる「仮想強鎖（その場ジャンプ）」の検出と統合
    const virtualStrongLinks = getVirtualStrongLinks(candCells, num);
    const allStrongLinks = [...strongLinks, ...virtualStrongLinks];

    if (allStrongLinks.length === 0) continue;

    // 3. 各【実在セル（リアルノード）】のみを始点として連鎖探索
    for (const startCell of candCells) {
      // pathには「通過したリアルノード」のみを記録。usedVNodesに通過した仮想ノード情報を保持
      const queue = [{
        current: startCell,
        path: [startCell],
        vNodes: [],
        lastLink: null
      }];

      while (queue.length > 0) {
        const { current, path, vNodes, lastLink } = queue.shift();

        // 奇数リンク（偶数ノード ≧ 4）かつ最後が「強鎖」の場合に確定判定
        if (path.length >= 4 && path.length % 2 === 0 && lastLink === "strong") {
          const endCell = current;

          // 消去対象セルの特定（実在する始点・終点から交差するセル）
          const targetCells = candCells.filter(c => {
            if (c === startCell || c === endCell || path.includes(c)) return false;
            const seesStart = (c.row === startCell.row || c.col === startCell.col || c.box === startCell.box);
            const seesEnd   = (c.row === endCell.row || c.col === endCell.col || c.box === endCell.box);
            return seesStart && seesEnd;
          });

          if (targetCells.length > 0) {
            // 描画用リンク構造の構築
            const chainLinks = [];
            for (let i = 0; i < path.length - 1; i++) {
              const isStrong = (i % 2 === 0);
              const fromCell = path[i];
              const toCell = path[i+1];

              if (isStrong) {
                // 強リンクの場合：仮想ノード経由（その場ジャンプ）か標準強鎖かを判定
                const linkObj = allStrongLinks.find(l => l.from === fromCell && l.to === toCell);
                if (linkObj && linkObj.via) {
                  // ★その場ジャンプ： リアル → 仮想ノード(黄色) → リアル の2本の線で描画
                  chainLinks.push({
                    from: { row: fromCell.row, col: fromCell.col },
                    to:   { row: linkObj.via.row, col: linkObj.via.col },
                    type: "strong",
                    num: num
                  });
                  chainLinks.push({
                    from: { row: linkObj.via.row, col: linkObj.via.col },
                    to:   { row: toCell.row, col: toCell.col },
                    type: "strong",
                    num: num
                  });
                } else {
                  chainLinks.push({
                    from: { row: fromCell.row, col: fromCell.col },
                    to:   { row: toCell.row, col: toCell.col },
                    type: "strong",
                    num: num
                  });
                }
              } else {
                // 弱リンクの場合（必ずリアルノード間を直接結ぶ）
                chainLinks.push({
                  from: { row: fromCell.row, col: fromCell.col },
                  to:   { row: toCell.row, col: toCell.col },
                  type: "weak",
                  num: num
                });
              }
            }

            const hasVirtual = vNodes.length > 0;
            const techniqueName = hasVirtual ? "Grouped X-Chain" : "X-Chain";
            const logIcon = hasVirtual ? "🔗✨" : "🔗";

            return {
              name: techniqueName,
              num: num,
              blueCells: [startCell, endCell],
              blueCands: path.map(c => ({ cell: c, num: num, row: c.row, col: c.col })),
              redCands: targetCells.map(c => ({ cell: c, num: num, row: c.row, col: c.col })),
              chainLinks: chainLinks,
              logMsg: `${logIcon} [${techniqueName}] 数字[${num}] : R${startCell.row+1}C${startCell.col+1} から R${endCell.row+1}C${endCell.col+1} への連鎖により、${targetCells.map(c=>`R${c.row+1}C${c.col+1}`).join(', ')} から[${num}]を除外できます。`,
              logClass: "xchain"
            };
          }
        }

        // 無限ループ防止
        if (path.length >= 8) continue;

        // 展開処理
        if (lastLink === null || lastLink === "weak") {
          // 次は「強鎖（標準または仮想その場ジャンプ）」で繋がるリアルセルへ
          const nextStrongs = allStrongLinks.filter(l => l.from === current && !path.includes(l.to));
          for (const l of nextStrongs) {
            queue.push({
              current: l.to,
              path: [...path, l.to],
              vNodes: l.via ? [...vNodes, l.via] : [...vNodes],
              lastLink: "strong"
            });
          }
        } 
        
        if (lastLink === "strong") {
          // 次は「弱鎖」で繋がるリアルセルへ（同じ House 内の実在候補マスのみ）
          const nextWeaks = candCells.filter(c => 
            c !== current && !path.includes(c) &&
            (c.row === current.row || c.col === current.col || c.box === current.box)
          );
          for (const nextCell of nextWeaks) {
            queue.push({
              current: nextCell,
              path: [...path, nextCell],
              vNodes: [...vNodes],
              lastLink: "weak"
            });
          }
        }
      }
    }
  }

  return null;
}
