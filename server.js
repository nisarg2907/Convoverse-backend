const app = require("./app");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

dotenv.config({ path: "./config.env" });

try {
  console.log(process.env.PORT);
} catch (err) {
  console.log(err);
}

process.on("uncaughtException", (err) => {
  console.log(err);
  process.exit(1);
});

const http = require("http");

const server = http.createServer(app);

const DB = process.env.DBURI;

const port = process.env.PORT || 6001;
mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    server.listen(port, () => {
      console.log(`App has started on ${port}`);
    });
    console.log("Database connected");
  })
  .catch((error) => {
    console.error("Error connecting to database:", error);
  });


process.on("unhandledRejection", (err) => {
  console.log(err);
  server.close(() => {
    process.exit(1);
  });
});
