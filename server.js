const app = require("./app");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

dotenv.config({ path: "./config.env" });

const {Server} = require("socket.io");





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
const User = require("./models/user");

const server = http.createServer(app);
const io = new Server(server,{
  cors:{
    origin: "http://localhost:3000",
    methods: ["GET","POST"],
  }
});


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

  io.on("connection",async(socket)=>{
    console.log(socket);
     const user_id = socket.handshake.query("user_id");

     const socket_id = socket.id;

     console.log(`User connected ${socket_id}`);

     if(user_id){
      await User.findByIdAndUpdate(user_id,{socket_id})
     }


    //  we can write our socket eventlisteners here

    socket.on("friend_request",async (data)=>{
      console.log(data.to);
      const to = await User.findById(data.to); 
      io.to(to.socket_id).emit("new_friend_reuest",{
        
      })
    })
  });


process.on("unhandledRejection", (err) => {
  console.log(err);
  server.close(() => {
    process.exit(1);
  });
});
