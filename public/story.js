(function () {
  const userId = localStorage.getItem("userId");
  const storyFileInput = document.getElementById("storyFileInput");
  let currentStoryMedia = null;
  let storiesData = [];
  let currentStoryIndex = 0;
  let storyTimer = null; // For story progression
  let activeStoriesForViewer = []; // Track currently viewing stories
  let isEditorOpen = false; // Controls playback lifecycle
  let trimLoopTimeout = null; // For recursive looping of trimmed segment

  // Music related variables
  let currentStoryMusic = null; // { source: "youtube" | "pixabay", id, title, thumbnail, audioUrl, startTime }
  let currentMusicPreviewPlayer = null; // Holds YouTube iframe or Audio element for preview
  let currentMusicPreviewPlayerType = null; // 'youtube' or 'pixabay'
  let currentStoryMusicPlayer = null; // Holds YouTube iframe or Audio element for story playback
  let storyMusicStopTimeout = null; // Timeout for stopping story music

  // Advanced Editor Variables
  let storyOverlays = []; // [{id, type, content, x, y, scale, rotation, styles}]
  let activeOverlay = null;
  let currentTextStyles = { font: 'Classic', color: '#fff', size: 32 };
  let isDraggingOverlay = false;
  let dragOffset = { x: 0, y: 0 };
  let lastTouchDist = 0;
  let lastTouchAngle = 0;
  let isOverDeleteZone = false;

  let trimPreviewAudioPlayer = null; // For playing the trimmed segment

  const SEGMENT_DURATION = 20; // Fixed 20-second segment
  let musicPreviewVolume = 1;
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
    isEditorOpen = true;
    const modal = document.getElementById("storyEditorModal");
    const preview = document.getElementById("storyMediaPreview");
    const mediaHtml = currentStoryMedia.type === "video"
        ? `<video src="${currentStoryMedia.data}" autoplay muted loop controls></video>`
        : `<img src="${currentStoryMedia.data}">`;

    // Re-inject the media and recreate the overlay container to avoid null reference errors
    preview.innerHTML = mediaHtml + '<div id="storyOverlayContainer" class="overlay-container"></div>';

    modal.style.display = "flex";
    updateSelectedMusicDisplay(); // Update music display in editor
    if (currentStoryMusic) {
      playTrimPreview(currentStoryMusic, currentStoryMusic.startTime, SEGMENT_DURATION);
    }
  }

  window.closeStoryEditor = () => {
    isEditorOpen = false;
    stopTrimPreview();
    storyOverlays = [];
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
        overlays: storyOverlays,
        music: currentStoryMusic
          ? { ...currentStoryMusic, duration: SEGMENT_DURATION }
          : null,
      }),
    });
    const data = await res.json();
    if (data.success) {
      isEditorOpen = false;
      stopTrimPreview();
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
    const overlayContainer = document.createElement("div");
    overlayContainer.className = "overlay-container";
    viewer.appendChild(overlayContainer);
    renderOverlaysToContainer(story.overlays ? JSON.parse(story.overlays) : [], overlayContainer);

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

  // ================= ADVANCED OVERLAY ENGINE =================

  function createOverlayElement(overlay) {
    const div = document.createElement("div");
    div.className = "draggable-overlay";
    div.id = `ov-${overlay.id}`;
    div.style.left = `${overlay.x}%`;
    div.style.top = `${overlay.y}%`;
    div.style.transform = `translate(-50%, -50%) scale(${overlay.scale}) rotate(${overlay.rotation}deg)`;

    if (overlay.type === "text") {
      div.textContent = overlay.content;
      div.style.fontFamily = getFontFamily(overlay.styles.font);
      div.style.fontSize = `${overlay.styles.size}px`;
      div.style.color = overlay.styles.color === 'gradient' ? 'transparent' : overlay.styles.color;
      if (overlay.styles.color === 'gradient') {
        div.style.backgroundImage = "linear-gradient(45deg, #f09433, #bc1888)";
        div.style.webkitBackgroundClip = "text";
      }
      if (overlay.styles.font === 'Neon') div.classList.add("font-neon");
    } else if (overlay.type === "location") {
      div.innerHTML = `<div class="story-tag-location"><i class="fa-solid fa-location-dot"></i> ${overlay.content}</div>`;
    } else if (overlay.type === "emoji") {
      div.style.fontSize = "80px";
      div.textContent = overlay.content;
    } else if (overlay.type === "sticker") {
      div.innerHTML = `<img src="${overlay.content}" style="width: 150px;">`;
    } else if (overlay.type === "time") {
      div.innerHTML = `<div class="story-tag-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>`;
    }

    // Interaction Logic
    div.addEventListener("mousedown", (e) => startDrag(e, overlay));
    div.addEventListener("touchstart", (e) => startDrag(e, overlay), { passive: false });

    return div;
  }

  function startDrag(e, overlay) {
    activeOverlay = overlay;
    isDraggingOverlay = true;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const rect = document.getElementById(`ov-${overlay.id}`).getBoundingClientRect();
    dragOffset = { x: clientX - rect.left - rect.width / 2, y: clientY - rect.top - rect.height / 2 };
    
    document.getElementById("storyDeleteZone").classList.add("show");

    if (e.touches && e.touches.length === 2) {
        lastTouchDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        lastTouchAngle = Math.atan2(e.touches[1].clientY - e.touches[0].clientY, e.touches[1].clientX - e.touches[0].clientX) * 180 / Math.PI;
    }
    e.preventDefault();
  }

  document.addEventListener("mousemove", (e) => handleMove(e));
  document.addEventListener("touchmove", (e) => handleMove(e), { passive: false });

  function handleMove(e) {
    if (!isDraggingOverlay || !activeOverlay) return;
    const container = document.getElementById("storyOverlayContainer");
    const containerRect = container.getBoundingClientRect();
    const deleteZone = document.getElementById("storyDeleteZone");
    const el = document.getElementById(`ov-${activeOverlay.id}`);

    if (e.touches && e.touches.length === 2) {
        const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        const angle = Math.atan2(e.touches[1].clientY - e.touches[0].clientY, e.touches[1].clientX - e.touches[0].clientX) * 180 / Math.PI;
        activeOverlay.scale *= (dist / lastTouchDist);
        activeOverlay.rotation += (angle - lastTouchAngle);
        lastTouchDist = dist;
        lastTouchAngle = angle;
    } else {
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        activeOverlay.x = ((clientX - containerRect.left) / containerRect.width) * 100;
        activeOverlay.y = ((clientY - containerRect.top) / containerRect.height) * 100;

        // Collision detection with Delete Zone
        const dzRect = deleteZone.getBoundingClientRect();
        isOverDeleteZone = (clientX >= dzRect.left && clientX <= dzRect.right && 
                            clientY >= dzRect.top && clientY <= dzRect.bottom);
        
        if (isOverDeleteZone) deleteZone.classList.add("active");
        else deleteZone.classList.remove("active");
    }

    el.style.left = `${activeOverlay.x}%`;
    el.style.top = `${activeOverlay.y}%`;
    el.style.transform = `translate(-50%, -50%) scale(${activeOverlay.scale}) rotate(${activeOverlay.rotation}deg)`;
  }

  function stopDragging() {
    if (isDraggingOverlay && activeOverlay && isOverDeleteZone) {
        document.getElementById(`ov-${activeOverlay.id}`).remove();
        storyOverlays = storyOverlays.filter(o => o.id !== activeOverlay.id);
    }
    isDraggingOverlay = false;
    activeOverlay = null;
    isOverDeleteZone = false;
    const dz = document.getElementById("storyDeleteZone");
    dz.classList.remove("show", "active");
  }

  document.addEventListener("mouseup", stopDragging);
  document.addEventListener("touchend", stopDragging);

  window.openStoryTextTool = () => {
    document.getElementById("storyTextModal").style.display = "flex";
    document.getElementById("storyTextInput").focus();
  };

  window.closeStoryTextTool = () => {
    const text = document.getElementById("storyTextInput").value.trim();
    if (text) {
      const overlay = {
        id: Date.now(),
        type: "text",
        content: text,
        x: 50, y: 50, scale: 1, rotation: 0,
        styles: { ...currentTextStyles }
      };
      storyOverlays.push(overlay);
      document.getElementById("storyOverlayContainer").appendChild(createOverlayElement(overlay));
    }
    document.getElementById("storyTextInput").value = "";
    document.getElementById("storyTextModal").style.display = "none";
  };

  window.setStoryFont = (font) => currentTextStyles.font = font;
  window.setStoryColor = (color) => currentTextStyles.color = color;

  window.openStoryLocationTool = () => {
    document.getElementById("storyLocationModal").style.display = "flex";
    const results = document.getElementById("locationResults");
    results.innerHTML = "";
    ["New York", "London", "Paris", "Tokyo", "Dubai", "Mumbai"].forEach(loc => {
        const d = document.createElement("div");
        d.className = "theme-option";
        d.textContent = loc;
        d.onclick = () => {
            addLocationTag(loc);
            closeStoryLocationTool();
        };
        results.appendChild(d);
    });
  };

  function addLocationTag(loc) {
    const overlay = { id: Date.now(), type: "location", content: loc, x: 50, y: 50, scale: 1, rotation: 0, styles: {} };
    storyOverlays.push(overlay);
    document.getElementById("storyOverlayContainer").appendChild(createOverlayElement(overlay));
  }

  window.closeStoryLocationTool = () => document.getElementById("storyLocationModal").style.display = "none";

  window.addStoryTimeTag = () => {
    const overlay = { id: Date.now(), type: "time", content: "", x: 50, y: 50, scale: 1, rotation: 0, styles: {} };
    storyOverlays.push(overlay);
    document.getElementById("storyOverlayContainer").appendChild(createOverlayElement(overlay));
  };

  window.openStoryStickerTool = () => {
    document.getElementById("storyStickerModal").style.display = "flex";
    switchStickerTab('stickers');
  };

  window.switchStickerTab = (tab) => {
    const results = document.getElementById("stickerResults");
    results.innerHTML = "";
    if (tab === 'stickers') {
        const stickerList = ["🔥", "⭐", "📍", "💯", "💖", "✨"]; // Mock URLs or Emojis
        stickerList.forEach(s => {
            const d = document.createElement("div");
            d.style.fontSize = "40px";
            d.style.cursor = "pointer";
            d.textContent = s;
            d.onclick = () => {
                const overlay = { id: Date.now(), type: "sticker", content: s, x: 50, y: 50, scale: 1, rotation: 0, styles: {} };
                storyOverlays.push(overlay);
                document.getElementById("storyOverlayContainer").appendChild(createOverlayElement(overlay));
                closeStoryStickerTool();
            };
            results.appendChild(d);
        });
    } else {
        const emojiList = ["😂", "😍", "🥺", "😎", "😭", "😡", "👍", "👎", "🎉", "🔥", "❤️"];
        emojiList.forEach(e => {
            const d = document.createElement("div");
            d.style.fontSize = "40px";
            d.style.cursor = "pointer";
            d.textContent = e;
            d.onclick = () => {
                const overlay = { id: Date.now(), type: "emoji", content: e, x: 50, y: 50, scale: 1, rotation: 0, styles: {} };
                storyOverlays.push(overlay);
                document.getElementById("storyOverlayContainer").appendChild(createOverlayElement(overlay));
                closeStoryStickerTool();
            };
            results.appendChild(d);
        });
    }
  };

  window.closeStoryStickerTool = () => document.getElementById("storyStickerModal").style.display = "none";

  function getFontFamily(font) {
    switch(font) {
      case 'Modern': return 'Helvetica, sans-serif';
      case 'Typewriter': return 'Courier New, monospace';
      case 'Elegant': return 'Georgia, serif';
      case 'Script': return 'Brush Script MT, cursive';
      case 'Comic': return 'Comic Sans MS, cursive';
      case 'Stencil': return 'Impact, sans-serif';
      default: return 'Arial, sans-serif';
    }
  }

  function renderOverlaysToContainer(overlays, container) {
    overlays.forEach(ov => {
      const div = document.createElement("div");
      div.className = "draggable-overlay";
      div.style.left = `${ov.x}%`;
      div.style.top = `${ov.y}%`;
      div.style.transform = `translate(-50%, -50%) scale(${ov.scale}) rotate(${ov.rotation}deg)`;
      div.style.pointerEvents = "none"; // Non-interactive in viewer

      if (ov.type === "text") {
        div.textContent = ov.content;
        div.style.fontFamily = getFontFamily(ov.styles.font);
        div.style.fontSize = `${ov.styles.size}px`;
        div.style.color = ov.styles.color === 'gradient' ? 'transparent' : ov.styles.color;
        if (ov.styles.color === 'gradient') {
          div.style.backgroundImage = "linear-gradient(45deg, #f09433, #bc1888)";
          div.style.webkitBackgroundClip = "text";
        }
        if (ov.styles.font === 'Neon') div.classList.add("font-neon");
      } else if (ov.type === "location") {
        div.innerHTML = `<div class="story-tag-location"><i class="fa-solid fa-location-dot"></i> ${ov.content}</div>`;
      } else if (ov.type === "emoji") {
        div.style.fontSize = "80px";
        div.textContent = ov.content;
      } else if (ov.type === "sticker") {
        div.innerHTML = `<img src="${ov.content}" style="width: 150px;">`;
      } else if (ov.type === "time") {
        div.innerHTML = `<div class="story-tag-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>`;
      }
      container.appendChild(div);
    });
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
// TOUCH START (same as mousedown)
segmentSlider.addEventListener("touchstart", (e) => {
  isDraggingSlider = true;
  dragStartX = e.touches[0].clientX;
  sliderStartLeft = segmentSlider.offsetLeft;
  segmentSlider.style.cursor = "grabbing";
});

// TOUCH MOVE (same as mousemove)
document.addEventListener("touchmove", (e) => {
  if (!isDraggingSlider) return;

  const dx = e.touches[0].clientX - dragStartX;
  let newLeft = sliderStartLeft + dx;

  const sliderParentWidth = segmentSlider.parentElement.offsetWidth;
  const segmentWidth = segmentSlider.offsetWidth;

  // Clamp
  if (newLeft < 0) newLeft = 0;
  if (newLeft + segmentWidth > sliderParentWidth)
    newLeft = sliderParentWidth - segmentWidth;

  currentSegmentStartTime =
    (newLeft / sliderParentWidth) * currentSongDuration;

  updateTrimmerUI();

  // prevent screen scroll while dragging
  e.preventDefault();
}, { passive: false });

// TOUCH END (same as mouseup)
document.addEventListener("touchend", () => {
  isDraggingSlider = false;
  segmentSlider.style.cursor = "grab";
});
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
    stopTrimPreview();
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
    clearTimeout(trimLoopTimeout);
    if (!isEditorOpen || !song) return;

    // Verify if existing player matches current song choice to avoid unnecessary destruction
    const isSameSong = trimPreviewAudioPlayer && 
                       trimPreviewAudioPlayer.dataset.songId === String(song.id) &&
                       trimPreviewAudioPlayer.dataset.source === song.source;

    if (trimPreviewAudioPlayer && !isSameSong) {
      if (trimPreviewAudioPlayer.pause) trimPreviewAudioPlayer.pause();
      trimPreviewAudioPlayer.remove();
      trimPreviewAudioPlayer = null;
    }

    function runLoop() {
      if (!isEditorOpen || !currentStoryMusic) {
        stopTrimPreview();
        return;
      }

      const loopStartTime = currentStoryMusic.startTime || 0;

      if (!trimPreviewAudioPlayer) {
        if (song.source === "youtube") {
          const iframe = document.createElement("iframe");
          iframe.width = "0";
          iframe.height = "0";
          iframe.src = `https://www.youtube.com/embed/${song.id}?autoplay=1&controls=0&modestbranding=1&rel=0&enablejsapi=1&start=${loopStartTime}`;
          iframe.allow = "autoplay";
          iframe.style.position = "absolute";
          iframe.style.left = "-9999px";
          iframe.style.top = "-9999px";
          iframe.dataset.songId = song.id;
          iframe.dataset.source = "youtube";
          document.body.appendChild(iframe);
          trimPreviewAudioPlayer = iframe;
          
          iframe.onload = () => {
            iframe.contentWindow.postMessage(`{"event":"command","func":"seekTo","args":[${loopStartTime}, true]}`, "*");
          };
        } else if (song.source === "pixabay") {
          const audio = document.createElement("audio");
          audio.src = song.audioUrl;
          audio.autoplay = true;
          audio.dataset.songId = song.id;
          audio.dataset.source = "pixabay";
          audio.oncanplay = () => {
            audio.currentTime = loopStartTime;
            audio.play();
          };
          document.body.appendChild(audio);
          trimPreviewAudioPlayer = audio;
        }
      } else {
        // Restart existing player from current startTime
        if (song.source === "youtube") {
          trimPreviewAudioPlayer.contentWindow.postMessage(`{"event":"command","func":"seekTo","args":[${loopStartTime}, true]}`, "*");
          trimPreviewAudioPlayer.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', "*");
        } else if (song.source === "pixabay") {
          trimPreviewAudioPlayer.currentTime = loopStartTime;
          trimPreviewAudioPlayer.play();
        }
      }

      trimLoopTimeout = setTimeout(runLoop, duration * 1000);
    }

    runLoop();
  }

  function stopTrimPreview() {
    clearTimeout(trimLoopTimeout);
    if (trimPreviewAudioPlayer) {
      if (trimPreviewAudioPlayer.pause) trimPreviewAudioPlayer.pause();
      else if (trimPreviewAudioPlayer.contentWindow) {
        trimPreviewAudioPlayer.contentWindow.postMessage('{"event":"command","func":"stopVideo","args":""}', "*");
      }
      trimPreviewAudioPlayer.remove();
      trimPreviewAudioPlayer = null;
    }
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
