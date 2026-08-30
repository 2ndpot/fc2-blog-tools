/**
 * 連鎖手筋: X-Chain (js/logic/xChain.js)
 */

/**
 * X-Chain（共役対・Strong Link 接続）の検出
 */
export function findXChain(grid) {
  for (let num = 1; num <= 9; num++) {
    const strongLinks = [];

    // 各ハウス（行・列・ブロック）における Strong Link（共役対）を特定
    for (const houseType of ["row", "col", "box"]) {
      for (let hIdx = 0; hIdx < 9; hIdx++) {
        const cells = grid.filter(c => c.status === "candidate" && c[houseType] === hIdx && c.val.includes(num));
        if (cells.length === 2) {
          strongLinks.push({ c1: cells[0], c2: cells[1] });
        }
      }
    }

    if (strongLinks.length === 0) continue;

    // 隣接リスト（グラフ）の構築
    const graph = new Map();
    grid.forEach(c => graph.set(c, []));
    strongLinks.forEach(link => {
      graph.get(link.c1).push(link.c2);
      graph.get(link.c2).push(link.c1);
    });

    const startNodes = Array.from(graph.keys()).filter(c => graph.get(c).length > 0);

    for (const startNode of startNodes) {
      // 奇数長（奇数個のエッジ＝奇数個の Strong Link）のパスを探索
      const queue = [[startNode]];
      
      while (queue.length > 0) {
        const path = queue.shift();
        const lastNode = path[path.length - 1];

        // 偶数個のノード＝奇数個のリンク（Strong Linkで始まるChain）
        if (path.length >= 4 && path.length % 2 === 0) {
          const endNode = lastNode;

          // 始点と終点の両方を見込める共通のマス（Intersection）を検索
          const redCands = [];
          grid.forEach(c => {
            if (c.status === "candidate" && c !== startNode && c !== endNode && c.val.includes(num)) {
              const seesStart = (c.row === startNode.row || c.col === startNode.col || c.box === startNode.box);
              const seesEnd = (c.row === endNode.row || c.col === endNode.col || c.box === endNode.box);
              if (seesStart && seesEnd) {
                redCands.push({ cell: c, num: num, row: c.row, col: c.col });
              }
            }
          });

          if (redCands.length > 0) {
            const blueCands = path.map(c => ({ cell: c, num: num }));
            const chainPathStr = path.map(c => `R${c.row+1}C${c.col+1}`).join(' = ');

            return {
              type: "clean",
              blueCells: path,
              blueCands: blueCands,
              redCands: redCands,
              chainPath: path,
              chainNum: num,
              logMsg: `🔗 [X-Chain] 数字「${num}」の強リンク連鎖 (${chainPathStr}) を発見。両端を見込むマスから数字「${num}」を削除できます。`,
              logClass: "chain"
            };
          }
        }

        // 次のノードへの伸長（重複防止）
        const neighbors = graph.get(lastNode) || [];
        for (const nextNode of neighbors) {
          if (!path.includes(nextNode)) {
            queue.push([...path, nextNode]);
          }
        }
      }
    }
  }

  return null;
}
