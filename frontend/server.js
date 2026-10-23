const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5002;

app.get("/", (req, res) => {
    res.redirect("/views/login.html");
});

app.use(express.static(path.join(__dirname, "public")));

app.listen(PORT, () => {
    console.log(`Frontend disponible en http://localhost:${PORT}`);
});
