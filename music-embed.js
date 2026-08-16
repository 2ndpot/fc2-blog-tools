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

    let wrapper = null;

    const createThumbnail = () => {
      const newWrapper = document.createElement("div");
      newWrapper.className = "youtube-lite";

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
      newWrapper.appendChild(button);

      const trackList = container.querySelector(".track-list");

      if (trackList) {
        container.insertBefore(newWrapper, trackList);
      } else {
        container.appendChild(newWrapper);
      }

      wrapper = newWrapper;

      button.addEventListener("click", () => {
        requestPlay(0);
      });
    };

    const resetPlayer = () => {
      const playerData = musicPlayers.get(playerId);

      if (playerData?.skipTimer) {
        clearInterval(playerData.skipTimer);
      }

      if (playerData?.player) {
        try {
          playerData.player.destroy();
        } catch (error) {
          console.error(
            "YouTubeプレーヤーを破棄できませんでした。",
            error
          );
        }
      }

      musicPlayers.delete(playerId);

      container
        .querySelectorAll(".youtube-lite")
        .forEach((element) => element.remove());

      createThumbnail();
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
         * プログラム自身によるシーク中は、
         * シーク先へ到達するまで監視を保留する。
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
         * 現在再生中の曲だけを見る。
         * 未来の曲を0にしても現在曲には影響しない。
         */
        if (getPlayCount(currentTrack) !== 0) {
          return;
        }

        const nextIndex = getNextPlayableIndex(currentIndex + 1);

        /*
         * 次に再生できる曲がないなら、
         * プレイリスト終了として初期状態へ戻す。
         */
        if (nextIndex === -1) {
          resetPlayer();
          return;
        }

        const targetStart = tracks[nextIndex].start;

        playerData.seekingTo = targetStart;
        player.seekTo(targetStart, true);
      }, 250);
    };

    const requestPlay = (trackIndex = 0) => {
      let targetStart = 0;

      if (tracks.length > 0) {
        const playableIndex = getNextPlayableIndex(trackIndex);

        /*
         * 指定位置以降に再生できる曲がない。
         */
        if (playableIndex === -1) {
          const playerData = musicPlayers.get(playerId);

          if (playerData?.player) {
            resetPlayer();
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
        console.error(
          "YouTube IFrame Player API が読み込まれていません。"
        );
        return;
      }

      if (!wrapper) {
        return;
      }

      const playerHost = document.createElement("div");
      playerHost.id = playerId;

      wrapper.replaceWith(playerHost);
      wrapper = null;

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
          },

          onStateChange: (event) => {
            if (
              event.data === YT.PlayerState.ENDED &&
              musicPlayers.get(playerId)?.player
            ) {
              resetPlayer();
            }
          }
        }
      });
    };

    if (data.youtube) {
      createThumbnail();
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
