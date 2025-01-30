const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const contactSchema = new Schema({
  contactName: {
    type: String,
    required: true,
  },
  contactEmail: {
    type: String,
    required: true,
  },
  contactPhoneNumber: {
    type: String,
    required: true,
  },
  contactReason: {
    type: String,
    enum: [
      "Support Assistance",
      "General Enquiry",
      "Feedback",
      "Complaint",
      "Others",
    ],
  },
  contactDate: {
    type: Date,
    default: Date.now,
  },
  contactDescription: {
    type: String,
    required: true,
  },
  contactMePhoneNumber: {
    type: Boolean,
    default: false,
  },
});

module.exports = mongoose.model("contact", contactSchema);
