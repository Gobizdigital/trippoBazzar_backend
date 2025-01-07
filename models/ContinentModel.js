const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const continentSchema = new Schema({
  ContinentName: {
    type: String,
    required: true,
  },
  ContinentPhotoUrl: {
    type: String,
    required: true,
  },
  Countries: [
    {
      type: Schema.Types.ObjectId,
      ref: "Country",
    },
  ],
});

module.exports = mongoose.model("Continent", continentSchema);
