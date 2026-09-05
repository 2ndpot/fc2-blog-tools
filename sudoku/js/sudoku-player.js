import { analyzeNextStep } from 'https://2ndpot.github.io/fc2-blog-tools/sudoku/js/logic/solver.js';
import { MESSAGES } from 'https://2ndpot.github.io/fc2-blog-tools/sudoku/js/messages.js';

document.querySelectorAll('script[type="application/json"].sudoku-json').forEach(scriptTag => {
  let data;
  try { data = JSON.parse(scriptTag.textContent); } catch (e) { return; }
  if (!data.grid) return;

  const container = document.createElement('div');
  container.className = 'sudoku-player-container';
  container.innerHTML = `
    <div class="step-controls">
      <button class="btn-deck btn-deck-reset">⏪ 最初に戻る</button>
      <button class="btn-deck btn-deck-prev" disabled>◀️ 1ステップ戻る</button>
      <button class="btn-deck btn-deck-next">1ステップ進む ▶️</button>
      <button class="btn-deck btn-deck-ff">一気に進む ⏩</button>
    </div>
    <div class="board-container">
      <div class="board"></div>
      <svg class="svg-overlay"></svg>
    </div>
    <div class="player-log-title">🔍 解析ログ</div>
    <div class="player-log"></div>
  `;
  scriptTag.parentNode.insertBefore(container, scriptTag.nextSibling);

  const elBoard = container.querySelector('.board');
  const elSvg = container.querySelector('.svg-overlay');
  const elLog = container.querySelector('.player-log');
  const btnReset = container.querySelector('.btn-deck-reset');
  const btnPrev = container.querySelector('.btn-deck-prev');
  const btnNext = container.querySelector('.btn-deck-next');
  const btnFF = container.querySelector('.btn-deck-ff');

  let memoryGrid = [], historyStack = [], highlights = { blueCells: [], blueCands: [], redCands: [], chainLinks: [] };
  let showCand = false, isCandidateInitialized = false, nextPhase = "preview", currentMove = null;

  const getR = o => o.cell ? o.cell.row : o.row;
  const getC = o => o.cell ? o.cell.col : o.col;

  function writeLog(text, type = "") {
    const div = document.createElement("div");
    if (type) div.className = `log-${type}`;
    div.textContent = text;
    elLog.appendChild(div);
    elLog.scrollTop = elLog.scrollHeight;
  }

  function clearHighlights() {
    highlights = { blueCells: [], blueCands: [], redCands: [], chainLinks: [] };
  }

  function renderOverlayLines() {
    elSvg.innerHTML = "";
    if (!highlights.chainLinks || highlights.chainLinks.length === 0) return;
    const boardRect = elBoard.getBoundingClientRect();
    const cellW = boardRect.width / 9, cellH = boardRect.height / 9;

    highlights.chainLinks.forEach(link => {
      if (!link.from || !link.to) return;
      const num = link.num || 1;
      const subRow = Math.floor((num - 1) / 3), subCol = (num - 1) % 3;
      const x1 = (link.from.col + (subCol + 0.5) / 3) * cellW, y1 = (link.from.row + (subRow + 0.5) / 3) * cellH;
      const x2 = (link.to.col + (subCol + 0.5) / 3) * cellW,   y2 = (link.to.row + (subRow + 0.5) / 3) * cellH;

      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", x1); line.setAttribute("y1", y1);
      line.setAttribute("x2", x2); line.setAttribute("y2", y2);

      if (link.type === "strong") {
        line.setAttribute("stroke", "#8e24aa"); line.setAttribute("stroke-width", "3.5"); line.setAttribute("stroke-linecap", "round");
      } else {
        line.setAttribute("stroke", "#e65100"); line.setAttribute("stroke-width", "3"); line.setAttribute("stroke-dasharray", "5,5"); line.setAttribute("stroke-linecap", "round");
      }
      elSvg.appendChild(line);
    });
  }

  function render() {
    elBoard.innerHTML = "";
    memoryGrid.forEach(c => {
      const el = document.createElement("div");
      el.className = "cell";
      el.setAttribute("data-status", c.status);
      if (highlights.blueCells.includes(c)) el.classList.add("hl-blue-cell");

      if (c.status !== "candidate") {
        el.textContent = c.val;
      } else if (showCand) {
        const g = document.createElement("div"); g.className = "cand-grid";
        for (let i = 1; i <= 9; i++) {
          const n = document.createElement("div"); n.className = "cand-num";
          if (c.val && c.val.includes(i)) {
            n.textContent = i;
            if (highlights.blueCands.some(h => getR(h) === c.row && getC(h) === c.col && h.num === i)) n.classList.add("hl-blue");
            else if (highlights.redCands.some(h => getR(h) === c.row && getC(h) === c.col && h.num === i)) n.classList.add("hl-red");
          }
          g.appendChild(n);
        }
        el.appendChild(g);
      }
      elBoard.appendChild(el);
    });
    renderOverlayLines();
  }

  function setupEngine() {
    elLog.innerHTML = ""; clearHighlights(); historyStack = [];
    btnPrev.disabled = true; btnNext.disabled = false;
    showCand = false; isCandidateInitialized = false; nextPhase = "preview"; currentMove = null;

    memoryGrid = data.grid.split('').map((v, i) => {
      const vi = parseInt(v, 10), r = Math.floor(i / 9), c = i % 9, b = Math.floor(r / 3) * 3 + Math.floor(c / 3);
      if (vi !== 0) return { val: vi, status: "given", row: r, col: c, box: b };
      return { val: [], status: "candidate", row: r, col: c, box: b };
    });

    memoryGrid.forEach(c => {
      if (c.status !== "candidate") return;
      const used = new Set();
      memoryGrid.forEach(t => { if (t.status !== "candidate" && (t.row === c.row || t.col === c.col || t.box === c.box)) used.add(t.val); });
      c.val = [];
      for (let i = 1; i <= 9; i++) if (!used.has(i)) c.val.push(i);
    });

    render();
  }

  function pushHistory() {
    historyStack.push({
      grid: JSON.parse(JSON.stringify(memoryGrid)),
      showCand, isCandidateInitialized, nextPhase, currentMove,
      highlights: {
        blueCellsCoords: highlights.blueCells.map(c => ({ row: c.row, col: c.col })),
        blueCandsCoords: highlights.blueCands.map(h => ({ row: getR(h), col: getC(h), num: h.num })),
        redCandsCoords: highlights.redCands.map(h => ({ row: getR(h), col: getC(h), num: h.num })),
        chainLinks: highlights.chainLinks || []
      },
      logHTML: elLog.innerHTML,
      btnNextDisabled: btnNext.disabled
    });
    btnPrev.disabled = false;
  }

  function stepBack() {
    if (historyStack.length === 0) return;
    const s = historyStack.pop();
    memoryGrid = s.grid; showCand = s.showCand; isCandidateInitialized = s.isCandidateInitialized;
    nextPhase = s.nextPhase; currentMove = s.currentMove; elLog.innerHTML = s.logHTML; btnNext.disabled = s.btnNextDisabled;

    highlights.blueCells = s.highlights.blueCellsCoords.map(pos => memoryGrid.find(c => c.row === pos.row && c.col === pos.col)).filter(Boolean);
    highlights.blueCands = s.highlights.blueCandsCoords.map(pos => ({ cell: memoryGrid.find(c => c.row === pos.row && c.col === pos.col), row: pos.row, col: pos.col, num: pos.num })).filter(h => h.cell);
    highlights.redCands = s.highlights.redCandsCoords.map(pos => ({ cell: memoryGrid.find(c => c.row === pos.row && c.col === pos.col), row: pos.row, col: pos.col, num: pos.num })).filter(h => h.cell);
    highlights.chainLinks = s.highlights.chainLinks || [];

    if (historyStack.length === 0) btnPrev.disabled = true;
    render();
  }

  function stepForward() {
    if (btnNext.disabled) return;
    pushHistory();

    if (!isCandidateInitialized) {
      showCand = true; isCandidateInitialized = true;
      writeLog(MESSAGES.candidateShown.logMsg, MESSAGES.candidateShown.logClass); render(); return;
    }

    if (nextPhase === "preview") {
      clearHighlights();
      const move = analyzeNextStep(memoryGrid);
      if (move && move.type === "cleared") { writeLog(move.logMsg, move.logClass); btnNext.disabled = true; render(); return; }
      if (move && move.type === "stuck") { writeLog(move.logMsg, move.logClass); btnNext.disabled = true; render(); return; }

      currentMove = move;
      highlights.blueCells = move.blueCells || [];
      highlights.blueCands = move.blueCands || [];
      highlights.redCands = move.redCands || [];
      highlights.chainLinks = move.chainLinks || [];
      writeLog(move.logMsg, move.logClass);
      nextPhase = "execute";
    } else {
      if (currentMove) {
        if (["Naked Single", "Hidden Single", "BUG+1"].includes(currentMove.name)) {
          const tr = currentMove.targetRow !== undefined ? currentMove.targetRow : (currentMove.targetCell ? currentMove.targetCell.row : -1);
          const tc = currentMove.targetCol !== undefined ? currentMove.targetCol : (currentMove.targetCell ? currentMove.targetCell.col : -1);
          const target = memoryGrid.find(c => c.row === tr && c.col === tc);
          if (target) { target.status = "solved"; target.val = currentMove.val; }
        }
        if (currentMove.redCands) {
          currentMove.redCands.forEach(rc => {
            const cell = memoryGrid.find(c => c.row === getR(rc) && c.col === getC(rc));
            if (cell && cell.status === "candidate") {
              const idx = cell.val.indexOf(rc.num);
              if (idx > -1) cell.val.splice(idx, 1);
            }
          });
        }
      }
      clearHighlights(); currentMove = null; nextPhase = "preview";
    }
    render();
  }

  btnReset.addEventListener('click', setupEngine);
  btnPrev.addEventListener('click', stepBack);
  btnNext.addEventListener('click', stepForward);
  btnFF.addEventListener('click', () => {
    let c = 0;
    while (!btnNext.disabled && c < 200) { stepForward(); c++; }
    if (nextPhase === "execute" && !btnNext.disabled) stepForward();
  });
  window.addEventListener('resize', renderOverlayLines);

  setupEngine();
});
