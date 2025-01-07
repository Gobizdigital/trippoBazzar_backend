const mongoose = require("mongoose");
const Schema = mongoose.Schema; //creation object of schema class
const couponSchema = new Schema({
  couponCode: { type: String, required: true },
  couponDescription:{type: String, required: true},
  discountPercentage: { type: Number, required: true },
  maxDiscount: { type: Number, required: true },
  validUntil: { type: Date, required: true },
});

module.exports = mongoose.model("Coupon", couponSchema);
