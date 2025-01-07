const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const stateSchema = new Schema({
  StateName: {
    type: String,
    required: true,
  },
  StatePhotoUrl: {
    type: String,
    required: true,
  },
  Packages: [
    {
      type: Schema.Types.ObjectId,
      ref: "Package",
    },
  ],
});

module.exports = mongoose.model("State", stateSchema);
