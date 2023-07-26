const app = require("./app");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const path = require("path")

dotenv.config({ path: "./config.env" });

const { Server } = require("socket.io");

process.on("uncaughtException", (err) => {
  console.log(err);
  process.exit(1);
});

const http = require("http");
const User = require("./models/user");
const FriendRequest = require("./models/friendRequest");

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

const DB = process.env.DBURI;
const port = process.env.PORT || 8080;

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

io.on("connection", async (socket) => {
  const user_id = socket.handshake.query["user_id"];
console.log(user_id);
  const socket_id = socket.id;
  console.log(`User connected ${socket_id}`);

  if (Boolean(user_id)) {
    await User.findByIdAndUpdate(user_id, { socket_id ,status: "Online" });
  }

  socket.on("friend_request", async (data) => {
    console.log(data.to);
    const to_user = await User.findById(data.to).select("socket_id");
    const from_user = await User.findById(data.from).select("socket_id");

    await FriendRequest.create({
      sender: data.from,
      recipient: data.to,
    });

    io.to(to_user.socket_id).emit("new_friend_request", {
      message: "New Friend request Received",
    });

    io.to(from_user.socket_id).emit("request_sent", {
      message: "Request sent successfully",
    });
  });

  socket.on("accept_request", async (data) => {
    console.log(data);

    const request_doc = await FriendRequest.findById(data.request_id);

    console.log(request_doc);

    const sender = await User.findById(request_doc.sender);
    const receiver = await User.findById(request_doc.recipient);

    sender.friends.push(request_doc.recipient);
    receiver.friends.push(request_doc.sender);

    await receiver.save({ new: true, validateModifiedOnly: true });
    await sender.save({ new: true, validateModifiedOnly: true });

    await FriendRequest.findByIdAndDelete(data.request_id);

    io.to(sender.socket_id).emit("request_accepted",{
      message:"Friend Request Accepted"
    });
    
    io.to(receiver.socket_id).emit("request_accepted",{
      message:"Friend Request Accepted"
    });

   socket.on("text_message",(data)=>{
    console.log("Recieved Message",data);
       

   });

   socket.on("file_message",(data)=>{
    console.log("Recieved message",data);


    const fileExtension = path.extname(data.file.name);

    const fileName = `${Date.now()}_${Math.floor(Math.random() * 1000)}${fileExtension}`;


   })





    socket.on("end",async(data)=>{
      if(data.user_id){
        await User.findByIdAndUpdate(data.user_id,{status:"Offline"});
      }


         console.log("closing connection");
         socket.disconnect(0);
    })

  });
});

process.on("unhandledRejection", (err) => {
  console.log(err);
  server.close(() => {
    process.exit(1);
  });
});
