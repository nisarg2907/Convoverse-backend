const User = require("../models/user");


exports.updateMe = async(req,res,next)=>{
 const {user} = req;
 const filterbody = filterObj(req.body,
   "firstName",
   "lastName",
   "about",
   "avatar")
 const updated_user = await User.findByIdAndUpdate(user._id,filterbody,{new: true,validateModifyOnly : true});

 res.status(200).json({
    status:"success",
    message:"profile updated successsfully",
    data : updated_user,
 }) 
 
 


}