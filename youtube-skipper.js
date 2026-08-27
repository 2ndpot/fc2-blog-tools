(function() {
  // 1. YouTube Iframe API の自動読み込み
  let tag = document.createElement('script');
  tag.src = "https://www.youtube.com/iframe_api";
  let firstScriptTag = document.getElementsByTagName('script')[0];
  firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

  // 複数プレイヤー管理用
  let instances = [];

  // 時間表記 ("0:00") を 秒数 に変換
  function parseTimeToSeconds(timeStr) {
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return 0;
  }

  // DOM生成 & 初期化
  document.addEventListener("DOMContentLoaded", function() {
    const jsonScripts = document.querySelectorAll('script.yts-config');
    if (jsonScripts.length === 0) return;

    jsonScripts.forEach((jsonScript, appIndex) => {
      let masterData = null;
      try {
        masterData = JSON.parse(jsonScript.textContent);
      } catch (e) {
        console.error(`yts[${appIndex}]: JSONの読み込みに失敗しました:`, e);
        return;
      }

      const instance = {
        appIndex: appIndex,
        masterData: masterData,
        player: null,
        timer: null,
        currentTrackIndex: -1,
        currentLoop: 1,
        tracks: []
      };

      instances.push(instance);

      // トラックデータ初期化
      instance.tracks = masterData.tracks.map((t, index) => ({
        ...t,
        index: index,
        startSec: parseTimeToSeconds(t.time),
        currentCount: t.repeatCount
      }));

      for (let i = 0; i < instance.tracks.length; i++) {
        instance.tracks[i].endSec = (i < instance.tracks.length - 1) ? instance.tracks[i + 1].startSec : Infinity;
      }

      // DOM構築
      const appContainer = document.createElement('div');
      appContainer.className = 'yts-app';
      appContainer.id = `yts-app-${appIndex}`;
      
      appContainer.innerHTML = `
        <div class="yts-player-wrapper">
          <div class="yts-embed-responsive">
            <div id="yts-yt-player-${appIndex}"></div>
          </div>
        </div>
        <div class="yts-controls">
          <button class="yts-btn yts-btn-primary" id="yts-btn-preset-${appIndex}">プリセット</button>
          <button class="yts-btn" id="yts-btn-all1-${appIndex}">全曲1回</button>
          <button class="yts-btn yts-btn-danger" id="yts-btn-stop-${appIndex}">停止</button>
        </div>
        <table class="yts-table">
          <thead>
            <tr>
              <th style="width: 15%;">時間</th>
              <th style="width: 25%;">再生回数</th>
              <th>曲名</th>
            </tr>
          </thead>
          <tbody id="yts-track-list-${appIndex}"></tbody>
        </table>
      `;

      jsonScript.parentNode.insertBefore(appContainer, jsonScript.nextSibling);

      renderTable(instance);
      bindEvents(instance);
    });
  });

  function renderTable(inst) {
    const tbody = document.getElementById(`yts-track-list-${inst.appIndex}`);
    if (!tbody) return;
    tbody.innerHTML = '';

    inst.tracks.forEach((track) => {
      const tr = document.createElement('tr');
      tr.id = `yts-track-row-${inst.appIndex}-${track.index}`;
      tr.className = 'yts-track-row';
      
      if (track.currentCount === 0) tr.classList.add('disabled');

      const tdTime = document.createElement('td');
      tdTime.innerHTML = `<span class="yts-time-link" data-index="${track.index}">${track.time}</span>`;

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

      const tdTitle = document.createElement('td');
      tdTitle.textContent = track.title;

      tr.appendChild(tdTime);
      tr.appendChild(tdCount);
      tr.appendChild(tdTitle);
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll('.yts-time-link').forEach(el => {
      el.addEventListener('click', (e) => {
        const idx = parseInt(e.target.getAttribute('data-index'));
        jumpToTrack(inst, idx);
      });
    });
  }

  function bindEvents(inst) {
    document.getElementById(`yts-btn-preset-${inst.appIndex}`).addEventListener('click', () => resetToPreset(inst));
    document.getElementById(`yts-btn-all1-${inst.appIndex}`).addEventListener('click', () => setAllTo(inst, 1));
    document.getElementById(`yts-btn-stop-${inst.appIndex}`).addEventListener('click', () => emergencyStop(inst));
  }

  // YouTube Iframe API 準備完了時
  window.onYouTubeIframeAPIReady = function() {
    instances.forEach((inst) => {
      inst.player = new YT.Player(`yts-yt-player-${inst.appIndex}`, {
        videoId: inst.masterData.videoId,
        events: {
          'onReady': () => { 
            if (!inst.timer) inst.timer = setInterval(() => checkTimeLoop(inst), 100); 
          },
          'onStateChange': (e) => {
            if (e.data === YT.PlayerState.PLAYING) {
              if (inst.player && typeof inst.player.getDuration === 'function') {
                const duration = inst.player.getDuration();
                if (duration > 0 && inst.tracks.length > 0) {
                  inst.tracks[inst.tracks.length - 1].endSec = duration;
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

    const trackIdx = inst.tracks.findIndex(t => currentTime >= t.startSec && currentTime < t.endSec);

    if (trackIdx !== -1) {
      if (trackIdx !== inst.currentTrackIndex) {
        inst.currentTrackIndex = trackIdx;
        inst.currentLoop = 1;
        updateRowHighlights(inst);
      }

      const currentTrack = inst.tracks[inst.currentTrackIndex];

      if (currentTrack.currentCount === 0) {
        skipToNextValidTrack(inst, inst.currentTrackIndex);
        return;
      }

      if (currentTime >= currentTrack.endSec - 0.3) {
        if (inst.currentLoop < currentTrack.currentCount) {
          inst.currentLoop++;
          inst.player.seekTo(currentTrack.startSec, true);
        } else {
          skipToNextValidTrack(inst, inst.currentTrackIndex + 1);
        }
      }
    }
  }

  function skipToNextValidTrack(inst, startIndex) {
    for (let i = startIndex; i < inst.tracks.length; i++) {
      if (inst.tracks[i].currentCount > 0) {
        jumpToTrack(inst, i);
        return;
      }
    }
    inst.player.pauseVideo();
  }

  function jumpToTrack(inst, index) {
    if (index < 0 || index >= inst.tracks.length) return;
    
    inst.currentTrackIndex = index;
    inst.currentLoop = 1;
    updateRowHighlights(inst);
    if (inst.player && typeof inst.player.seekTo === 'function') {
      inst.player.seekTo(inst.tracks[index].startSec, true);
      inst.player.playVideo();
    }
  }

  function syncCurrentTrackIndex(inst) {
    if (!inst.player || typeof inst.player.getCurrentTime !== 'function') return;
    const currentTime = inst.player.getCurrentTime();
    const idx = inst.tracks.findIndex(t => currentTime >= t.startSec && currentTime < t.endSec);
    if (idx !== -1 && idx !== inst.currentTrackIndex) {
      inst.currentTrackIndex = idx;
      inst.currentLoop = 1;
      updateRowHighlights(inst);
    }
  }

  function updateRowHighlights(inst) {
    inst.tracks.forEach((t) => {
      const row = document.getElementById(`yts-track-row-${inst.appIndex}-${t.index}`);
      if (!row) return;

      if (t.index === inst.currentTrackIndex) {
        row.classList.add('active');
      } else {
        row.classList.remove('active');
      }

      if (t.currentCount === 0) {
        row.classList.add('disabled');
      } else {
        row.classList.remove('disabled');
      }
    });
  }

  function updateRepeatCount(inst, index, newCount) {
    inst.tracks[index].currentCount = newCount;
    updateRowHighlights(inst);
    if (index === inst.currentTrackIndex && newCount === 0) {
      skipToNextValidTrack(inst, index + 1);
    }
  }

  function resetToPreset(inst) {
    inst.tracks.forEach((t, i) => { t.currentCount = inst.masterData.tracks[i].repeatCount; });
    renderTable(inst);
    updateRowHighlights(inst);
    if (inst.currentTrackIndex !== -1 && inst.tracks[inst.currentTrackIndex].currentCount === 0) {
      skipToNextValidTrack(inst, inst.currentTrackIndex);
    }
  }

  function setAllTo(inst, count) {
    inst.tracks.forEach(t => t.currentCount = count);
    renderTable(inst);
    updateRowHighlights(inst);
  }

  function emergencyStop(inst) {
    if (inst.player && typeof inst.player.pauseVideo === 'function') {
      inst.player.pauseVideo();
    }
  }
})();
