// サイドバー（.side_plugin）内にあるリンクのうち、
// target="_blank" が付いているものだけ属性を外し、同じタブで開くようにする。
// FC2の「リンク」プラグインなど、プラグイン側があらかじめ
// target="_blank" 付きでHTMLを生成してくるケースへの対処。
document.addEventListener('DOMContentLoaded', function () {
  var links = document.querySelectorAll('.side_plugin a[target="_blank"]');
  links.forEach(function (a) {
    a.removeAttribute('target');
  });
});
