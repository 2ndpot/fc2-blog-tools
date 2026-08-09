document.addEventListener("DOMContentLoaded", async () => {
  const wakaElements = document.querySelectorAll(
    "blockquote.waka[data-number]"
  );

  if (!wakaElements.length) return;

  try {
    const response = await fetch(
      "https://2ndpot.github.io/fc2-blog-tools/data/hyakunin-isshu.json"
    );

    if (!response.ok) {
      throw new Error(`百人一首データを取得できませんでした: ${response.status}`);
    }

    const wakaData = await response.json();

    wakaElements.forEach((blockquote) => {
      const number = blockquote.dataset.number;
      const waka = wakaData[number];

      if (!waka) {
        console.warn(`百人一首 ${number}番のデータがありません。`);
        return;
      }

      const p = document.createElement("p");

      const kami = document.createElement("span");
      kami.className = "kami";
      appendKana(kami, waka.lines.slice(0, 2).join(" "));

      const simo = document.createElement("span");
      simo.className = "simo";
      appendKana(simo, waka.lines.slice(2).join(" "));

      p.append(kami, document.createTextNode(" "), simo);

      const footer = document.createElement("footer");

      const author = document.createElement("span");
      author.className = "author";
      author.textContent = waka.author;

      const cite = document.createElement("cite");
      cite.textContent = `『${waka.source}』`;

      footer.append(author, cite);

      blockquote.replaceChildren(p, footer);
    });
  } catch (error) {
    console.error(error);
  }
});


function appendKana(parent, text) {
  const kanaPattern =
    /[\p{Script=Hiragana}\p{Script=Katakana}ーゝゞヽヾ]+/gu;

  let lastIndex = 0;

  for (const match of text.matchAll(kanaPattern)) {
    if (match.index > lastIndex) {
      parent.append(
        document.createTextNode(text.slice(lastIndex, match.index))
      );
    }

    const span = document.createElement("span");
    span.className = "kana";
    span.textContent = match[0];
    parent.append(span);

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parent.append(
      document.createTextNode(text.slice(lastIndex))
    );
  }
}