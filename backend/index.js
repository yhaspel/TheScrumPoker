const express = require("express");
const cors = require("cors");
const app = express();
const http = require("http").Server(app);

const clientOriginUrl = "http://localhost:4200";
let players = [];
let voteFeed = [];

const io = require("socket.io")(http, {
  cors: {
    origin: clientOriginUrl,
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

// Allow CORS requests
app.use(
  cors({
    origin: clientOriginUrl,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 200,
  })
);

// Serve static files
app.use(express.static("public"));

// Define endpoint for '/'
app.get("/", (req, res) => {
  res.send(`Server ready!`);
});

app.get("/clear-players", (req, res) => {
  console.warn("CLEAR PLAYERS");
  players = [];
  res.json({
    message: "cleared!",
  });
});

// Listen for new socket connections
io.on("connection", (socket) => {
  console.log("A user connected");

  // Listen for data from client
  socket.on("vote-data", (data) => {
    const { name, vote } = data;
    const updatePlayerVotes = ({ name, vote }) => {
      players.forEach((player) => {
        if (player.name === name) {
          player.vote = vote;
          player.hasVoted = true;
        }
      });
    };
    updatePlayerVotes({ name, vote });
    socket.emit("players-updated", { players });

    voteFeed = [...voteFeed, `${name} has voted`];
    socket.emit("vote-updated", {
      voteFeed,
    });
    console.warn('VOTE FEED >>>', voteFeed);
  });

  socket.on("clear-votes", players => {
    this.players = players;
    socket.emit("players-updated", { players });
  });

  socket.on("join-game", (data) => {
    const { playerName: name } = data;
    console.log("Now joined game:", name);
    const isPlayerAlreadyJoined = (name) => {
      const i = players.findIndex((e) => e.name === name);
      return i > -1;
    };

    if (!isPlayerAlreadyJoined(name)) {
      players.unshift({ name, vote: "", hasVoted: false });
      socket.emit("players-updated", { players });
    }
  });

  // Listen for disconnection event
  socket.on("disconnect", () => {
    console.log("A user disconnected");
    socket.emit("server-disconnect", { message: "Server disconnected!" });
    players = [];
  });
});

// Start the server
const port = 3000;
http.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
