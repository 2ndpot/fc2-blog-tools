const musicPlayers = new Map();

document.querySelectorAll(".music-data").forEach((dataElement, index) => {
  const entry = dataElement.closest(".entry");
  const container = entry?.querySelector(".music-embed");

  if (!container) {
    return;
  }

  try {
    const data = JSON.parse(dataElement.textContent);
    const tracks = Array.isArray(data.tracks) ? data.tracks : [];
    const playerId = `music-player-${index}`;

    const getPlayCount = (track) => {
      if (track.skip) {
        return 0;
      }

      return Number(track.playCountElement?.value ?? 1);
    };

    const getNextPlayableIndex = (startIndex) => {
      for (let i = startIndex; i < tracks.length; i++) {
        if (getPlayCount(tracks[i]) !== 0) {
          return i;
        }
      }

      return -1;
    };

    const startPlayMonitor = (player, playerData) => {
      if (playerData.skipTimer) {
        clearInterval(playerData.skipTimer);
      }

      playerData.skipTimer = setInterval(() => {
        const currentTime = player.getCurrentTime();

        if (!Number.isFinite(currentTime)) {
          return;
        }

        /*
         * プログラム自身が seekTo() した直後は、
         * 目的位置へ実際に到達するまで監視を保留する。
         * これにより、シーク先の直前を再び0曲と判定して
         * seekTo() を連打する現象を防ぐ。
         */
        if (playerData.seekingTo !== null) {
          if (currentTime >= playerData.seekingTo) {
            playerData.seekingTo = null;
          } else {
            return;
          }
        }

        const currentIndex = tracks.findIndex((track, trackIndex) => {
          const nextTrack = tracks[trackIndex + 1];

          return (
            currentTime >= track.start &&
            (!nextTrack || currentTime < nextTrack.start)
          );
        });

        if (currentIndex === -1) {
          return;
        }

        const currentTrack = tracks[currentIndex];

        /*
         * 現在再生している曲だけを見る。
         * 未来の曲を0に変更しても、現在曲には何もしない。
         */
        if (getPlayCount(currentTrack) !== 0) {
          return;
        }

        const nextIndex = getNextPlayableIndex(currentIndex + 1);

        if (nextIndex === -1) {
          player.pauseVideo();
          return;
        }

        const targetStart = tracks[nextIndex].start;

        playerData.seekingTo = targetStart;
        player.seekTo(targetStart, true);
      }, 250);
    };

    let wrapper = null;

    if (data.youtube) {
      wrapper = document.createElement("div");
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
    }

    /*
     * サムネスタートとリンクスタートの共通入口。
     *
     * trackIndex:
     *   0     → 先頭から再生。ただし0指定曲は飛ばす
     *   1以上 → 指定曲から再生。ただし0指定なら次の非0曲へ
     */
    const requestPlay = (trackIndex = 0) => {
      let targetStart = 0;

      if (tracks.length > 0) {
        const playableIndex = getNextPlayableIndex(trackIndex);

        if (playableIndex === -1) {
          const playerData = musicPlayers.get(playerId);

          if (playerData?.player) {
            playerData.player.pauseVideo();
          }

          return;
        }

        targetStart = tracks[playableIndex].start;
      }

      const existingPlayerData = musicPlayers.get(playerId);

      if (existingPlayerData?.player) {
        existingPlayerData.seekingTo = targetStart;
        existingPlayerData.player.seekTo(targetStart, true);
        existingPlayerData.player.playVideo();
        return;
      }

      if (!window.YT?.Player) {
        console.error("YouTube IFrame Player API が読み込まれていません。");
        return;
      }

      if (!wrapper) {
        return;
      }

      const playerHost = document.createElement("div");
      playerHost.id = playerId;

      wrapper.replaceWith(playerHost);

      const playerData = {
        player: null,
        skipTimer: null,
        seekingTo: targetStart
      };

      musicPlayers.set(playerId, playerData);

      playerData.player = new YT.Player(playerId, {
        width: "560",
        height: "315",
        videoId: data.youtube,
        playerVars: {
          autoplay: 1,
          origin: location.origin
        },
        events: {
          onReady: (event) => {
            if (targetStart > 0) {
              event.target.seekTo(targetStart, true);
            } else {
              playerData.seekingTo = null;
            }

            event.target.playVideo();
            startPlayMonitor(event.target, playerData);
          }
        }
      });
    };

    if (wrapper) {
      const thumbnailButton =
        wrapper.querySelector(".youtube-lite-button");

      thumbnailButton.addEventListener("click", () => {
        requestPlay(0);
      });
    }

    if (tracks.length > 1) {
      const list = document.createElement("ul");
      list.className = "track-list";

      tracks.forEach((track, trackIndex) => {
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
          requestPlay(trackIndex);
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
