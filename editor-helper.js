(() => {
  const textarea = document.querySelector("#customized-buttonpane-body");
  if (!textarea) return;

  const editor = $("#customized-buttonpane-body").data("trumbowyg");
  if (!editor) return;

  editor.addBtnDef("meta", {
    fn: function () {},
    title: "Meta",
    hasIcon: false
  });

  const metaBtn = editor.buildBtn("meta");

  const style = document.createElement("style");
  style.textContent = `
    .trumbowyg-meta-button::before {
      display: none !important;
    }

    .trumbowyg-meta-button {
      text-indent: 0 !important;
    }
  `;
  document.head.appendChild(style);

  editor.$btnPane
    .find(".trumbowyg-button-group")
    .eq(1)
    .append(metaBtn);
})();
