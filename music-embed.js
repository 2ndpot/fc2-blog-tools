const musicPlayers = new Map();

document.querySelectorAll(".music-data").forEach((dataElement) => {
  const entry = dataElement.closest(".entry");
  const container = entry?.querySelector(".music-embed");

  if (!container) {
    return;
  }

  try {
    const data = JSON.parse(dataElement.textContent);

    const getPlayCount = (track) => {
      if (track.skip) {
        return 0;
      }

      return Number(track.playCountElement?.value ?? 1);
    };

    const getNextPlayableTrack = (trackIndex) => {
      for (let i = trackIndex + 1; i < data.tracks.length; i++) {
        if (getPlayCount(data.tracks[i]) !== 0) {
          return data.tracks[i];
        }
      }

      return null;
    };

    const startPlayMonitor = (player, playerData) => {
      if (playerData.skipTimer) {
        clearInterval(playerData.skipTimer);
      }

      playerData.skipTimer = setInterval(() => {
        const currentTime = player.getCurrentTime();

        const currentIndex = data.tracks.findIndex((track, index) => {
          const nextTrack = data.tracks[index + 1];

          return (
            currentTime >= track.start &&
            (!nextTrack || currentTime < nextTrack.start)
          );
        });

        if (currentIndex === -1) {
          return;
        }

        const currentTrack = data.tracks[currentIndex];

        if (getPlayCount(currentTrack) !== 0) {
          return;
        }

        const nextTrack = getNextPlayableTrack(currentIndex);

        if (nextTrack) {
          player.seekTo(nextTrack.start, true);
        } else {
          player.stopVideo();
        }
      }, 500);
    };

    if (data.youtube) {
      const wrapper = document.createElement("div");
      wrapper.className = "youtube-lite";

      const button = document.createElement("button");
      button.type = "button";
      button.className = "youtube-lite-button";
      button.setAttribute("aria-label", "YouTube動画を再生");

      const thumbnail = document.createElement("img");
      thumbnail.src =
        `https://i.ytimg.com/vi/${data.youtube}/hqdefault.jpg`;
      thumbnail.alt = "";
      thumbnail.loading = "lazy";

      button.appendChild(thumbnail);
      wrapper.appendChild(button);
      container.appendChild(wrapper);

      button.addEventListener("click", () => {
        const playerId = `music-player-${data.youtube}`;
        const existingPlayerData = musicPlayers.get(playerId);

        if (existingPlayerData?.player) {
          existingPlayerData.player.playVideo();
          return;
        }

        const iframe = document.createElement("iframe");

        iframe.id = playerId;
        iframe.width = "560";
        iframe.height = "315";

        const origin = encodeURIComponent(location.origin);

        iframe.src =
          `https://www.youtube.com/embed/${data.youtube}` +
          `?autoplay=1&enablejsapi=1&origin=${origin}`;

        iframe.title = "YouTube";
        iframe.allow =
          "autoplay; encrypted-media; picture-in-picture";
        iframe.allowFullscreen = true;

        wrapper.replaceWith(iframe);

        const playerData = {
          player: null,
          start: 0,
          skipTimer: null
        };

        musicPlayers.set(playerId, playerData);

        playerData.player = new YT.Player(playerId, {
          events: {
            onReady: (event) => {
              event.target.playVideo();
              startPlayMonitor(event.target, playerData);
            }
          }
        });
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

          if (getPlayCount(track) === 0) {
            const nextTrack = getNextPlayableTrack(trackIndex);

            if (nextTrack) {
              targetStart = nextTrack.start;
            } else {
              if (playerData?.player) {
                playerData.player.stopVideo();
              }

              return;
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
                startPlayMonitor(event.target, newPlayerData);
              }
            }
          });
        });

        let playCount;

        if (track.skip) {
          playCount = document.createElement("span");
          playCount.className =
            "track-play-count track-play-count-fixed";
          playCount.textContent = "0";
        } else {
          playCount = document.createElement("select");
          playCount.className = "track-play-count";

          [0, 1, 2, 3].forEach((count) => {
            const option = document.createElement("option");
            option.value = count;
            option.textContent = count;

            if (count === 1) {
              option.selected = true;
            }

            playCount.appendChild(option);
          });

          track.playCountElement = playCount;
        }

        const titleElement = document.createElement("span");
        titleElement.className = "track-title";
        titleElement.textContent = track.title;

        item.appendChild(timeElement);
        item.appendChild(playCount);
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
