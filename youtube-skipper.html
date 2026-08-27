(function() {
  // 1. YouTube Iframe API の自動読み込み
  let tag = document.createElement('script');
  tag.src = "https://www.youtube.com/iframe_api";
  let firstScriptTag = document.getElementsByTagName('script')[0];
  firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

  let player = null;
  let timer = null;
  let isAutoControlEnabled = true;
  let currentTrackIndex = -1;
  let currentLoop = 1;
  let tracks = [];
  let masterData = null;

  // 時間表記 ("0:00") を 秒数 に変換
  function parseTimeToSeconds(timeStr) {
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return 0;
  }

  // DOM生成 & 初期化
  document.addEventListener("DOMContentLoaded", function() {
    const jsonScript = document.querySelector('script.yts-config');
    if (!jsonScript) return;

    try {
      masterData = JSON.parse(jsonScript.textContent);
    } catch (e) {
      console.error("yts: JSONの読み込みに失敗しました:", e);
      return;
    }

    // 操作卓コンテナ作成
    const appContainer = document.createElement('div');
    appContainer.className = 'yts-app';
    
    // DOM構造を展開
    appContainer.innerHTML = `
      <h2 class="yts-title">${masterData.artist || ''} - 鑑賞卓</h2>
      <div class="yts-memo">${masterData.memo || ''}</div>
      <div class="yts-player-wrapper">
        <div class="yts-embed-responsive">
          <div id="yts-yt-player"></div>
        </div>
      </div>
      <div class="yts-controls">
        <button class="yts-btn yts-btn-primary" id="yts-btn-preset">プリセットに戻す</button>
        <button class="yts-btn" id="yts-btn-all1">全曲1回（標準）</button>
        <button class="yts-btn" id="yts-btn-toggle">自動制御: ON</button>
        <button class="yts-btn yts-btn-danger" id="yts-btn-stop">緊急停止</button>
      </div>
      <table class="yts-table">
        <thead>
          <tr>
            <th style="width: 15%;">時間</th>
            <th style="width: 25%;">再生回数</th>
            <th>曲名</th>
          </tr>
        </thead>
        <tbody id="yts-track-list"></tbody>
      </table>
    `;

    // JSONタグの直後に作成したコンテナを挿入
    jsonScript.parentNode.insertBefore(appContainer, jsonScript.nextSibling);

    initTracks();
    renderTable();
    bindEvents();
  });

  function initTracks() {
    tracks = masterData.tracks.map((t, index) => ({
      ...t,
      index: index,
      startSec: parseTimeToSeconds(t.time),
      currentCount: t.repeatCount
    }));

    for (let i = 0; i < tracks.length; i++) {
      tracks[i].endSec = (i < tracks.length - 1) ? tracks[i + 1].startSec : Infinity;
    }
  }

  function renderTable() {
    const tbody = document.getElementById('yts-track-list');
    if (!tbody) return;
    tbody.innerHTML = '';

    tracks.forEach((track) => {
      const tr = document.createElement('tr');
      tr.id = `yts-track-row-${track.index}`;
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
      select.addEventListener('change', (e) => updateRepeatCount(track.index, parseInt(e.target.value)));
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
        jumpToTrack(idx);
      });
    });
  }

  function bindEvents() {
    document.getElementById('yts-btn-preset').addEventListener('click', resetToPreset);
    document.getElementById('yts-btn-all1').addEventListener('click', () => setAllTo(1));
    document.getElementById('yts-btn-toggle').addEventListener('click', toggleAutoControl);
    document.getElementById('yts-btn-stop').addEventListener('click', emergencyStop);
  }

  // YouTube API Ready コールバック
  window.onYouTubeIframeAPIReady = function() {
    if (!masterData) return;
    player = new YT.Player('yts-yt-player', {
      videoId: masterData.videoId,
      events: {
        'onReady': () => { timer = setInterval(checkTimeLoop, 100); },
        'onStateChange': (e) => {
          if (e.data === YT.PlayerState.PLAYING) syncCurrentTrackIndex();
        }
      }
    });
  };

  function checkTimeLoop() {
    if (!player || !isAutoControlEnabled || typeof player.getCurrentTime !== 'function') return;
    const currentTime = player.getCurrentTime();
    if (currentTime === undefined) return;

    const trackIdx = tracks.findIndex(t => currentTime >= t.startSec && currentTime < t.endSec);

    if (trackIdx !== -1) {
      if (trackIdx !== currentTrackIndex) {
        currentTrackIndex = trackIdx;
        currentLoop = 1;
        updateRowHighlights();
      }

      const currentTrack = tracks[currentTrackIndex];

      if (currentTrack.currentCount === 0) {
        skipToNextValidTrack(currentTrackIndex);
        return;
      }

      if (currentTime >= currentTrack.endSec - 0.3) {
        if (currentLoop < currentTrack.currentCount) {
          currentLoop++;
          player.seekTo(currentTrack.startSec, true);
        } else {
          skipToNextValidTrack(currentTrackIndex + 1);
        }
      }
    }
  }

  function skipToNextValidTrack(startIndex) {
    for (let i = startIndex; i < tracks.length; i++) {
      if (tracks[i].currentCount > 0) {
        jumpToTrack(i);
        return;
      }
    }
    player.pauseVideo();
  }

  function jumpToTrack(index) {
    if (index < 0 || index >= tracks.length) return;
    currentTrackIndex = index;
    currentLoop = 1;
    updateRowHighlights();
    if (player && typeof player.seekTo === 'function') {
      player.seekTo(tracks[index].startSec, true);
      player.playVideo();
    }
  }

  function syncCurrentTrackIndex() {
    if (!player || typeof player.getCurrentTime !== 'function') return;
    const currentTime = player.getCurrentTime();
    const idx = tracks.findIndex(t => currentTime >= t.startSec && currentTime < t.endSec);
    if (idx !== -1 && idx !== currentTrackIndex) {
      currentTrackIndex = idx;
      currentLoop = 1;
      updateRowHighlights();
    }
  }

  function updateRowHighlights() {
    tracks.forEach((t) => {
      const row = document.getElementById(`yts-track-row-${t.index}`);
      if (!row) return;

      if (t.index === currentTrackIndex) {
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

  function updateRepeatCount(index, newCount) {
    tracks[index].currentCount = newCount;
    updateRowHighlights();
    if (index === currentTrackIndex && newCount === 0) {
      skipToNextValidTrack(index + 1);
    }
  }

  function resetToPreset() {
    tracks.forEach((t, i) => { t.currentCount = masterData.tracks[i].repeatCount; });
    renderTable();
    updateRowHighlights();
    if (currentTrackIndex !== -1 && tracks[currentTrackIndex].currentCount === 0) {
      skipToNextValidTrack(currentTrackIndex);
    }
  }

  function setAllTo(count) {
    tracks.forEach(t => t.currentCount = count);
    renderTable();
    updateRowHighlights();
  }

  function toggleAutoControl() {
    isAutoControlEnabled = !isAutoControlEnabled;
    const btn = document.getElementById('yts-btn-toggle');
    btn.textContent = `自動制御: ${isAutoControlEnabled ? 'ON' : 'OFF'}`;
  }

  function emergencyStop() {
    if (timer) clearInterval(timer);
    isAutoControlEnabled = false;
    if (player && typeof player.pauseVideo === 'function') {
      player.pauseVideo();
    }
    document.getElementById('yts-btn-toggle').textContent = '自動制御: OFF';
    alert('自動制御を停止しました。');
  }
})();
