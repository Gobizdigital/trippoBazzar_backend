const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    orderId: { type: String, required: true, unique: true }, // Razorpay Order ID
    packageId: { type: mongoose.Schema.Types.ObjectId, ref: "Package", required: true },
    verifiedPrice: { type: Number, required: true }, // Securely stored price
    status: { type: String, enum: ["Pending", "Paid", "Failed"], default: "Pending" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", PaymentSchema);
