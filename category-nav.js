// header の category_nav 内で、現在表示中のカテゴリーへのリンクを
// リンク解除して強調表示する。
// data-current-cno（<%cno>、カテゴリー一覧画面でのみ値が入る）と、
// 各カテゴリーリンクの data-cno（<%category_no>）を突き合わせて判定する。
document.addEventListener('DOMContentLoaded', function () {
  var nav = document.querySelector('.category_nav');
  if (!nav) return;

  var currentCno = nav.dataset.currentCno;
  if (!currentCno) return; // カテゴリー一覧画面以外では何もしない

  var links = nav.querySelectorAll('a[data-cno]');
  links.forEach(function (a) {
    if (a.dataset.cno === currentCno) {
      var span = document.createElement('span');
      span.className = 'current-category';
      span.textContent = a.textContent;
      a.replaceWith(span);
    }
  });
});
