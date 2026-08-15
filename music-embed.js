const musicPlayers = new Map();

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
        iframe.src =
          `https://www.youtube.com/embed/${data.youtube}?autoplay=1`;
        iframe.title = "YouTube";
        iframe.allow =
          "autoplay; encrypted-media; picture-in-picture";
        iframe.allowFullscreen = true;

        wrapper.replaceWith(iframe);
      });
    }

    if (Array.isArray(data.tracks) && data.tracks.length > 1) {
      const list = document.createElement("ul");
      list.className = "track-list";

      data.tracks.forEach((track, trackIndex) => {
        const item = document.createElement("li");
        item.className = "track-item";

        if (track.skip) {
          item.classList.add("track-skip");
        }

        const minutes = Math.floor(track.start / 60);
        const seconds = track.start % 60;
        const time =
          `${minutes}:${String(seconds).padStart(2, "0")}`;

        const timeElement = document.createElement("button");
        timeElement.type = "button";
        timeElement.className = "track-time";
        timeElement.textContent = time;

        timeElement.addEventListener("click", () => {
          const playerId = `music-player-${data.youtube}`;
          const playerData = musicPlayers.get(playerId);

          let targetStart = track.start;

          if (track.skip) {
            const nextTrack = data.tracks[trackIndex + 1];

            if (nextTrack) {
              targetStart = nextTrack.start;
            }
          }

          if (playerData?.player) {
            playerData.player.seekTo(targetStart, true);
            playerData.player.playVideo();
            return;
          }

          let iframe = container.querySelector("iframe");

          if (!iframe) {
            const thumbnailButton =
              container.querySelector(".youtube-lite-button");

            if (thumbnailButton) {
              thumbnailButton.click();
              iframe = container.querySelector("iframe");
            }
          }

          if (!iframe) {
            return;
          }

          iframe.id = playerId;

          const origin = encodeURIComponent(location.origin);

          iframe.src =
            `https://www.youtube.com/embed/${data.youtube}` +
            `?autoplay=1&enablejsapi=1&origin=${origin}`;

          const newPlayerData = {
            player: null,
            start: targetStart,
            skipTimer: null
          };

          musicPlayers.set(playerId, newPlayerData);

          newPlayerData.player = new YT.Player(playerId, {
            events: {
              onReady: (event) => {
                event.target.seekTo(newPlayerData.start, true);
                event.target.playVideo();

                newPlayerData.skipTimer = setInterval(() => {
                  const currentTime = event.target.getCurrentTime();

                  data.tracks.forEach(
                    (currentTrack, currentIndex) => {
                      if (!currentTrack.skip) {
                        return;
                      }

                      const nextTrack =
                        data.tracks[currentIndex + 1];

                      if (!nextTrack) {
                        return;
                      }

                      if (
                        currentTime >= currentTrack.start &&
                        currentTime < nextTrack.start
                      ) {
                        event.target.seekTo(
                          nextTrack.start,
                          true
                        );
                      }
                    }
                  );
                }, 500);
              }
            }
          });
        });

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
    console.error(
      "music-data のJSONを読み取れませんでした。",
      error
    );
  }
});
