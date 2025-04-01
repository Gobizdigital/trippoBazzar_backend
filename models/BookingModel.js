const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// BookingDetails Schema
const bookingDetailsSchema = new Schema({
  PackageBooked: {
    type: Schema.Types.ObjectId,
    ref: "Package",
    required: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },

  PackageStartDate: { type: Date },
  PackageEndDate: { type: Date },
  TotalGuests: { type: Number },
  BookedHotels: [
    {
      adults: { type: Number },
      children: { type: Number },
      childrenAgeUnder5: { type: Boolean },
      extraBed: { type: Boolean },
      hotelName: { type: String },
      rooms: { type: Number },
      hotelPhotoUrl: [{ type: String }],
      hotelPrice: { type: Number },
      hotelRating: { type: Number },
      hotelLocation: { type: String },
    },
  ],
  CouponDetails: { type: Object },
  PackageBookedDate: { type: Date, default: Date.now() },
  PackageBookedPrice: { type: Number, required: true },
  GuestDetails: [
    {
      GuestName: { type: String, required: true },
      DOB: { type: Date },
      Gender: {
        type: String,
        enum: ["male", "female", "other"],
        required: true,
      },
      PassportNumber: { type: String },
      PassportIssuedCountry: { type: String },
      PassportIssuedDate: { type: Date },
      PassportDateOfExpiry: { type: Date },
    },
  ],
  PackageBookedStatus: {
    type: String,
    enum: ["Booked", "Cancelled"],
    required: true,
  },
  PackageBookedPaymentStatus: {
    type: String,
    enum: ["Paid", "Pending", "Failed"],
    required: true,
  },
  RazorPayPaymentId: { type: String },
  ContactNumber: { type: String, required: true },
  ContactEmail: { type: String, required: true },
  GSTNumber: { type: String },
  GSTAddress: { type: String },
  GSTCity: { type: String },
});

// Export the BookingDetails model
module.exports = mongoose.model("BookingDetails", bookingDetailsSchema);
