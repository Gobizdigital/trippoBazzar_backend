const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const hotelSchema = new Schema({
  hotelName: {
    type: String,
    required: true,
  },
  hotelPhotoUrl: {
    type: [String],
  },
  hotelRating: {
    type: Number,
  },
  hotelPrice: {
    type: Number,
  },
  hotelType: {
    type: String,
  },
});

module.exports = mongoose.model("Hotel", hotelSchema);
