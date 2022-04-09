// const { v4: uuid } = require("uuid");
const cloudinary = require("../util/cloudinary");
const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const HttpError = require("../models/http-error");
const user = require("../models/user");

const getusers = async (req, res, next) => {
  let users;
  try {
    users = await user.find({}, "-password");
  } catch (err) {
    return next(
      new HttpError("Couldn't fetch users, Please try again later."),
      500
    );
  }
  res.json({ users: users.map((user) => user.toObject({ getters: true })) });
};

const signupUser = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new HttpError("Please provide appropriate data.", 422));
  }
  const { name, email, password } = req.body;
  let existingUser;
  try {
    existingUser = await user.findOne({ email: email });
  } catch (err) {
    return next(new HttpError("Couldn't signup, please try again later.", 500));
  }
  if (existingUser) {
    return next(new HttpError("User already exists!", 422));
  }

  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(password, 15);
  } catch (err) {
    return next(new HttpError("Can't create a new user", 500));
  }

  let response;
  try {
    response = await cloudinary.uploader.upload(req.file.path);
  } catch (err) {
    return next(err);
  }

  const newUser = new user({
    name,
    email,
    password: hashedPassword,
    imageUrl: response.secure_url,
    imagePublicId: response.public_id,
    places: [],
  });

  try {
    await newUser.save();
  } catch (err) {
    return next(new HttpError("Signing up user failed!!", 500));
  }
  let token;
  try {
    token = await jwt.sign(
      { userId: newUser.id, email: newUser.email },
      process.env.SECRET_KEY,
      { expiresIn: "1h" }
    );
  } catch (err) {
    return next(new HttpError("Signing up user failed!!", 500));
  }

  res
    .status(200)
    .json({ userId: newUser.id, email: newUser.email, token: token });
};

const loginUser = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new HttpError("Please provide appropriate data.", 422));
  }
  const { email, password } = req.body;
  let existingUser;
  try {
    existingUser = await user.findOne({ email: email });
  } catch (err) {
    return next(new HttpError("Couldn't login, please try again later.", 500));
  }
  if (!existingUser) {
    return next(
      new HttpError(
        "Couldn't identify the user, credentials seems to be wrong!!",
        401
      )
    );
  }
  let passwordIsValid = false;
  try {
    passwordIsValid = await bcrypt.compare(password, existingUser.password);
  } catch (err) {
    return next(new HttpError("Couldn't login, please try again later.", 500));
  }

  if (!passwordIsValid) {
    return next(
      new HttpError(
        "Couldn't identify the user, credentials seems to be wrong!!",
        401
      )
    );
  }

  let token;
  try {
    token = await jwt.sign(
      { userId: existingUser.id, email: existingUser.email },
      process.env.SECRET_KEY,
      { expiresIn: "1h" }
    );
  } catch (err) {
    return next(new HttpError("Logging in user failed!!", 500));
  }

  res.status(200).json({
    userId: existingUser.id,
    email: existingUser.email,
    token: token,
  });
};

exports.getusers = getusers;
exports.signupUser = signupUser;
exports.loginUser = loginUser;
