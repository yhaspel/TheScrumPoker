const path = require("path");
const express = require("express");
const cors = require("cors");
const app = express();
const http = require("http").Server(app);

const clientOriginUrl = "*";

let players = [];
let voteFeed = [];
let voteHistoryFeed = [];
let showVotesState = false;

const io = require("socket.io")(http, {
  pingTimeout: 360000,
  pingInterval: 20000,
  cors: {
    origin: clientOriginUrl,
    allowedHeaders: ['Content-Type'],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
    allowEIO3: true,
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

// // Serve static files
app.use(express.static("public"));

// Define endpoint for '/'
app.get("/", (req, res) => {
  res.send(`Server ready!`);
});

app.get("/clear-players", (req, res) => {
  players = [];
  res.json({
    message: "cleared!",
  });
});

app.get("/get-players", (req, res) => {
  res.json({
    players,
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
    io.emit("players-updated", { players: [...players] });

    voteFeed = [...voteFeed, `${name} has voted`];
    io.emit("vote-updated", {
      voteFeed,
    });
  });

  socket.on("clear-votes", () => {
    voteFeed = [];
    const getClearedPlayerArray = () => {
      return players.map((player) => ({
        name: player.name,
        vote: "",
        hasVoted: false,
      }));
    };
    const newPlayers = getClearedPlayerArray();
    players = [...newPlayers];
    io.emit("players-updated", { players });
  });

  socket.on("show-votes", (showVotes) => {
    showVotesState = showVotes;
    io.emit("show-votes", showVotes);
  });

  socket.on("record-vote-history", ({ votingOn, average }) => {
    voteHistoryFeed = [...voteHistoryFeed, `${votingOn} - ${average} average`];
    io.emit("vote-history-updated", {
      voteHistoryFeed,
    });
  });

  socket.on("vote-on", (voteOn) => {
    io.emit("vote-on-changed", voteOn);
  });

  socket.on("join-game", (data) => {
    const { playerName: name } = data;
    const isPlayerAlreadyJoined = (name) => {
      const i = players.findIndex((e) => e.name === name);
      return i > -1;
    };

    if (!isPlayerAlreadyJoined(name)) {
      players.unshift({ name, vote: "", hasVoted: false });
      console.log("Now joined game:", name, players);
      io.emit("players-updated", { players });
    }
  });

  // Listen for disconnection event
  socket.on("disconnect", () => {
    console.log("A user disconnected");
    socket.emit("server-disconnect", {
      message: "User disconnected from server!",
    });
    voteFeed = [];
    players = [];
    voteHistoryFeed = [];
    showVotesState = false;
  });
});

// Start the server
const port = process.env.PORT || 3000;
http.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
