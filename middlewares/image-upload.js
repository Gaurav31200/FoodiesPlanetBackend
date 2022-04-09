const multer = require("multer");
const { v4: uuidv4 } = require("uuid");

const MIME_TYPE_MAP = {
  "image/png": "png",
  "image/jpg": "jpg",
  "image/jpeg": "jpeg",
};

const imageUpload = multer({
  limits: 600000, //bytes
  storage: multer.diskStorage({
    // destination: (req, image, cb) => {
    //   cb(null, "uploads/images");
    // },
    filename: (req, image, cb) => {
      const ext = MIME_TYPE_MAP[image.mimetype];
      cb(null, uuidv4() + "." + ext);
    },
  }),
  fileFilter: (req, image, cb) => {
    const isValid = !!MIME_TYPE_MAP[image.mimetype]; //if undefined=> false else true
    let error = isValid ? null : new Error("Invalid mime type");
    cb(error, isValid);
  },
});

module.exports = imageUpload;
