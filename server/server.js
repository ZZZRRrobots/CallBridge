require("dotenv").config({
    path: __dirname + "/.env"
});

const express = require("express");
const cors = require("cors");
const path = require("path");
const { translateText } = require("./services/translate");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Serve the frontend
app.use(express.static(path.join(__dirname, "..", "client")));

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    app: "CallBridge"
  });
});

app.post("/api/translate", async (req, res) => {
    try {
        const { text, from, to } = req.body;

        if (!text || !from || !to) {
            return res.status(400).json({
                error: "text, from and to are required"
            });
        }

        const translation = await translateText(text, from, to);

        res.json({
            translation
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Translation failed"
        });
    }
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`CallBridge running at http://localhost:${PORT}`);
});
