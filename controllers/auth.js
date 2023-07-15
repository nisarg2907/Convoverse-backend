const jwt = require("jsonwebtoken");
const filterObj = require("../utils/filterObj");
const User = require("../models/user");
const otpGenerator = require("otp-generator");

const signToken = (userId) => {
  jwt.sign(
    {
      userId,
    },
    process.env.JWT_SECRET
  );
};

exports.register = async (req, res, next) => {
  const { firstName, lastName, email, password } = req.body;

  const filteredBody = filterObj(
    req.body,
    "firstName",
    "lastName",
    "password",
    "email"
  );
  // check if the user is already existing
  const existing_user = await User.findOne({ email: email });

  if (!existing_user && existing_user.verified) {
    res.status(400).json({
      status: "error",
      message: " Email is already taken , please try logging in",
    });
  } else if (existing_user) {
    const updated_user = await User.findOneAndUpdate(
      { email: email },
      filteredBody,
      { new: true, validateModifiedOnly: true }
    );
    req.userId = existing_user._id;
    next();
  } else {
    // if there is no user record
    const new_user = await User.create(filteredBody);

    // generate otp and send email to user
    req.userId = new_user._id;
    next();
  }
};

exports.sendOTP = async (req, res, next) => {
  const { userId } = req.body;
  const new_otp = otpGenerator.generate(6, {
    upperCaseAlphabets: false,
    specialChars: false,
    lowerCaseAlphabets: false,
  });

  const otp_expiry_time = Date.now() + 10 * 60 * 1000;
  await User.findByIdAndUpdate(userId, {
    otp: new_otp,
    otp_expiry_time,
  });

  // send mail
  res.status(200).json({
    status: "success",
    message: "OTP sent successfully",
  });
};

exports.verifyOTP = async (req, res, next) => {
  const { email, otp } = req.body;

  const user = await User.findOne({
    email,
    otp_expiry_time: { $gt: Date.now() },
  });

  if (!user) {
    res.status(400).json({
      status: "error",
      message: "email is ivalid or otp is expired",
    });
  }

  if(!await user.correctOTP(otp,user.otp)){
   res.status(400).json({
      status:"error",
      message: "OTP is incorrect",
   })
  }

  user.verified = true;
  user.otp = undefined;

  await user.save({new: true, validateModifiedOnly: true});

  const token = signToken(user._id);
  res.status(200).json({
    status: "success",
    message: "OTP verified successfully",
    token,
  });
};

exports.login = async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({
      status: " error",
      message: " both email and password are required",
    });
  }

  const user = await User.findOne({ email: email }.select("+password"));

  if (!user || !(await User.correctPassword(password, user.password))) {
    res.status(400).json({
      status: " error",
      message: "Email or password   is incorrect",
    });
  }

  const token = signToken(user._id);
  res.status(200).json({
    status: "success",
    message: "Logged in successfully",
    token,
  });
};

exports.forgotPassword = async(req,res,next)=>{

};

exports.resetPassword = async(req,res,next)=>{

};