const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const cors = require("cors");
const http = require("http");

const app = express();
app.use(express.json({ limit: "100mb" }));
app.use(cors());
app.use(bodyParser.json({ limit: "100mb" }));
app.use(express.static("public"));

const server = http.createServer(app);
const io = require("socket.io")(server, {
  maxHttpBufferSize: 1e8, // 100 MB
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const db = new sqlite3.Database("./users.db");

// ================= DB TABLES =================

db.run(`
CREATE TABLE IF NOT EXISTS users(
id INTEGER PRIMARY KEY AUTOINCREMENT,
name TEXT,
email TEXT UNIQUE,
password TEXT
)
`);

// Add last_seen column if it doesn't exist
db.run("ALTER TABLE users ADD COLUMN last_seen DATETIME", (err) => {
  if (err && !err.message.includes("duplicate column name")) {
    // Ignore error if column already exists
  }
});

db.run(`
CREATE TABLE IF NOT EXISTS friends(
id INTEGER PRIMARY KEY AUTOINCREMENT,
user1 INTEGER,
user2 INTEGER
)
`);

db.run("ALTER TABLE friends ADD COLUMN created_at DATETIME", (err) => {
  if (err && !err.message.includes("duplicate column name")) {
  }
});

db.run(`
CREATE TABLE IF NOT EXISTS friend_requests(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sender INTEGER,
  receiver INTEGER,
  status TEXT
)
`);

// 🔥 UPDATED TABLE (added seen_at safely)
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

// Add type column if it doesn't exist
db.run("ALTER TABLE messages ADD COLUMN type TEXT DEFAULT 'text'", (err) => {
  if (err && !err.message.includes("duplicate column name")) {
    // Ignore
  }
});
db.run("ALTER TABLE messages ADD COLUMN deleted_for TEXT", (err) => {
  if (err && !err.message.includes("duplicate column name")) {
  }
});

// Add caption column if it doesn't exist
db.run("ALTER TABLE messages ADD COLUMN caption TEXT", (err) => {
  if (err && !err.message.includes("duplicate column name")) {
  }
});
db.run("ALTER TABLE messages ADD COLUMN edited INTEGER DEFAULT 0", (err) => {
  if (err && !err.message.includes("duplicate column name")) {
  }
});

db.run("ALTER TABLE messages ADD COLUMN edited_at DATETIME", (err) => {
  if (err && !err.message.includes("duplicate column name")) {
  }
});
db.run("ALTER TABLE messages ADD COLUMN edited_for_me TEXT", (err) => {
  if (err && !err.message.includes("duplicate column name")) {
  }
});
db.run("ALTER TABLE messages ADD COLUMN reactions TEXT", (err) => {
  if (err && !err.message.includes("duplicate column name")) {
  }
});
db.run("ALTER TABLE messages ADD COLUMN reply_to INTEGER", (err) => {
  if (err && !err.message.includes("duplicate column name")) {
  }
});
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

// Backfill created_at for old friendships without a date
db.all(
  `SELECT id, user1, user2 FROM friends WHERE created_at IS NULL`,
  [],
  (err, rows) => {
    if (err) {
      console.error("Error fetching old friendships to backfill:", err);
      return;
    }
    if (rows && rows.length > 0) {
      console.log(`Backfilling friendship dates for ${rows.length} friends...`);
      rows.forEach((friendship) => {
        db.get(
          `SELECT timestamp FROM messages 
                 WHERE (sender = ? AND receiver = ?) OR (sender = ? AND receiver = ?)
                 ORDER BY id ASC LIMIT 1`,
          [
            friendship.user1,
            friendship.user2,
            friendship.user2,
            friendship.user1,
          ],
          (err, msg) => {
            if (err) return;
            // If there's a message, use its timestamp. Otherwise, use a recent date.
            const dateToSet = msg ? msg.timestamp : new Date().toISOString();
            db.run(`UPDATE friends SET created_at = ? WHERE id = ?`, [
              dateToSet,
              friendship.id,
            ]);
          },
        );
      });
    }
  },
);

// ================= ROUTES =================

app.post("/register", (req, res) => {
  const { name, email, password } = req.body;

  db.run(
    `INSERT INTO users(name,email,password) VALUES(?,?,?)`,
    [name, email, password],
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

  db.get(
    "SELECT id, name FROM users WHERE email=? AND password=?",
    [email, password],
    (err, row) => {
      if (err) return res.status(500).json({ success: false });

      if (row) {
        res.json({
          success: true,
          id: row.id,
          name: row.name,
        });
      } else {
        res.json({ success: false });
      }
    },
  );
});

app.post("/searchUser", (req, res) => {
  const { name } = req.body;

  db.all(
    "SELECT id, name FROM users WHERE name LIKE ?",
    [`%${name}%`],
    (err, rows) => {
      if (err) return res.status(500).json({ users: [] });
      res.json({ users: rows });
    },
  );
});

app.post("/sendRequest", (req, res) => {
  const { userId: sender, receiver } = req.body;

  if (!sender || !receiver) {
    return res.status(400).json({ success: false });
  }

  db.run(
    `INSERT INTO friend_requests(sender,receiver,status) VALUES(?,?,?)`,
    [sender, receiver, "pending"],
    function (err) {
      if (err) return res.json({ success: false });
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
    if (err || !row || row.receiver != userId) {
      return res.json({ success: false });
    }

    db.run(
      `INSERT INTO friends(user1,user2,created_at) VALUES(?,?,CURRENT_TIMESTAMP)`,
      [row.sender, row.receiver],
    );
    db.run(`UPDATE friend_requests SET status='accepted' WHERE id=?`, [id]);

    res.json({ success: true });
  });
});

app.get("/getRequests/:userId", (req, res) => {
  const userId = req.params.userId;

  db.all(
    `
    SELECT friend_requests.id, users.name, users.id as senderId
    FROM friend_requests 
    JOIN users ON users.id = friend_requests.sender
    WHERE receiver = ? AND status = 'pending'
  `,
    [userId],
    (err, rows) => {
      if (err) return res.json({ requests: [] });
      res.json({ requests: rows });
    },
  );
});

app.get("/getFriends/:userId", (req, res) => {
  const userId = req.params.userId;

  db.all(
    `
    SELECT DISTINCT u.id, u.name,
    (SELECT COUNT(*) FROM messages WHERE sender = u.id AND receiver = ? AND status != 'seen') as unreadCount,
    (SELECT message FROM messages WHERE (sender = u.id AND receiver = ?) OR (sender = ? AND receiver = u.id) ORDER BY id DESC LIMIT 1) as lastMessage
    FROM friends f 
    JOIN users u ON (u.id = f.user1 OR u.id = f.user2)
    WHERE (f.user1 = ? OR f.user2 = ?) AND u.id != ?
  `,
    [userId, userId, userId, userId, userId, userId],
    (err, rows) => {
      if (err) return res.json({ friends: [] });
      res.json({ friends: rows });
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
      u.name as senderName,

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
        `SELECT id, sender, message, type, timestamp FROM messages 
         WHERE ((sender = ? AND receiver = ?) OR (sender = ? AND receiver = ?))
         AND type IN ('image', 'video', 'audio')
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
  const isOnline = onlineUsers.has(String(userId));

  db.get("SELECT last_seen FROM users WHERE id=?", [userId], (err, row) => {
    if (err) return res.json({ online: false, lastSeen: null });
    res.json({
      online: isOnline,
      lastSeen: row ? row.last_seen : null,
    });
  });
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
// ================= SOCKET =================

const onlineUsers = new Map();
const activeChats = new Map();
const activeCalls = new Map();
// callerId -> { receiver, timeout }
const ongoingCalls = new Map();
io.on("connection", (socket) => {
  console.log("User connected");

  socket.on("register", (userId) => {
    const id = String(userId);
    onlineUsers.set(id, socket.id);
    socket.userId = id;
    socket.join(`user_${id}`);
    io.emit("userOnline", id);

    const now = new Date().toISOString();
    db.run("UPDATE users SET last_seen=? WHERE id=?", [now, id]);
  });

  socket.on("disconnect", () => {
    if (socket.userId) {
      const friendId = activeChats.get(socket.userId);
      if (friendId) {
        io.to(`user_${friendId}`).emit("friendLeftChat", {
          friendId: socket.userId,
        });
      }

      if (ongoingCalls.has(socket.userId)) {
        const partnerId = ongoingCalls.get(socket.userId);
        io.to(`user_${partnerId}`).emit("callEnded");
        ongoingCalls.delete(socket.userId);
        ongoingCalls.delete(partnerId);
      }

      if (activeCalls.has(socket.userId)) {
        const { receiver, timeout } = activeCalls.get(socket.userId);
        clearTimeout(timeout);
        io.to(`user_${receiver}`).emit("callEnded");
        activeCalls.delete(socket.userId);
      }

      for (const [callerId, data] of activeCalls.entries()) {
        if (data.receiver === socket.userId) {
          clearTimeout(data.timeout);
          io.to(`user_${callerId}`).emit("callEnded");
          activeCalls.delete(callerId);
        }
      }

      onlineUsers.delete(socket.userId);
      activeChats.delete(socket.userId);
      const now = new Date().toISOString();
      db.run("UPDATE users SET last_seen=? WHERE id=?", [now, socket.userId]);
      io.emit("userOffline", socket.userId);
    }
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

    if (friendId) {
      io.to(`user_${friendId}`).emit("friendLeftChat", { friendId: userId });
    }
    activeChats.delete(userId);
  });

  // ================= SEND MESSAGE =================

  socket.on(
    "sendMessage",
    ({ to, message, type, caption, replyTo }, callback) => {
      const sender = String(socket.userId);
      const receiver = String(to);
      const msgType = type || "text";

      if (!message) return;

      const room = `chat_${Math.min(sender, receiver)}_${Math.max(sender, receiver)}`;

      db.run(
        `INSERT INTO messages(sender, receiver, message, unread_count, status, type, caption, reply_to)
   VALUES(?,?,?,?,?,?,?,?)`,
        [
          sender,
          receiver,
          message,
          1,
          "sent",
          msgType,
          caption || null,
          replyTo || null,
        ],
        function (err) {
          if (err) {
            console.error(err);
            return callback?.({ success: false });
          }

          const finalMsgId = this.lastID;
          const timestamp = new Date().toISOString();

          const payload = {
            from: sender,
            to: receiver,
            message,
            msgId: finalMsgId,
            status: "sent",
            type: msgType,
            caption: caption,
            timestamp: timestamp,
            replyTo: replyTo || null, // 👈 ADD
          };

          // ✅ SEND TO SPECIFIC USERS (Works even if chat is not open)
          io.to(`user_${receiver}`)
            .to(`user_${sender}`)
            .emit("newMessage", payload);

          const isInChat = activeChats.get(receiver) === sender;

          if (isInChat) {
            const now = new Date().toISOString();

            db.run(`UPDATE messages SET status='seen', seen_at=? WHERE id=?`, [
              now,
              finalMsgId,
            ]);

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

          callback?.({ success: true, data: payload });
        },
      );
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

    let messageText = "";
    if (type === "missed") {
      messageText = "Missed call";
    } else if (type === "ended") {
      messageText = `Call ended ${duration}`;
    } else {
      return;
    }

    db.run(
      `INSERT INTO messages(sender, receiver, message, unread_count, status, type)
       VALUES(?,?,?,?,?,?)`,
      [sender, receiver, messageText, 1, "sent", "call_log"],
      function (err) {
        if (err) return console.error(err);

        const payload = {
          from: sender,
          to: receiver,
          message: messageText,
          msgId: this.lastID,
          status: "sent",
          type: "call_log",
          timestamp: new Date().toISOString(),
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

  // ================= WEBRTC CALLING =================

  socket.on("callUser", ({ userToCall, signalData, from, callType }) => {
    const caller = String(socket.userId);
    const receiver = String(userToCall);

    io.to(`user_${receiver}`).emit("callUser", {
      signal: signalData,
      from,
      callType,
    });

    // ✅ Start 30 sec timeout
    const timeout = setTimeout(() => {
      const call = activeCalls.get(caller);
      if (!call) return;

      handleMissedCall(caller, receiver);

      activeCalls.delete(caller);

      io.to(`user_${caller}`).emit("callEnded");
      io.to(`user_${receiver}`).emit("callEnded");
    }, 30000);

    activeCalls.set(caller, { receiver, timeout });
  });
  socket.on("answerCall", ({ signal, to }) => {
    const caller = String(to);

    // ✅ clear timeout (call picked)
    const call = activeCalls.get(caller);
    if (call) {
      clearTimeout(call.timeout);
      activeCalls.delete(caller);
    }

    ongoingCalls.set(caller, String(socket.userId));
    ongoingCalls.set(String(socket.userId), caller);

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

    // ✅ prevent duplicate (timeout vs manual end)
    const call = activeCalls.get(sender);
    if (call) {
      clearTimeout(call.timeout);
      activeCalls.delete(sender);
    }

    ongoingCalls.delete(sender);
    ongoingCalls.delete(receiver);

    const now = new Date().toISOString();

    let callerMessage = "";
    let receiverMessage = "";

    if (!answered) {
      callerMessage = "No answer";
      receiverMessage = "Missed call";
    } else {
      callerMessage = `Call ended (${duration})`;
      receiverMessage = `Call ended (${duration})`;
    }

    // 👉 caller log
    db.run(
      `INSERT INTO messages(sender, receiver, message, status, type)
     VALUES(?,?,?,?,?)`,
      [sender, receiver, callerMessage, "seen", "call_log"],
    );

    // 👉 receiver log
    db.run(
      `INSERT INTO messages(sender, receiver, message, status, type)
     VALUES(?,?,?,?,?)`,
      [receiver, sender, receiverMessage, "sent", "call_log"],
      function () {
        const payload = {
          from: receiver,
          to: sender,
          message: receiverMessage,
          msgId: this.lastID,
          status: "sent",
          type: "call_log",
          timestamp: now,
        };

        io.to(`user_${sender}`)
          .to(`user_${receiver}`)
          .emit("newMessage", payload);
      },
    );

    io.to(`user_${receiver}`).emit("callEnded");
  });

  // ================= DELETE MESSAGE =================

  socket.on("deleteMessage", ({ msgId, type, to }) => {
    if (!socket.userId) return;
    const userId = String(socket.userId);

    if (type === "everyone") {
      // only sender can delete for everyone
      db.get(`SELECT sender FROM messages WHERE id=?`, [msgId], (err, row) => {
        if (!row || String(row.sender) !== userId) return;

        db.run(`DELETE FROM messages WHERE id=?`, [msgId]);

        io.to(`user_${userId}`).to(`user_${to}`).emit("messageDeleted", {
          msgId,
          type: "everyone",
        });
      });
    }

    if (type === "me") {
      db.get(
        `SELECT deleted_for FROM messages WHERE id=?`,
        [msgId],
        (err, row) => {
          if (err) return console.error(err);

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
              if (err) {
                console.error("Delete failed:", err);
                return;
              }

              io.to(`user_${userId}`).emit("messageDeleted", {
                msgId,
                type: "me",
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
  socket.on("toggleCamera", ({ to, isVideo }) => {
    io.to(`user_${to}`).emit("cameraToggled", {
      from: socket.userId,
      isVideo,
    });
  });
});
function handleMissedCall(caller, receiver) {
  const now = new Date().toISOString();

  // Caller → No answer
  db.run(
    `INSERT INTO messages(sender, receiver, message, status, type)
     VALUES(?,?,?,?,?)`,
    [caller, receiver, "No answer", "seen", "call_log"],
  );

  // Receiver → Missed call
  db.run(
    `INSERT INTO messages(sender, receiver, message, status, type)
     VALUES(?,?,?,?,?)`,
    [receiver, caller, "Missed call", "sent", "call_log"],
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
