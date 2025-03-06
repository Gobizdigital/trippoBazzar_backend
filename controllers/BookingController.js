const BookingModel = require("../models/BookingModel");
const UserModel = require("../models/UserModel");
const auth = require("../auth/AuthValidation");
require("dotenv").config();

const addBooking = async (req, res) => {
  try {
    // Step 1: Remove userId from req.body to avoid passing it during booking creation
    const { userId, ...bookingData } = req.body; // Destructure to remove userId

    // Step 2: Create the booking without userId in the request body
    const savedBooking = await BookingModel.create({ ...bookingData, userId });

    if (!savedBooking) {
      return res.status(400).json({ message: "Incomplete Booking Details" });
    }

    // Step 3: Find the user by the passed userId and update their BookingDetails
    const updatedUser = await UserModel.findByIdAndUpdate(
      userId, // User ID to find
      {
        $push: { BookingDetails: savedBooking._id }, // Push the booking ID to the BookingDetails array
      },
      { new: true, runValidators: false } // Return the updated user and skip validation
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Step 4: Return success response with the booking details
    res.status(201).json({
      message: "Booking Added Successfully",
      data: savedBooking,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error in creating booking",
      error: error.message,
    });
  }
};

const getAllBookings = async (req, res) => {
  try {
    const Bookings = await BookingModel.find();
    if (Bookings.length > 0) {
      res.status(200).json({
        message: "Bookings retrieved successfully",
        data: Bookings,
      });
    } else {
      res.status(404).json({ message: "No Bookings found" });
    }
  } catch (error) {
    res.status(500).json({
      message: "Error in fetching Bookings",
      error: error.message,
    });
  }
};

const getBookingById = async (req, res) => {
  try {
    const BookingId = req.params.id;
    const Booking = await BookingModel.findById(BookingId);

    if (Booking) {
      res.status(200).json({
        message: "Booking retrieved successfully",
        data: Booking,
      });
    } else {
      res.status(404).json({ message: "Booking not found" });
    }
  } catch (error) {
    res.status(500).json({
      message: "Error in fetching Booking",
      error: error.message,
    });
  }
};

const updateBooking = async (req, res) => {
  try {
    const BookingId = req.params.id; // Get country ID from URL params
    const updateData = req.body; // Get the data to be updated from the request body

    const updatedBooking = await BookingModel.findByIdAndUpdate(
      BookingId,
      updateData,
      { new: true } // This option returns the updated document
    );

    if (updatedBooking) {
      res.status(200).json({
        message: "Booking updated successfully",
        data: updatedBooking,
      });
    } else {
      res.status(404).json({ message: "Booking not found" });
    }
  } catch (error) {
    res.status(500).json({
      message: "Error in updating Booking",
      error: error.message,
    });
  }
};

const deleteBooking = async (req, res) => {
  try {
    const BookingId = req.params.id; // Get country ID from URL params

    const updatedBooking = await BookingModel.findByIdAndDelete(BookingId);

    if (updatedBooking) {
      res.status(200).json({
        message: "Booking Deleted successfully",
      });
    } else {
      res.status(404).json({ message: "Booking not found" });
    }
  } catch (error) {
    res.status(500).json({
      message: "Error in Deleting Booking",
      error: error.message,
    });
  }
};

module.exports = {
  addBooking,
  getAllBookings,
  getBookingById,
  updateBooking,
  deleteBooking,
};
