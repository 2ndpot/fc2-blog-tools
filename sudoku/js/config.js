/**
 * システム設定および解析ロジックのON/OFF制御 (js/config.js)
 */

// 各解析アルゴリズム（手筋）の有効/無効フラグ
export const SOLVER_CONFIG = {
  enableNakedSingle: true,      // Naked Single（確定マス）[cite: 1]
  enableHiddenSingle: true,     // Hidden Single（限定マス）[cite: 1]
  enableNakedPair: true,        // Naked Pair（二値同盟）[cite: 1]
  enableHiddenPair: true,       // Hidden Pair（隠れ二値同盟）[cite: 1]
  enableLockedCandidates: true, // Locked Candidates（指形・クレーム）[cite: 1]
  enableNakedTriple: true,      // Naked Triple（三値同盟）[cite: 1]
  enableHiddenTriple: true,     // Hidden Triple（隠れ三値同盟）[cite: 1]
  enableNakedQuad: true,        // Naked Quad（四値同盟）[cite: 1]
  enableHiddenQuad: true,       // Hidden Quad（隠れ四値同盟）[cite: 1]
  enableXChain: true,           // X-Chain[cite: 1]
  enableBUGPlusOne: true,       // BUG+1[cite: 1]
  
  // 保留中の実験的ロジック（デフォルトOFF）
  enableGroupedXChain: false
};

// UI・埋め込み表示用の共通設定
export const UI_CONFIG = {
  defaultTitle: "Ver 7.83 Manual Elimination",[cite: 1]
  maxLogHeight: 280, // ログエリアの高さ(px)[cite: 1]
};
