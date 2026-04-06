(function () {
  const userId = localStorage.getItem("userId");
  const storyFileInput = document.getElementById("storyFileInput");
  let currentStoryMedia = null;
  let storiesData = [];
  let currentStoryIndex = 0;
  let storyTimer = null; // For story progression
  let activeStoriesForViewer = []; // Track currently viewing stories

  // Music related variables
  let currentStoryMusic = null; // { source: "youtube" | "pixabay", id, title, thumbnail, audioUrl, startTime }
  let currentMusicPreviewPlayer = null; // Holds YouTube iframe or Audio element for preview
  let currentMusicPreviewPlayerType = null; // 'youtube' or 'pixabay'
  let currentStoryMusicPlayer = null; // Holds YouTube iframe or Audio element for story playback
  let storyMusicStopTimeout = null; // Timeout for stopping story music

  let trimPreviewAudioPlayer = null; // For playing the trimmed segment
  let trimPreviewStopTimeout = null; // Timeout for stopping trim preview

  const SEGMENT_DURATION = 20; // Fixed 20-second segment
  let musicPreviewVolume = 0.5;
  let musicSearchTimer;

  storyFileInput.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      currentStoryMedia = {
        data: ev.target.result,
        type: file.type.startsWith("video") ? "video" : "image",
      };
      openStoryEditor();
      storyFileInput.value = "";
    };
    reader.readAsDataURL(file);
  };

  function openStoryEditor() {
    const modal = document.getElementById("storyEditorModal");
    const preview = document.getElementById("storyMediaPreview");
    preview.innerHTML =
      currentStoryMedia.type === "video"
        ? `<video src="${currentStoryMedia.data}" autoplay muted loop controls></video>`
        : `<img src="${currentStoryMedia.data}">`;
    modal.style.display = "flex";
    updateSelectedMusicDisplay(); // Update music display in editor
  }

  window.closeStoryEditor = () => {
    document.getElementById("storyEditorModal").style.display = "none";
    currentStoryMedia = null;
    storyFileInput.value = "";
  };

  window.publishStory = async () => {
    if (!currentStoryMedia) return;
    const res = await fetch("/uploadStory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        media: currentStoryMedia.data,
        type: currentStoryMedia.type,
        overlays: [],
        music: currentStoryMusic
          ? { ...currentStoryMusic, duration: SEGMENT_DURATION }
          : null,
      }),
    });
    const data = await res.json();
    if (data.success) {
      closeStoryEditor();
      showPopup("Story Added!");
      socket.emit("newStory", { userId });
      loadStories();
    }
  };

  async function loadStories() {
    const res = await fetch(`/getStories/${userId}`);
    const data = await res.json();
    if (!data.success) return;
    storiesData = data.stories;
    renderStoryTray();
  }

  function renderStoryTray() {
    const tray = document.getElementById("storyTray");
    if (!tray) return;
    tray.innerHTML = "";

    // 1. Handle "Your Story" item first
    const myStories = storiesData.filter((s) => s.user_id == userId);
    const hasMyStories = myStories.length > 0;
    const myAvatar =
      localStorage.getItem("userAvatar") ||
      document.getElementById("profileBtn")?.src ||
      getAvatarSrc(userId);

    const myItem = document.createElement("div");
    myItem.className = "story-item my-story-card";

    myItem.innerHTML = `
            <div class="story-circle ${hasMyStories ? "" : "no-ring"}">
                <img src="${myAvatar}">
                <div class="add-story-overlay"><i class="fa-solid fa-plus"></i></div>
            </div>
            <div class="story-user-name">Your Story</div>
        `;

    myItem.onclick = () => {
      if (hasMyStories) openStoryViewer(userId);
      else storyFileInput.click();
    };

    const plusBtn = myItem.querySelector(".add-story-overlay");
    plusBtn.onclick = (e) => {
      e.stopPropagation();
      storyFileInput.click();
    };

    tray.appendChild(myItem);

    // 2. Group and render other users' stories
    const usersWithStories = {};
    storiesData.forEach((s) => {
      if (s.user_id == userId) return; // Skip self as handled above
      if (!usersWithStories[s.user_id]) {
        usersWithStories[s.user_id] = {
          name: s.name,
          avatar: s.avatar,
          stories: [],
        };
      }
      usersWithStories[s.user_id].stories.push(s);
    });

    Object.keys(usersWithStories).forEach((uid) => {
      const user = usersWithStories[uid];
      const item = document.createElement("div");
      item.className = "story-item";
      item.onclick = () => openStoryViewer(uid);
      item.innerHTML = `
                <div class="story-circle">
                    <img src="${user.avatar || getAvatarSrc(uid)}">
                </div>
                <div class="story-user-name">${user.name}</div>
            `;
      tray.appendChild(item);
    });
  }

  function openStoryViewer(selectedUserId) {
    const userStories = storiesData.filter((s) => s.user_id == selectedUserId);
    if (userStories.length === 0) return;

    activeStoriesForViewer = userStories;
    currentStoryIndex = 0;
    const modal = document.getElementById("storyViewerModal");
    modal.style.display = "flex";
    displayStory();
  }

  function displayStory() {
    const userStories = activeStoriesForViewer;
    const story = userStories[currentStoryIndex];
    const viewer = document.getElementById("storyViewerMedia");
    const avatar = document.getElementById("storyUserAvatar");
    const name = document.getElementById("storyUserName");
    const delBtn = document.getElementById("deleteStoryBtn");
    const timeEl = document.getElementById("storyTime");

    cancelAnimationFrame(storyTimer);
    avatar.src = story.avatar || getAvatarSrc(story.user_id);
    name.textContent = story.name;
    avatar.dataset.uid = story.user_id;
    timeEl.textContent = timeAgo(story.created_at);
    delBtn.style.display = story.user_id == userId ? "block" : "none";
    delBtn.onclick = () => deleteStory(story.id);

    viewer.innerHTML =
      story.type === "video"
        ? `<video id="viewerVideo" src="${story.media}" autoplay muted></video>`
        : `<img src="${story.media}">`;

    // Progress bars
    const progress = document.getElementById("storyProgress");
    progress.innerHTML = activeStoriesForViewer
      .map(
        (_, i) => `
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${i < currentStoryIndex ? "100%" : "0%"}"></div>
            </div>
        `,
      )
      .join("");

    const currentFill =
      progress.children[currentStoryIndex].querySelector(".progress-fill");

    let start = null;
    let storyDuration = 20000; // Default 20s for images

    function step(timestamp) {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      currentFill.style.width =
        Math.min((elapsed / storyDuration) * 100, 100) + "%";
      if (elapsed < storyDuration) {
        storyTimer = requestAnimationFrame(step);
      } else {
        nextStory();
      }
    }

    if (story.type === "video") {
      const video = document.getElementById("viewerVideo");
      video.onloadedmetadata = () => {
        storyDuration = video.duration * 1000;
        storyTimer = requestAnimationFrame(step);
      };
      if (video.readyState >= 1) {
        storyDuration = video.duration * 1000;
        storyTimer = requestAnimationFrame(step);
      }
    } else {
      storyTimer = requestAnimationFrame(step);
    }

    // Handle music playback
    playStoryMusic(
      story.music ? JSON.parse(story.music) : null,
      story.type === "video",
    );
  }

  window.nextStory = () => {
    if (currentStoryIndex < activeStoriesForViewer.length - 1) {
      currentStoryIndex++;
      displayStory();
    } else {
      closeStoryViewer();
    }
  };

  window.prevStory = () => {
    if (currentStoryIndex > 0) {
      currentStoryIndex--;
      displayStory();
    } else {
      displayStory();
    }
  };

  window.closeStoryViewer = () => {
    cancelAnimationFrame(storyTimer);
    stopStoryMusicPlayback();
    document.getElementById("storyViewerModal").style.display = "none";
    activeStoriesForViewer = [];
  };

  async function deleteStory(storyId) {
    if (!confirm("Delete this story?")) return;
    const res = await fetch("/deleteStory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storyId, userId }),
    });
    if (res.ok) {
      closeStoryViewer();
      socket.emit("newStory", { userId });
      loadStories();
    }
  }

  // ================= MUSIC PICKER LOGIC =================
  window.openMusicPicker = () => {
    document.getElementById("musicPickerModal").style.display = "flex";
    document.getElementById("musicSearchInput").value = "";
    document.getElementById("musicResultsList").innerHTML =
      '<p style="text-align:center; color:#888;">Search for songs or browse trending tracks.</p>';
    document.getElementById("musicPreviewPlayer").style.display = "none";
    document.getElementById("musicTrimmer").style.display = "none";
    document.getElementById("confirmMusicSelectionBtn").style.display = "none";
    stopMusicPreview();
    // Optionally load trending/free tracks from Pixabay initially
    searchMusic(""); // Empty query to get trending/default
  };

  window.closeMusicPicker = () => {
    document.getElementById("musicPickerModal").style.display = "none";
    document.getElementById("musicTrimmer").style.display = "none";
    stopMusicPreview();
  };

  document.getElementById("musicSearchInput").oninput = (e) => {
    const query = e.target.value.trim();
    clearTimeout(musicSearchTimer);
    musicSearchTimer = setTimeout(() => searchMusic(query), 500); // Debounce
  };

  async function searchMusic(query) {
    const resultsList = document.getElementById("musicResultsList");

    // ✅ Prevent empty query (MAIN FIX)
    if (!query || query.trim() === "") {
      resultsList.innerHTML =
        '<p style="text-align:center; color:#888;">Type to search music...</p>';
      return;
    }

    // ✅ Debounce (prevents spam API calls)
    clearTimeout(musicSearchTimer);
    musicSearchTimer = setTimeout(async () => {
      resultsList.innerHTML =
        '<p style="text-align:center; color:#888;">Searching...</p>';
      document.getElementById("musicTrimmer").style.display = "none";
      document.getElementById("confirmMusicSelectionBtn").style.display =
        "none";
      stopMusicPreview();

      try {
        const res = await fetch(
          `/searchSongs?query=${encodeURIComponent(query)}`,
        );
        const data = await res.json();

        if (!data.success || !data.songs || data.songs.length === 0) {
          resultsList.innerHTML =
            '<p style="text-align:center; color:#888;">No songs found.</p>';
          return;
        }

        resultsList.innerHTML = "";

        data.songs.forEach((song) => {
          const item = document.createElement("div");
          item.className = "music-result-item"; 
          item.style.cssText = `
                    display:flex;
                    align-items:center;
                    gap:10px;
                    padding:10px;
                    border-bottom:1px solid #333;
                    cursor:pointer;
                `;

          // ✅ SAFE dataset (FIX JSON ERROR BUG)
          item.innerHTML = `
                    <div style="width: 40px; height: 40px; border-radius: 4px; overflow: hidden;">
                        <img src="${song.thumbnail || "/images/music_placeholder.png"}" 
                             style="width:100%; height:100%; object-fit:cover;">
                    </div>

                    <div style="flex-grow: 1;">
                        <div style="font-size: 14px; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                            ${song.title}
                        </div>
                        <div style="font-size: 12px; color: #aaa;">
                            ${song.source === "youtube" ? "YouTube" : "Pixabay"}
                        </div>
                    </div>

                    <button class="play-preview-btn" 
                        style="background:none; border:none; color:#ffcc00; font-size:18px; cursor:pointer;">
                        <i class="fa-solid fa-play"></i>
                    </button>
                `;

          item.onclick = () => {
            playMusicPreview(song);
            setupMusicTrimmer(song);
            document.getElementById("confirmMusicSelectionBtn").style.display =
              "block";
          };

          resultsList.appendChild(item);
        });
      } catch (err) {
        console.error("Music search error:", err);
        resultsList.innerHTML =
          '<p style="text-align:center; color:red;">Error loading songs</p>';
      }
    }, 300); // ✅ debounce delay
  }

  function playMusicPreview(song) {
    stopMusicPreview();

    const previewPlayerContainer =
      document.getElementById("musicPreviewPlayer");
    const previewThumbnail = document
      .getElementById("musicPreviewThumbnail")
      .querySelector("img");
    const previewTitle = document.getElementById("musicPreviewTitle");
    const previewSource = document.getElementById("musicPreviewSource");
    const playPauseBtn = document.getElementById("musicPreviewPlayPause");
    const volumeSlider = document.getElementById("musicPreviewVolume");
    const musicTrimmer = document.getElementById("musicTrimmer");

    previewThumbnail.src = song.thumbnail || "/images/music_placeholder.png";
    previewTitle.textContent = song.title;
    previewSource.textContent =
      // Use song.source directly, not currentMusicPreviewPlayerType
      song.source === "youtube" ? "YouTube" : "Pixabay";
    playPauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
    volumeSlider.value = musicPreviewVolume;

    if (song.source === "youtube") {
      const iframe = document.createElement("iframe");
      iframe.width = "0"; // Hidden
      iframe.height = "0"; // Hidden
      iframe.src = `https://www.youtube.com/embed/${song.id}?autoplay=1&controls=0&modestbranding=1&rel=0&enablejsapi=1`;
      iframe.allow = "autoplay";
      iframe.style.position = "absolute"; // Hide it completely
      iframe.style.left = "-9999px";
      iframe.style.top = "-9999px";
      document.body.appendChild(iframe);
      currentMusicPreviewPlayer = iframe; // Store iframe reference

      iframe.onload = () => {
        iframe.contentWindow.postMessage(
          `{"event":"command","func":"setVolume","args":[${musicPreviewVolume * 100}]}`,
          "*",
        );
      };
      currentMusicPreviewPlayerType = "youtube";
    } else if (song.source === "pixabay") {
      const audio = document.createElement("audio");
      audio.src = song.audioUrl;
      audio.autoplay = true;
      audio.controls = false;
      audio.volume = musicPreviewVolume;
      audio.loop = false; // Don't loop for full preview
      document.body.appendChild(audio);
      currentMusicPreviewPlayer = audio;
    }

    previewPlayerContainer.style.display = "flex";

    playPauseBtn.onclick = () => {
      if (currentMusicPreviewPlayer) {
        if (
          currentMusicPreviewPlayer.paused ||
          currentMusicPreviewPlayer.src.includes("paused")
        ) {
          if (currentMusicPreviewPlayer.play) currentMusicPreviewPlayer.play();
          else if (currentMusicPreviewPlayer.contentWindow)
            currentMusicPreviewPlayer.contentWindow.postMessage(
              '{"event":"command","func":"playVideo","args":""}',
              "*",
            );
          playPauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
        } else {
          if (currentMusicPreviewPlayer.pause)
            currentMusicPreviewPlayer.pause();
          else if (currentMusicPreviewPlayer.contentWindow)
            currentMusicPreviewPlayer.contentWindow.postMessage(
              '{"event":"command","func":"pauseVideo","args":""}',
              "*",
            );
          playPauseBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
        }
      }
    };

    volumeSlider.oninput = (e) => {
      musicPreviewVolume = parseFloat(e.target.value);
      if (currentMusicPreviewPlayer) {
        if (currentMusicPreviewPlayer.volume !== undefined)
          currentMusicPreviewPlayer.volume = musicPreviewVolume;
        else if (currentMusicPreviewPlayer.contentWindow) {
          currentMusicPreviewPlayer.contentWindow.postMessage(
            `{"event":"command","func":"setVolume","args":[${musicPreviewVolume * 100}]}`,
            "*",
          );
        }
      }
    };
  }

  function stopMusicPreview() {
    if (currentMusicPreviewPlayer) {
      if (currentMusicPreviewPlayer.pause) currentMusicPreviewPlayer.pause();
      else if (currentMusicPreviewPlayer.contentWindow)
        currentMusicPreviewPlayer.contentWindow.postMessage(
          '{"event":"command","func":"stopVideo","args":""}',
          "*",
        );
      currentMusicPreviewPlayer.remove();
      currentMusicPreviewPlayer = null;
      currentMusicPreviewPlayerType = null;
    }
    document.getElementById("musicPreviewPlayer").style.display = "none";
    document.getElementById("musicPreviewPlayPause").innerHTML =
      '<i class="fa-solid fa-play"></i>';
  }

  // Music Trimmer Logic
  const musicTrimmer = document.getElementById("musicTrimmer");
  const segmentSlider = document.getElementById("segmentSlider");
  const segmentHandleLeft = document.getElementById("segmentHandleLeft");
  const segmentHandleRight = document.getElementById("segmentHandleRight");
  const segmentStartTimeEl = document.getElementById("segmentStartTime");
  const segmentEndTimeEl = document.getElementById("segmentEndTime");
  const segmentTotalDurationEl = document.getElementById(
    "segmentTotalDuration",
  );
  const trimPreviewPlayPauseBtn = document.getElementById(
    "trimPreviewPlayPause",
  );
  const trimResetBtn = document.getElementById("trimResetBtn");

  let currentSongDuration = 0; // Total duration of the selected song
  let currentSegmentStartTime = 0; // Start time of the 20-second segment

  function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  }

  function setupMusicTrimmer(song) {
    stopMusicPreview(); // Stop full song preview
    musicTrimmer.style.display = "flex";
    document.getElementById("musicPreviewPlayer").style.display = "block"; // Ensure player is visible

    currentStoryMusic = {
      source: song.source,
      id: song.id,
      title: song.title,
      thumbnail: song.thumbnail,
      audioUrl: song.audioUrl,
      startTime: 0, // Default start time
      duration: SEGMENT_DURATION,
    };

    currentSongDuration = song.duration || 180; // Use actual duration or default to 3 minutes
    if (currentSongDuration < SEGMENT_DURATION) {
      currentSongDuration = SEGMENT_DURATION; // Ensure minimum duration for segment
    }

    currentSegmentStartTime = 0;
    updateTrimmerUI();
    segmentTotalDurationEl.textContent = formatTime(currentSongDuration);

    // Reset trim preview player
    if (trimPreviewAudioPlayer) {
      trimPreviewAudioPlayer.pause();
      trimPreviewAudioPlayer.remove();
      trimPreviewAudioPlayer = null;
    }
  }

  function updateTrimmerUI() {
    const sliderWidth = segmentSlider.parentElement.offsetWidth;
    const segmentWidth = (SEGMENT_DURATION / currentSongDuration) * sliderWidth;
    const leftPosition =
      (currentSegmentStartTime / currentSongDuration) * sliderWidth;

    segmentSlider.style.width = `${segmentWidth}px`;
    segmentSlider.style.left = `${leftPosition}px`;

    segmentStartTimeEl.textContent = formatTime(currentSegmentStartTime);
    segmentEndTimeEl.textContent = formatTime(
      currentSegmentStartTime + SEGMENT_DURATION,
    );

    currentStoryMusic.startTime = currentSegmentStartTime; // Update the music object
  }

  let isDraggingSlider = false;
  let dragStartX = 0;
  let sliderStartLeft = 0;

  segmentSlider.onmousedown = (e) => {
    isDraggingSlider = true;
    dragStartX = e.clientX;
    sliderStartLeft = segmentSlider.offsetLeft;
    segmentSlider.style.cursor = "grabbing";
  };

  document.onmousemove = (e) => {
    if (!isDraggingSlider) return;
    const dx = e.clientX - dragStartX;
    let newLeft = sliderStartLeft + dx;

    const sliderParentWidth = segmentSlider.parentElement.offsetWidth;
    const segmentWidth = segmentSlider.offsetWidth;

    // Clamp newLeft within bounds
    if (newLeft < 0) newLeft = 0;
    if (newLeft + segmentWidth > sliderParentWidth)
      newLeft = sliderParentWidth - segmentWidth;

    currentSegmentStartTime =
      (newLeft / sliderParentWidth) * currentSongDuration;
    updateTrimmerUI();
  };

  document.onmouseup = () => {
    isDraggingSlider = false;
    segmentSlider.style.cursor = "grab";
    stopTrimPreview(); // Stop any ongoing trim preview
  };

  trimPreviewPlayPauseBtn.onclick = () => {
    playTrimPreview(
      currentStoryMusic,
      currentSegmentStartTime,
      SEGMENT_DURATION,
    );
  };

  trimResetBtn.onclick = () => {
    currentSegmentStartTime = 0;
    updateTrimmerUI();
    stopTrimPreview();
  };

  document.getElementById("confirmMusicSelectionBtn").onclick = () => {
    // currentStoryMusic is already set by playMusicPreview
    updateSelectedMusicDisplay();
    closeMusicPicker();
  };

  function updateSelectedMusicDisplay() {
    stopMusicPreview(); // Ensure preview player is stopped
    const display = document.getElementById("selectedMusicDisplay");
    if (currentStoryMusic) {
      document.getElementById("selectedMusicThumbnail").src =
        currentStoryMusic.thumbnail || "/images/music_placeholder.png";
      document.getElementById("selectedMusicTitle").textContent =
        currentStoryMusic.title;
      document.getElementById("selectedMusicSource").textContent =
        currentStoryMusic.source === "youtube" ? "YouTube" : "Pixabay";
      display.style.display = "flex";
      musicTrimmer.style.display = "none"; // Hide trimmer once confirmed
    } else {
      display.style.display = "none";
    }
  }

  window.removeSelectedMusic = () => {
    currentStoryMusic = null;
    updateSelectedMusicDisplay();
  };

  function playStoryMusic(musicMetadata, isVideoStory) {
    stopStoryMusicPlayback();

    if (!musicMetadata || !musicMetadata.id) {
      // Ensure volume is restored if muted for previous video
      const viewerVideo = document.getElementById("viewerVideo");
      if (viewerVideo) viewerVideo.muted = false;
      return;
    }

    if (musicMetadata.source === "youtube") {
      const iframe = document.createElement("iframe");
      const startTime = musicMetadata.startTime || 0;
      iframe.width = "0"; // Hidden
      iframe.height = "0";
      iframe.src = `https://www.youtube.com/embed/${musicMetadata.id}?autoplay=1&controls=0&modestbranding=1&rel=0&enablejsapi=1&start=${startTime}`;
      iframe.allow = "autoplay";
      iframe.style.position = "absolute";
      iframe.style.left = "-9999px";
      iframe.style.top = "-9999px";
      
      iframe.onload = () => {
        // Explicit seek to ensure accurate start
        iframe.contentWindow.postMessage(
          `{"event":"command","func":"seekTo","args":[${startTime}, true]}`,
          "*"
        );
      };

      document.body.appendChild(iframe);
      currentStoryMusicPlayer = iframe;
    } else if (musicMetadata.source === "pixabay") {
      const audio = document.createElement("audio");
      audio.src = musicMetadata.audioUrl;
      audio.autoplay = true;
      audio.controls = false;
      audio.loop = false;
      
      // Ensure playback starts from the exact segment
      audio.oncanplay = () => {
        audio.currentTime = musicMetadata.startTime || 0;
        audio.play();
      };

      document.body.appendChild(audio);
      currentStoryMusicPlayer = audio;
    }

    // Enforce strict 20s (or specified duration) hard stop
    const stopDuration = musicMetadata.duration || 20;
    storyMusicStopTimeout = setTimeout(() => {
      stopStoryMusicPlayback();
    }, stopDuration * 1000);

    // If it's a video story, mute the story video to hear the music
    if (isVideoStory) {
      const viewerVideo = document.getElementById("viewerVideo");
      if (viewerVideo) viewerVideo.muted = true;
    }
  }

  function playTrimPreview(song, startTime, duration) {
    stopTrimPreview();

    if (song.source === "youtube") {
      const iframe = document.createElement("iframe");
      iframe.width = "0";
      iframe.height = "0";
      iframe.src = `https://www.youtube.com/embed/${song.id}?autoplay=1&controls=0&modestbranding=1&rel=0&enablejsapi=1&start=${startTime}`;
      iframe.allow = "autoplay";
      iframe.style.position = "absolute";
      iframe.style.left = "-9999px";
      iframe.style.top = "-9999px";
      document.body.appendChild(iframe);
      
      iframe.onload = () => {
        iframe.contentWindow.postMessage(
          `{"event":"command","func":"seekTo","args":[${startTime}, true]}`,
          "*"
        );
      };

      trimPreviewAudioPlayer = iframe;
    } else if (song.source === "pixabay") {
      const audio = document.createElement("audio");
      audio.src = song.audioUrl;
      audio.autoplay = true;
      audio.controls = false;
      audio.oncanplay = () => {
        audio.currentTime = startTime;
        audio.play();
      };
      document.body.appendChild(audio);
      trimPreviewAudioPlayer = audio;
    }

    trimPreviewStopTimeout = setTimeout(() => {
      stopTrimPreview();
    }, duration * 1000);
  }

  function stopTrimPreview() {
    if (trimPreviewAudioPlayer) {
      if (trimPreviewAudioPlayer.pause) trimPreviewAudioPlayer.pause();
      else if (trimPreviewAudioPlayer.contentWindow) {
        trimPreviewAudioPlayer.contentWindow.postMessage(
          '{"event":"command","func":"stopVideo","args":""}',
          "*"
        );
      }
      trimPreviewAudioPlayer.remove();
      trimPreviewAudioPlayer = null;
    }
    clearTimeout(trimPreviewStopTimeout);
  }

  function stopStoryMusicPlayback() {
    clearTimeout(storyMusicStopTimeout);
    if (currentStoryMusicPlayer) {
      if (currentStoryMusicPlayer.pause) {
        currentStoryMusicPlayer.pause();
      } else if (currentStoryMusicPlayer.contentWindow) {
        currentStoryMusicPlayer.contentWindow.postMessage(
          '{"event":"command","func":"stopVideo","args":""}',
          "*"
        );
      }
      currentStoryMusicPlayer.remove();
      currentStoryMusicPlayer = null;
    }
  }

  socket.on("storyUpdate", () => loadStories());

  // Init
  loadStories();
})();
