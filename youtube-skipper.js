(function() {
  let tag = document.createElement('script');
  tag.src = "https://www.youtube.com/iframe_api";
  let firstScriptTag = document.getElementsByTagName('script')[0];
  firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

  let instances = [];

  function parseTimeToSeconds(timeStr) {
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return 0;
  }

  document.addEventListener("DOMContentLoaded", function() {
    const jsonScripts = document.querySelectorAll('script.yts-config');
    if (jsonScripts.length === 0) return;

    jsonScripts.forEach((jsonScript, appIndex) => {
      let rawData = null;
      try {
        rawData = JSON.parse(jsonScript.textContent);
      } catch (e) {
        console.error(`yts[${appIndex}]: JSONの読み込みに失敗しました:`, e);
        return;
      }

      let playlist = [];
      if (rawData.videos && Array.isArray(rawData.videos)) {
        playlist = rawData.videos;
      } else {
        playlist = [{
          videoId: rawData.videoId,
          title: rawData.artist || rawData.title || "動画 1",
          tracks: rawData.tracks
        }];
      }

      playlist.forEach(vid => {
        vid.parsedTracks = vid.tracks.map((t, index) => ({
          ...t,
          index: index,
          startSec: parseTimeToSeconds(t.time),
          currentCount: t.repeatCount
        }));
        for (let i = 0; i < vid.parsedTracks.length; i++) {
          vid.parsedTracks[i].endSec = (i < vid.parsedTracks.length - 1) ? vid.parsedTracks[i + 1].startSec : Infinity;
        }
      });

      const instance = {
        appIndex: appIndex,
        playlist: playlist,
        currentVideoIndex: 0,
        player: null,
        timer: null,
        currentTrackIndex: -1,
        currentLoop: 1
      };

      instances.push(instance);

      const appContainer = document.createElement('div');
      appContainer.className = 'yts-app';
      appContainer.id = `yts-app-${appIndex}`;
      
      const isMulti = playlist.length > 1;

      // 操作卓にレトロフィルター切替（yts-select-filter）を追加
      appContainer.innerHTML = `
        ${isMulti ? `
        <div class="yts-playlist-nav">
          <button class="yts-btn yts-btn-sm" id="yts-prev-vid-${appIndex}">◀ 前の動画</button>
          <select class="yts-select-video" id="yts-select-vid-${appIndex}"></select>
          <button class="yts-btn yts-btn-sm" id="yts-next-vid-${appIndex}">次の動画 ▶</button>
        </div>
        ` : ''}
        <div class="yts-player-wrapper">
          <div class="yts-embed-responsive" id="yts-embed-${appIndex}">
            <div id="yts-yt-player-${appIndex}"></div>
          </div>
        </div>
        <div class="yts-controls">
          <button class="yts-btn yts-btn-primary" id="yts-btn-preset-${appIndex}">プリセット</button>
          <button class="yts-btn" id="yts-btn-all1-${appIndex}">全曲1回</button>
          <button class="yts-btn yts-btn-danger" id="yts-btn-stop-${appIndex}">停止</button>
          <select class="yts-select yts-filter-select" id="yts-select-filter-${appIndex}">
            <option value="none">🎬 現代 (カラー)</option>
            <option value="bw">📷 昭和モノクロ</option>
            <option value="sepia">📜 昭和セピア</option>
            <option value="film">🎞️ 8mmフィルム</option>
          </select>
        </div>
        <table class="yts-table">
          <thead>
            <tr>
              <th style="width: 15%;">時間</th>
              <th style="width: 20%;">リピ回数</th>
              <th style="width: 15%;">n周目</th>
              <th>トラック名</th>
            </tr>
          </thead>
          <tbody id="yts-track-list-${appIndex}"></tbody>
        </table>
      `;

      jsonScript.parentNode.insertBefore(appContainer, jsonScript.nextSibling);

      if (isMulti) {
        setupPlaylistUI(instance);
      }

      renderTable(instance);
      bindEvents(instance);
    });
  });

  function setupPlaylistUI(inst) {
    const select = document.getElementById(`yts-select-vid-${inst.appIndex}`);
    if (!select) return;
    select.innerHTML = '';
    inst.playlist.forEach((v, idx) => {
      const opt = document.createElement('option');
      opt.value = idx;
      opt.textContent = `${idx + 1}. ${v.title || '動画 ' + (idx + 1)}`;
      select.appendChild(opt);
    });

    select.addEventListener('change', (e) => {
      switchVideo(inst, parseInt(e.target.value));
    });

    document.getElementById(`yts-prev-vid-${inst.appIndex}`).addEventListener('click', () => {
      if (inst.currentVideoIndex > 0) switchVideo(inst, inst.currentVideoIndex - 1);
    });
    document.getElementById(`yts-next-vid-${inst.appIndex}`).addEventListener('click', () => {
      if (inst.currentVideoIndex < inst.playlist.length - 1) switchVideo(inst, inst.currentVideoIndex + 1);
    });
  }

  function switchVideo(inst, newVideoIdx, autoPlay = true) {
    if (newVideoIdx < 0 || newVideoIdx >= inst.playlist.length) return;
    inst.currentVideoIndex = newVideoIdx;
    inst.currentTrackIndex = -1;
    inst.currentLoop = 1;

    const select = document.getElementById(`yts-select-vid-${inst.appIndex}`);
    if (select) select.value = newVideoIdx;

    renderTable(inst);

    const currentVid = inst.playlist[inst.currentVideoIndex];
    if (inst.player && typeof inst.player.loadVideoById === 'function') {
      const firstValidTrack = currentVid.parsedTracks.find(t => t.currentCount > 0);
      const startSec = firstValidTrack ? firstValidTrack.startSec : 0;
      
      if (autoPlay) {
        inst.player.loadVideoById(currentVid.videoId, startSec);
      } else {
        inst.player.cueVideoById(currentVid.videoId, startSec);
      }
    }
  }

  function getCurrentTracks(inst) {
    return inst.playlist[inst.currentVideoIndex].parsedTracks;
  }

  function renderTable(inst) {
    const tbody = document.getElementById(`yts-track-list-${inst.appIndex}`);
    if (!tbody) return;
    tbody.innerHTML = '';

    const tracks = getCurrentTracks(inst);

    tracks.forEach((track) => {
      const tr = document.createElement('tr');
      tr.id = `yts-track-row-${inst.appIndex}-${track.index}`;
      tr.className = 'yts-track-row';
      
      if (track.currentCount === 0) tr.classList.add('disabled');

      const tdTime = document.createElement('td');
      if (track.currentCount === 0) {
        tdTime.innerHTML = `<span class="yts-time-text">${track.time}</span>`;
      } else {
        tdTime.innerHTML = `<span class="yts-time-link" data-index="${track.index}">${track.time}</span>`;
      }

      const tdCount = document.createElement('td');
      const select = document.createElement('select');
      select.className = 'yts-select';
      for (let i = 0; i <= 5; i++) {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = `${i} 回`;
        if (i === track.currentCount) opt.selected = true;
        select.appendChild(opt);
      }
      select.addEventListener('change', (e) => updateRepeatCount(inst, track.index, parseInt(e.target.value)));
      tdCount.appendChild(select);

      const tdLoop = document.createElement('td');
      tdLoop.id = `yts-track-loop-${inst.appIndex}-${track.index}`;
      tdLoop.className = 'yts-loop-cell';
      tdLoop.textContent = '-';

      const tdTitle = document.createElement('td');
      tdTitle.textContent = track.title;

      tr.appendChild(tdTime);
      tr.appendChild(tdCount);
      tr.appendChild(tdLoop);
      tr.appendChild(tdTitle);
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll('.yts-time-link').forEach(el => {
      el.addEventListener('click', (e) => {
        const idx = parseInt(e.target.getAttribute('data-index'));
        jumpToTrack(inst, idx);
      });
    });

    updateRowHighlights(inst);
  }

  function bindEvents(inst) {
    document.getElementById(`yts-btn-preset-${inst.appIndex}`).addEventListener('click', () => resetToPreset(inst));
    document.getElementById(`yts-btn-all1-${inst.appIndex}`).addEventListener('click', () => setAllTo(inst, 1));
    document.getElementById(`yts-btn-stop-${inst.appIndex}`).addEventListener('click', () => emergencyStop(inst));

    // 昭和レトロフィルターの切り替えイベント処理
    const filterSelect = document.getElementById(`yts-select-filter-${inst.appIndex}`);
    const embedWrapper = document.getElementById(`yts-embed-${inst.appIndex}`);
    
    if (filterSelect && embedWrapper) {
      filterSelect.addEventListener('change', (e) => {
        embedWrapper.classList.remove('yts-filter-bw', 'yts-filter-sepia', 'yts-filter-film');
        if (e.target.value !== 'none') {
          embedWrapper.classList.add(`yts-filter-${e.target.value}`);
        }
      });
    }
  }

  window.onYouTubeIframeAPIReady = function() {
    instances.forEach((inst) => {
      const currentVid = inst.playlist[inst.currentVideoIndex];
      inst.player = new YT.Player(`yts-yt-player-${inst.appIndex}`, {
        videoId: currentVid.videoId,
        events: {
          'onReady': () => { 
            if (!inst.timer) inst.timer = setInterval(() => checkTimeLoop(inst), 100); 
          },
          'onStateChange': (e) => {
            if (e.data === YT.PlayerState.PLAYING) {
              const tracks = getCurrentTracks(inst);
              if (inst.player && typeof inst.player.getDuration === 'function') {
                const duration = inst.player.getDuration();
                if (duration > 0 && tracks.length > 0) {
                  tracks[tracks.length - 1].endSec = duration;
                }
              }
              syncCurrentTrackIndex(inst);
            }
          }
        }
      });
    });
  };

  function checkTimeLoop(inst) {
    if (!inst.player || typeof inst.player.getCurrentTime !== 'function') return;
    if (inst.player.getPlayerState && inst.player.getPlayerState() !== YT.PlayerState.PLAYING) return;

    const currentTime = inst.player.getCurrentTime();
    if (currentTime === undefined) return;

    const tracks = getCurrentTracks(inst);
    const trackIdx = tracks.findIndex(t => currentTime >= t.startSec && currentTime < t.endSec);

    if (trackIdx !== -1) {
      if (trackIdx !== inst.currentTrackIndex) {
        inst.currentTrackIndex = trackIdx;
        inst.currentLoop = 1;
        updateRowHighlights(inst);
      }

      const currentTrack = tracks[inst.currentTrackIndex];

      if (currentTrack.currentCount === 0) {
        skipToNextValidTrack(inst, inst.currentTrackIndex);
        return;
      }

      const isLastValidTrack = !hasNextValidTrack(inst, inst.currentTrackIndex + 1);

      if (currentTime >= currentTrack.endSec - 0.3) {
        if (inst.currentLoop < currentTrack.currentCount) {
          inst.currentLoop++;
          inst.player.seekTo(currentTrack.startSec, true);
          updateRowHighlights(inst);
        } else {
          if (!isLastValidTrack) {
            skipToNextValidTrack(inst, inst.currentTrackIndex + 1);
          } else {
            if (inst.currentVideoIndex < inst.playlist.length - 1) {
              switchVideo(inst, inst.currentVideoIndex + 1, true);
            }
          }
        }
      }
    }
  }

  function hasNextValidTrack(inst, startIndex) {
    const tracks = getCurrentTracks(inst);
    for (let i = startIndex; i < tracks.length; i++) {
      if (tracks[i].currentCount > 0) return true;
    }
    return false;
  }

  function skipToNextValidTrack(inst, startIndex) {
    const tracks = getCurrentTracks(inst);
    for (let i = startIndex; i < tracks.length; i++) {
      if (tracks[i].currentCount > 0) {
        jumpToTrack(inst, i);
        return;
      }
    }
  }

  function jumpToTrack(inst, index) {
    const tracks = getCurrentTracks(inst);
    if (index < 0 || index >= tracks.length) return;
    if (tracks[index].currentCount === 0) return;
    
    inst.currentTrackIndex = index;
    inst.currentLoop = 1;
    updateRowHighlights(inst);
    if (inst.player && typeof inst.player.seekTo === 'function') {
      inst.player.seekTo(tracks[index].startSec, true);
      inst.player.playVideo();
    }
  }

  function syncCurrentTrackIndex(inst) {
    if (!inst.player || typeof inst.player.getCurrentTime !== 'function') return;
    const currentTime = inst.player.getCurrentTime();
    const tracks = getCurrentTracks(inst);
    const idx = tracks.findIndex(t => currentTime >= t.startSec && currentTime < t.endSec);
    if (idx !== -1 && idx !== inst.currentTrackIndex) {
      inst.currentTrackIndex = idx;
      inst.currentLoop = 1;
      updateRowHighlights(inst);
    }
  }

  function updateRowHighlights(inst) {
    const tracks = getCurrentTracks(inst);
    tracks.forEach((t) => {
      const row = document.getElementById(`yts-track-row-${inst.appIndex}-${t.index}`);
      const loopCell = document.getElementById(`yts-track-loop-${inst.appIndex}-${t.index}`);
      if (!row) return;

      if (t.index === inst.currentTrackIndex) {
        row.classList.add('active');
        if (loopCell) {
          loopCell.textContent = t.currentCount > 0 ? `${inst.currentLoop}/${t.currentCount}` : '-';
        }
      } else {
        row.classList.remove('active');
        if (loopCell) {
          loopCell.textContent = '-';
        }
      }

      if (t.currentCount === 0) {
        row.classList.add('disabled');
      } else {
        row.classList.remove('disabled');
      }
    });
  }

  function updateRepeatCount(inst, index, newCount) {
    const tracks = getCurrentTracks(inst);
    tracks[index].currentCount = newCount;
    renderTable(inst);
    if (index === inst.currentTrackIndex && newCount === 0) {
      skipToNextValidTrack(inst, index + 1);
    }
  }

  function resetToPreset(inst) {
    const currentVid = inst.playlist[inst.currentVideoIndex];
    currentVid.parsedTracks.forEach((t, i) => { 
      t.currentCount = currentVid.tracks[i].repeatCount; 
    });
    renderTable(inst);
    if (inst.currentTrackIndex !== -1 && currentVid.parsedTracks[inst.currentTrackIndex].currentCount === 0) {
      skipToNextValidTrack(inst, inst.currentTrackIndex);
    }
  }

  function setAllTo(inst, count) {
    const tracks = getCurrentTracks(inst);
    tracks.forEach(t => t.currentCount = count);
    renderTable(inst);
  }

  function emergencyStop(inst) {
    if (inst.player && typeof inst.player.pauseVideo === 'function') {
      inst.player.pauseVideo();
    }
  }
})();
