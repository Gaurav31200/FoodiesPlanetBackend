const HttpError = require("../models/http-error");
const mongoose = require("mongoose");
const { validationResult } = require("express-validator");

const foodPlace = require("../models/foodPlace");
const User = require("../models/user");

const getPlaceById = async (req, res, next) => {
  const placeId = req.params.pid;
  let place;
  try {
    place = await foodPlace.findById(placeId);
    // place = JSON.parse(JSON.stringify(place));
    // place = { ...place, id: place._id };
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, couldn't find the place",
      500
    );
    return next(error);
  }
  if (!place) {
    const err = new HttpError(
      "Couldn't find the place for the provided id. ",
      404
    );
    return next(err);
  }
  res.json({ place: place.toObject({ getters: true }) }); // getters is used to convert __id(objectid) to simple id.
};

const getPlaceByUserId = async (req, res, next) => {
  const userId = req.params.uid;
  let places;
  try {
    places = await foodPlace.find({ creator: userId }); // returns an array
    // places = JSON.parse(JSON.stringify(places));
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, couldn't find the places!",
      500
    );
    return next(error);
  }
  if (!places) {
    return next(
      new HttpError("Couldn't find the place for the provided user id. ", 404)
    );
  }
  res.json({
    places: places.map((place) => place.toObject({ getters: true })),
  });
};

const createFoodPlace = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    next(new HttpError("Please provide appropriate data.", 422));
  }
  const { title, description, address, lat, lng } = req.body;
  // let coordinates;
  // try {
  //   coordinates = await getCoordinates(address);
  // } catch (error) {
  //   return next(error);
  // }
  const creator = req.userData.userId;
  const createdFoodPlace = new foodPlace({
    title,
    description,
    address,
    image: req.file.path,
    location: {
      lng: lng,
      lat: lat,
    },
    creator,
  });

  let existingUser;
  try {
    existingUser = await User.findById(creator);
  } catch (err) {
    return next("Couldn't create food place,please try again later", 500);
  }

  if (!existingUser) {
    return next("Couldn't find user for provided id!", 404);
  }

  try {
    const session = await mongoose.startSession(); // session is used here because there are two operations to be completed simultaneously
    session.startTransaction();
    await createdFoodPlace.save({ session: session }); //1
    existingUser.places.push(createdFoodPlace); // it push only the creator(objectId)
    await existingUser.save({ session: session }); //2
    await session.commitTransaction();
  } catch (error) {
    const err = new HttpError("Creating food Place Failed!!", 500);
    return next(err);
  }

  res.status(201).json({ place: createdFoodPlace });
};
const updateFoodPlace = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return new HttpError("Please provide appropriate data.", 422);
  }
  const { title, description, address, coordinates } = req.body;
  const placeId = req.params.pid;

  let updatedPlace;
  try {
    updatedPlace = await foodPlace.findById(placeId);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, couldn't update place!",
      500
    );
    return next(error);
  }

  if (updatedPlace.creator.toString() !== req.userData.userId) {
    return next(new HttpError("You are not allowed to manipulate!!", 401));
  }
  updatedPlace.title = title;
  updatedPlace.description = description;
  updatedPlace.address = address;
  // let coordinates;
  // try {
  //   coordinates = await getCoordinates(address);
  // } catch (error) {
  //   return next(error);
  // }
  updatedPlace.location = coordinates;

  try {
    await updatedPlace.save();
  } catch (err) {
    const error = new HttpError(
      "Something went wrong, couldn't update place!",
      500
    );
    return next(error);
  }

  res
    .status(200)
    .json({ updatedPlace: updatedPlace.toObject({ getters: true }) });
};
const deleteFoodPlace = async (req, res, next) => {
  const placeId = req.params.pid;
  let place;
  try {
    place = await foodPlace.findById(placeId);
    // place = await (await foodPlace.findById(placeId)).populate('creator'); it can also be used.
  } catch (err) {
    const error = new HttpError(
      "Something went wrong,couldn't delete the place",
      500
    );
    return next(error);
  }

  if (!place) {
    return next(new HttpError("Couldn't find the place", 404));
  }
  let existingUser;
  try {
    existingUser = await User.findById(place.creator);
  } catch (err) {
    const error = new HttpError(
      "Something went wrong,couldn't delete the place",
      500
    );
    return next(error);
  }
  if (!existingUser) {
    return next(new HttpError("Couldn't find the user", 404));
  }
  if (place.creator.toString() !== req.userData.userId) {
    return next(new HttpError("You are not allowed to manipulate!!", 401));
  }

  try {
    const session = await mongoose.startSession();
    session.startTransaction();
    existingUser.places.pull(place);
    //  place.creator.places.pull(place);
    await existingUser.save({ session: session });
    await place.remove({ session: session });
    await session.commitTransaction();
  } catch (err) {
    const error = new HttpError(
      "Something went wrong,couldn't delete the place",
      500
    );
    return next(error);
  }

  res.status(200).json({ message: "Deleted Food Place" });
};

exports.getPlaceById = getPlaceById;
exports.getPlaceByUserId = getPlaceByUserId;
exports.createFoodPlace = createFoodPlace;
exports.updateFoodPlace = updateFoodPlace;
exports.deleteFoodPlace = deleteFoodPlace;
