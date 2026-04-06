(function () {
  const userId = localStorage.getItem("userId");
  const storyFileInput = document.getElementById("storyFileInput");
  let currentStoryMedia = null;
  let storiesData = [];
  let currentStoryIndex = 0;
  let storyTimer = null; // For story progression

  // Music related variables
  let currentStoryMusic = null; // { source: "youtube" | "pixabay", id, title, thumbnail, audioUrl, startTime }
  let currentMusicPreviewPlayer = null; // Holds YouTube iframe or Audio element for preview
  let currentStoryMusicPlayer = null; // Holds YouTube iframe or Audio element for story playback
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
        userId, // Ensure userId is passed
        media: currentStoryMedia.data,
        type: currentStoryMedia.type,
        overlays: [],
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

    currentStoryIndex = 0;
    // Filter stories to only include those from the selected user
    storiesData = storiesData.filter((s) => s.user_id == selectedUserId);
    const modal = document.getElementById("storyViewerModal");
    modal.style.display = "flex";
    displayStory(storiesData);
  }

  function displayStory(userStories) {
    const story = userStories[currentStoryIndex];
    const viewer = document.getElementById("storyViewerMedia");
    const avatar = document.getElementById("storyUserAvatar");
    const name = document.getElementById("storyUserName");
    const delBtn = document.getElementById("deleteStoryBtn");
    const timeEl = document.getElementById("storyTime");

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
    progress.innerHTML = userStories
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
    clearTimeout(storyTimer);

    let start = null;
    const duration = 5000;
    function step(timestamp) {
      if (!start) start = timestamp;
      const progress = timestamp - start;
      currentFill.style.width =
        Math.min((progress / duration) * 100, 100) + "%";
      if (progress < duration) {
        storyTimer = requestAnimationFrame(step);
      } else {
        nextStory(userStories);
      }
    }
    storyTimer = requestAnimationFrame(step);

    // Handle music playback
    playStoryMusic(story.music ? JSON.parse(story.music) : null);
  }

  window.nextStory = (userStories = storiesData) => {
    if (currentStoryIndex < userStories.length - 1) {
      currentStoryIndex++;
      displayStory(userStories);
    } else {
      closeStoryViewer();
    }
  };

  window.prevStory = (userStories = storiesData) => {
    if (currentStoryIndex > 0) {
      currentStoryIndex--;
      displayStory(userStories);
    } else {
      // Optionally go to previous user or just stay
      // For now, just restart the current story if it's the first one
      displayStory(userStories);
    }
  };

  window.closeStoryViewer = () => {
    cancelAnimationFrame(storyTimer);
    stopStoryMusicPlayback();
    document.getElementById("storyViewerModal").style.display = "none";
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
    document.getElementById("confirmMusicSelectionBtn").style.display = "none";
    stopMusicPreview();
    // Optionally load trending/free tracks from Pixabay initially
    searchMusic(""); // Empty query to get trending/default
  };

  window.closeMusicPicker = () => {
    document.getElementById("musicPickerModal").style.display = "none";
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

          // ✅ attach data safely (DO NOT use JSON in HTML)
          item.querySelector(".play-preview-btn").onclick = (e) => {
            e.stopPropagation();
            playMusicPreview(song);
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

    previewThumbnail.src = song.thumbnail || "/images/music_placeholder.png";
    previewTitle.textContent = song.title;
    previewSource.textContent =
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
      currentMusicPreviewPlayer = iframe;

      iframe.onload = () => {
        iframe.contentWindow.postMessage(
          `{"event":"command","func":"setVolume","args":[${musicPreviewVolume * 100}]}`,
          "*",
        );
      };
    } else if (song.source === "pixabay") {
      const audio = document.createElement("audio");
      audio.src = song.audioUrl;
      audio.autoplay = true;
      audio.controls = false;
      audio.volume = musicPreviewVolume;
      audio.loop = true; // Loop for preview
      document.body.appendChild(audio);
      currentMusicPreviewPlayer = audio;
    }

    previewPlayerContainer.style.display = "flex";
    currentStoryMusic = song; // Temporarily select for confirmation

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
    }
    document.getElementById("musicPreviewPlayer").style.display = "none";
    document.getElementById("musicPreviewPlayPause").innerHTML =
      '<i class="fa-solid fa-play"></i>';
  }

  document.getElementById("confirmMusicSelectionBtn").onclick = () => {
    // currentStoryMusic is already set by playMusicPreview
    updateSelectedMusicDisplay();
    closeMusicPicker();
  };

  function updateSelectedMusicDisplay() {
    const display = document.getElementById("selectedMusicDisplay");
    if (currentStoryMusic) {
      document.getElementById("selectedMusicThumbnail").src =
        currentStoryMusic.thumbnail || "/images/music_placeholder.png";
      document.getElementById("selectedMusicTitle").textContent =
        currentStoryMusic.title;
      document.getElementById("selectedMusicSource").textContent =
        currentStoryMusic.source === "youtube" ? "YouTube" : "Pixabay";
      display.style.display = "flex";
    } else {
      display.style.display = "none";
    }
  }

  window.removeSelectedMusic = () => {
    currentStoryMusic = null;
    updateSelectedMusicDisplay();
  };

  function playStoryMusic(musicMetadata) {
    stopStoryMusicPlayback();

    if (!musicMetadata) return;

    if (musicMetadata.source === "youtube") {
      const iframe = document.createElement("iframe");
      iframe.width = "0"; // Hidden
      iframe.height = "0"; // Hidden
      iframe.src = `https://www.youtube.com/embed/${musicMetadata.id}?autoplay=1&controls=0&modestbranding=1&rel=0&enablejsapi=1&start=${musicMetadata.startTime || 0}`;
      iframe.allow = "autoplay";
      iframe.style.position = "absolute";
      iframe.style.left = "-9999px";
      iframe.style.top = "-9999px";
      document.body.appendChild(iframe);
      currentStoryMusicPlayer = iframe;
    } else if (musicMetadata.source === "pixabay") {
      const audio = document.createElement("audio");
      audio.src = musicMetadata.audioUrl;
      audio.autoplay = true;
      audio.controls = false;
      audio.loop = true; // Loop for story playback
      audio.currentTime = musicMetadata.startTime || 0;
      document.body.appendChild(audio);
      currentStoryMusicPlayer = audio;
    }
  }

  function stopStoryMusicPlayback() {
    if (currentStoryMusicPlayer) {
      if (currentStoryMusicPlayer.pause) currentStoryMusicPlayer.pause();
      else if (currentStoryMusicPlayer.contentWindow)
        currentStoryMusicPlayer.contentWindow.postMessage(
          '{"event":"command","func":"stopVideo","args":""}',
          "*",
        );
      currentStoryMusicPlayer.remove();
      currentStoryMusicPlayer = null;
    }
  }

  socket.on("storyUpdate", () => loadStories());

  // Init
  loadStories();
})();
