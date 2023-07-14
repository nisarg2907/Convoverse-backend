const jwt = require('jsonwebtoken');

const User = require("../models/user");

const signToken = (userId)=>{
     jwt.sign({
        userId
     }, process.env.JWT_SECRET);
}

 
exports.login = async(req,res,next)=>{
    const {email,password} = req.body;
    
    if(! email || ! password){
        res.status(400).json({
           status: " error",
           message: " both email and password are required" ,
        });


    }

    const user = await User.findOne({email: email}.select("+password"));

    if(!user || !(await User.correctPassword(password,user.password)) ){
        res.status(400).json({
            status: " error",
            message: "Email or password   is incorrect",
            
         });
    }


     const token = signToken(user._id);
     res.status(200).json({
        status:"success",
        message: "Logged in successfully",
        token,
     })
   

}