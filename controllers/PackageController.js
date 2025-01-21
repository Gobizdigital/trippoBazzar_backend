const packageModel = require("../models/PackageModel");
const auth = require("../auth/AuthValidation");
const crypto = require("crypto");
const couponModel = require("../models/CouponModel");
const hotelModel = require("../models/HotelModel");
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
}) => {
  // Step 1: Fetch package details
  const packageDetails = await packageModel.findById(Pack_id);
  if (!packageDetails) {
    throw new Error("Package not found");
  }

  const basePrice = packageDetails.price;
  const mainPrice = basePrice * guests;

  // Step 2: Initialize totalHotelPrice
  let totalHotelPrice = 0;

  // Step 3: Calculate the total price for all selected hotels
  for (const hotel of selectedHotels) {
    try {
      // Validate hotel._id
      if (!hotel._id) {
        console.warn(`Missing hotel ID for one of the selected hotels:`, hotel);
        continue;
      }

      // Fetch hotel details
      const hotelData = await hotelModel.findById(hotel._id);
      if (!hotelData) {
        console.warn(`Hotel not found for ID: ${hotel._id}`);
        continue;
      }

      // Calculate the hotel price
      let price = hotelData.hotelPrice * hotel.room;

      // Add price for additional adults
      if (hotel.adults > 1) {
        price += (hotel.adults - 1) * hotelData.hotelPrice * 0.85 * hotel.room;
      }

      // Add price for children
      if (hotel.children > 0) {
        price += hotel.extraBed
          ? hotel.children * hotelData.hotelPrice * 0.75
          : hotel.children * hotelData.hotelPrice * 0.5;
      }

      // Accumulate the total hotel price
      totalHotelPrice += price;
    } catch (error) {
      console.error(`Error processing hotel ID: ${hotel._id}`, error);
    }
  }

  // Step 4: Calculate total cost
  const totalCost = mainPrice + totalHotelPrice;

  // Step 5: Apply coupon if valid
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

const verifyAmount = async (req, res) => {
  try {
    const { selectedHotels, Pack_id, guests, coupon } = req.body;


    // Validate input data
    if (!Pack_id || !guests || !Array.isArray(selectedHotels)) {
      return res.status(400).json({ error: "Invalid input data" });
    }

    // Recalculate the total price
    const totalPrice = await calculateTotalPrice({
      selectedHotels,
      Pack_id, // You need to pass Pack_id here, not basePrice
      guests,
      coupon,
    });

    // Now that you have the totalPrice, return both totalPrice and order creation response
    const orderResponse = await createOrder(totalPrice);

    // Return both responses in the response body
    return res.status(200).json({
      totalPrice,
      order: orderResponse, // Assuming createOrder returns the order details
    });
  } catch (error) {
    console.error("Error calculating price:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Updated createOrder to return a promise
const createOrder = async (totalPrice) => {
  const options = {
    amount: (totalPrice) * 100, // Convert to paise (Razorpay expects the amount in paise)
    currency: "INR",
    receipt: "order_1",
  };

  try {
    // Creating the Razorpay order
    return new Promise((resolve, reject) => {
      razorPayInstance.orders.create(options, (err, order) => {
        if (err) {
          reject({
            message: "Error creating an order",
            error: err.message,
          });
        } else {
          resolve(order); // Resolving the promise with the order details
        }
      });
    });
  } catch (error) {
    throw new Error(`Error creating an order: ${error.message}`);
  }
};

const verfiyPayment = async (req, res) => {
  const { order_id, payment_id, signature } = req.body;

  const secret = process.env.RAZOR_KEY_SECRET;
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(order_id + "|" + payment_id);

  const generateSignature = hmac.digest("hex");
  if (generateSignature === signature) {
    res.status(200).json({
      message: "Payment verified successfully",
    });
  } else if (generateSignature !== signature) {
    res.status(401).json({
      message: "Invalid signature",
    });
  } else {
    res.status(400).json({
      message: "Payment not Verified",
    });
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
