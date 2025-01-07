const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const countrySchema = new Schema({
  CountryName: {
    type: String,
    required: true,
  },
  CountryCode: {
    type: String,
  },
  CountryPhotoUrl: {
    type: String,
    required: true,
  },
  States: [
    {
      type: Schema.Types.ObjectId,
      ref: "State",
    },
  ],
});

module.exports = mongoose.model("Country", countrySchema);
