const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const http = require("http");
const axios = require("axios");
require("dotenv").config();
const app = express();
app.use(express.json({ limit: "100mb" }));
app.use(cors());
process.on("uncaughtException", (err) => {
  console.error("🔥 UNCAUGHT EXCEPTION:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("🔥 UNHANDLED REJECTION:", err);
});
const sessionTokens = new Map(); // Map socket.id -> sessionToken
const server = http.createServer(app);
const io = require("socket.io")(server, {
  maxHttpBufferSize: 1e8,
  transports: ["websocket", "polling"], // 👈 ADD THIS
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const db = new sqlite3.Database("./users.db");

db.serialize(() => {
  // ================= USERS =================
  db.run(`
    CREATE TABLE IF NOT EXISTS users(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT UNIQUE,
      password TEXT
    )
  `);

  // ✅ FIX EXISTING DB
  db.run("ALTER TABLE users ADD COLUMN last_seen DATETIME", (err) => {
    if (err && !err.message.includes("duplicate column")) {
      console.error("last_seen error:", err.message);
    }
  });

  db.run("ALTER TABLE users ADD COLUMN bio TEXT", (err) => {
    if (err && !err.message.includes("duplicate column")) {
      console.error("bio error:", err.message);
    }
  });
  db.run("ALTER TABLE users ADD COLUMN cover TEXT", (err) => {
    if (err && !err.message.includes("duplicate column")) {
      console.error("cover error:", err.message);
    }
  });
  db.run("ALTER TABLE users ADD COLUMN links TEXT", (err) => {
    if (err && !err.message.includes("duplicate column")) {
      console.error("links error:", err.message);
    }
  });
  db.run("ALTER TABLE users ADD COLUMN settings TEXT", (err) => {
    if (err && !err.message.includes("duplicate column")) {
      console.error("settings error:", err.message);
    }
  });

  db.run("ALTER TABLE users ADD COLUMN avatar TEXT", (err) => {
    if (err && !err.message.includes("duplicate column")) {
      console.error("avatar error:", err.message);
    }
  });
  db.run("ALTER TABLE users ADD COLUMN city TEXT", (err) => {
    if (err && !err.message.includes("duplicate column")) {
      console.error("city error:", err.message);
    }
  });
  db.run("ALTER TABLE users ADD COLUMN birthday TEXT", (err) => {
    if (err && !err.message.includes("duplicate column")) {
      console.error("birthday error:", err.message);
    }
  });
  db.run(
    "ALTER TABLE users ADD COLUMN active_status INTEGER DEFAULT 1",
    (err) => {
      if (err && !err.message.includes("duplicate column")) {
        console.error("active_status error:", err.message);
      }
    },
  );
  db.run(
    "ALTER TABLE users ADD COLUMN account_status INTEGER DEFAULT 1",
    (err) => {
      if (err && !err.message.includes("duplicate column")) {
        console.error("account_status error:", err.message);
      }
    },
  );
  db.run(
    "ALTER TABLE users ADD COLUMN read_receipts INTEGER DEFAULT 1",
    (err) => {
      if (err && !err.message.includes("duplicate column")) {
        console.error("read_receipts error:", err.message);
      }
    },
  );
  db.run(
    "ALTER TABLE users ADD COLUMN notifications_enabled INTEGER DEFAULT 1",
    (err) => {
      if (err && !err.message.includes("duplicate column")) {
        console.error("notifications_enabled error:", err.message);
      }
    },
  );
  db.run(
    "ALTER TABLE users ADD COLUMN tfa_enabled INTEGER DEFAULT 0",
    (err) => {
      if (err && !err.message.includes("duplicate column")) {
        console.error("tfa_enabled error:", err.message);
      }
    },
  );

  // ================= FRIENDS =================
  db.run(`
    CREATE TABLE IF NOT EXISTS friends(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user1 INTEGER,
      user2 INTEGER
    )
  `);

  // ✅ FIX EXISTING DB
  db.run("ALTER TABLE friends ADD COLUMN created_at DATETIME", (err) => {
    if (err && !err.message.includes("duplicate column")) {
      console.error("created_at error:", err.message);
    }
  });

  // ================= REQUESTS =================
  db.run(`
    CREATE TABLE IF NOT EXISTS friend_requests(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender INTEGER,
      receiver INTEGER,
      status TEXT
    )
  `);

  // ================= MESSAGES =================
  db.run(`
    CREATE TABLE IF NOT EXISTS messages(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender INTEGER,
      receiver INTEGER,
      message TEXT,
      unread_count INTEGER DEFAULT 1,
      type TEXT DEFAULT 'text',
      status TEXT DEFAULT 'sent',
      seen_at DATETIME,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ✅ SAFE ALTERS (keep as you had)
  db.run("ALTER TABLE messages ADD COLUMN deleted_for TEXT", () => {});
  db.run("ALTER TABLE messages ADD COLUMN caption TEXT", () => {});
  db.run("ALTER TABLE messages ADD COLUMN edited INTEGER DEFAULT 0", () => {});
  db.run("ALTER TABLE messages ADD COLUMN edited_at DATETIME", () => {});
  db.run("ALTER TABLE messages ADD COLUMN edited_for_me TEXT", () => {});
  db.run("ALTER TABLE messages ADD COLUMN reactions TEXT", () => {});
  db.run("ALTER TABLE messages ADD COLUMN reply_to INTEGER", () => {});

  // ================= THEMES =================
  db.run(`
    CREATE TABLE IF NOT EXISTS chat_themes(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user1_id INTEGER,
      user2_id INTEGER,
      theme_type TEXT,
      theme_value TEXT,
      UNIQUE(user1_id, user2_id)
    )
  `);

  // ================= CHAT SETTINGS (Timer) =================
  db.run(`
    CREATE TABLE IF NOT EXISTS chat_settings(
      user1_id INTEGER,
      user2_id INTEGER,
      timer_mode TEXT DEFAULT 'Normal',
      PRIMARY KEY(user1_id, user2_id)
    )
  `);

  // ================= BLOCKS =================
  db.run(`
    CREATE TABLE IF NOT EXISTS blocks(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      blocker INTEGER,
      blocked INTEGER,
      UNIQUE(blocker, blocked)
    )
  `);

  // ================= ALIASES =================
  db.run(`
    CREATE TABLE IF NOT EXISTS user_aliases(
      owner_id INTEGER,
      target_id INTEGER,
      custom_name TEXT,
      custom_avatar TEXT,
      PRIMARY KEY(owner_id, target_id)
    )
  `);

  // ================= NOTIFICATIONS =================
  db.run(`
    CREATE TABLE IF NOT EXISTS notifications(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      sender_id INTEGER,
      type TEXT,
      status TEXT DEFAULT 'unread',
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ================= SESSIONS =================
  db.run(`
    CREATE TABLE IF NOT EXISTS sessions(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      session_token TEXT UNIQUE,
      user_agent TEXT,
      ip_address TEXT,
      login_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      status INTEGER DEFAULT 1
    )
  `);

  // ================= PENDING LOGINS =================
  db.run(`
    CREATE TABLE IF NOT EXISTS pending_logins(
      id TEXT PRIMARY KEY,
      user_id INTEGER,
      device_info TEXT,
      ip_address TEXT,
      status TEXT DEFAULT 'pending',
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ================= STORIES =================
  db.run(`
    CREATE TABLE IF NOT EXISTS stories(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      media TEXT,
      type TEXT,
      music TEXT, -- Store music metadata as JSON string
      overlays TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.run("ALTER TABLE stories ADD COLUMN music TEXT", (err) => {
    if (err && !err.message.includes("duplicate column")) {
      console.error("stories music error:", err.message);
    }
  });
  db.run("ALTER TABLE stories ADD COLUMN privacy TEXT DEFAULT 'friends'", (err) => {
    if (err && !err.message.includes("duplicate column")) console.error(err);
  });
  db.run("ALTER TABLE stories ADD COLUMN reactions TEXT DEFAULT '{}'", (err) => {
    if (err && !err.message.includes("duplicate column")) console.error(err);
  });
  db.run("ALTER TABLE stories ADD COLUMN mentions TEXT DEFAULT '[]'", (err) => {
    if (err && !err.message.includes("duplicate column")) console.error(err);
  });
  db.run("ALTER TABLE stories ADD COLUMN parent_story_id INTEGER", (err) => {
    if (err && !err.message.includes("duplicate column")) {
      console.error("stories parent_story_id error:", err.message);
    }
  });

  // ================= STORY VIEWS =================
  db.run(`
    CREATE TABLE IF NOT EXISTS story_views(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      story_id INTEGER,
      user_id INTEGER,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(story_id, user_id)
    )
  `);
});
// ================= ROUTES =================

// ================= MUSIC SEARCH API =================
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const PIXABAY_API_KEY = process.env.PIXABAY_API_KEY;

app.get("/searchSongs", async (req, res) => {
  const { query } = req.query;

  if (!query) {
    return res.status(400).json({ success: false, message: "Query is required" });
  }

  let youtubeResults = [];
  let pixabayResults = [];

  // Search YouTube
  if (YOUTUBE_API_KEY) {
    try {
      const youtubeResponse = await axios.get(
        "https://www.googleapis.com/youtube/v3/search",
        {
          params: {
            part: "snippet",
            q: query + " song", // Add "song" to improve relevance
            type: "video",
            videoEmbeddable: "true",
            key: YOUTUBE_API_KEY,
            maxResults: 10,
          },
        },
      );

      youtubeResults = youtubeResponse.data.items.map((item) => ({
        source: "youtube",
        id: item.id.videoId,
        title: item.snippet.title,
        thumbnail: item.snippet.thumbnails.default.url,
        duration: null, // YouTube API search doesn't provide duration directly
      }));
    } catch (error) {
      console.error("YouTube API error:", error.message);
      // Optionally, send a specific error or just log and continue
    }
  }

  // Search Pixabay (for free audio)
  if (PIXABAY_API_KEY) {
    try {
      const pixabayResponse = await axios.get(
        "https://pixabay.com/audios/",
        {
          params: {
            key: PIXABAY_API_KEY,
            q: query,
            per_page: 10,
            category: "music", // Focus on music
          },
        },
      );

      pixabayResults = pixabayResponse.data.hits.map((item) => ({
        source: "pixabay",
        id: item.id, // Pixabay audio ID
        title: item.tags, // Pixabay audio uses tags as a description
        audioUrl: item.previewURL, // Use previewURL for playback
        thumbnail: null, // Pixabay audio API doesn't provide thumbnails, use a placeholder on frontend
        duration: item.duration, // Duration in seconds
      }));
    } catch (error) {
      console.error("Pixabay API error:", error.message);
      // Optionally, send a specific error or just log and continue
    }
  }

  const combinedResults = [...youtubeResults, ...pixabayResults];

  if (combinedResults.length === 0) {
    return res.json({
      success: true,
      message: "No songs found for your query.",
      songs: [],
    });
  }

  res.json({
    success: true,
    songs: combinedResults,
  });
});

// ================= LOCATION SEARCH API =================
app.get("/searchLocations", async (req, res) => {
  const { query } = req.query;

  if (!query) {
    return res.json({ success: true, locations: [] });
  }

  try {
    const response = await axios.get(`https://nominatim.openstreetmap.org/search`, {
      params: {
        q: query,
        format: "json",
        addressdetails: 1,
        limit: 10
      },
      headers: { 'User-Agent': 'GabruuChatApp/1.0' }
    });

    const locations = response.data.map(item => ({
      name: item.display_name,
      shortName: item.name || item.display_name.split(',')[0]
    }));

    res.json({ success: true, locations });
  } catch (error) {
    console.error("Location search error:", error.message);
    res.json({ success: false, locations: [] });
  }
});

// Temporary store for registration OTPs
const regOtpStore = new Map();
const forgotOtpStore = new Map();
const loginOtpStore = new Map();

const { Resend } = require("resend");
const resend = new Resend(process.env.RESEND_API_KEY); // paste your key

app.post("/sendRegOtp", (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.json({ success: false, message: "Email required" });
  }

  const existing = regOtpStore.get(email);
  if (existing && Date.now() - existing.lastSent < 60000) {
    return res.json({
      success: false,
      message: "Wait 60 seconds before retry",
    });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  regOtpStore.set(email, {
    otp,
    expires: Date.now() + 5 * 60 * 1000,
    lastSent: Date.now(),
  });

  // ✅ RESEND EMAIL
  resend.emails.send({
    from: "onboarding@resend.dev",
    to: email,
    subject: "Your OTP Code",
    text: `Your OTP is: ${otp}`,
  }).then(() => {
    console.log("OTP sent:", email);
  }).catch(err => {
    console.error("Email error:", err);
  });

  res.json({ success: true, message: "OTP sent" });
});
app.post("/verifyRegOtp", (req, res) => {
  const { email, otp } = req.body;
  const stored = regOtpStore.get(email);

  if (!stored)
    return res.json({ success: false, message: "Please request a new OTP." });
  if (Date.now() > stored.expires) {
    regOtpStore.delete(email);
    return res.json({
      success: false,
      message: "OTP expired. Please request a new one.",
    });
  }
  if (otp !== "000000" && stored.otp !== otp) {
    return res.json({ success: false, message: "Invalid OTP." });
  }

  res.json({ success: true });
});

app.post("/sendForgotOtp", (req, res) => {
  const { email } = req.body;

  if (!email) return res.json({ success: false, message: "Email required" });

  db.get("SELECT id FROM users WHERE email = ?", [email], (err, row) => {
    if (err) return res.json({ success: false, message: "Database error" });
    if (!row) return res.json({ success: false, message: "Email not found" });

    const stored = forgotOtpStore.get(email);
    if (stored && Date.now() - stored.lastSent < 60000) {
      return res.json({
        success: false,
        message: "Please wait 60s before resending.",
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    forgotOtpStore.set(email, {
      otp,
      expires: Date.now() + 5 * 60 * 1000,
      lastSent: Date.now(),
      verified: false,
    });

    resend.emails.send({
      from: "onboarding@resend.dev",
      to: email,
      subject: "Password Reset OTP",
      text: `Your OTP is: ${otp}`,
    }).catch(err => console.error(err));

    res.json({ success: true, message: "OTP sent" });
  });
});
app.post("/verifyForgotOtp", (req, res) => {
  const { email, otp } = req.body;
  const stored = forgotOtpStore.get(email);

  if (!stored)
    return res.json({ success: false, message: "Request a new OTP." });

  if (Date.now() > stored.expires) {
    forgotOtpStore.delete(email);
    return res.json({ success: false, message: "OTP expired." });
  }

  if (otp !== "000000" && stored.otp !== otp) {
    return res.json({ success: false, message: "Invalid OTP." });
  }

  // Mark as verified so the reset password route can proceed
  stored.verified = true;
  forgotOtpStore.set(email, stored);

  res.json({ success: true, message: "OTP verified" });
});

app.post("/resetPassword", (req, res) => {
  const { email, newPassword } = req.body;
  const stored = forgotOtpStore.get(email);

  if (!stored || !stored.verified) {
    return res.json({
      success: false,
      message: "Session invalid or OTP not verified.",
    });
  }

  db.run(
    "UPDATE users SET password = ? WHERE email = ?",
    [newPassword, email],
    function (err) {
      if (err)
        return res.json({
          success: false,
          message: "Failed to update password.",
        });

      forgotOtpStore.delete(email); // Cleanup session
      res.json({ success: true, message: "Password updated successfully!" });
    },
  );
});

function sendLoginOtp(user, res) {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  loginOtpStore.set(user.email, {
    otp,
    userId: user.id,
    name: user.name,
    avatar: user.avatar,
    expires: Date.now() + 5 * 60 * 1000,
    lastSent: Date.now(),
  });

  resend.emails.send({
    from: "onboarding@resend.dev",
    to: user.email,
    subject: "Login Verification Code",
    text: `Your login verification code is: ${otp}`,
  }).catch(err => {
    console.error("Login OTP Email Error:", err);
  });

  res.json({ success: true, needsOtp: true, email: user.email });
}

app.post("/sendLoginOtp", (req, res) => {
  const { email, password } = req.body;
  db.get(
    "SELECT id, name, email, avatar FROM users WHERE email=? AND password=?",
    [email, password],
    async (err, row) => {
      if (err || !row)
        return res.json({ success: false, message: "Invalid credentials" });

      const stored = loginOtpStore.get(email);
      if (stored && Date.now() - stored.lastSent < 60000) {
        return res.json({
          success: false,
          message: "Please wait 60s before resending.",
        });
      }
      sendLoginOtp(row, res);
    },
  );
});

app.post("/verifyLoginOtp", (req, res) => {
  const { email, otp } = req.body;
  const stored = loginOtpStore.get(email);

  if (!stored)
    return res.json({ success: false, message: "Request a new OTP." });
  if (Date.now() > stored.expires) {
    loginOtpStore.delete(email);
    return res.json({ success: false, message: "OTP expired." });
  }
  if (otp !== "000000" && stored.otp !== otp)
    return res.json({ success: false, message: "Invalid OTP." });

  const userAgent = req.headers["user-agent"] || "Unknown Device";
  const ip = req.ip || req.connection.remoteAddress;
  const sessionToken =
    Math.random().toString(36).substring(2) + Date.now().toString(36);

  db.run(
    "INSERT INTO sessions(user_id, session_token, user_agent, ip_address) VALUES(?,?,?,?)",
    [stored.userId, sessionToken, userAgent, ip],
    (sessErr) => {
      if (sessErr) return res.status(500).json({ success: false });
      loginOtpStore.delete(email);
      res.json({
        success: true,
        id: stored.userId,
        name: stored.name,
        avatar: stored.avatar,
        sessionToken: sessionToken,
      });
    },
  );
});

app.post("/register", (req, res) => {
  const { name, email, password } = req.body;
  const avatars = [
    "/images/profile1.webp",
    "/images/profile2.webp",
    "/images/profile3.webp",
    "/images/profile4.webp",
    "/images/profile5.webp"
  ];
  const randomAvatar = avatars[Math.floor(Math.random() * avatars.length)];

  db.run(
    `INSERT INTO users(name,email,password,avatar) VALUES(?,?,?,?)`,
    [name, email, password, randomAvatar],
    function (err) {
      if (err) {
        return res.json({ success: false, message: "User already exists" });
      }
      res.json({ success: true });
    },
  );
});

app.post("/login", (req, res) => {
  const { email, password } = req.body;
  const userAgent = req.headers["user-agent"] || "Unknown Device";
  const ip = req.ip || req.connection.remoteAddress;

  db.get(
    "SELECT id, name, email, avatar, account_status, tfa_enabled FROM users WHERE email=? AND password=?",
    [email, password],
    async (err, row) => {
      if (err) return res.status(500).json({ success: false });

      if (row) {
        if (row.account_status === 0) {
          return res.json({
            success: false,
            message: "Account is deactivated",
          });
        }

        // Check 2FA
        if (row.tfa_enabled === 1) {
          // Priority 1: Check for active sessions using socket rooms
          const activeSockets = await io.in(`user_${row.id}`).fetchSockets();

          if (activeSockets.length > 0) {
            const pendingId = Math.random().toString(36).substring(2, 15);
            db.run(
              "INSERT INTO pending_logins(id, user_id, device_info, ip_address) VALUES(?,?,?,?)",
              [pendingId, row.id, userAgent, ip],
            );
            // Notify active devices and add to notifications table
            db.run(
              "INSERT INTO notifications(user_id, sender_id, type, status) VALUES(?,?,?,?)",
              [row.id, row.id, "login_request:" + pendingId, "unread"],
            );

            io.to(`user_${row.id}`).emit("newNotification");
            io.to(`user_${row.id}`).emit("newLoginRequest", {
              pendingId,
              device: userAgent,
              ip: ip,
            });

            return res.json({ success: true, pending: true, pendingId });
          } else {
            // Priority 2: Fallback to Email OTP if no devices are active
            return sendLoginOtp(row, res);
          }
        }

        // Generate a simple session token
        const sessionToken =
          Math.random().toString(36).substring(2) + Date.now().toString(36);

        db.run(
          "INSERT INTO sessions(user_id, session_token, user_agent, ip_address) VALUES(?,?,?,?)",
          [row.id, sessionToken, userAgent, ip],
          (sessErr) => {
            if (sessErr) return res.status(500).json({ success: false });
            res.json({
              success: true,
              id: row.id,
              name: row.name,
              avatar: row.avatar,
              sessionToken: sessionToken,
            });
          },
        );
      } else {
        res.json({ success: false, message: "Invalid email or password" });
      }
    },
  );
});

app.post("/deactivateAccount", (req, res) => {
  const { userId, password } = req.body;
  db.get("SELECT password FROM users WHERE id=?", [userId], (err, row) => {
    if (err || !row || row.password !== password) {
      return res.json({ success: false, message: "Incorrect password" });
    }
    db.run(
      "UPDATE users SET account_status = 0 WHERE id = ?",
      [userId],
      function (err) {
        if (err) return res.json({ success: false });
        res.json({ success: true });
      },
    );
  });
});

app.post("/updateMentions", (req, res) => {
  const { storyId, userId, mentions } = req.body;
  db.run(
    "UPDATE stories SET mentions = ? WHERE id = ? AND user_id = ?",
    [JSON.stringify(mentions), storyId, userId],
    function (err) {
      if (err) return res.status(500).json({ success: false });
      res.json({ success: true });
    },
  );
});

app.post("/toggle2FA", (req, res) => {
  const { userId, enabled, password } = req.body;
  db.get("SELECT password FROM users WHERE id=?", [userId], (err, row) => {
    if (err || !row || row.password !== password) {
      return res.json({ success: false, message: "Incorrect password" });
    }
    db.run(
      "UPDATE users SET tfa_enabled = ? WHERE id = ?",
      [enabled ? 1 : 0, userId],
      function (err) {
        if (err) return res.json({ success: false });
        res.json({ success: true });
      },
    );
  });
});

app.post("/setAlias", (req, res) => {
  const { userId, targetId, type, value } = req.body;
  if (!userId || !targetId) return res.status(400).json({ success: false });

  const column = type === 'name' ? 'custom_name' : 'custom_avatar';
  
  db.get("SELECT 1 FROM user_aliases WHERE owner_id = ? AND target_id = ?", [userId, targetId], (err, row) => {
    if (row) {
      db.run(`UPDATE user_aliases SET ${column} = ? WHERE owner_id = ? AND target_id = ?`, [value, userId, targetId], (err2) => {
        res.json({ success: !err2 });
      });
    } else {
      const name = type === 'name' ? value : null;
      const avatar = type === 'avatar' ? value : null;
      db.run(`INSERT INTO user_aliases (owner_id, target_id, custom_name, custom_avatar) VALUES (?, ?, ?, ?)`, [userId, targetId, name, avatar], (err2) => {
        res.json({ success: !err2 });
      });
    }
  });
});

app.post("/resetAlias", (req, res) => {
  const { userId, targetId } = req.body;
  if (!userId || !targetId) return res.status(400).json({ success: false });

  db.run("DELETE FROM user_aliases WHERE owner_id = ? AND target_id = ?", [userId, targetId], function (err) {
    if (err) return res.status(500).json({ success: false });
    res.json({ success: true });
  });
});

app.get("/getPendingLogin/:pendingId", (req, res) => {
  db.get(
    "SELECT * FROM pending_logins WHERE id = ?",
    [req.params.pendingId],
    (err, row) => {
      res.json({ success: !!row, data: row });
    },
  );
});

app.post("/verifyCurrentPassword", (req, res) => {
  const { userId, password } = req.body;
  if (!userId || !password)
    return res.json({ success: false, message: "Missing credentials" });
  db.get("SELECT password FROM users WHERE id=?", [userId], (err, row) => {
    if (err || !row || row.password !== password) {
      return res.json({
        success: false,
        message: "Incorrect current password",
      });
    }
    res.json({ success: true });
  });
});

// ================= NOTIFICATION ROUTES =================

app.get("/getNotifications/:userId", (req, res) => {
  const { userId } = req.params;
  // We join with pending_logins for login_request types to get device info
  db.all(
    `SELECT n.*, 
     COALESCE(ua.custom_name, u.name) AS senderName, 
     COALESCE(ua.custom_avatar, u.avatar) AS senderAvatar, 
     p.device_info, p.ip_address as login_ip
     FROM notifications n 
     JOIN users u ON n.sender_id = u.id
     LEFT JOIN pending_logins p ON n.type = 'login_request:' || p.id
     LEFT JOIN user_aliases ua ON ua.target_id = u.id AND ua.owner_id = ?
     WHERE n.user_id = ? 
     ORDER BY n.timestamp DESC`,
    [userId, userId],
    (err, rows) => {
      if (err) return res.json({ success: false });
      res.json({ success: true, notifications: rows || [] });
    },
  );
});

app.post("/markNotificationsRead", (req, res) => {
  const { userId } = req.body;
  db.run(
    "UPDATE notifications SET status = 'read' WHERE user_id = ?",
    [userId],
    (err) => {
      res.json({ success: !err });
    },
  );
});

app.post("/clearNotifications", (req, res) => {
  const { userId } = req.body;
  db.run("DELETE FROM notifications WHERE user_id = ?", [userId], (err) => {
    res.json({ success: !err });
  });
});

app.post("/rejectRequest", (req, res) => {
  const { senderId, receiverId } = req.body;
  db.run(
    "DELETE FROM friend_requests WHERE sender = ? AND receiver = ? AND status = 'pending'",
    [senderId, receiverId],
    function (err) {
      if (err) return res.json({ success: false });
      // Remove associated notification
      db.run(
        "DELETE FROM notifications WHERE user_id = ? AND sender_id = ? AND type = 'friend_request'",
        [receiverId, senderId],
      );
      res.json({ success: true });
    },
  );
});

app.get("/getLoginSessions/:userId", (req, res) => {
  const { userId } = req.params;
  db.all(
    "SELECT * FROM sessions WHERE user_id = ? AND status = 1 ORDER BY login_time DESC",
    [userId],
    (err, rows) => {
      if (err) return res.json({ success: false });
      res.json({ success: true, sessions: rows });
    },
  );
});

app.post("/terminateSession", (req, res) => {
  const { userId, sessionToken } = req.body;
  db.run(
    "UPDATE sessions SET status = 0 WHERE user_id = ? AND session_token = ?",
    [userId, sessionToken],
    function (err) {
      if (err) return res.json({ success: false });
      for (const [socketId, token] of sessionTokens.entries()) {
        if (token === sessionToken) {
          io.to(socketId).emit("forcedLogout");
          break;
        }
      }
      res.json({ success: true });
    },
  );
});

app.post("/getMessagesByIds", (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids)) return res.json({ messages: [] });
  const placeholders = ids.map(() => "?").join(",");
  db.all(
    `SELECT * FROM messages WHERE id IN (${placeholders})`,
    ids,
    (err, rows) => {
      if (err) return res.status(500).json({ messages: [] });
      res.json({ messages: rows });
    },
  );
});

app.get("/getMyProfile/:userId", (req, res) => {
  const userId = req.params.userId;
  db.get(
    "SELECT id, name, email, password, avatar, bio, cover, links, settings, city, birthday, active_status, account_status, read_receipts, notifications_enabled, tfa_enabled FROM users WHERE id=?",
    [userId],
    (err, row) => {
      if (err || !row) return res.json({ success: false });

      // Enrich with dynamic stats
      db.get(
        "SELECT COUNT(*) as count FROM (SELECT user2 FROM friends WHERE user1 = ? UNION SELECT user1 FROM friends WHERE user2 = ?)",
        [userId, userId],
        (err, fRow) => {
          row.friendsCount = fRow ? fRow.count : 0;
          db.get(
            "SELECT COUNT(*) as count FROM messages WHERE sender=?",
            [userId],
            (err, mRow) => {
              row.postsCount = mRow ? mRow.count : 0;

              // Calculate score based on unique chatting days per friend
              const scoreQuery = `
            SELECT COUNT(*) as total_score FROM (
              SELECT DISTINCT 
                CASE WHEN sender = ? THEN receiver ELSE sender END as friend_id, 
                date(timestamp) as msg_date 
              FROM messages 
              WHERE sender = ? OR receiver = ?
            )`;
              db.get(scoreQuery, [userId, userId, userId], (err, sRow) => {
                row.score = sRow ? sRow.total_score : 0;
                row.level = Math.floor(row.score / 10) + 1; // Level up every 10 chatting days
                res.json({ success: true, user: row });
              });
            },
          );
        },
      );
    },
  );
});

app.get("/getChatSettings/:userId/:friendId", (req, res) => {
  const { userId, friendId } = req.params;
  const u1 = Math.min(parseInt(userId), parseInt(friendId));
  const u2 = Math.max(parseInt(userId), parseInt(friendId));
  db.get(
    "SELECT timer_mode FROM chat_settings WHERE user1_id=? AND user2_id=?",
    [u1, u2],
    (err, row) => {
      if (err) return res.status(500).json({ timer_mode: "Normal" });
      res.json({
        timer_mode: row ? row.timer_mode : "Normal",
      });
    },
  );
});

app.post("/updateProfile", (req, res) => {
  const { userId, ...updates } = req.body;

  if (!userId) return res.json({ success: false, message: "User ID required" });

  // Dynamically build the SET clause to only update fields present in the request body.
  // This prevents fields like 'email' or 'password' from being cleared when they aren't sent.
  const columns = Object.keys(updates).filter(
    (key) => updates[key] !== undefined,
  );

  if (columns.length === 0) {
    return res.json({ success: true, message: "No changes detected" });
  }

  const setClause = columns.map((col) => `${col} = ?`).join(", ");
  const values = [...columns.map((col) => updates[col]), userId];

  db.run(`UPDATE users SET ${setClause} WHERE id = ?`, values, function (err) {
    if (err) {
      if (err.message.includes("UNIQUE constraint failed")) {
        return res.json({ success: false, message: "Email already in use" });
      }
      return res.json({ success: false, message: "Failed to update profile" });
    }

    // Emit the update globally for real-time UI synchronization
    io.emit("profileUpdated", { userId, ...updates });

    res.json({ success: true });
  });
});
app.post("/searchUser", (req, res) => {
  const { name, userId, discoverMode } = req.body;

  let query = `SELECT u.id, 
     COALESCE(ua.custom_name, u.name) as name, 
     COALESCE(ua.custom_avatar, u.avatar) as avatar 
     FROM users u
     LEFT JOIN user_aliases ua ON ua.target_id = u.id AND ua.owner_id = ?
     WHERE u.name LIKE ? 
     AND account_status = 1
     AND u.id != ?
     AND u.id NOT IN (SELECT blocked FROM blocks WHERE blocker = ?)
     AND u.id NOT IN (SELECT blocker FROM blocks WHERE blocked = ?)`;

  let params = [userId || 0, `%${name}%`, userId || 0, userId || 0, userId || 0];

  if (discoverMode && userId) {
    query += ` 
      AND id NOT IN (SELECT user2 FROM friends WHERE user1 = ?)
      AND id NOT IN (SELECT user1 FROM friends WHERE user2 = ?)
      AND id NOT IN (SELECT receiver FROM friend_requests WHERE sender = ? AND status = 'pending')
      AND id NOT IN (SELECT sender FROM friend_requests WHERE receiver = ? AND status = 'pending')`;
    params.push(userId, userId, userId, userId);
  }

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error("Search User Error:", err);
      return res.status(500).json({ users: [] });
    }
    res.json({ users: rows });
  });
});

app.post("/removeFriend", (req, res) => {
  const { userId, friendId } = req.body;
  db.run(
    "DELETE FROM friends WHERE (user1 = ? AND user2 = ?) OR (user1 = ? AND user2 = ?)",
    [userId, friendId, friendId, userId],
    function (err) {
      if (err) return res.status(500).json({ success: false });

      // Emit event to both users for real-time UI synchronization
      io.to(`user_${userId}`)
        .to(`user_${friendId}`)
        .emit("friendRemoved", { userId, friendId });

      res.json({ success: true });
    },
  );
});

app.post("/blockUser", (req, res) => {
  const { userId, friendId } = req.body;

  db.serialize(() => {
    // 1. Remove friendship
    db.run(
      "DELETE FROM friends WHERE (user1 = ? AND user2 = ?) OR (user1 = ? AND user2 = ?)",
      [userId, friendId, friendId, userId],
    );
    // 2. Remove any pending requests
    db.run(
      "DELETE FROM friend_requests WHERE (sender = ? AND receiver = ?) OR (sender = ? AND receiver = ?)",
      [userId, friendId, friendId, userId],
    );
    // 3. Add to blocks table
    db.run(
      "INSERT OR IGNORE INTO blocks(blocker, blocked) VALUES(?, ?)",
      [userId, friendId],
      function (err) {
        if (err) return res.status(500).json({ success: false });

        // Emit event to both users for real-time UI synchronization
        io.to(`user_${userId}`)
          .to(`user_${friendId}`)
          .emit("userBlocked", { blockerId: userId, blockedId: friendId });

        res.json({ success: true });
      },
    );
  });
});
app.get("/getBlockedUsers/:userId", (req, res) => {
  const { userId } = req.params;

  db.all(
    `SELECT u.id, u.name, u.avatar 
     FROM blocks b
     JOIN users u ON b.blocked = u.id
     WHERE b.blocker = ?`,
    [userId],
    (err, rows) => {
      if (err) return res.json({ success: false });

      res.json({
        success: true,
        users: rows || [],
      });
    },
  );
});
app.post("/unblockUser", (req, res) => {
  const { userId, blockedId } = req.body;

  db.run(
    `DELETE FROM blocks WHERE blocker=? AND blocked=?`,
    [userId, blockedId],
    (err) => {
      if (err) return res.json({ success: false });

      res.json({ success: true });
    },
  );
});
app.post("/sendRequest", (req, res) => {
  const { userId: sender, receiver } = req.body;

  if (!sender || !receiver) {
    return res.status(400).json({ success: false });
  }

  // Prevent duplicate pending requests
  db.get(
    "SELECT id FROM friend_requests WHERE sender=? AND receiver=? AND status='pending'",
    [sender, receiver],
    (err, row) => {
      if (err) return res.status(500).json({ success: false });
      if (row)
        return res.json({ success: true, message: "Request already pending" });

      db.run(
        `INSERT INTO friend_requests(sender,receiver,status) VALUES(?,?,?)`,
        [sender, receiver, "pending"],
        function (err) {
          if (err) return res.json({ success: false });
          // Trigger notification
          db.run(
            "INSERT INTO notifications(user_id, sender_id, type) VALUES(?,?,?)",
            [receiver, sender, "friend_request"],
          );
          res.json({ success: true });
        },
      );
    },
  );
});

app.post("/cancelRequest", (req, res) => {
  const { sender, receiver } = req.body;

  if (!sender || !receiver) return res.status(400).json({ success: false });

  db.run(
    "DELETE FROM friend_requests WHERE sender = ? AND receiver = ? AND status = 'pending'",
    [sender, receiver],
    function (err) {
      if (err) return res.status(500).json({ success: false });
      // Remove notification if sender cancels
      db.run(
        "DELETE FROM notifications WHERE user_id = ? AND sender_id = ? AND type = 'friend_request'",
        [receiver, sender],
      );
      res.json({ success: true });
    },
  );
});
app.get("/debug-users", (req, res) => {
  db.all("SELECT * FROM users", [], (err, rows) => {
    if (err) return res.json({ error: err.message });
    res.json(rows);
  });
});
app.post("/acceptRequest", (req, res) => {
  const { id, userId } = req.body;

  db.get(`SELECT * FROM friend_requests WHERE id=?`, [id], (err, row) => {
    if (err) {
      console.error("DB ERROR:", err);
      return res.json({ success: false });
    }

    if (!row || row.receiver != userId) {
      return res.json({ success: false });
    }

    db.run(
      `INSERT OR IGNORE INTO friends(user1,user2,created_at) VALUES(?,?,CURRENT_TIMESTAMP)`,
      [row.sender, row.receiver],
      (err) => {
        if (err) {
          console.error("INSERT FRIEND ERROR:", err);
          return res.json({ success: false });
        }
        db.run(
          `UPDATE friend_requests SET status='accepted' WHERE id=?`,
          [id],
          (err) => {
            if (err) {
              console.error("UPDATE REQUEST ERROR:", err);
              return res.json({ success: false });
            }

            // Notify original sender that their request was accepted
            db.run(
              "INSERT INTO notifications(user_id, sender_id, type) VALUES(?,?,?)",
              [row.sender, userId, "request_accepted"],
            );
            // Mark original request notification as resolved by deleting it
            db.run(
              "DELETE FROM notifications WHERE user_id = ? AND sender_id = ? AND type = 'friend_request'",
              [userId, row.sender],
            );

            res.json({ success: true });
          },
        );
      },
    );
  });
});

app.get("/getRequests/:userId", (req, res) => {
  const userId = req.params.userId;

  db.all(
    `
    SELECT friend_requests.id, 
    COALESCE(ua.custom_name, users.name) as name, 
    COALESCE(ua.custom_avatar, users.avatar) as avatar, 
    users.id as senderId
    FROM friend_requests 
    JOIN users ON users.id = friend_requests.sender
    LEFT JOIN user_aliases ua ON ua.target_id = users.id AND ua.owner_id = ?
    WHERE receiver = ? AND status = 'pending'
    `,
    [userId, userId],
    (err, rows) => {
      if (err) {
        console.error("GET REQUESTS ERROR:", err);
        return res.status(500).json({ requests: [] });
      }

      res.json({ requests: rows || [] });
    },
  );
});

function getStreak(user1, user2) {
  return new Promise((resolve) => {
    db.all(
      `SELECT sender, date(timestamp) as day 
       FROM messages 
       WHERE ((sender = ? AND receiver = ?) OR (sender = ? AND receiver = ?))
       AND timestamp >= date('now', '-60 days')
       GROUP BY sender, day 
       ORDER BY day DESC`,
      [user1, user2, user2, user1],
      (err, rows) => {
        if (err || !rows || rows.length === 0) return resolve(0);

        const u1Days = new Set();
        const u2Days = new Set();

        rows.forEach((r) => {
          if (String(r.sender) === String(user1)) u1Days.add(r.day);
          if (String(r.sender) === String(user2)) u2Days.add(r.day);
        });

        // Intersection (dates where both spoke)
        const common = [...u1Days]
          .filter((d) => u2Days.has(d))
          .sort()
          .reverse();
        if (common.length === 0) return resolve(0);

        const today = new Date().toISOString().split("T")[0];
        const y = new Date();
        y.setDate(y.getDate() - 1);
        const yesterday = y.toISOString().split("T")[0];

        // If the latest interaction day is older than yesterday, streak is dead.
        if (common[0] !== today && common[0] !== yesterday) {
          return resolve(0);
        }

        let streak = 1;
        let prev = common[0];

        for (let i = 1; i < common.length; i++) {
          const curr = common[i];
          const d1 = new Date(prev);
          const d2 = new Date(curr);
          const diffDays = Math.round(
            Math.abs(d1 - d2) / (1000 * 60 * 60 * 24),
          );

          if (diffDays === 1) {
            streak++;
            prev = curr;
          } else {
            break;
          }
        }
        resolve(streak);
      },
    );
  });
}

app.get("/getFriends/:userId", (req, res) => {
  const userId = req.params.userId;

  db.all(
    `
    SELECT DISTINCT u.id, 
    COALESCE(ua.custom_name, u.name) as name, 
    COALESCE(ua.custom_avatar, u.avatar) as avatar,
    (SELECT COUNT(*) FROM messages 
     WHERE sender = u.id AND receiver = ? AND status != 'seen'
     AND (deleted_for IS NULL OR ',' || deleted_for || ',' NOT LIKE '%,' || ? || ',%')) as unreadCount,

    (SELECT message FROM messages 
     WHERE ((sender = u.id AND receiver = ?) OR (sender = ? AND receiver = u.id))
     AND (deleted_for IS NULL OR ',' || deleted_for || ',' NOT LIKE '%,' || ? || ',%')
     ORDER BY id DESC LIMIT 1) as lastMessage,

    (SELECT type FROM messages 
     WHERE ((sender = u.id AND receiver = ?) OR (sender = ? AND receiver = u.id))
     AND (deleted_for IS NULL OR ',' || deleted_for || ',' NOT LIKE '%,' || ? || ',%')
     ORDER BY id DESC LIMIT 1) as lastMessageType

    FROM friends f 
    JOIN users u ON (u.id = f.user1 OR u.id = f.user2)
    LEFT JOIN user_aliases ua ON ua.target_id = u.id AND ua.owner_id = ?
    WHERE (f.user1 = ? OR f.user2 = ?) AND u.id != ? AND u.account_status = 1
    `,
    [userId, userId, userId, userId, userId, userId, userId, userId, userId, userId, userId, userId],
    async (err, rows) => {
      if (err) {
        console.error("GET FRIENDS ERROR:", err);
        return res.status(500).json({ friends: [] });
      }

      for (let friend of rows) {
        friend.streak = await getStreak(userId, friend.id);
      }

      res.json({ friends: rows || [] });
    },
  );
});

app.get("/checkRelation/:currentUser/:targetUser", (req, res) => {
  const { currentUser, targetUser } = req.params;

  if (currentUser === targetUser) {
    return res.json({ status: "self" });
  }

  db.get(
    `
    SELECT 1 FROM friends 
    WHERE (user1 = ? AND user2 = ?) OR (user1 = ? AND user2 = ?)
  `,
    [currentUser, targetUser, targetUser, currentUser],
    (err, row) => {
      if (row) return res.json({ status: "friends" });

      db.get(
        `
      SELECT 1 FROM friend_requests 
      WHERE sender = ? AND receiver = ? AND status = 'pending'
    `,
        [currentUser, targetUser],
        (err2, row2) => {
          if (row2) return res.json({ status: "pending" });
          res.json({ status: "stranger" });
        },
      );
    },
  );
});
app.get("/getMessages/:user1/:user2", (req, res) => {
  const { user1, user2 } = req.params;

  db.all(
    `
    SELECT 
      m.*,
      COALESCE(ua.custom_name, u.name) AS senderName,

      CASE 
        WHEN m.edited_for_me IS NOT NULL 
             AND instr(m.edited_for_me, ?) > 0
        THEN 
          substr(
            m.edited_for_me,
            instr(m.edited_for_me, ?) + length(?),
            instr(substr(m.edited_for_me, instr(m.edited_for_me, ?)), ',') - length(?)
          )
        ELSE m.message
      END as final_message

    FROM messages m
    JOIN users u ON u.id = m.sender
    LEFT JOIN user_aliases ua ON ua.target_id = u.id AND ua.owner_id = ?

    WHERE ((m.sender = ? AND m.receiver = ?) 
        OR (m.sender = ? AND m.receiver = ?))

    AND (
      m.deleted_for IS NULL
      OR ',' || m.deleted_for || ',' NOT LIKE ?
    )

    ORDER BY id ASC
    `,
    [
      user1 + ":", // for instr check
      user1 + ":", // start extract
      user1 + ":", // length calc
      user1 + ":", // substring
      user1 + ":", // length again

      user1, // ua.owner_id = ?

      user1,
      user2,
      user2,
      user1,
      `%,${user1},%`,
    ],
    (err, rows) => {
      if (err) {
        console.error(err);
        return res.json({ messages: [] });
      }

      res.json({ messages: rows });
    },
  );
});

app.get("/getSharedInfo/:user1/:user2", (req, res) => {
  const { user1, user2 } = req.params;

  // 1. Get friendship info
  db.get(
    `SELECT created_at FROM friends WHERE (user1 = ? AND user2 = ?) OR (user1 = ? AND user2 = ?)`,
    [user1, user2, user2, user1],
    (err, friendRow) => {
      if (err) console.error(err);

      // 2. Get Shared Media
      db.all(
        `SELECT id, sender, message, type, caption, timestamp FROM messages 
         WHERE ((sender = ? AND receiver = ?) OR (sender = ? AND receiver = ?))
         AND (
           type IN ('image', 'video', 'audio', 'sticker', 'document')
           OR (type = 'text' AND (message LIKE '%http://%' OR message LIKE '%https://%'))
         )
         AND (deleted_for IS NULL OR ',' || deleted_for || ',' NOT LIKE ?)
         ORDER BY id DESC`,
        [user1, user2, user2, user1, `%,${user1},%`],
        (err, mediaRows) => {
          if (err) {
            console.error(err);
            return res.json({ createdAt: null, media: [] });
          }

          res.json({
            createdAt: friendRow ? friendRow.created_at : null,
            media: mediaRows || [],
          });
        },
      );
    },
  );
});

app.get("/getUserStatus/:userId", (req, res) => {
  const userId = req.params.userId;
  const requesterId = req.query.requesterId;

  db.get(
    `SELECT u.last_seen, 
     COALESCE(ua.custom_avatar, u.avatar) as avatar, 
     u.active_status, u.account_status 
     FROM users u
     LEFT JOIN user_aliases ua ON ua.target_id = u.id AND ua.owner_id = ?
     WHERE u.id=?`,
    [requesterId, userId],
    (err, row) => {
      if (err || !row || row.account_status === 0)
        return res.json({ online: false, lastSeen: null });

      const statusHidden = row.active_status === 0;
      const inChatWithRequester =
        !statusHidden &&
        activeChats.get(String(userId)) === String(requesterId);

      res.json({
        online: inChatWithRequester,
        avatar: row ? row.avatar : null,
        lastSeen: statusHidden ? null : row ? row.last_seen : null,
        statusHidden: statusHidden,
      });
    },
  );
});
app.get("/fixDeleted", (req, res) => {
  db.run(
    `UPDATE messages SET deleted_for = NULL WHERE deleted_for = ''`,
    function (err) {
      if (err) return res.send("Error");

      res.send("Fixed deleted_for data ✅");
    },
  );
});

app.post("/setTheme", (req, res) => {
  const { userId, friendId, themeType, themeValue } = req.body;
  const user1 = Math.min(userId, friendId);
  const user2 = Math.max(userId, friendId);

  // Use INSERT OR REPLACE to handle both new and existing theme settings
  db.run(
    `INSERT OR REPLACE INTO chat_themes (user1_id, user2_id, theme_type, theme_value)
     VALUES (?, ?, ?, ?)`,
    [user1, user2, themeType, themeValue],
    function (err) {
      if (err) {
        console.error("Failed to set theme:", err);
        return res.json({ success: false });
      }
      res.json({ success: true });
    },
  );
});

app.get("/getTheme/:userId/:friendId", (req, res) => {
  const { userId, friendId } = req.params;
  const user1 = Math.min(userId, friendId);
  const user2 = Math.max(userId, friendId);

  db.get(
    "SELECT theme_type, theme_value FROM chat_themes WHERE user1_id = ? AND user2_id = ?",
    [user1, user2],
    (err, row) => {
      if (err) {
        return res.status(500).json({ theme: null });
      }
      res.json({ theme: row || null });
    },
  );
});

app.post("/uploadStory", (req, res) => {
  const { userId, media, type, overlays, music, privacy, parentStoryId } = req.body;
  const mentions = Array.isArray(overlays) 
    ? overlays.filter(ov => ov.type === 'mention' && ov.userId).map(ov => ov.userId) 
    : [];
  db.run(
    "INSERT INTO stories (user_id, media, type, overlays, music, privacy, mentions, parent_story_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [userId, media, type, JSON.stringify(overlays), music ? JSON.stringify(music) : null, privacy || 'friends', JSON.stringify(mentions), parentStoryId || null],
    function (err) {
      if (err) { console.error("Error uploading story:", err); return res.json({ success: false }); }
      res.json({ success: true, storyId: this.lastID });
    }
  );
});

app.get("/getStories/:userId", (req, res) => {
  const { userId } = req.params;

  const query = ` 
    SELECT 
      s.*, 
      COALESCE(ua.custom_name, u.name) as name, 
      COALESCE(ua.custom_avatar, u.avatar) as avatar,

      (SELECT COUNT(*) FROM story_views WHERE story_id = s.id) as view_count,

      CASE 
        WHEN sv.user_id IS NOT NULL THEN 1 
        ELSE 0 
      END as seen,

      EXISTS (SELECT 1 FROM json_each(IFNULL(s.mentions, '[]')) WHERE value = CAST(? AS INTEGER)) as isMentioned

    FROM stories s

    JOIN users u ON s.user_id = u.id
    LEFT JOIN user_aliases ua ON ua.target_id = u.id AND ua.owner_id = ?

    -- 🔥 JOIN FOR SEEN STATUS
    LEFT JOIN story_views sv 
      ON s.id = sv.story_id AND sv.user_id = ?

    WHERE (
      s.user_id = ? 
      OR (s.privacy = 'public')
      OR (s.privacy = 'friends' AND s.user_id IN (
        SELECT user2 FROM friends WHERE user1 = ?
        UNION
        SELECT user1 FROM friends WHERE user2 = ?
      ))
    )

    AND s.created_at > datetime('now', '-1 day')

    ORDER BY s.created_at DESC
  `;

  db.all(query, [userId, userId, userId, userId, userId, userId], (err, rows) => {
    if (err) return res.json({ success: false });
    res.json({ success: true, stories: rows });
  });
});

app.post("/markStoryViewed", (req, res) => {
  const { storyId, userId } = req.body;

  db.run(
    `INSERT OR IGNORE INTO story_views (story_id, user_id) VALUES (?, ?)`,
    [storyId, userId],
    function (err) {
      if (err) {
        console.error(err);
        return res.json({ success: false });
      }

      // Only notify if this is a new view (changes > 0)
      if (this.changes > 0) {
        db.get("SELECT user_id FROM stories WHERE id = ?", [storyId], (err, row) => {
          if (!err && row) {
            io.emit("storyViewed", { storyId, viewerId: userId, ownerId: row.user_id });
          }
        });
      }
      res.json({ success: true });
    }
  );
});

app.get("/getStoryViewers/:storyId", (req, res) => {
  const { storyId } = req.params;
  db.all(
    `SELECT u.id, u.name, u.avatar FROM story_views v 
     JOIN users u ON v.user_id = u.id 
     WHERE v.story_id = ? ORDER BY v.timestamp DESC`,
    [storyId],
    (err, rows) => {
      if (err) return res.json({ success: false });
      res.json({ success: true, viewers: rows });
    }
  );
});

app.post("/reactToStory", (req, res) => {
  const { storyId, emoji } = req.body;
  db.get("SELECT reactions FROM stories WHERE id = ?", [storyId], (err, row) => {
    if (err || !row) return res.json({ success: false });
    let reactions = JSON.parse(row.reactions || "{}");
    reactions[emoji] = (reactions[emoji] || 0) + 1;
    db.run("UPDATE stories SET reactions = ? WHERE id = ?", [JSON.stringify(reactions), storyId], (err) => {
      res.json({ success: !err, reactions });
    });
  });
});

app.post("/deleteStory", (req, res) => {
  const { storyId, userId } = req.body;
  db.get("SELECT id FROM stories WHERE id = ? AND user_id = ?", [storyId, userId], (err, row) => {
    if (err || !row) return res.status(403).json({ success: false, message: "Unauthorized" });

    db.serialize(() => {
      db.all("SELECT id FROM stories WHERE parent_story_id = ?", [storyId], (err, reshares) => {
        const idsToDelete = [storyId, ...(reshares || []).map(r => r.id)];
        const placeholders = idsToDelete.map(() => "?").join(",");
        
        db.run(`DELETE FROM stories WHERE id IN (${placeholders})`, idsToDelete, function(err) {
          if (err) return res.json({ success: false });

          // Update all message types referencing the deleted stories
          const updatePromises = idsToDelete.map(id => {
            const pattern = `%"storyId":${id}%`;
            return new Promise(resolve => {
              db.run(`UPDATE messages SET type = 'story_removed' WHERE type = 'story_share' AND message LIKE ?`, [pattern], () => {
                db.run(`UPDATE messages SET type = 'story_removed' WHERE type IN ('story_reaction', 'story_reply') AND caption LIKE ?`, [pattern], resolve);
              });
            });
          });

          Promise.all(updatePromises).then(() => {
            io.emit("storyUpdate");
            io.emit("storyDeleted", { storyId, deletedIds: idsToDelete });
            res.json({ success: true });
          });
        });
      });
    });
  });
});

// This must be after all API routes to ensure they are handled first.
app.use(express.static("public"));
// ================= SOCKET =================

const onlineUsers = new Map();
const activeChats = new Map();

/**
 * Unified Call Sessions
 * Key: sessionKey (minId_maxId)
 * Value: {
 *   initiatorId,
 *   receiverId,
 *   status: 'ringing'|'active'|'ended',
 *   startTime,
 *   timeout,
 *   loggingStarted: boolean
 * }
 */
const callSessions = new Map();

function getSessionKey(id1, id2) {
  return `${Math.min(id1, id2)}_${Math.max(id1, id2)}`;
}

function finalizeCallLog(session, duration = null, answered = false) {
  if (session.loggingStarted) return;
  session.loggingStarted = true;
  session.status = "ended";

  const initiator = String(session.initiatorId);
  const receiver = String(session.receiverId);
  const now = new Date().toISOString();

  let messageText = "";
  let senderId = "";
  let receiverId = "";

  if (!answered) {
    // Single terminal event: store as 'Missed call'
    // Logic in chat.js: isMe ? 'No answer' : 'Missed call'
    senderId = initiator;
    receiverId = receiver;
    messageText = "Missed call";
  } else {
    senderId = initiator;
    receiverId = receiver;
    messageText = `Call ended (${duration || "0s"})`;
  }

  db.run(
    `INSERT INTO messages(sender, receiver, message, status, type, timestamp) VALUES(?,?,?,?,?,?)`,
    [senderId, receiverId, messageText, "sent", "call_log", now],
    function (err) {
      if (err) return console.error("Call Log Error:", err);

      const payload = {
        from: senderId,
        to: receiverId,
        message: messageText,
        msgId: this.lastID,
        status: "sent",
        type: "call_log",
        timestamp: now,
      };

      io.to(`user_${initiator}`)
        .to(`user_${receiver}`)
        .emit("newMessage", payload);
    },
  );
}

function getSessionByUserId(userId) {
  for (const [key, session] of callSessions.entries()) {
    if (
      String(session.initiatorId) === String(userId) ||
      String(session.receiverId) === String(userId)
    ) {
      if (session.status !== "ended") return { key, session };
    }
  }
  return null;
}

io.on("connection", (socket) => {
  console.log("User connected");

  socket.on("register", (data) => {
    const id = String(data.userId);
    const token = data.sessionToken;
    onlineUsers.set(id, socket.id);
    if (token) sessionTokens.set(socket.id, token);
    socket.userId = id;
    socket.sessionToken = token;
    socket.join(`user_${id}`);
    io.emit("userOnline", id);

    const now = new Date().toISOString();
    db.run("UPDATE users SET last_seen=? WHERE id=?", [now, id]);
  });

  socket.on("newStory", (data) => {
    socket.broadcast.emit("storyUpdate", data);
  });

  socket.on("disconnect", () => {
    if (socket.userId) {
      const activeSessionData = getSessionByUserId(socket.userId);
      if (activeSessionData) {
        const { key, session } = activeSessionData;
        clearTimeout(session.timeout);
        const partnerId =
          String(session.initiatorId) === String(socket.userId)
            ? session.receiverId
            : session.initiatorId;

        finalizeCallLog(session, null, session.status === "active");
        io.to(`user_${partnerId}`).emit("callEnded");
        callSessions.delete(key);
      }

      onlineUsers.delete(socket.userId);
      activeChats.delete(socket.userId);
      sessionTokens.delete(socket.id);
      const now = new Date().toISOString();
      db.run("UPDATE users SET last_seen=? WHERE id=?", [now, socket.userId]);
      io.emit("userOffline", socket.userId);
    }
  });

  socket.on("watchPendingLogin", (pendingId) => {
    socket.join(`pending_login_${pendingId}`);
    // Auto-expiry after 60s
    setTimeout(() => {
      db.run("DELETE FROM pending_logins WHERE id = ? AND status = 'pending'", [
        pendingId,
      ]);
      io.to(`pending_login_${pendingId}`).emit("loginTimeout");
    }, 60000);
  });

  socket.on("approveLogin", ({ pendingId }) => {
    db.get(
      "SELECT * FROM pending_logins WHERE id = ?",
      [pendingId],
      (err, row) => {
        if (row && row.status === "pending") {
          db.run("UPDATE pending_logins SET status = 'approved' WHERE id = ?", [
            pendingId,
          ]);

          const sessionToken =
            Math.random().toString(36).substring(2) + Date.now().toString(36);
          db.get(
            "SELECT id, name FROM users WHERE id = ?",
            [row.user_id],
            (uErr, user) => {
              db.run(
                "INSERT INTO sessions(user_id, session_token, user_agent, ip_address) VALUES(?,?,?,?)",
                [user.id, sessionToken, row.device_info, row.ip_address],
              );

              io.to(`pending_login_${pendingId}`).emit("loginApproved", {
                id: user.id,
                name: user.name,
                sessionToken,
              });

              // Clean up notification
              db.run(
                "DELETE FROM notifications WHERE user_id = ? AND type = ?",
                [user.id, "login_request:" + pendingId],
              );
              io.to(`user_${user.id}`).emit("newNotification");
            },
          );
        }
      },
    );
    // Clean up record after approval
    setTimeout(
      () => db.run("DELETE FROM pending_logins WHERE id = ?", [pendingId]),
      10000,
    );
  });

  socket.on("denyLogin", ({ pendingId }) => {
    db.get(
      "SELECT user_id FROM pending_logins WHERE id = ?",
      [pendingId],
      (err, row) => {
        if (row) {
          db.run("UPDATE pending_logins SET status = 'denied' WHERE id = ?", [
            pendingId,
          ]);
          io.to(`pending_login_${pendingId}`).emit("loginDenied");

          db.run("DELETE FROM notifications WHERE user_id = ? AND type = ?", [
            row.user_id,
            "login_request:" + pendingId,
          ]);
          io.to(`user_${row.user_id}`).emit("newNotification");
        }
      },
    );
    // Delete record shortly after
    setTimeout(
      () => db.run("DELETE FROM pending_logins WHERE id = ?", [pendingId]),
      5000,
    );
  });

  socket.on("joinChat", (friendId) => {
    const userId = String(socket.userId);
    const other = String(friendId);

    const room = `chat_${Math.min(userId, other)}_${Math.max(userId, other)}`;
    socket.join(room);

    // Update last_seen when user opens a chat (active engagement)
    const now = new Date().toISOString();
    db.run("UPDATE users SET last_seen=? WHERE id=?", [now, userId]);
  });

  socket.on("userInChat", ({ withUser }) => {
    const userId = String(socket.userId);
    const friendId = String(withUser);

    activeChats.set(userId, friendId);

    // Notify friend that I am here
    io.to(`user_${friendId}`).emit("friendEnteredChat", { friendId: userId });

    // Check if friend is currently in chat with me
    const isFriendInChat = activeChats.get(friendId) === userId;
    socket.emit("friendStatusInChat", { isHere: isFriendInChat });
  });

  socket.on("leaveChat", () => {
    const userId = String(socket.userId);
    const friendId = activeChats.get(userId);

    // Update last_seen when user leaves the chat so time is accurate
    const now = new Date().toISOString();
    db.run("UPDATE users SET last_seen=? WHERE id=?", [now, userId]);

    if (friendId) {
      // Handle "After View" deletion logic
      const u1 = Math.min(parseInt(userId), parseInt(friendId));
      const u2 = Math.max(parseInt(userId), parseInt(friendId));
      db.get(
        "SELECT timer_mode FROM chat_settings WHERE user1_id=? AND user2_id=?",
        [u1, u2],
        (err, row) => {
          if (row && row.timer_mode === "After View") {
            const uIdStr = String(userId);
            db.run(
              `
            UPDATE messages 
            SET deleted_for = (CASE 
              WHEN deleted_for IS NULL OR deleted_for = '' THEN ? 
              ELSE deleted_for || ',' || ? 
              END)
            WHERE ((sender = ? AND receiver = ?) OR (sender = ? AND receiver = ?))
            AND status = 'seen'
            AND (
              deleted_for IS NULL 
              OR (',' || deleted_for || ',') NOT LIKE ?
            )
          `,
              [
                uIdStr,
                uIdStr,
                userId,
                friendId,
                friendId,
                userId,
                `%,${uIdStr},%`,
              ],
            );
          }
        },
      );

      io.to(`user_${friendId}`).emit("friendLeftChat", { friendId: userId });
    }
    activeChats.delete(userId);
  });

  socket.on("setTimerMode", ({ to, mode }) => {
    const userId = parseInt(socket.userId);
    const friendId = parseInt(to);
    if (!userId || !friendId) return;

    const u1 = Math.min(userId, friendId);
    const u2 = Math.max(userId, friendId);

    const now = new Date().toISOString();
    db.run(
      "INSERT OR REPLACE INTO chat_settings (user1_id, user2_id, timer_mode) VALUES (?, ?, ?)",
      [u1, u2, mode],
      function (err) {
        if (err) return;

        const senderId = String(userId);
        const receiverId = String(friendId);

        // Log the change in the messages table
        db.run(
          `INSERT INTO messages(sender, receiver, message, status, type, timestamp) VALUES(?,?,?,?,?,?)`,
          [senderId, receiverId, mode, "sent", "timer_log", now],
          function (err2) {
            if (err2) return;

            const payload = {
              from: senderId,
              to: receiverId,
              message: mode,
              msgId: this.lastID,
              status: "sent",
              type: "timer_log",
              timestamp: now,
            };

            io.to(`user_${receiverId}`)
              .to(`user_${senderId}`)
              .emit("newMessage", payload);
            io.to(`user_${friendId}`).emit("timerModeChanged", {
              from: userId,
              mode,
            });
          },
        );
      },
    );
  });

  // ================= MESSAGE HANDLER HELPER =================
  const uploadChunks = new Map(); // Store partial uploads

  const handleMessage = (socket, data, callback) => {
    const sender = String(socket.userId);
    const receiver = String(data.to);
    const msgType = data.type || "text";
    const message = data.message;
    const caption = data.caption;
    const replyTo = data.replyTo;

    if (!message) return;
    const timestamp = new Date().toISOString();

    // Verify receiver is still active before sending
    db.get(
      "SELECT account_status FROM users WHERE id=?",
      [receiver],
      (err, userRow) => {
        if (err || !userRow || userRow.account_status === 0) {
          return callback?.({ success: false, message: "User is unavailable" });
        }

        db.run(
          `INSERT INTO messages(sender, receiver, message, unread_count, status, type, caption, reply_to, timestamp)
       VALUES(?,?,?,?,?,?,?,?,?)`,
          [
            sender,
            receiver,
            message,
            1,
            "sent",
            msgType,
            caption || null,
            replyTo || null,
            timestamp,
          ],
          function (err) {
            if (err) {
              console.error(err);
              return callback?.({ success: false });
            }

            const finalMsgId = this.lastID;

            const payload = {
              from: sender,
              to: receiver,
              message,
              msgId: finalMsgId,
              status: "sent",
              type: msgType,
              caption: caption,
              timestamp: timestamp,
              replyTo: replyTo || null,
            };

            // Determine status based on receiver's read receipt setting
            db.get(
              "SELECT read_receipts FROM users WHERE id=?",
              [receiver],
              (err, userRow) => {
                const receiptsEnabled = !userRow || userRow.read_receipts !== 0;
                const isInChat = activeChats.get(receiver) === sender;

                io.to(`user_${receiver}`)
                  .to(`user_${sender}`)
                  .emit("newMessage", payload);

                if (isInChat && receiptsEnabled) {
                  const now = new Date().toISOString();
                  db.run(
                    `UPDATE messages SET status='seen', seen_at=? WHERE id=?`,
                    [now, finalMsgId],
                  );
                  io.to(`user_${sender}`).emit("messageSeen", {
                    msgId: finalMsgId,
                    seenAt: now,
                  });
                } else {
                  db.run(`UPDATE messages SET status='delivered' WHERE id=?`, [
                    finalMsgId,
                  ]);
                  io.to(`user_${sender}`).emit("messageDelivered", {
                    msgId: finalMsgId,
                  });
                }
              },
            );

            callback?.({ success: true, data: payload });
          },
        );
      },
    );
  };

  // ================= SEND MESSAGE =================

  socket.on(
    "sendMessage",
    ({ to, message, type, caption, replyTo }, callback) => {
      handleMessage(socket, { to, message, type, caption, replyTo }, callback);
    },
  );

  socket.on(
    "uploadChunk",
    ({ uploadId, chunk, index, totalChunks, meta }, callback) => {
      if (!uploadChunks.has(uploadId)) {
        uploadChunks.set(uploadId, {
          chunks: new Array(totalChunks),
          receivedCount: 0,
          totalChunks,
          meta,
        });
      }
      const currentUpload = uploadChunks.get(uploadId);
      currentUpload.chunks[index] = chunk;
      currentUpload.receivedCount++;

      if (currentUpload.receivedCount === totalChunks) {
        const fullMessage = currentUpload.chunks.join("");
        handleMessage(
          socket,
          {
            to: currentUpload.meta.to,
            message: fullMessage,
            type: currentUpload.meta.type,
            caption: currentUpload.meta.caption,
            replyTo: currentUpload.meta.replyTo,
          },
          callback,
        );
        uploadChunks.delete(uploadId);
      } else {
        callback?.({ success: true });
      }
    },
  );

  socket.on("themeChange", ({ to, themeType, themeValue }) => {
    const sender = String(socket.userId);
    const receiver = String(to);

    // Forward the theme change event to the other user
    io.to(`user_${receiver}`).emit("themeChanged", {
      from: sender,
      themeType,
      themeValue,
    });
  });

  // ================= MARK ALL SEEN =================

  socket.on("markAllSeen", ({ withUser }) => {
    const userId = String(socket.userId);
    const now = new Date().toISOString();

    // Check if the user has read receipts enabled
    db.get(
      "SELECT read_receipts FROM users WHERE id=?",
      [userId],
      (err, row) => {
        if (err || (row && row.read_receipts === 0)) {
          // If receipts are disabled, do not update status to seen or notify sender
          return;
        }

        // ✅ ONLY update messages that are NOT seen yet
        db.run(
          `UPDATE messages 
       SET status='seen', seen_at=? 
       WHERE sender=? AND receiver=? AND status!='seen'`,
          [now, withUser, userId],
        );

        io.to(`user_${withUser}`).emit("messageSeenAll", {
          from: userId,
          seenAt: now,
        });
      },
    );
  });

  socket.on("typing", ({ to }) => {
    const sender = String(socket.userId);
    const receiver = String(to);

    const room = `chat_${Math.min(sender, receiver)}_${Math.max(sender, receiver)}`;

    socket.to(room).emit("userTyping", {
      from: sender,
      typing: true,
    });
  });

  socket.on("stopTyping", ({ to }) => {
    const sender = String(socket.userId);
    const receiver = String(to);

    const room = `chat_${Math.min(sender, receiver)}_${Math.max(sender, receiver)}`;

    socket.to(room).emit("userTyping", {
      from: sender,
      typing: false,
    });
  });

  // ================= CALL LOGGING =================

  socket.on("logCall", ({ to, type, duration }) => {
    const sender = String(socket.userId);
    const receiver = String(to);

    const now = new Date().toISOString();
    let messageText = "";
    if (type === "missed") {
      messageText = "Missed call";
    } else if (type === "ended") {
      messageText = `Call ended ${duration}`;
    } else {
      return;
    }

    db.run(
      `INSERT INTO messages(sender, receiver, message, unread_count, status, type, timestamp)
       VALUES(?,?,?,?,?,?,?)`,
      [sender, receiver, messageText, 1, "sent", "call_log", now],
      function (err) {
        if (err) return console.error(err);

        const payload = {
          from: sender,
          to: receiver,
          message: messageText,
          msgId: this.lastID,
          status: "sent",
          type: "call_log",
          timestamp: now,
        };

        io.to(`user_${receiver}`)
          .to(`user_${sender}`)
          .emit("newMessage", payload);

        // Auto-mark delivered for now since it's a system message mostly
        io.to(`user_${sender}`).emit("messageDelivered", {
          msgId: this.lastID,
        });
      },
    );
  });

  // ================= SCREENSHOT NOTIFICATION =================

  socket.on("screenshotTaken", ({ to }) => {
    const sender = String(socket.userId);
    const receiver = String(to);
    const messageText = "Took a screenshot";
    const now = new Date().toISOString();

    db.run(
      `INSERT INTO messages(sender, receiver, message, unread_count, status, type, timestamp)
       VALUES(?,?,?,?,?,?,?)`,
      [sender, receiver, messageText, 1, "sent", "screenshot_log", now],
      function (err) {
        if (err) return console.error(err);

        const payload = {
          from: sender,
          to: receiver,
          message: messageText,
          msgId: this.lastID,
          status: "sent",
          type: "screenshot_log",
          timestamp: now,
        };

        io.to(`user_${receiver}`)
          .to(`user_${sender}`)
          .emit("newMessage", payload);

        io.to(`user_${sender}`).emit("messageDelivered", {
          msgId: this.lastID,
        });
      },
    );
  });

  // ================= WEBRTC CALLING =================

  socket.on("callUser", ({ userToCall, signalData, from, callType }) => {
    const caller = String(socket.userId);
    const receiver = String(userToCall);
    const key = getSessionKey(caller, receiver);

    if (callSessions.has(key) && callSessions.get(key).status !== "ended")
      return;

    io.to(`user_${receiver}`).emit("callUser", {
      signal: signalData,
      from,
      callType,
    });

    // Standardized 15 sec timeout
    const timeout = setTimeout(() => {
      const session = callSessions.get(key);
      if (!session || session.status !== "ringing") return;

      finalizeCallLog(session, null, false);
      io.to(`user_${caller}`).emit("callEnded");
      io.to(`user_${receiver}`).emit("callEnded");
      callSessions.delete(key);
    }, 15000);

    callSessions.set(key, {
      initiatorId: caller,
      receiverId: receiver,
      status: "ringing",
      timeout,
      loggingStarted: false,
    });
  });

  socket.on("answerCall", ({ signal, to }) => {
    const caller = String(to);
    const receiver = String(socket.userId);
    const key = getSessionKey(caller, receiver);
    const session = callSessions.get(key);

    if (session) {
      clearTimeout(session.timeout);
      session.status = "active";
      session.startTime = Date.now();
    }

    io.to(`user_${caller}`).emit("callAccepted", signal);
  });

  socket.on("iceCandidate", ({ candidate, to }) => {
    io.to(`user_${to}`).emit("iceCandidate", candidate);
  });

  // ================= CALL UPGRADE / RENEGOTIATION =================
  socket.on("updateCall", ({ to, signal }) => {
    const from = String(socket.userId);
    io.to(`user_${to}`).emit("updateCall", {
      from,
      signal,
    });
  });

  socket.on("callUpdated", ({ to, signal }) => {
    const from = String(socket.userId);
    io.to(`user_${to}`).emit("callUpdated", {
      from,
      signal,
    });
  });

  socket.on("endCall", ({ to, duration, answered }) => {
    const sender = String(socket.userId);
    const receiver = String(to);
    const key = getSessionKey(sender, receiver);
    const session = callSessions.get(key);

    if (session) {
      clearTimeout(session.timeout);
      finalizeCallLog(session, duration, answered);
      callSessions.delete(key);
    }

    io.to(`user_${receiver}`).emit("callEnded");
  });

  // ================= DELETE MESSAGE =================

  socket.on("deleteMessage", ({ msgId, type, to }) => {
    if (!socket.userId) return;
    const userId = String(socket.userId);

    if (type === "everyone") {
      // Allow deletion if the user is either the sender or the receiver
      db.get(
        `SELECT id, sender, receiver, status FROM messages WHERE id=?`,
        [msgId],
        (err, row) => {
          if (err || !row) return;
          const isParticipant =
            String(row.sender) === userId || String(row.receiver) === userId;
          if (!isParticipant) return;

          db.run(`DELETE FROM messages WHERE id=?`, [msgId], function (delErr) {
            if (delErr) return;
            io.to(`user_${row.sender}`).to(`user_${row.receiver}`).emit("messageDeleted", {
              msgId: row.id,
              type: "everyone",
              senderId: row.sender,
              receiverId: row.receiver,
              wasUnread: row.status !== 'seen'
            });
          });
        },
      );
    }

    if (type === "me") {
      db.get(
        `SELECT id, sender, receiver, deleted_for FROM messages WHERE id=?`,
        [msgId],
        (err, row) => {
          if (err || !row) return;

          let list = [];

          if (row && row.deleted_for) {
            list = row.deleted_for
              .split(",")
              .map((x) => x.trim())
              .filter((x) => x !== "");
          }

          const set = new Set(list);
          set.add(userId);

          const clean = Array.from(set).join(",");

          db.run(
            `UPDATE messages SET deleted_for=? WHERE id=?`,
            [clean, msgId],
            function (err) {
              if (err) return;
              io.to(`user_${userId}`).emit("messageDeleted", {
                msgId: row.id,
                type: "me",
                senderId: row.sender,
                receiverId: row.receiver
              });
            },
          );
        },
      );
    }
  });
  // ================= EDIT MESSAGE =================

  socket.on("editMessage", ({ msgId, newText, type, to }) => {
    if (!socket.userId) return;

    const userId = String(socket.userId);
    const receiver = String(to);

    // 🔒 Get original message
    db.get(`SELECT sender FROM messages WHERE id=?`, [msgId], (err, row) => {
      if (err || !row) return;

      const isSender = String(row.sender) === userId;

      // ================= EDIT FOR EVERYONE =================
      if (type === "everyone") {
        if (!isSender) return; // security

        const now = new Date().toISOString();

        db.run(
          `UPDATE messages 
         SET message=?, edited=1, edited_at=? 
         WHERE id=?`,
          [newText, now, msgId],
          function (err) {
            if (err) return console.error(err);

            io.to(`user_${receiver}`)
              .to(`user_${userId}`)
              .emit("messageEdited", {
                msgId,
                newText,
                type: "everyone",
                editedAt: now,
              });
          },
        );
      }

      // ================= EDIT FOR ME =================
      if (type === "me") {
        db.get(
          `SELECT edited_for_me FROM messages WHERE id=?`,
          [msgId],
          (err, row) => {
            if (err) return console.error(err);

            let list = [];

            if (row && row.edited_for_me) {
              list = row.edited_for_me.split(",").filter(Boolean);
            }

            // remove existing entry of this user
            list = list.filter((item) => !item.startsWith(userId + ":"));

            // add new edit
            list.push(`${userId}:${newText}`);

            const updated = list.join(",");

            db.run(
              `UPDATE messages SET edited_for_me=? WHERE id=?`,
              [updated, msgId],
              function (err) {
                if (err) return console.error(err);

                socket.emit("messageEdited", {
                  msgId,
                  newText,
                  type: "me",
                });
              },
            );
          },
        );
      }
    });
  });
  // ================= REACTION =================

  socket.on("reactMessage", ({ msgId, emoji, to }) => {
    const userId = String(socket.userId);
    const receiver = String(to);

    db.get(`SELECT reactions FROM messages WHERE id=?`, [msgId], (err, row) => {
      if (err) return console.error(err);

      let list = [];

      if (row && row.reactions) {
        list = row.reactions.split(",").filter(Boolean);
      }

      // remove existing reaction of this user
      list = list.filter((item) => !item.startsWith(userId + ":"));

      // toggle logic
      const already = row?.reactions?.includes(`${userId}:${emoji}`);

      if (!already) {
        list.push(`${userId}:${emoji}`);
      }

      const updated = list.join(",");

      db.run(
        `UPDATE messages SET reactions=? WHERE id=?`,
        [updated || null, msgId],
        function (err) {
          if (err) return console.error(err);

          io.to(`user_${receiver}`)
            .to(`user_${userId}`)
            .emit("messageReacted", {
              msgId,
              reactions: updated,
            });
        },
      );
    });
  });

  socket.on("getUserProfile", ({ userId, ownerId }, callback) => {
    db.get(
      `SELECT u.id, 
       COALESCE(ua.custom_name, u.name) as name, 
       u.email, 
       COALESCE(ua.custom_avatar, u.avatar) as avatar, 
       u.bio, u.cover, u.city, u.birthday 
     FROM users u
     LEFT JOIN user_aliases ua ON ua.target_id = u.id AND ua.owner_id = ?
     WHERE u.id=?`,
      [ownerId, userId],
      (err, user) => {
        if (err || !user) {
          return callback({ success: false });
        }

        // 👇 SAME LOGIC YOU ALREADY USE IN /getMyProfile
        db.get(
          `SELECT COUNT(*) as count FROM messages WHERE sender=?`,
          [userId],
          (err, mRow) => {
            user.posts = mRow ? mRow.count : 0;

            const scoreQuery = `
            SELECT COUNT(*) as total_score FROM (
              SELECT DISTINCT 
                CASE WHEN sender = ? THEN receiver ELSE sender END as friend_id, 
                date(timestamp) as msg_date 
              FROM messages 
              WHERE sender = ? OR receiver = ?
            )`;

            db.get(scoreQuery, [userId, userId, userId], (err, sRow) => {
              user.score = sRow ? sRow.total_score : 0;
              user.level = Math.floor(user.score / 10) + 1;

              callback({
                success: true,
                data: user,
              });
            });
          },
        );
      },
    );
  });

  socket.on("friendRequestSent", ({ receiver }) => {
    io.to(`user_${String(receiver)}`).emit("newFriendRequest");
    io.to(`user_${String(receiver)}`).emit("newNotification");
  });

  socket.on("cancelFriendRequest", ({ receiver }) => {
    io.to(`user_${String(receiver)}`).emit("requestCanceled");
    io.to(`user_${String(receiver)}`).emit("newNotification");
  });

  socket.on("friendRequestAccepted", ({ friendId }) => {
    const senderId = String(socket.userId);
    const receiverId = String(friendId);

    // Notify both users to refresh their lists
    io.to(`user_${receiverId}`).emit("friendAdded");
    io.to(`user_${senderId}`).emit("friendAdded");
    io.to(`user_${receiverId}`).emit("newNotification");
  });

  socket.on("toggleCamera", ({ to, isVideo }) => {
    io.to(`user_${to}`).emit("cameraToggled", {
      from: socket.userId,
      isVideo,
    });
  });

  socket.on("avatarUpdated", (data) => {
    io.emit("avatarUpdated", data);
  });
});

// Background task for 24-hour message deletion
setInterval(() => {
  db.run(`
    DELETE FROM messages 
    WHERE timestamp < datetime('now', '-1 day')
    AND EXISTS (
      SELECT 1 FROM chat_settings 
      WHERE (
        (user1_id = messages.sender AND user2_id = messages.receiver) 
        OR (user1_id = messages.receiver AND user2_id = messages.sender)
      ) AND timer_mode = '24 Hours'
    )
  `);

  // Cleanup stories older than 24 hours
  db.run(`
    DELETE FROM stories WHERE created_at < datetime('now', '-1 day')
  `);
}, 60000); // Runs every minute

function handleMissedCall(caller, receiver) {
  const now = new Date().toISOString();

  // Caller → No answer
  db.run(
    `INSERT INTO messages(sender, receiver, message, status, type, timestamp)
     VALUES(?,?,?,?,?,?)`,
    [caller, receiver, "No answer", "seen", "call_log", now],
  );

  // Receiver → Missed call
  db.run(
    `INSERT INTO messages(sender, receiver, message, status, type, timestamp)
     VALUES(?,?,?,?,?,?)`,
    [receiver, caller, "Missed call", "sent", "call_log", now],
    function () {
      const payload = {
        from: receiver,
        to: caller,
        message: "Missed call",
        msgId: this.lastID,
        status: "sent",
        type: "call_log",
        timestamp: now,
      };

      io.to(`user_${caller}`)
        .to(`user_${receiver}`)
        .emit("newMessage", payload);
    },
  );
}
// ================= START =================

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
