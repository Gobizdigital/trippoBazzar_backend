const packageModel = require("../models/PackageModel");
const auth = require("../auth/AuthValidation");
const crypto = require("crypto");
const couponModel = require("../models/CouponModel");
const hotelModel = require("../models/HotelModel");
const BookingModel = require("../models/BookingModel");
const UserModel = require("../models/UserModel");
const PaymentModel = require("../models/PaymentModel");
const NodeCache = require("node-cache");
const createRazorPayInstance = require("../utils/RazorPayConfig");
const cache = new NodeCache({ stdTTL: 1800 });
const razorPayInstance = createRazorPayInstance();
require("dotenv").config();

const addPackage = async (req, res) => {
  try {
    const savedPackage = await packageModel.create(req.body);
    if (savedPackage) {
      res.status(201).json({
        message: "Package Added Successfully",
        data: savedPackage,
      });
      cache.del("allPackages");
    } else {
      res.status(400).json({ message: "Incomplete Package Details" });
    }
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error in creating", error: error.message });
  }
};

const getAllPackages = async (req, res) => {
  try {
    // Check if the data is already in the cache
    const cachedPackages = cache.get("allPackages");

    if (cachedPackages) {
      return res.status(200).json({
        message: "Packages retrieved successfully from cache",
        data: cachedPackages,
      });
    }

    // Fetch from the database
    const packages = await packageModel.find();

    if (packages.length > 0) {
      // Store in the cache
      cache.set("allPackages", packages);

      res.status(200).json({
        message: "Packages retrieved successfully",
        data: packages,
      });
    } else {
      res.status(404).json({ message: "No Packages found" });
    }
  } catch (error) {
    res.status(500).json({
      message: "Error in fetching Packages",
      error: error.message,
    });
  }
};

const getPackageById = async (req, res) => {
  try {
    const packageId = req.params.id;
    const package = await packageModel.findById(packageId).populate({
      path: "hotels.hotelDetails", // Nested population of hotelDetails within hotels
    });

    if (package) {
      res.status(200).json({
        message: "package retrieved successfully",
        data: package,
      });
    } else {
      res.status(404).json({ message: "package not found" });
    }
  } catch (error) {
    res.status(500).json({
      message: "Error in fetching package",
      error: error.message,
    });
  }
};

const updatePackage = async (req, res) => {
  try {
    const packageId = req.params.id;
    const updateData = req.body;
    const updatedPackage = await packageModel.findByIdAndUpdate(
      packageId,
      updateData,
      { new: true } // This option returns the updated document
    );

    if (updatedPackage) {
      res.status(200).json({
        message: "Package updated successfully",
        data: updatedPackage,
      });
      cache.del("allPackages");
    } else {
      res.status(404).json({ message: "Package not found" });
    }
  } catch (error) {
    res.status(500).json({
      message: "Error in updating Package",
      error: error.message,
    });
  }
};

const deletePackage = async (req, res) => {
  try {
    const packageId = req.params.id; // Get country ID from URL params
    const deleteData = req.body; // Get the data to be updated from the request body

    const updatedPackage = await packageModel.findByIdAndDelete(
      packageId,
      deleteData,
      { new: true } // This option returns the updated document
    );

    if (updatedPackage) {
      res.status(200).json({
        message: "Package deleted successfully",
        data: updatedPackage,
      });
      cache.del("allPackages");
    } else {
      res.status(404).json({ message: "Package not found" });
    }
  } catch (error) {
    res.status(500).json({
      message: "Error in updating Package",
      error: error.message,
    });
  }
};

const calculateTotalPrice = async ({
  selectedHotels,
  Pack_id,
  guests,
  coupon,
  selectedPricing,
  services, // Additional services (extra bed, CNB)
}) => {
  // Step 1: Fetch package details
  const packageDetails = await packageModel.findById(Pack_id);
  if (!packageDetails) {
    throw new Error("Package not found");
  }

  // Step 2: Verify pricing from the package model
  let mainPrice = packageDetails.price * guests; // Default price without selectedPricing
  let extraBedCharge = 0;
  let cnbCharge = 0;
  let cwbCharge = 0;

  if (selectedPricing) {
    const matchingPricing = packageDetails.pricing.find(
      (p) => p.basePrice === selectedPricing
    );

    if (!matchingPricing) {
      throw new Error("Invalid pricing selection");
    }

    // **If perPerson is true, multiply by guests**
    if (matchingPricing.perPerson) {
      mainPrice = selectedPricing * guests; // Multiply selected price per guest
    } else {
      if (guests !== matchingPricing.guestCount) {
        throw new Error("Guest count mismatch for selected pricing");
      }
      mainPrice = selectedPricing * guests;
    }

    // Step 3: Add Extra Bed and CNB charges ONLY IF selectedPricing is valid
    if (services?.extraBed) {
      extraBedCharge = matchingPricing.extraBedCharge || 0;
    }

    if (services?.cnb) {
      cnbCharge = matchingPricing.CNB || 0;
    }

    if (services?.cwb) {
      cwbCharge = matchingPricing.CWB || 0;
    }
  }

  // Step 4: Initialize totalHotelPrice
  let totalHotelPrice = 0;

  // Step 5: Calculate the total price for all selected hotels
  for (const hotel of selectedHotels) {
    try {
      if (!hotel._id) {
        console.warn(`Missing hotel ID for one of the selected hotels:`, hotel);
        continue;
      }

      const hotelData = await hotelModel.findById(hotel._id);
      if (!hotelData) {
        console.warn(`Hotel not found for ID: ${hotel._id}`);
        continue;
      }

      let price = hotelData.hotelPrice * hotel.room;

      if (hotel.adults > 1) {
        price += (hotel.adults - 1) * hotelData.hotelPrice * 0.85 * hotel.room;
      }

      if (hotel.children > 0) {
        price += hotel.extraBed
          ? hotel.children * hotelData.hotelPrice * 0.75
          : hotel.children * hotelData.hotelPrice * 0.5;
      }

      totalHotelPrice += price;
    } catch (error) {
      console.error(`Error processing hotel ID: ${hotel._id}`, error);
    }
  }

  // Step 6: Calculate total cost (including extra bed & CNB charges ONLY if selectedPricing exists)
  const totalCost =
    mainPrice +
    totalHotelPrice +
    (selectedPricing ? extraBedCharge + cnbCharge + cwbCharge : 0); // Add only if selectedPricing exists

  // Step 7: Apply coupon if valid
  if (coupon?.id) {
    try {
      const couponDetails = await couponModel.findById(coupon.id);
      if (couponDetails) {
        const discount = Math.min(
          (totalCost * couponDetails.discountPercentage) / 100,
          couponDetails.maxDiscount
        );
        return totalCost - discount;
      } else {
        console.warn(`Invalid coupon ID: ${coupon.id}`);
      }
    } catch (error) {
      console.error(
        `Error fetching coupon details for ID: ${coupon.id}`,
        error
      );
    }
  }

  // Return total cost if no valid coupon
  return totalCost;
};

// Controller to verify amount
const verifyAmount = async (req, res) => {
  try {
    const {
      selectedHotels,
      Pack_id,
      guests,
      coupon,
      selectedPricing,
      services,
      userId,
    } = req.body;

    if (!Pack_id || !guests) {
      return res.status(400).json({ error: "Invalid input data" });
    }

    // ✅ Step 1: Securely calculate total price
    const totalPrice = await calculateTotalPrice({
      selectedHotels,
      Pack_id,
      guests,
      coupon,
      selectedPricing,
      services,
    });

    // ✅ Step 2: Create Razorpay order
    const order = await createOrder(totalPrice);

    if (!order) {
      return res.status(500).json({ error: "Failed to create order" });
    }

    // ✅ Step 3: Store `totalPrice` securely in the Payment model
    const paymentRecord = await PaymentModel.create({
      userId,
      orderId: order.id,
      packageId: Pack_id,
      verifiedPrice: totalPrice, // 🔥 Securely stored
      status: "Pending",
    });

    return res.status(200).json({
      success: true,
      order, // ✅ Only return order details (not `totalPrice`)
      packageId: Pack_id,
    });
  } catch (error) {
    console.error("Error verifying amount:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Updated createOrder to return a promise
const createOrder = async (totalPrice) => {
  const options = {
    amount: totalPrice * 100, // Convert to paise (Razorpay expects the amount in paise)
    currency: "INR",
    receipt: "order_1",
    payment_capture: 1, // Auto-capture the payment
  };

  try {
    // Creating Razorpay order
    return new Promise((resolve, reject) => {
      razorPayInstance.orders.create(options, (err, order) => {
        if (err) {
          console.error("Error creating Razorpay order:", err); // Log the error
          reject({
            message: "Error creating an order",
            error: err.message,
          });
        } else {
          resolve(order); // Return the created order
        }
      });
    });
  } catch (error) {
    console.error("Unhandled error while creating Razorpay order:", error);
    throw new Error(`Error creating an order: ${error.message}`);
  }
};

// const verfiyPayment = async (req, res) => {
//   try {
//     const { order_id, payment_id, signature, userId, bookingData } = req.body;

//     // Step 1: Generate the expected signature
//     const expectedSignature = crypto
//       .createHmac("sha256", process.env.RAZOR_KEY_SECRET)
//       .update(order_id + "|" + payment_id)
//       .digest("hex");

//     // Step 2: Compare expected vs received signature
//     if (expectedSignature !== signature) {
//       return res
//         .status(400)
//         .json({ success: false, message: "Invalid signature" });
//     }

//     // Step 3: Payment verified - Create the booking securely
//     const savedBooking = await BookingModel.create({
//       ...bookingData,
//       userId,
//       PackageBookedStatus: "Booked",
//       PackageBookedPaymentStatus: "Paid",
//       RazorPayPaymentId: payment_id,
//     });

//     // Step 4: Update the User's BookingDetails Array
//     const updatedUser = await UserModel.findByIdAndUpdate(
//       userId, // User ID to find
//       { $push: { BookingDetails: savedBooking._id } }, // Push booking ID into BookingDetails array
//       { new: true, runValidators: false } // Return the updated user & skip validation
//     );

//     if (!updatedUser) {
//       return res
//         .status(404)
//         .json({ success: false, message: "User not found" });
//     }

//     // Step 5: Return success response with booking details
//     return res.status(201).json({
//       success: true,
//       message: "Payment verified, booking added successfully",
//       data: savedBooking,
//     });
//   } catch (error) {
//     console.error("Payment verification error:", error);
//     return res.status(500).json({ success: false, message: "Server error" });
//   }
// };

const verfiyPayment = async (req, res) => {
  try {
    const { order_id, payment_id, signature, userId, bookingData } = req.body;

    // ✅ Step 1: Validate Razorpay Signature
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZOR_KEY_SECRET)
      .update(`${order_id}|${payment_id}`)
      .digest("hex");

    if (expectedSignature !== signature) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid payment signature" });
    }

    // ✅ Step 2: Fetch stored `totalPrice` from backend (Not from frontend)
    const paymentRecord = await PaymentModel.findOne({ orderId: order_id });

    if (!paymentRecord) {
      return res
        .status(400)
        .json({ success: false, message: "Payment record not found" });
    }

    const correctPrice = paymentRecord.verifiedPrice;

    // ✅ Step 3: Ensure amount matches before booking
    if (!correctPrice) {
      return res
        .status(400)
        .json({ success: false, message: "Price verification failed" });
    }

    // ✅ Step 4: Create Booking
    const savedBooking = await BookingModel.create({
      ...bookingData,
      userId,
      PackageBookedPrice: correctPrice,
      PackageBookedStatus: "Booked",
      PackageBookedPaymentStatus: "Paid",
      RazorPayPaymentId: payment_id,
    });

    // ✅ Step 5: Update Payment Record to `Paid`
    paymentRecord.status = "Paid";
    await paymentRecord.save();

    // ✅ Step 6: Update User's Booking History
    await UserModel.findByIdAndUpdate(userId, {
      $push: { BookingDetails: savedBooking._id },
    });

    return res.status(201).json({
      success: true,
      message: "Payment verified & booking added successfully",
      data: savedBooking,
    });
  } catch (error) {
    console.error("Payment verification error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  addPackage,
  getAllPackages,
  getPackageById,
  updatePackage,
  deletePackage,
  verifyAmount,
  createOrder,
  verfiyPayment,
};
