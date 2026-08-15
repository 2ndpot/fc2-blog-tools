document.querySelectorAll(".music-data").forEach((dataElement) => {
  const entry = dataElement.closest(".entry");
  const container = entry?.querySelector(".music-embed");

  if (!container) {
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
      thumbnail.src = `https://i.ytimg.com/vi/${data.youtube}/hqdefault.jpg`;
      thumbnail.alt = "";
      thumbnail.loading = "lazy";

      button.appendChild(thumbnail);
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

    if (Array.isArray(data.tracks) && data.tracks.length > 1) {
      const list = document.createElement("ul");
      list.className = "track-list";

      data.tracks.forEach((track) => {
        const item = document.createElement("li");
        item.className = "track-item";

        if (track.skip) {
          item.classList.add("track-skip");
        }

        const minutes = Math.floor(track.start / 60);
        const seconds = track.start % 60;
        const time = `${minutes}:${String(seconds).padStart(2, "0")}`;

        const timeElement = document.createElement("span");
        timeElement.className = "track-time";
        timeElement.textContent = time;

        const titleElement = document.createElement("span");
        titleElement.className = "track-title";
        titleElement.textContent = track.title;

        item.appendChild(timeElement);
        item.appendChild(titleElement);
        list.appendChild(item);
      });

      container.appendChild(list);
    }

  } catch (error) {
    console.error("music-data のJSONを読み取れませんでした。", error);
  }
});
