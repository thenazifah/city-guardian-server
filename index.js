require("./src/server");

app.get("/", (req, res) => {
    res.send("Server is running");
  });