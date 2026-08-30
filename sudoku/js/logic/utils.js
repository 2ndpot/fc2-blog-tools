/**
 * ユーティリティ関数群 (js/logic/utils.js)
 */

/**
 * ハウス（領域）の種別を日本語表記に変換
 * @param {string} type - "row", "col", "box"
 * @returns {string} - "行", "列", "ブロック"
 */
export const getHouseName = (type) => {
  return type === "row" ? "行" : type === "col" ? "列" : "ブロック";
};

/**
 * 配列から k 個を選ぶすべての組み合わせを取得
 * @param {Array} arr 
 * @param {number} k 
 * @returns {Array<Array>}
 */
export function getCombinations(arr, k) {
  if (k === 1) return arr.map(e => [e]);
  const result = [];
  arr.forEach((val, idx) => {
    const head = [val];
    const tailCombs = getCombinations(arr.slice(idx + 1), k - 1);
    tailCombs.forEach(tail => result.push(head.concat(tail)));
  });
  return result;
}

/**
 * 81桁の数字文字列入力チェック
 * @param {string} str - 検証対象の文字列
 * @param {string} name - データ名（ログ表示用）
 * @param {function} logCallback - エラーログ出力用のコールバック関数
 * @returns {boolean}
 */
export function checkValid(str, name, logCallback) {
  if (str.length !== 81) {
    if (logCallback) logCallback(`【❌エラー】${name}が81桁ではありません。`, "err");
    return false;
  }
  if (!/^[0-9]+$/.test(str)) {
    if (logCallback) logCallback(`【❌エラー】${name}に数字以外が含まれています。`, "err");
    return false;
  }
  return true;
}
