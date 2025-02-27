const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const packageSchema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  pricing: [
    {
      guestCount: { type: Number },
      packageType: {
        type: String,
        enum: ["Standard", "Deluxe", "Super Deluxe", "Luxury"],
      },
      basePrice: { type: Number },
      extraPersonCharge: { type: Number },
      extraBedCharge: { type: Number },
      CNB: { type: Number },
      perPerson: { type: Boolean },
    },
  ],
  whatsIncluded: {
    type: [String],
    enum: ["Food", "Hotel", "Car", "Explore", "Travel", "Visa"],
  },
  coupon: {
    type: [String],
  },
  MainPhotos: {
    type: [String],
  },
  dayDescription: [
    {
      dayTitle: {
        type: String,
        required: true,
      },
      photos: {
        type: [String],
      },
      dayDetails: {
        type: String,
      },
    },
  ],
  specialInstruction: {
    type: String,
  },
  conditionOfTravel: {
    type: String,
  },
  thingsToMaintain: {
    type: String,
  },
  hotels: [
    {
      location: {
        type: String, // Name of the location, e.g., 'Leh', 'Nubra Valley'
      },
      hotelDetails: [
        {
          type: Schema.Types.ObjectId,
          ref: "Hotel", // Reference to the Hotel model for each hotel in this location
        },
      ],
    },
  ],
  policies: {
    type: String,
  },
  termsAndConditions: {
    type: String,
  },
});

module.exports = mongoose.model("Package", packageSchema);
