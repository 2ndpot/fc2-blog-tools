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

    let sessionSerial = 0;
    let wrapper = null;

    let controls = null;

    const createControls = () => {
      if (controls) {
        return;
      }

      const newControls = document.createElement("div");
      newControls.className = "music-player-controls";

      const favoriteButton = document.createElement("button");
      favoriteButton.type = "button";
      favoriteButton.className = "music-player-favorite";
      favoriteButton.textContent = "偏愛";

      const universalButton = document.createElement("button");
      universalButton.type = "button";
      universalButton.className = "music-player-universal";
      universalButton.textContent = "博愛";

      newControls.appendChild(favoriteButton);
      newControls.appendChild(universalButton);

      const trackList = container.querySelector(".track-list");

      if (trackList) {
        container.insertBefore(newControls, trackList);
      } else {
        container.appendChild(newControls);
      }

      controls = newControls;
    };

    const getPlayCount = (track) => {
      if (track.skip) {
        return 0;
      }

      return Number(track.playCountElement?.value ?? 1);
    };

      const getInitialPlayCount = (track) => {
        if (track.skip) {
          return 0;
        }

        const playCount = Number(track.playCount);

        if ([0, 1, 2, 3].includes(playCount)) {
          return playCount;
        }

        return 1;
      };

    const getNextPlayableIndex = (startIndex) => {
      for (let i = startIndex; i < tracks.length; i++) {
        if (getPlayCount(tracks[i]) !== 0) {
          return i;
        }
      }

      return -1;
    };

    const getTrackIndexAtTime = (currentTime) => {
      return tracks.findIndex((track, trackIndex) => {
        const nextTrack = tracks[trackIndex + 1];

        return (
          currentTime >= track.start &&
          (!nextTrack || currentTime < nextTrack.start)
        );
      });
    };

    const resetCompletedCounts = () => {
      tracks.forEach((track) => {
        track.completedCount = 0;
      });
    };

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

      /*
       * 現在の再生セッションを失効させる。
       * 古い監視処理やコールバックは以後無効。
       */
      if (playerData) {
        playerData.sessionId = ++sessionSerial;
      }

      if (playerData?.skipTimer) {
        clearInterval(playerData.skipTimer);
      }

      if (playerData) {
        playerData.seekingTo = null;
        playerData.currentTrackIndex = null;
        playerData.currentRunCountable = false;
        playerData.lastTime = null;
        playerData.lastObservedAt = null;
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

      controls
        ?.querySelectorAll(".music-player-stop")
        .forEach((element) => element.remove());

      createThumbnail();

    };

    const beginSession = (playerData, trackIndex) => {
      resetCompletedCounts();

      playerData.sessionId = ++sessionSerial;
      playerData.currentTrackIndex = trackIndex;
      playerData.currentRunCountable = true;
      playerData.lastTime = null;
      playerData.lastObservedAt = null;
    };

    const seekToTrack = (
      player,
      playerData,
      trackIndex,
      countable = true
    ) => {
      const targetStart = tracks[trackIndex].start;

      playerData.currentTrackIndex = trackIndex;
      playerData.currentRunCountable = countable;
      playerData.seekingTo = targetStart;
      playerData.lastTime = null;
      playerData.lastObservedAt = null;

      player.seekTo(targetStart, true);
    };

    const goToNextPlayableTrack = (
      player,
      playerData,
      currentIndex
    ) => {
      const nextIndex =
        getNextPlayableIndex(currentIndex + 1);

      if (nextIndex === -1) {
        resetPlayer();
        return;
      }

      seekToTrack(
        player,
        playerData,
        nextIndex,
        true
      );
    };

    const completeCurrentTrack = (
      player,
      playerData,
      physicalIndex = null,
      videoEnded = false
    ) => {
      const currentIndex =
        playerData.currentTrackIndex;

      if (
        currentIndex === null ||
        !tracks[currentIndex]
      ) {
        return;
      }

      const currentTrack = tracks[currentIndex];

      /*
       * 曲頭から始まった正規の再生だけを
       * 完走回数として数える。
       */
      if (playerData.currentRunCountable) {
        currentTrack.completedCount =
          (currentTrack.completedCount ?? 0) + 1;
      }

      const targetCount = getPlayCount(currentTrack);
      const completedCount =
        currentTrack.completedCount ?? 0;

      /*
       * まだ目標回数に達していないなら、
       * 同じ曲を曲頭からもう一度再生する。
       */
      if (
        targetCount !== 0 &&
        completedCount < targetCount
      ) {
        seekToTrack(
          player,
          playerData,
          currentIndex,
          true
        );

        player.playVideo();
        return;
      }

      const nextIndex =
        getNextPlayableIndex(currentIndex + 1);

      /*
       * 次に再生できる曲がない。
       */
      if (nextIndex === -1) {
        resetPlayer();
        return;
      }

      /*
       * 通常再生で、ちょうど次の再生対象へ
       * 自然に入った場合はシークしない。
       *
       * これにより全曲1の通常再生では、
       * 曲境界で余計なseekTo()を行わない。
       */
      if (
        !videoEnded &&
        physicalIndex === nextIndex
      ) {
        playerData.currentTrackIndex = nextIndex;
        playerData.currentRunCountable = true;
        playerData.seekingTo = null;
        return;
      }

      seekToTrack(
        player,
        playerData,
        nextIndex,
        true
      );

      player.playVideo();
    };

    const startPlayMonitor = (player, playerData) => {
      if (playerData.skipTimer) {
        clearInterval(playerData.skipTimer);
      }

      const monitorSessionId =
        playerData.sessionId;

      playerData.skipTimer = setInterval(() => {
        /*
         * この監視を開始したあとに
         * 新しい再生セッションが始まっていたら、
         * 古い監視処理は何もしない。
         */
        if (
          !musicPlayers.has(playerId) ||
          playerData.sessionId !== monitorSessionId
        ) {
          clearInterval(playerData.skipTimer);
          return;
        }

        const currentTime = player.getCurrentTime();

        if (!Number.isFinite(currentTime)) {
          return;
        }

        const observedAt = performance.now();

        /*
         * プログラム自身によるシーク中は、
         * シーク先へ到達するまで監視を保留する。
         */
        if (playerData.seekingTo !== null) {
          if (currentTime >= playerData.seekingTo) {
            playerData.seekingTo = null;
            playerData.lastTime = currentTime;
            playerData.lastObservedAt = observedAt;
          } else {
            return;
          }
        }

        const physicalIndex =
          getTrackIndexAtTime(currentTime);

        if (physicalIndex === -1) {
          playerData.lastTime = currentTime;
          playerData.lastObservedAt = observedAt;
          return;
        }

        if (playerData.currentTrackIndex === null) {
          playerData.currentTrackIndex =
            physicalIndex;
          playerData.currentRunCountable = false;
        }

        /*
         * 現在管理中の曲と、
         * 実際にYouTubeが再生している曲が違う。
         *
         * まず自然な曲境界通過かどうかを見る。
         */
        if (
          physicalIndex !==
          playerData.currentTrackIndex
        ) {
          const expectedNextIndex =
            playerData.currentTrackIndex + 1;

          const boundary =
            tracks[expectedNextIndex]?.start;

          const mediaElapsed =
            playerData.lastTime === null
              ? null
              : currentTime - playerData.lastTime;

          const realElapsed =
            playerData.lastObservedAt === null
              ? null
              : (
                  observedAt -
                  playerData.lastObservedAt
                ) / 1000;

          const naturalProgress =
            physicalIndex === expectedNextIndex &&
            boundary !== undefined &&
            playerData.lastTime !== null &&
            playerData.lastTime < boundary &&
            currentTime >= boundary &&
            mediaElapsed >= 0 &&
            realElapsed !== null &&
            mediaElapsed <= realElapsed + 1.5;

          if (naturalProgress) {
            completeCurrentTrack(
              player,
              playerData,
              physicalIndex,
              false
            );

            playerData.lastTime = currentTime;
            playerData.lastObservedAt = observedAt;
            return;
          }

          /*
           * 自然な曲境界通過でなければ、
           * ユーザーがYouTubeのシークバーで
           * 別の曲へ移動したものとして扱う。
           *
           * 曲途中からの侵入なので、
           * この1回は完走回数に含めない。
           */
          playerData.currentTrackIndex =
            physicalIndex;
          playerData.currentRunCountable = false;
        }

        const currentTrack =
          tracks[playerData.currentTrackIndex];

        /*
         * 現在再生中の曲だけを見る。
         *
         * 0なら即座に次の非0曲へ移動する。
         */
        if (getPlayCount(currentTrack) === 0) {
          goToNextPlayableTrack(
            player,
            playerData,
            playerData.currentTrackIndex
          );

          return;
        }

        playerData.lastTime = currentTime;
        playerData.lastObservedAt = observedAt;
      }, 250);
    };

    const requestPlay = (trackIndex = 0) => {
      let playableIndex = 0;

      if (tracks.length > 0) {
        playableIndex =
          getNextPlayableIndex(trackIndex);

        /*
         * 指定位置以降に再生できる曲がない。
         */
        if (playableIndex === -1) {
          const playerData =
            musicPlayers.get(playerId);

          if (playerData?.player) {
            resetPlayer();
          }

          return;
        }
      }

      const targetStart =
        tracks.length > 0
          ? tracks[playableIndex].start
          : 0;

      const existingPlayerData =
        musicPlayers.get(playerId);

      /*
       * すでにプレーヤーが存在する場合も、
       * 時刻リンクからの再生は
       * 新しい再生セッションとする。
       */
      if (existingPlayerData?.player) {
        beginSession(
          existingPlayerData,
          playableIndex
        );

        existingPlayerData.seekingTo =
          targetStart;

        /*
         * YT.Playerの準備完了前なら、
         * onReady側で最新の再生位置を処理する。
         */
        if (!existingPlayerData.isReady) {
          return;
        }

        existingPlayerData.player.seekTo(
          targetStart,
          true
        );

        existingPlayerData.player.playVideo();

        startPlayMonitor(
          existingPlayerData.player,
          existingPlayerData
        );

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

      const playerHost =
        document.createElement("div");

      playerHost.id = playerId;

      wrapper.replaceWith(playerHost);
      wrapper = null;

      const stopButton = document.createElement("button");
      stopButton.type = "button";
      stopButton.className = "music-player-stop";
      stopButton.textContent = "■ 再生終了";

      stopButton.addEventListener("click", () => {
        resetPlayer();
      });

      controls.appendChild(stopButton);

      const playerData = {
        player: null,
        skipTimer: null,
        seekingTo: targetStart,
        currentTrackIndex: playableIndex,
        currentRunCountable: true,
        lastTime: null,
        lastObservedAt: null,
        sessionId: 0,
        isReady: false
      };

      beginSession(
        playerData,
        playableIndex
      );

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
            if (
              musicPlayers.get(playerId) !==
              playerData
            ) {
              return;
            }

            playerData.isReady = true;

            /*
             * プレーヤー生成待ちの間に
             * 別の時刻リンクが押されていても、
             * 最新のcurrentTrackIndexを使う。
             */
            const currentIndex =
              playerData.currentTrackIndex;

            const latestTargetStart =
              tracks.length > 0
                ? tracks[currentIndex].start
                : 0;

            if (latestTargetStart > 0) {
              playerData.seekingTo =
                latestTargetStart;

              event.target.seekTo(
                latestTargetStart,
                true
              );
            } else {
              playerData.seekingTo = null;
            }

            event.target.playVideo();

            startPlayMonitor(
              event.target,
              playerData
            );
          },

          onStateChange: (event) => {
            if (
              event.data !==
              YT.PlayerState.ENDED
            ) {
              return;
            }

            if (
              musicPlayers.get(playerId) !==
              playerData
            ) {
              return;
            }

            /*
             * 動画そのものの末尾へ到達した場合。
             *
             * 最終曲の必要回数が残っていれば
             * 最終曲をリピートし、
             * 消化済みならプレイリスト終了。
             */
            const lastTrackIndex =
              tracks.length - 1;

            if (
              lastTrackIndex >= 0 &&
              playerData.currentTrackIndex !==
                lastTrackIndex
            ) {
              playerData.currentTrackIndex =
                lastTrackIndex;
              playerData.currentRunCountable =
                false;
            }

            completeCurrentTrack(
              event.target,
              playerData,
              null,
              true
            );
          }
        }
      });
    };

    if (data.youtube) {
      createThumbnail();
      createControls();
    }

    if (tracks.length > 1) {
      const list = document.createElement("ul");
      list.className = "track-list";

      tracks.forEach((track, trackIndex) => {
        const item = document.createElement("li");
        item.className = "track-item";

        track.completedCount = 0;

        if (track.skip) {
          item.classList.add("track-skip");
        }

        const minutes = Math.floor(track.start / 60);
        const seconds = track.start % 60;
        const time =
          `${minutes}:${String(seconds).padStart(2, "0")}`;

        let timeElement;

        if (track.skip) {
          timeElement = document.createElement("span");
          timeElement.className = "track-time track-time-fixed";
          timeElement.textContent = time;
        } else {
          timeElement = document.createElement("button");
          timeElement.type = "button";
          timeElement.className = "track-time";
          timeElement.textContent = time;

          timeElement.addEventListener("click", () => {
            requestPlay(trackIndex);
          });
        }

        let playCount;

        if (track.skip) {
          playCount = document.createElement("span");
          playCount.className =
            "track-play-count track-play-count-fixed";
          playCount.textContent = "0";
        } else {
          playCount = document.createElement("select");
          playCount.className = "track-play-count";

          const initialPlayCount =
            getInitialPlayCount(track);

          [0, 1, 2, 3].forEach((count) => {
            const option =
              document.createElement("option");

            option.value = count;
            option.textContent = count;

            if (count === initialPlayCount) {
              option.selected = true;
            }

            playCount.appendChild(option);
          });

          track.playCountElement = playCount;
        }

        const titleElement =
          document.createElement("span");

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
