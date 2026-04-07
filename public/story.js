(function () {
  const userId = localStorage.getItem("userId");
  const storyFileInput = document.getElementById("storyFileInput");
  let currentStoryMedia = null;
  let storiesData = [];
  let currentStoryIndex = 0;
  let currentUserStoryGroup = []; // 🔥 ADD THIS
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
  let viewerPause = false;
  let groupedStories = []; // Stories grouped by user for sequential playback
  let currentUserDeckIndex = 0; // Index of the user in the tray

  // Advanced Editor Variables
  let storyOverlays = []; // [{id, type, content, x, y, scale, rotation, styles}]
  let activeOverlay = null;
  let selectedOverlayId = null;
  let currentTextStyles = {
    font: "Classic",
    color: "#fff",
    size: 32,
    mode: "normal",
  };
  let isDraggingOverlay = false;
  let dragOffset = { x: 0, y: 0 };
  let lastTouchDist = 0;
  let lastTouchAngle = 0;
  let isOverDeleteZone = false;
  let editingOverlayId = null;
  let hasMovedDuringDrag = false;
  let locationSearchTimer;

  let trimPreviewAudioPlayer = null; // For playing the trimmed segment

  const SEGMENT_DURATION = 20; // Fixed 20-second segment
  const emojiCategories = {
    Smileys: [
      "😀",
      "😃",
      "😄",
      "😁",
      "😆",
      "😅",
      "😂",
      "🤣",
      "😊",
      "😇",
      "🙂",
      "🙃",
      "😉",
      "😌",
      "😍",
      "🥰",
      "😘",
      "😗",
      "😙",
      "😚",
      "😋",
      "😛",
      "😝",
      "😜",
      "🤪",
      "🤨",
      "🧐",
      "🤓",
      "😎",
      "🤩",
      "🥳",
      "😏",
      "😒",
      "😞",
      "😔",
      "😟",
      "😕",
      "🙁",
      "☹️",
      "😣",
      "😖",
      "😫",
      "😩",
      "🥺",
      "😢",
      "😭",
      "😤",
      "😠",
      "😡",
      "🤬",
      "🤯",
      "😳",
      "🥵",
      "🥶",
      "😱",
      "😨",
      "😰",
      "😥",
      "😓",
      "🤗",
      "🤔",
      "🤭",
      "🤫",
      "🤥",
      "😶",
      "😐",
      "😑",
      "😬",
      "🙄",
      "😯",
      "😦",
      "😧",
      "😮",
      "😲",
      "🥱",
      "😴",
      "🤤",
      "😪",
      "😵",
      "🤐",
      "🥴",
      "🤢",
      "🤮",
      "🤧",
      "😷",
      "🤒",
      "🤕",
      "🤑",
      "🤠",
      "😈",
      "👿",
      "👹",
      "👺",
      "🤡",
      "💩",
      "👻",
      "💀",
      "☠️",
      "👽",
      "👾",
      "🤖",
      "🎃",
      "😺",
      "😸",
      "😻",
      "😼",
      "😽",
      "🙀",
      "😿",
      "😾",
    ],
    Animals: [
      "🐶",
      "🐱",
      "🐭",
      "🐹",
      "🐰",
      "🦊",
      "🐻",
      "🐼",
      "🐨",
      "🐯",
      "🦁",
      "🐮",
      "🐷",
      "🐸",
      "🐵",
      "🐔",
      "🐧",
      "🐦",
      "🐤",
      "🦆",
      "🦅",
      "🦉",
      "🦇",
      "🐺",
      "🐗",
      "🐴",
      "🦄",
      "🐝",
      "🐛",
      "🦋",
      "🐌",
      "🐞",
      "🐜",
      "🦟",
      "🦗",
      "🕷",
      "🕸",
      "🦂",
      "🐢",
      "🐍",
      "🦎",
      "🦖",
      "🦕",
      "🐙",
      "🦑",
      "🦐",
      "🦞",
      "🦀",
      "🐡",
      "🐠",
      "🐟",
      "🐬",
      "🐳",
      "🐋",
      "🦈",
      "🐊",
      "🐅",
      "🐆",
      "🦓",
      "🦍",
      "🐘",
      "🦏",
      "🦛",
      "🐪",
      "🐫",
      "🦒",
      "🦘",
      "🐃",
      "🐂",
      "🐄",
      "🐎",
      "🐖",
      "🐏",
      "🐑",
      "🐐",
      "🦌",
      "🐕",
      "🐩",
      "🐈",
      "🐓",
      "🦃",
      "🕊",
      "🐇",
      "🐁",
      "🐀",
      "🐿",
      "🦔",
      "🐾",
      "🐉",
      "🐲",
    ],
    Food: [
      "🍏",
      "🍎",
      "🍐",
      "🍊",
      "🍋",
      "🍌",
      "🍉",
      "🍇",
      "🍓",
      "🍈",
      "🍒",
      "🍑",
      "🥭",
      "🍍",
      "🥥",
      "🥝",
      "🍅",
      "🍆",
      "🥑",
      "🥦",
      "🥬",
      "🥒",
      "🌶",
      "🌽",
      "🥕",
      "🥔",
      "🍠",
      "🥐",
      "🥯",
      "🍞",
      "🥖",
      "🧀",
      "🥚",
      "🍳",
      "🥞",
      "🥓",
      "🥩",
      "🍗",
      "🍖",
      "🌭",
      "🍔",
      "🍟",
      "🍕",
      "🥪",
      "🥙",
      "🌮",
      "🌯",
      "🥗",
      "🥘",
      "🥣",
      "🍝",
      "🍜",
      "🍲",
      "🍛",
      "🍣",
      "🍱",
      "🥟",
      "🍤",
      "🍙",
      "🍚",
      "🍘",
      "🍥",
      "🥠",
      "🥮",
      "🍢",
      "🍡",
      "🍧",
      "🍨",
      "🍦",
      "🥧",
      "🍰",
      "🎂",
      "🍮",
      "🍭",
      "🍬",
      "🍫",
      "🍿",
      "🧂",
      "🍩",
      "🍪",
      "🌰",
      "🥜",
      "🍯",
      "🥛",
      "☕️",
      "🍵",
      "🥤",
      "🍶",
      "🍺",
      "🍻",
      "🥂",
      "🍷",
      "🥃",
      "🍸",
      "🍹",
      "🍾",
    ],
    Activities: [
      "⚽️",
      "🏀",
      "🏈",
      "⚾️",
      "🥎",
      "🎾",
      "🏐",
      "🏉",
      "🎱",
      "🏓",
      "🏸",
      "🥅",
      "🏒",
      "🏑",
      "🏏",
      "⛳️",
      "🏹",
      "🎣",
      "🥊",
      "🥋",
      "⛸",
      "🎿",
      "🛷",
      "🛹",
      "🛼",
      "🛶",
      "🏊‍♂️",
      "🏄‍♂️",
      "🏇",
      "🚴‍♂️",
      "🚵‍♂️",
      "🧗‍♂️",
      "🧘‍♂️",
      "🏌️‍♂️",
      "🏊‍♀️",
      "🏄‍♀️",
      "🏇",
      "🚴‍♀️",
      "🚵‍♀️",
      "🧗‍♀️",
      "🧘‍♀️",
      "🏌️‍♀️",
      "🏆",
      "🥇",
      "🥈",
      "🥉",
      "🏅",
      "🎖",
      "🎫",
      "🎟",
      "🎭",
      "🎨",
      "🎬",
      "🎤",
      "🎧",
      "🎼",
      "🎹",
      "🥁",
      "🎷",
      "🎺",
      "🎸",
      "🎻",
      "🎲",
      "🎯",
      "🎳",
      "🎮",
      "🎰",
    ],
    Travel: [
      "🚗",
      "🚕",
      "🚙",
      "🚌",
      "🚎",
      "🏎",
      "🚓",
      "🚑",
      "🚒",
      "🚐",
      "🚚",
      "🚛",
      "🚜",
      "🚲",
      "🛴",
      "🛵",
      "🏍",
      "🚨",
      "🚔",
      "🚍",
      "🚘",
      "🚖",
      "🚡",
      "🚠",
      "🚟",
      "🚃",
      "🚋",
      "🚞",
      "🚝",
      "🚄",
      "🚅",
      "🚈",
      "🚂",
      "🚆",
      "🚇",
      "🚊",
      "🚉",
      "🚁",
      "🛩",
      "✈️",
      "🛫",
      "🛬",
      "⛵️",
      "🛥",
      "🚤",
      "⛴",
      "🛳",
      "🚀",
      "🛰",
      "💺",
      "🛶",
      "⚓️",
      "🚧",
      "⛽️",
      "🚏",
      "🗺",
      "🗿",
      "🗽",
      "🗼",
      "🏰",
      "🏟",
      "🎡",
      "🎢",
      "🎠",
      "⛲️",
      "⛱",
      "🏖",
      "🏝",
      "🏜",
      "🌋",
      "⛰",
      "🏔",
      "🗻",
      "🏕",
      "⛺️",
      "🏠",
      "🏡",
      "🏢",
      "🏣",
      "🏤",
      "🏥",
      "🏦",
      "🏨",
      "🏩",
      "🏪",
      "🏫",
      "🏬",
      "🏭",
      "🏯",
      "🏰",
      "💒",
      "⛪️",
      "🕌",
      "🕍",
      "⛩",
      "🕋",
    ],
    Symbols: [
      "💘",
      "💝",
      "💖",
      "💗",
      "💓",
      "💞",
      "💕",
      "💌",
      "❣️",
      "💔",
      "❤️",
      "🧡",
      "💛",
      "💚",
      "💙",
      "💜",
      "🖤",
      "💟",
      "💤",
      "💢",
      "💣",
      "💥",
      "💦",
      "💨",
      "💫",
      "💬",
      "🗨",
      "🗯",
      "💭",
      "♨️",
      "🛑",
      "🕛",
      "🕧",
      "🕐",
      "🕜",
      "🕑",
      "🕝",
      "🕒",
      "🕞",
      "🕓",
      "🕟",
      "🕔",
      "🕠",
      "🕕",
      "🕡",
      "🕖",
      "🕢",
      "🕗",
      "🕣",
      "🕘",
      "🕤",
      "🕙",
      "🕥",
      "🕚",
      "🕦",
      "🌀",
      "♠️",
      "♥️",
      "♦️",
      "♣️",
      "🃏",
      "🀄️",
      "🎴",
      "🔇",
      "🔈",
      "🔉",
      "🔊",
      "🔔",
      "🔕",
      "💹",
      "🏧",
      "🚮",
      "🚰",
      "♿️",
      "🚹",
      "🚺",
      "🚻",
      "🚼",
      "🚾",
      "⚠️",
      "🚸",
      "⛔️",
      "🚫",
      "🚳",
      "🚭",
      "🚯",
      "🚱",
      "🚷",
      "📵",
      "🔞",
      "☢️",
      "☣️",
      "⬆️",
      "↗️",
      "➡️",
      "↘️",
      "⬇️",
      "↙️",
      "⬅️",
      "↖️",
      "↕️",
      "↔️",
      "↩️",
      "↪️",
      "⤴️",
      "⤵️",
      "🔃",
      "🔄",
      "🔙",
      "🔚",
      "🔛",
      "🔜",
      "🔝",
    ],
  };

  let musicPreviewVolume = 1;
  let musicSearchTimer;

  storyFileInput.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    // 🔥 RESET EVERYTHING FOR NEW STORY
    currentStoryMusic = null; // ❗ FIX MAIN ISSUE
    stopTrimPreview(); // stop any previous preview
    stopMusicPreview();
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
    selectedOverlayId = null;
    const modal = document.getElementById("storyEditorModal");
    const preview = document.getElementById("storyMediaPreview");
    const mediaHtml =
      currentStoryMedia.type === "video"
        ? `<video src="${currentStoryMedia.data}" autoplay muted loop controls></video>`
        : `<img src="${currentStoryMedia.data}">`;

    // Re-inject the media and recreate the overlay container to avoid null reference errors
    preview.innerHTML =
      mediaHtml +
      '<div id="storyOverlayContainer" class="overlay-container"></div>';

    // Add background click to deselect
    preview.onclick = (e) => {
      if (
        e.target.id === "storyOverlayContainer" ||
        e.target.tagName === "IMG" ||
        e.target.tagName === "VIDEO"
      ) {
        deselectOverlay();
      }
    };

    modal.style.display = "flex";
    updateSelectedMusicDisplay(); // Update music display in editor
    if (currentStoryMusic) {
      playTrimPreview(
        currentStoryMusic,
        currentStoryMusic.startTime,
        SEGMENT_DURATION,
      );
    }
  }

  window.closeStoryEditor = () => {
    isEditorOpen = false;
    deselectOverlay();
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
        privacy: document.getElementById("storyPrivacyInp").value,
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

    // Group stories by user
    const groups = {};
    storiesData.forEach((s) => {
      if (!groups[s.user_id]) {
        groups[s.user_id] = {
          user_id: s.user_id,
          name: s.name,
          avatar: s.avatar,
          stories: [],
        };
      }
      groups[s.user_id].stories.push(s);
    });
    groupedStories = Object.values(groups);

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

      // 🔥 CHECK IF ALL STORIES SEEN
      const allSeen = user.stories.every((s) => s.seen == 1);

      const item = document.createElement("div");
      item.className = "story-item";
      item.onclick = () => openStoryViewer(uid);

      item.innerHTML = `
    <div class="story-circle ${allSeen ? "seen-story" : ""}">
        <img src="${user.avatar || getAvatarSrc(uid)}">
    </div>
    <div class="story-user-name">${user.name}</div>
  `;

      tray.appendChild(item);
    });
  }

  function openStoryViewer(selectedUserId) {
    currentUserDeckIndex = groupedStories.findIndex(
      (g) => g.user_id == selectedUserId,
    );
    if (currentUserDeckIndex === -1) return;

    activeStoriesForViewer = groupedStories[currentUserDeckIndex].stories;
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
    const replyContainer = document.querySelector(".story-reply-container");
    const reactionsStrip = document.querySelector(".story-reactions-strip");
    const viewsInfo = document.querySelector(".story-views-info");

    document.getElementById("storyViewCount").textContent =
      story.view_count || 0;
    document.getElementById("storyReplyInput").value = "";
    cancelAnimationFrame(storyTimer);

    // Use global helper for avatar if available
    const avatarUrl =
      story.avatar ||
      (window.getAvatarSrc
        ? window.getAvatarSrc(story.user_id)
        : `https://i.pravatar.cc/150?img=${(story.user_id % 70) + 1}`);
    avatar.src = avatarUrl;

    // ✅ Ownership logic: Hide interactions on own story, show views info
    if (story.user_id == userId) {
      if (replyContainer) replyContainer.style.display = "none";
      if (reactionsStrip) reactionsStrip.style.display = "none";
      if (viewsInfo) viewsInfo.style.display = "flex";
    } else {
      if (replyContainer) replyContainer.style.display = "flex";
      if (reactionsStrip) reactionsStrip.style.display = "flex";
      if (viewsInfo) viewsInfo.style.display = "none";
    }

    name.textContent = story.name;
    avatar.dataset.uid = story.user_id;
    timeEl.textContent = timeAgo(story.created_at);
    delBtn.style.display = story.user_id == userId ? "block" : "none";
    delBtn.onclick = () => deleteStory(story.id);
    // Interaction: Mark viewed
    if (story.user_id != userId) {
      fetch("/markStoryViewed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storyId: story.id, userId }),
      });
    }
    viewer.innerHTML =
      story.type === "video"
        ? `<video id="viewerVideo" src="${story.media}" autoplay muted></video>`
        : `<img src="${story.media}">`;

    // Progress bars
    const overlayContainer = document.createElement("div");
    overlayContainer.className = "overlay-container";
    viewer.appendChild(overlayContainer);
    renderOverlaysToContainer(
      story.overlays ? JSON.parse(story.overlays) : [],
      overlayContainer,
    );

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
      if (viewerPause) {
        start = null;
        storyTimer = requestAnimationFrame(step);
        return;
      }
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

  const viewer = document.getElementById("storyViewerModal");

  let startX = 0;
  let startY = 0;
  let startTime = 0;
  let isHolding = false;
  let lastTap = 0;

  viewer.addEventListener("pointerdown", (e) => {
    const isInteractive =
      e.target.closest("button") ||
      e.target.closest("input") ||
      e.target.closest(".story-reply-container") ||
      e.target.closest(".story-reactions-strip") ||
      e.target.closest(".story-views-info");

    if (isInteractive) return;

    startX = e.clientX;
    startY = e.clientY;
    startTime = Date.now();
    isHolding = true;

    // HOLD → pause
    setTimeout(() => {
      if (isHolding) viewerPause = true;
    }, 200);
  });

  viewer.addEventListener("pointerup", (e) => {
    const isInteractive =
      e.target.closest("button") ||
      e.target.closest("input") ||
      e.target.closest(".story-reply-container") ||
      e.target.closest(".story-reactions-strip") ||
      e.target.closest(".story-views-info");

    if (isInteractive) return;

    const endX = e.clientX;
    const endY = e.clientY;
    const dx = endX - startX;
    const dy = endY - startY;
    const duration = Date.now() - startTime;

    isHolding = false;
    viewerPause = false;

    // 🔥 DOUBLE TAP → reaction
    const now = Date.now();
    if (now - lastTap < 300) {
      reactToStory("❤️");
      showHeartAnimation(e.clientX, e.clientY);
      return;
    }
    lastTap = now;

    // 🔥 SWIPE DOWN → close
    if (dy > 80 && Math.abs(dx) < 50) {
      closeStoryViewer();
      return;
    }

    // 🔥 TAP → navigation
    if (duration < 200) {
      const screenWidth = window.innerWidth;

      const edgeSize = screenWidth * 0.25; // 25% edge zones

      // 👉 LEFT EDGE
      if (endX < edgeSize) {
        prevStory();
        return;
      }

      // 👉 RIGHT EDGE
      if (endX > screenWidth - edgeSize) {
        nextStory();
        return;
      }

      // 👉 CENTER AREA → DO NOTHING (safe zone)
    }
  });
  function showHeartAnimation(x, y) {
    const heart = document.createElement("div");
    heart.innerHTML = "❤️";

    heart.style.position = "fixed";
    heart.style.left = x + "px";
    heart.style.top = y + "px";
    heart.style.fontSize = "40px";
    heart.style.transform = "translate(-50%, -50%)";
    heart.style.pointerEvents = "none";
    heart.style.zIndex = "999999";
    heart.style.animation = "heartPop 0.8s ease forwards";

    document.body.appendChild(heart);

    setTimeout(() => heart.remove(), 800);
  }
  window.openViewersList = async () => {
    const story = activeStoriesForViewer[currentStoryIndex];
    if (!story || story.user_id != userId) return;

    viewerPause = true; // Keep story paused
    const modal = document.getElementById("storymod");
    const list = document.getElementById("storyViewersList");
    modal.style.display = "flex";
    list.innerHTML = "<p style='color:#888; text-align:center;'>Loading...</p>";

    try {
      const res = await fetch(`/getStoryViewers/${story.id}`);
      const data = await res.json();
      if (!data.success || !data.viewers.length) {
        list.innerHTML =
          "<p style='color:#888; text-align:center;'>No views yet</p>";
        return;
      }
      list.innerHTML = "";
      data.viewers.forEach((v) => {
        const div = document.createElement("div");
        div.className = "friend-item-mini"; // Reuse existing styles
        div.style.marginBottom = "10px";
        div.innerHTML = `
          <img src="${v.avatar || (window.getAvatarSrc ? window.getAvatarSrc(v.id) : `https://i.pravatar.cc/150?img=${(v.id % 70) + 1}`)}">
          <div style="flex:1; text-align:left;"><div style="font-weight:600; color:white;">${v.name}</div></div>
        `;
        list.appendChild(div);
      });
    } catch (e) {
      list.innerHTML = "Error loading viewers";
    }
  };
  window.reactToStory = async (emoji) => {
    const story = activeStoriesForViewer[currentStoryIndex];
    if (!story) return;

    // ✅ Step 1: mark viewed
    markStoryViewed(story.id);

    // ✅ Step 2: save reaction (existing API)
    await fetch("/reactToStory", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        storyId: story.id,
        emoji,
      }),
    });

    // 🔥 Step 3: SEND MESSAGE TO CHAT
    socket.emit("sendMessage", {
      to: story.user_id,

      message: `${emoji} reacted to your story`,
      type: "story_reaction",

      // 🔥 VERY IMPORTANT
      caption: JSON.stringify({
        storyMedia: story.media,
        storyType: story.type,
      }),
    });

    showPopup(`Reacted ${emoji}`);
  };
  const sendBtn = document.querySelector(".story-reply-container button");

  sendBtn.addEventListener("pointerup", (e) => {
    e.preventDefault();
    e.stopPropagation();
    sendStoryReply();
  });
  window.sendStoryReply = () => {
    console.log("Sending socket...");
    const input = document.getElementById("storyReplyInput");
    const text = input.value.trim();

    if (!text) return;

    const story = activeStoriesForViewer[currentStoryIndex];
    if (!story) return;

    // ✅ mark viewed
    markStoryViewed(story.id);

    // 🔥 SEND CORRECT FORMAT
    socket.emit("sendMessage", {
      to: story.user_id,

      message: text,
      type: "story_reply", // 🔥 IMPORTANT FIX

      caption: JSON.stringify({
        storyMedia: story.media,
        storyType: story.type,
      }),
    });

    showPopup("Reply sent!");
    input.value = "";
  };
  async function markStoryViewed(storyId) {
    try {
      await fetch("/markStoryViewed", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          storyId,
          userId: localStorage.getItem("userId"),
        }),
      });
    } catch (e) {
      console.error("View mark failed", e);
    }
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
      div.innerHTML = overlay.content.replace(/\n/g, "<br>");
      div.style.fontFamily = getFontFamily(overlay.styles.font);
      div.style.fontSize = `${overlay.styles.size}px`;
      applyVisualStyles(div, overlay.styles);
      if (overlay.styles.font === "Neon") div.classList.add("font-neon");
    } else if (overlay.type === "location") {
      div.innerHTML = `<div class="story-tag-location"><i class="fa-solid fa-location-dot"></i> ${overlay.content}</div>`;
    } else if (overlay.type === "emoji") {
      div.style.fontSize = "80px";
      div.innerHTML = overlay.content.replace(/\n/g, "<br>");
    } else if (overlay.type === "sticker") {
      div.innerHTML = `<img src="${overlay.content}" style="width: 150px;">`;
    } else if (overlay.type === "time") {
      div.innerHTML = `<div class="story-tag-time">${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>`;
    }

    // Interaction Logic
    div.addEventListener("mousedown", (e) => startDrag(e, overlay));
    div.addEventListener("touchstart", (e) => startDrag(e, overlay), {
      passive: false,
    });

    return div;
  }

  function applyVisualStyles(el, styles) {
    el.style.color = styles.color === "gradient" ? "transparent" : styles.color;
    el.style.background = "transparent";
    el.style.padding = "0";
    el.style.borderRadius = "0";
    el.style.textShadow = "none";
    el.style.backgroundImage = "none";
    el.style.webkitBackgroundClip = "initial";

    if (styles.color === "gradient") {
      el.style.backgroundImage = "linear-gradient(45deg, #f09433, #bc1888)";
      el.style.webkitBackgroundClip = "text";
    }

    if (styles.mode === "bg") {
      const isDark = styles.color === "#fff" || styles.color === "gradient";
      el.style.background = isDark ? "rgba(0,0,0,0.8)" : "#fff";
      el.style.color =
        styles.color === "gradient" && isDark
          ? "transparent"
          : isDark
            ? "#fff"
            : styles.color;
      if (styles.color === "gradient" && isDark)
        el.style.webkitBackgroundClip = "text";
      el.style.borderRadius = "12px";
      el.style.display = "inline-block";
    } else if (styles.mode === "shadow") {
      el.style.textShadow = "2px 2px 8px rgba(0,0,0,0.8)";
    }
  }

  function startDrag(e, overlay) {
    activeOverlay = overlay;
    isDraggingOverlay = true;
    hasMovedDuringDrag = false;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const rect = document
      .getElementById(`ov-${overlay.id}`)
      .getBoundingClientRect();
    dragOffset = {
      x: clientX - rect.left - rect.width / 2,
      y: clientY - rect.top - rect.height / 2,
    };

    document.getElementById("storyDeleteZone").classList.add("show");

    // Hide scale control while dragging to prevent screen clutter
    const scaleControl = document.getElementById("storyScaleControl");
    if (scaleControl) scaleControl.style.display = "none";

    if (e.touches && e.touches.length === 2) {
      lastTouchDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      lastTouchAngle =
        (Math.atan2(
          e.touches[1].clientY - e.touches[0].clientY,
          e.touches[1].clientX - e.touches[0].clientX,
        ) *
          180) /
        Math.PI;
    }
    e.preventDefault();
  }

  document.addEventListener("mousemove", (e) => handleMove(e));
  document.addEventListener("touchmove", (e) => handleMove(e), {
    passive: false,
  });

  function handleMove(e) {
    if (!isDraggingOverlay || !activeOverlay) return;
    hasMovedDuringDrag = true;
    const container = document.getElementById("storyOverlayContainer");
    const containerRect = container.getBoundingClientRect();
    const deleteZone = document.getElementById("storyDeleteZone");
    const el = document.getElementById(`ov-${activeOverlay.id}`);

    if (e.touches && e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      const angle =
        (Math.atan2(
          e.touches[1].clientY - e.touches[0].clientY,
          e.touches[1].clientX - e.touches[0].clientX,
        ) *
          180) /
        Math.PI;
      activeOverlay.scale = Math.min(
        Math.max(activeOverlay.scale * (dist / lastTouchDist), 0.5),
        8,
      );
      activeOverlay.rotation += angle - lastTouchAngle;
      lastTouchDist = dist;
      lastTouchAngle = angle;

      // Keep slider in sync with pinch gesture
      if (selectedOverlayId === activeOverlay.id) {
        const scaleInp = document.getElementById("storyOverlayScaleInp");
        if (scaleInp) scaleInp.value = activeOverlay.scale;
      }
    } else {
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      activeOverlay.x =
        ((clientX - containerRect.left) / containerRect.width) * 100;
      activeOverlay.y =
        ((clientY - containerRect.top) / containerRect.height) * 100;

      // Collision detection with Delete Zone
      const dzRect = deleteZone.getBoundingClientRect();
      isOverDeleteZone =
        clientX >= dzRect.left &&
        clientX <= dzRect.right &&
        clientY >= dzRect.top &&
        clientY <= dzRect.bottom;

      if (isOverDeleteZone) deleteZone.classList.add("active");
      else deleteZone.classList.remove("active");
    }

    el.style.left = `${activeOverlay.x}%`;
    el.style.top = `${activeOverlay.y}%`;
    el.style.transform = `translate(-50%, -50%) scale(${activeOverlay.scale}) rotate(${activeOverlay.rotation}deg)`;
  }

  function stopDragging() {
    if (isDraggingOverlay && activeOverlay) {
      if (isOverDeleteZone) {
        document.getElementById(`ov-${activeOverlay.id}`).remove();
        storyOverlays = storyOverlays.filter((o) => o.id !== activeOverlay.id);
        if (selectedOverlayId === activeOverlay.id) deselectOverlay();
      } else if (!hasMovedDuringDrag && activeOverlay.type === "text") {
        openStoryTextTool(activeOverlay);
      } else if (
        !hasMovedDuringDrag &&
        (activeOverlay.type === "emoji" || activeOverlay.type === "sticker")
      ) {
        selectOverlay(activeOverlay);
      } else if (
        selectedOverlayId === activeOverlay.id &&
        (activeOverlay.type === "emoji" || activeOverlay.type === "sticker")
      ) {
        // Show scale control again if it was already selected and just moved
        const scaleControl = document.getElementById("storyScaleControl");
        const scaleInp = document.getElementById("storyOverlayScaleInp");
        if (scaleControl && scaleInp) {
          scaleInp.value = activeOverlay.scale;
          scaleControl.style.display = "flex";
        }
      }
    }
    isDraggingOverlay = false;
    activeOverlay = null;
    isOverDeleteZone = false;
    const dz = document.getElementById("storyDeleteZone");
    dz.classList.remove("show", "active");
  }

  document.addEventListener("mouseup", stopDragging);
  document.addEventListener("touchend", stopDragging);

  window.selectOverlay = (overlay) => {
    if (selectedOverlayId === overlay.id) return;
    deselectOverlay();

    selectedOverlayId = overlay.id;
    const el = document.getElementById(`ov-${overlay.id}`);
    if (el) el.classList.add("selected-overlay");

    if (overlay.type === "emoji" || overlay.type === "sticker") {
      const scaleControl = document.getElementById("storyScaleControl");
      const scaleInp = document.getElementById("storyOverlayScaleInp");
      if (scaleControl && scaleInp) {
        scaleInp.value = overlay.scale;
        scaleControl.style.display = "flex";
      }
    }
  };

  window.deselectOverlay = () => {
    if (selectedOverlayId) {
      const el = document.getElementById(`ov-${selectedOverlayId}`);
      if (el) el.classList.remove("selected-overlay");
    }
    selectedOverlayId = null;
    const scaleControl = document.getElementById("storyScaleControl");
    if (scaleControl) scaleControl.style.display = "none";
  };

  window.updateOverlayScale = (val) => {
    if (!selectedOverlayId) return;
    const overlay = storyOverlays.find((o) => o.id === selectedOverlayId);
    if (overlay) {
      overlay.scale = parseFloat(val);
      const el = document.getElementById(`ov-${overlay.id}`);
      if (el) {
        el.style.transform = `translate(-50%, -50%) scale(${overlay.scale}) rotate(${overlay.rotation}deg)`;
      }
    }
  };

  window.changeOverlayScale = (delta) => {
    const scaleInp = document.getElementById("storyOverlayScaleInp");
    if (!scaleInp) return;
    let newVal = parseFloat(scaleInp.value) + delta;
    newVal = Math.min(Math.max(newVal, 0.5), 8); // Clamp between 0.5x and 8x
    scaleInp.value = newVal;
    updateOverlayScale(newVal);
  };

  window.openStoryTextTool = (editingOverlay = null) => {
    deselectOverlay();
    const input = document.getElementById("storyTextInput");

    if (editingOverlay) {
      editingOverlayId = editingOverlay.id;
      input.value = editingOverlay.content;
      currentTextStyles = JSON.parse(JSON.stringify(editingOverlay.styles));
      document.getElementById("storyFontSizeInp").value =
        currentTextStyles.size;

      // Hide the overlay while editing
      const el = document.getElementById(`ov-${editingOverlay.id}`);
      if (el) el.style.opacity = "0";
    } else {
      editingOverlayId = null;
      input.value = "";
      currentTextStyles = {
        font: "Classic",
        color: "#fff",
        size: 32,
        mode: "normal",
      };
      document.getElementById("storyFontSizeInp").value = 32;
    }

    updateLiveTextStyle();
    document.getElementById("storyTextModal").style.display = "flex";
    input.focus();
  };

  window.updateLiveTextStyle = () => {
    const input = document.getElementById("storyTextInput");
    const size = document.getElementById("storyFontSizeInp").value;
    currentTextStyles.size = size;
    input.style.fontFamily = getFontFamily(currentTextStyles.font);
    input.style.fontSize = `${size}px`;

    // Auto-resize textarea
    input.style.height = "auto";
    input.style.height = input.scrollHeight + "px";

    applyVisualStyles(input, currentTextStyles);
    if (currentTextStyles.font === "Neon") input.classList.add("font-neon");
    else input.classList.remove("font-neon");

    // Update font selector highlighting
    document.querySelectorAll(".font-selector span").forEach((span) => {
      if (span.getAttribute("data-font") === currentTextStyles.font) {
        span.classList.add("active");
      } else {
        span.classList.remove("active");
      }
    });
  };

  window.closeStoryTextTool = () => {
    const input = document.getElementById("storyTextInput");
    const text = input.value.trim();
    const container = document.getElementById("storyOverlayContainer");

    if (text) {
      if (editingOverlayId) {
        const overlay = storyOverlays.find((o) => o.id === editingOverlayId);
        if (overlay) {
          overlay.content = text;
          overlay.styles = JSON.parse(JSON.stringify(currentTextStyles));
          const el = document.getElementById(`ov-${overlay.id}`);
          if (el) {
            el.textContent = text;
            el.style.fontFamily = getFontFamily(overlay.styles.font);
            el.style.fontSize = `${overlay.styles.size}px`;
            applyVisualStyles(el, overlay.styles);
            el.style.opacity = "1";
            if (overlay.styles.font === "Neon") el.classList.add("font-neon");
            else el.classList.remove("font-neon");
          }
        }
      } else {
        const overlay = {
          id: Date.now(),
          type: "text",
          content: text,
          x: 50,
          y: 50,
          scale: 1,
          rotation: 0,
          styles: JSON.parse(JSON.stringify(currentTextStyles)),
        };
        storyOverlays.push(overlay);
        container.appendChild(createOverlayElement(overlay));
      }
    } else if (editingOverlayId) {
      // Removed text, so delete overlay
      storyOverlays = storyOverlays.filter((o) => o.id !== editingOverlayId);
      const el = document.getElementById(`ov-${editingOverlayId}`);
      if (el) el.remove();
    }

    editingOverlayId = null;
    input.value = "";
    document.getElementById("storyTextModal").style.display = "none";
  };

  window.setStoryFont = (font) => {
    currentTextStyles.font = font;
    updateLiveTextStyle();
  };
  window.setStoryColor = (color) => {
    currentTextStyles.color = color;
    updateLiveTextStyle();
  };
  window.toggleTextStyle = () => {
    const modes = ["normal", "bg", "shadow"];
    const currentIdx = modes.indexOf(currentTextStyles.mode || "normal");
    currentTextStyles.mode = modes[(currentIdx + 1) % modes.length];
    updateLiveTextStyle();
  };

  window.openStoryLocationTool = () => {
    deselectOverlay();
    document.getElementById("storyLocationModal").style.display = "flex";
    const input = document.getElementById("locationSearchInput");
    const results = document.getElementById("locationResults");
    results.innerHTML =
      '<p style="text-align:center; color:#888; padding:20px;">Start typing to search globally...</p>';
    input.value = "";
    input.focus();

    input.oninput = (e) => {
      const query = e.target.value.trim();
      clearTimeout(locationSearchTimer);
      if (query.length < 2) {
        results.innerHTML =
          '<p style="text-align:center; color:#888; padding:20px;">Type at least 2 characters...</p>';
        return;
      }
      locationSearchTimer = setTimeout(async () => {
        results.innerHTML =
          '<p style="text-align:center; color:#888; padding:20px;">Searching...</p>';
        const res = await fetch(
          `/searchLocations?query=${encodeURIComponent(query)}`,
        );
        const data = await res.json();
        results.innerHTML = "";
        if (data.locations && data.locations.length > 0) {
          data.locations.forEach((loc) => {
            const d = document.createElement("div");
            d.className = "theme-option";
            d.style.textAlign = "left";
            d.style.padding = "12px 20px";
            d.innerHTML = `
              <div style="font-weight:bold; color:#fff; font-size:14px;">${loc.shortName}</div>
              <div style="font-size:11px; color:#aaa; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; margin-top:2px;">${loc.name}</div>
            `;
            d.onclick = () => {
              addLocationTag(loc.shortName);
              closeStoryLocationTool();
            };
            results.appendChild(d);
          });
        } else {
          results.innerHTML =
            '<p style="text-align:center; color:#888; padding:20px;">No locations found.</p>';
        }
      }, 500);
    };
  };

  function addLocationTag(loc) {
    const overlay = {
      id: Date.now(),
      type: "location",
      content: loc,
      x: 50,
      y: 50,
      scale: 1,
      rotation: 0,
      styles: {},
    };
    storyOverlays.push(overlay);
    document
      .getElementById("storyOverlayContainer")
      .appendChild(createOverlayElement(overlay));
  }

  window.closeStoryLocationTool = () =>
    (document.getElementById("storyLocationModal").style.display = "none");

  window.addStoryTimeTag = () => {
    deselectOverlay();
    const overlay = {
      id: Date.now(),
      type: "time",
      content: "",
      x: 50,
      y: 50,
      scale: 1,
      rotation: 0,
      styles: {},
    };
    storyOverlays.push(overlay);
    document
      .getElementById("storyOverlayContainer")
      .appendChild(createOverlayElement(overlay));
  };

  window.openStoryStickerTool = () => {
    deselectOverlay();
    document.getElementById("storyStickerModal").style.display = "flex";
    document.getElementById("stickerSearchInput").value = "";
    switchStickerTab("emojis");
  };

  document.getElementById("stickerSearchInput").oninput = (e) => {
    const query = e.target.value.trim().toLowerCase();
    const results = document.getElementById("stickerResults");
    if (!query) {
      switchStickerTab("emojis");
      return;
    }
    results.innerHTML = "";
    results.style.display = "grid";
    results.style.gridTemplateColumns = "repeat(6, 1fr)";

    Object.values(emojiCategories)
      .flat()
      .forEach((e) => {
        if (e.includes(query)) {
          const d = document.createElement("div");
          d.style.fontSize = "40px";
          d.style.cursor = "pointer";
          d.style.textAlign = "center";
          d.textContent = e;
          d.onclick = () => {
            const overlay = {
              id: Date.now(),
              type: "emoji",
              content: e,
              x: 50,
              y: 50,
              scale: 2.5,
              rotation: 0,
              styles: {},
            };
            storyOverlays.push(overlay);
            document
              .getElementById("storyOverlayContainer")
              .appendChild(createOverlayElement(overlay));
            selectOverlay(overlay);
            closeStoryStickerTool();
          };
          results.appendChild(d);
        }
      });
  };

  window.switchStickerTab = (tab) => {
    const results = document.getElementById("stickerResults");
    const tabEmojis = document.getElementById("tabEmojis");
    results.innerHTML = "";
    if (tab === "emojis") {
      tabEmojis.classList.add("active");
      results.style.display = "block";

      Object.keys(emojiCategories).forEach((cat) => {
        const header = document.createElement("div");
        header.style.cssText =
          "font-size:12px; color:#aaa; text-transform:uppercase; padding:15px 10px 10px; border-bottom:1px solid #333; margin-bottom:10px; font-weight:bold;";
        header.textContent = cat;
        results.appendChild(header);

        const grid = document.createElement("div");
        grid.style.cssText =
          "display:grid; grid-template-columns:repeat(6, 1fr); gap:10px; margin-bottom:20px; padding:0 10px;";

        emojiCategories[cat].forEach((e) => {
          const d = document.createElement("div");
          d.style.fontSize = "38px";
          d.style.cursor = "pointer";
          d.style.textAlign = "center";
          d.textContent = e;
          d.onclick = () => {
            const overlay = {
              id: Date.now(),
              type: "emoji",
              content: e,
              x: 50,
              y: 50,
              scale: 2.5,
              rotation: 0,
              styles: {},
            };
            storyOverlays.push(overlay);
            document
              .getElementById("storyOverlayContainer")
              .appendChild(createOverlayElement(overlay));
            selectOverlay(overlay);
            closeStoryStickerTool();
          };
          grid.appendChild(d);
        });
        results.appendChild(grid);
      });
    }
  };

  window.closeStoryStickerTool = () =>
    (document.getElementById("storyStickerModal").style.display = "none");

  function getFontFamily(font) {
    switch (font) {
      case "Modern":
        return "Helvetica, sans-serif";
      case "Typewriter":
        return "Courier New, monospace";
      case "Elegant":
        return "Georgia, serif";
      case "Script":
        return "Brush Script MT, cursive";
      case "Comic":
        return "Comic Sans MS, cursive";
      case "Stencil":
        return "Impact, sans-serif";
      default:
        return "Arial, sans-serif";
    }
  }

  function renderOverlaysToContainer(overlays, container) {
    overlays.forEach((ov) => {
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
        applyVisualStyles(div, ov.styles);
        if (ov.styles.font === "Neon") div.classList.add("font-neon");
      } else if (ov.type === "location") {
        div.innerHTML = `<div class="story-tag-location"><i class="fa-solid fa-location-dot"></i> ${ov.content}</div>`;
      } else if (ov.type === "emoji") {
        div.style.fontSize = "80px";
        div.textContent = ov.content;
      } else if (ov.type === "sticker") {
        div.innerHTML = `<img src="${ov.content}" style="width: 150px;">`;
      } else if (ov.type === "time") {
        div.innerHTML = `<div class="story-tag-time">${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>`;
      }
      container.appendChild(div);
    });
  }
let isNavigating = false;
window.nextStory = () => {
  if (isNavigating) return; // 🔥 BLOCK MULTIPLE CALLS
  isNavigating = true;

  if (currentStoryIndex < activeStoriesForViewer.length - 1) {
    currentStoryIndex++;
    displayStory();
  } else if (currentUserDeckIndex < groupedStories.length - 1) {
    currentUserDeckIndex++;
    activeStoriesForViewer = groupedStories[currentUserDeckIndex].stories;
    currentStoryIndex = 0;
    displayStory();
  } else {
    closeStoryViewer();
  }

  setTimeout(() => {
    isNavigating = false;
  }, 300); // 🔥 delay to prevent double tap
};

window.prevStory = () => {
  if (isNavigating) return;
  isNavigating = true;

  if (currentStoryIndex > 0) {
    currentStoryIndex--;
    displayStory();
  } else if (currentUserDeckIndex > 0) {
    currentUserDeckIndex--;

    activeStoriesForViewer =
      groupedStories[currentUserDeckIndex].stories;

    currentStoryIndex = activeStoriesForViewer.length - 1;
    displayStory();
  }

  setTimeout(() => {
    isNavigating = false;
  }, 300);
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
    deselectOverlay();
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
  document.addEventListener(
    "touchmove",
    (e) => {
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
    },
    { passive: false },
  );

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
          "*",
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
    const isSameSong =
      trimPreviewAudioPlayer &&
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
            iframe.contentWindow.postMessage(
              `{"event":"command","func":"seekTo","args":[${loopStartTime}, true]}`,
              "*",
            );
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
          trimPreviewAudioPlayer.contentWindow.postMessage(
            `{"event":"command","func":"seekTo","args":[${loopStartTime}, true]}`,
            "*",
          );
          trimPreviewAudioPlayer.contentWindow.postMessage(
            '{"event":"command","func":"playVideo","args":""}',
            "*",
          );
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
        trimPreviewAudioPlayer.contentWindow.postMessage(
          '{"event":"command","func":"stopVideo","args":""}',
          "*",
        );
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
          "*",
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
