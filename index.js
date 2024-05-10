const express = require("express");
const app = express();
const fs = require("fs");
const http = require("http");
const https = require("https");

const cors = require("cors");
app.use(cors());

const videomap = {
  first: "uploads/ram.mp4",
  second: "uploads/ample.mp4",
  third: "uploads/test.mp4",
};

app.get("/video/:filename", function (req, res) {
  const fileName = req.params.filename;
  const file = videomap[fileName];

  if (!file) {
    return res.status(404).send("Video not found");
  }

  // Check if it's a local file
  if (file.startsWith("http")) {
    // It's an external URL, handle streaming from URL
    const videoRequest = file.startsWith("https") ? https : http;

    videoRequest.get(file, (videoRes) => {
      // Forward the headers from the external server
      res.writeHead(200, {
        "Content-Type": videoRes.headers["content-type"],
        "Content-Length": videoRes.headers["content-length"],
      });

      videoRes.pipe(res);
    });
  } else {
    // It's a local file, handle streaming from file system
    const range = "bytes=0-";
    if (!range) {
      return res.status(400).send("Requires Range header");
    }

    const videoPath = file;
    const videoSize = fs.statSync(file).size;

    // Parse Range
    const CHUNK_SIZE = 10 ** 6; // 1MB
    const start = Number(range.replace(/\D/g, ""));
    const end = Math.min(start + CHUNK_SIZE, videoSize - 1);

    // Create headers
    const contentLength = end - start + 1;
    const headers = {
      "Content-Range": `bytes ${start}-${end}/${videoSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": contentLength,
      "Content-Type": "video/mp4",
    };

    // HTTP Status 206 for Partial Content
    res.writeHead(206, headers);

    // create video read stream for this particular chunk
    const videoStream = fs.createReadStream(videoPath, { start, end });

    // Stream the video chunk to the client
    videoStream.pipe(res);
  }
});

app.listen(8000, function () {
  console.log("Listening on port 8000!");
});
