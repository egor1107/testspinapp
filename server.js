const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Отдаём статику из папки App
app.use(express.static(path.join(__dirname, "App")));

// Главная страница
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "App", "index.html"));
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
