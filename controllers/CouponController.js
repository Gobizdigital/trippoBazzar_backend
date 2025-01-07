const couponModel = require("../models/CouponModel");
const auth = require("../auth/AuthValidation");
require("dotenv").config();

const addcoupon = async (req, res) => {
  try {
    const savedCoupon = await couponModel.create(req.body);
    if (savedCoupon) {
      res.status(201).json({
        message: "Coupon Added Successfully",
        data: savedCoupon,
      });
    } else {
      res.status(400).json({ message: "Incomplete Coupon Details" });
    }
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error in creating", error: error.message });
  }
};

const getAllCoupons = async (req, res) => {
  try {
    const coupons = await couponModel.find();
    if (coupons.length > 0) {
      res.status(200).json({
        message: "coupons retrieved successfully",
        data: coupons,
      });
    } else {
      res.status(404).json({ message: "No coupons found" });
    }
  } catch (error) {
    res.status(500).json({
      message: "Error in fetching coupons",
      error: error.message,
    });
  }
};

const getCouponById = async (req, res) => {
  try {
    const couponId = req.params.id;
    const coupon = await couponModel.findById(couponId);

    if (coupon) {
      res.status(200).json({
        message: "coupon retrieved successfully",
        data: coupon,
      });
    } else {
      res.status(404).json({ message: "coupon not found" });
    }
  } catch (error) {
    res.status(500).json({
      message: "Error in fetching coupon",
      error: error.message,
    });
  }
};

const updateCoupon = async (req, res) => {
  try {
    const couponId = req.params.id; // Get country ID from URL params
    const updateData = req.body; // Get the data to be updated from the request body

    const updatedCoupon = await couponModel.findByIdAndUpdate(
      couponId,
      updateData,
      { new: true } // This option returns the updated document
    );

    if (updatedCoupon) {
      res.status(200).json({
        message: "Coupon updated successfully",
        data: updatedCoupon,
      });
    } else {
      res.status(404).json({ message: "Coupon not found" });
    }
  } catch (error) {
    res.status(500).json({
      message: "Error in updating Coupon",
      error: error.message,
    });
  }
};

const deleteCoupon = async (req, res) => {
  try {
    const couponId = req.params.id; // Get country ID from URL params

    const updatedCoupon = await couponModel.findByIdAndDelete(couponId);

    if (updatedCoupon) {
      res.status(200).json({
        message: "Coupon Deleted successfully",
      });
    } else {
      res.status(404).json({ message: "Coupon not found" });
    }
  } catch (error) {
    res.status(500).json({
      message: "Error in Deleting Coupon",
      error: error.message,
    });
  }
};

module.exports = {
  addcoupon,
  getAllCoupons,
  getCouponById,
  updateCoupon,
  deleteCoupon
};
