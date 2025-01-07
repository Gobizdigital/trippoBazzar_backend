const razorpay = require("razorpay");
const dotenv = require("dotenv");
dotenv.config();


const createRazorPayInstance = () => {
  return new razorpay({
    key_id: process.env.RAZOR_KEY_ID,
    key_secret: process.env.RAZOR_KEY_SECRET,
  });
};

module.exports = createRazorPayInstance; // Use module.exports instead of export
