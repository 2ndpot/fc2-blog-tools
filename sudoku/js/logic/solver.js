/**
 * 解析ロジック統合制御モジュール (js/logic/solver.js)
 */
import { SOLVER_CONFIG } from '../config.js';
import { findNakedSingle, findHiddenSingle } from './singles.js';
import { findNakedN, findHiddenN } from './subsets.js';
import { findLockedCandidates } from './lockedCandidates.js';
import { findXChain } from './xChain.js';
import { findBUGPlusOne } from './bugPlusOne.js';

/**
 * 盤面データ（grid）を受け取り、有効化されている手筋を優先順位順に実行して最初に見つかったヒントを返す
 * @param {Array} grid - 盤面状態セル配列
 * @returns {Object|null} - 検出されたヒント情報、または null
 */
export function analyzeNextStep(grid) {
  // 盤面がすでに完全に埋まっているかをチェック
  const isComplete = grid.every(c => c.status !== "candidate");
  if (isComplete) {
    return {
      type: "cleared",
      logMsg: "最後まで解けました。",
      logClass: "ok"
    };
  }

  // 1. Naked Single
  if (SOLVER_CONFIG.enableNakedSingle) {
    const res = findNakedSingle(grid);
    if (res) return res;
  }

  // 2. Hidden Single
  if (SOLVER_CONFIG.enableHiddenSingle) {
    const res = findHiddenSingle(grid);
    if (res) return res;
  }

  // 3. Naked Pair (二値同盟)
  if (SOLVER_CONFIG.enableNakedPair) {
    const res = findNakedN(grid, 2, "Naked Pair", "ok");
    if (res) return res;
  }

  // 4. Hidden Pair (隠れ二値同盟)
  if (SOLVER_CONFIG.enableHiddenPair) {
    const res = findHiddenN(grid, 2, "Hidden Pair", "ok");
    if (res) return res;
  }

  // 5. Locked Candidates (指形・クレーム)
  if (SOLVER_CONFIG.enableLockedCandidates) {
    const res = findLockedCandidates(grid);
    if (res) return res;
  }

  // 6. Naked Triple (三値同盟)
  if (SOLVER_CONFIG.enableNakedTriple) {
    const res = findNakedN(grid, 3, "Naked Triple", "ok");
    if (res) return res;
  }

  // 7. Hidden Triple (隠れ三値同盟)
  if (SOLVER_CONFIG.enableHiddenTriple) {
    const res = findHiddenN(grid, 3, "Hidden Triple", "ok");
    if (res) return res;
  }

  // 8. Naked Quad (四値同盟)
  if (SOLVER_CONFIG.enableNakedQuad) {
    const res = findNakedN(grid, 4, "Naked Quad", "ok");
    if (res) return res;
  }

  // 9. Hidden Quad (隠れ四値同盟)
  if (SOLVER_CONFIG.enableHiddenQuad) {
    const res = findHiddenN(grid, 4, "Hidden Quad", "ok");
    if (res) return res;
  }

  // 10. X-Chain
  if (SOLVER_CONFIG.enableXChain) {
    const res = findXChain(grid);
    if (res) return res;
  }

  // 11. BUG+1
  if (SOLVER_CONFIG.enableBUGPlusOne) {
    const res = findBUGPlusOne(grid);
    if (res) return res;
  }

  return {
    type: "stuck",
    logMsg: "実装済みロジックで解けるのはここまでです。",
    logClass: "info"
  };
}
