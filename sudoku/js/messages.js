/**
 * ログメッセージ一元管理ファイル (js/messages.js)
 * 手筋以外の、システム的なログメッセージをここに集約する
 */
export const MESSAGES = {
  candidateShown: { logMsg: "候補数字を表示しました。", logClass: "info" },
  cleared: { type: "cleared", logMsg: "最後まで解けました。", logClass: "ok" },
  stuck:   { type: "stuck",   logMsg: "実装済みロジックで解けるのはここまでです。", logClass: "info" }
};
