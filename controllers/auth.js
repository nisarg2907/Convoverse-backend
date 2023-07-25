const jwt = require("jsonwebtoken");
const filterObj = require("../utils/filterObj");
const mailService = require("../services/mailer")
const otpGenerator = require("otp-generator");
const User = require("../models/user");
const crypto = require("crypto");


const signToken = (userId) => {
  return jwt.sign(
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

  if (existing_user && existing_user.verified) {
    res.status(400).json({
      status: "error",
      message: "Email is already taken, please try logging in",
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

// Define a function to generate the HTML content for the OTP email



exports.sendOTP = async (req, res, next) => {
  const { userId } = req;
  const new_otp = otpGenerator.generate(6, {
    upperCaseAlphabets: false,
    specialChars: false,
    lowerCaseAlphabets: false,
  });

  const generateOTPEmailHTML = (firstName, otp) => {
    return `<p>Hello ${firstName},</p>
    <p>Your OTP is: ${otp}</p>
    <p>This OTP is valid for the next 10 minutes.</p>`;
  };
  

  const otp_expiry_time = Date.now() + 10 * 60 * 1000; // 10 Mins after otp is sent

  const user = await User.findByIdAndUpdate(userId, {
    otp_expiry_time: otp_expiry_time,
  });

  user.otp = new_otp.toString();

  await user.save({ new: true, validateModifiedOnly: true });

  console.log(new_otp);

  try {
    // Send mail using the sendEmail function
    await mailService.sendEmail({
      recipient: user.email,
      subject: "Verification OTP",
      html:  generateOTPEmailHTML(user.firstName, new_otp),
      attachments: [],
    });

    res.status(200).json({
      status: "success",
      message: "OTP Sent Successfully!",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: "error",
      message: "Failed to send OTP",
    });
  }
};


exports.verifyOTP = async (req, res, next) => {
  const { email, otp } = req.body;
  const user = await User.findOne({
    email,
    otp_expiry_time: { $gt: Date.now() },
  });

  if (!user) {
    return res.status(400).json({
      status: "error",
      message: "Email is invalid or OTP expired",
    });
  }

  if (user.verified) {
    return res.status(400).json({
      status: "error",
      message: "Email is already verified",
    });
  }

  if (!(await user.correctOTP(otp, user.otp))) {
    res.status(400).json({
      status: "error",
      message: "OTP is incorrect",
    });

    return;
  }

  // OTP is correct

  user.verified = true;
  user.otp = undefined;
  await user.save({ new: true, validateModifiedOnly: true });

  const token = signToken(user._id);

  res.status(200).json({
    status: "success",
    message: "OTP verified Successfully!",
    token,
    user_id: user._id,
  });
};


exports.login = async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      status: "error",
      message: "Both email and password are required",
    });
  }

  const user = await User.findOne({ email: email }).select("+password");

  if (!user || !(await user.correctPassword(password, user.password))) {
    return res.status(400).json({
      status: "error",
      message: "Email or password is incorrect",
    });
  }

  const token = signToken(user._id);
  return res.status(200).json({
    status: "success",
    message: "Logged in successfully",
    token,
  });
};


exports.protect = async (req, res, next) => {
  // 1) Getting token and check if it's there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return res.status(401).json({
      message: "You are not logged in! Please log in to get access.",
    });
  }
  // 2) Verification of token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  console.log(decoded);

  // 3) Check if user still exists

  const this_user = await User.findById(decoded.userId);
  if (!this_user) {
    return res.status(401).json({
      message: "The user does no longer exist.",
    });
  }
  // 4) Check if user changed password after the token was issued
  if (this_user.changedPasswordAfter(decoded.iat)) {
    return res.status(401).json({
      message: "User recently changed the password! Please log in again.",
    });
  }

  // GRANT ACCESS TO PROTECTED ROUTE
  req.user = this_user;
  next();
};

const generateOTPEmailHTML = (firstName, resetURL) => {
  return `<p>Hello ${firstName},</p>
    <p>Please click on the following link to reset your password:</p>
    <a href="${resetURL}">${resetURL}</a>
    <p>This link is valid for the next 10 minutes.</p>`;
};

exports.forgotPassword = async (req, res, next) => {
  // 1) Get user based on POSTed email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return res.status(404).json({
      status: "error",
      message: "There is no user with the email address.",
    });
  }

  // 2) Generate the random reset token
  const resetToken = user.createPasswordResetToken();

  // Store the password reset token directly without hashing
  user.passwordResetToken = resetToken;
  user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

  await user.save({ validateBeforeSave: false });

  // 3) Send it to the user's email
  try {
    const resetURL = `http://localhost:3000/auth/new-password?token=${resetToken}`;
    const emailHTML = generateOTPEmailHTML(user.firstName, resetURL);

    mailService.sendEmail({
      recipient: user.email,
      subject: "Reset Password",
      html: emailHTML,
      attachments: [],
    });

    res.status(200).json({
      status: "success",
      message: "Token sent to email!",
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return res.status(500).json({
      message: "There was an error sending the email. Try again later!",
    });
  }
};

exports.resetPassword = async (req, res, next) => {
  // 1) Get user based on the token
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.body.token)
    .digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  console.log("Token from request:", req.body.token);
  console.log("Hashed token from request:", hashedToken);
  console.log("User found:", user);

  // 2) If token has not expired, and there is user, set the new password
  if (!user) {
    return res.status(400).json({
      status: "error",
      message: "Token is Invalid or Expired",
    });
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // 3) Update changedPasswordAt property for the user
  // 4) Log the user in, send JWT
  const token = signToken(user._id);

  res.status(200).json({
    status: "success",
    message: "Password Reset Successfully",
    token,
  });
};

