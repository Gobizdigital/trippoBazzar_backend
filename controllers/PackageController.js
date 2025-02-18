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

  if (selectedPricing) {
    const matchingPricing = packageDetails.pricing.find(
      (p) => p.basePrice === selectedPricing
    );

    if (!matchingPricing) {
      throw new Error("Invalid pricing selection");
    }

    if (guests !== matchingPricing.guestCount) {
      throw new Error("Guest count mismatch for selected pricing");
    }

    mainPrice = selectedPricing * guests;

    // Step 3: Add Extra Bed and CNB charges ONLY IF selectedPricing is valid
    if (services?.extraBed) {
      extraBedCharge = matchingPricing.extraBedCharge || 0;
    }

    if (services?.cnb) {
      cnbCharge = matchingPricing.CNB || 0;
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
    (selectedPricing ? extraBedCharge + cnbCharge : 0); // Add only if selectedPricing exists

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
    } = req.body;

    if (!Pack_id || !guests) {
      return res.status(400).json({ error: "Invalid input data" });
    }

    const totalPrice = await calculateTotalPrice({
      selectedHotels,
      Pack_id,
      guests,
      coupon,
      selectedPricing,
      services,
    });

    const orderResponse = await createOrder(totalPrice);

    return res.status(200).json({
      totalPrice,
      order: orderResponse,
    });
  } catch (error) {
    console.error("Error calculating price:", error);
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
