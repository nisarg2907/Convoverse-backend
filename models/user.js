const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, "First Name is required"],
  },
  lastName: {
    type: String,
    required: [true, "Last Name is required"],
  },
  avatar: {
    type: String,
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    validate: {
      validator: function (email) {
        return String(email)
          .toLowerCase()
          .match(
            /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
          );
      },
      message: (props) => `Email (${props.value}) is invalid!`,
    },
  },
  password: {
    type: String,
  },
  passwordConfirm: {
    type: String,
  },
  passwordChangedAt: {
    type: Date,
  },
  passwordResetToken: {
    type: String,
  },
  passwordResetExpires: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
  updatedAt: {
    type: Date,
  },
  verified: {
    type: Boolean,
    default: false,
  },
  otp: {
    type: Number,
  },
  otp_expiry_time: {
    type: Date,
  },
});

userSchema.pre("save", async function (next) {
  // Only run this function if otp was actually modified
  if (!this.isModified("otp") || !this.otp) return next();

  console.log(this.otp.toString(), "FROM PRE SAVE HOOK"); // Check the OTP value before hashing (optional)

  // No need to hash the OTP, store it directly
  // this.otp = await bcrypt.hash(this.otp.toString(), 12);

  next();
});




userSchema.pre("save", async function (next) {
  // Only run this function if password was actually modified
  if (!this.isModified("password") || !this.password) return next();

  // Hash the password with cost of 12
  this.password = await bcrypt.hash(this.password, 12);

  // Update the passwordChangedAt field
  this.passwordChangedAt = Date.now() - 1000;

  next();
});

userSchema.pre("save", function (next) {
  // Only run this function if password was actually modified
  if (!this.isModified("password") || this.isNew || !this.password)
    return next();

  // Update the passwordChangedAt field
  this.passwordChangedAt = Date.now() - 1000;

  next();
});

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};


userSchema.methods.correctOTP = async function (candidateOTP, userOTP) {
  // Ensure that both candidateOTP and userOTP are strings
  const candidateOTPString = candidateOTP.toString();
  const userOTPString = userOTP.toString();

  return candidateOTPString===userOTPString;
};




userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");

  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

userSchema.methods.changedPasswordAfter = function (timestamp) {
  
    return timestamp < this.passwordChangedAt;
  };




const User = mongoose.model("User", userSchema);
module.exports = User;
