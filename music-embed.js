document.querySelectorAll(".music-data").forEach((dataElement) => {
  const container = dataElement.previousElementSibling;

  if (!container?.classList.contains("music-embed")) {
    return;
  }

  try {
    const data = JSON.parse(dataElement.textContent);

    if (data.youtube) {
      const wrapper = document.createElement("div");
      wrapper.className = "youtube-lite";

      const button = document.createElement("button");
      button.type = "button";
      button.className = "youtube-lite-button";
      button.setAttribute("aria-label", "YouTube動画を再生");

      const thumbnail = document.createElement("img");
      thumbnail.src = `https://i.ytimg.com/vi/${data.youtube}/mqdefault.jpg`;
      thumbnail.alt = "";
      thumbnail.loading = "lazy";

      const play = document.createElement("span");
      play.className = "youtube-lite-play";
      play.textContent = "▶";

      button.append(thumbnail, play);
      wrapper.appendChild(button);
      container.appendChild(wrapper);

      button.addEventListener("click", () => {
        const iframe = document.createElement("iframe");

        iframe.width = "560";
        iframe.height = "315";
        iframe.src = `https://www.youtube.com/embed/${data.youtube}?autoplay=1`;
        iframe.title = "YouTube";
        iframe.allow = "autoplay; encrypted-media; picture-in-picture";
        iframe.allowFullscreen = true;

        wrapper.replaceWith(iframe);
      });
    }

    const labels = {
      lyrics: "作詞",
      music: "作曲",
      arrangement: "編曲",
      choreography: "振付"
    };

    const credits = Object.entries(labels)
      .filter(([key]) => data.credit?.[key])
      .map(([key, label]) => `${label}:${data.credit[key]}`);

    if (credits.length > 0) {
      const p = document.createElement("p");
      p.className = "credit";

      const small = document.createElement("small");
      small.textContent = credits.join("、");

      p.appendChild(small);
      container.appendChild(p);
    }
  } catch (error) {
    console.error("music-data のJSONを読み取れませんでした。", error);
  }
});
