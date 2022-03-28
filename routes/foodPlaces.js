const express = require("express");
const { check } = require("express-validator");
const foodPlacesControllers = require("../controllers/foodPlaces");
const imageUpload = require("../middlewares/image-upload");
const validate = require("../middlewares/validate-auth");

const router = express.Router();

router.get("/:pid", foodPlacesControllers.getPlaceById);

router.get("/user/:uid", foodPlacesControllers.getPlaceByUserId);

router.use(validate);

router.post(
  "/",
  imageUpload.single("image"),
  [
    check("title").notEmpty(),
    check("description").isLength({ min: 5 }),
    check("address").notEmpty(),
  ],
  foodPlacesControllers.createFoodPlace
);

router.patch(
  "/:pid",
  [check("title").notEmpty(), check("description").isLength({ min: 5 })],
  foodPlacesControllers.updateFoodPlace
);

router.delete("/:pid", foodPlacesControllers.deleteFoodPlace);

module.exports = router;
