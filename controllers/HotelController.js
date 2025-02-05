const hotelModel = require("../models/HotelModel");
const auth = require("../auth/AuthValidation");
require("dotenv").config();

const addHotel = async (req, res) => {
  try {
    const savedhotel = await hotelModel.create(req.body);
    if (savedhotel) {
      res.status(201).json({
        message: "hotel Added Successfully",
        data: savedhotel,
      });
    } else {
      res.status(400).json({ message: "Incomplete hotel Details" });
    }
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error in creating", error: error.message });
  }
};

const getAllHotels = async (req, res) => {
  try {
    const hotels = await hotelModel.find();
    if (hotels.length > 0) {
      res.status(200).json({
        message: "Hotels retrieved successfully",
        data: hotels,
      });
    } else {
      res.status(404).json({ message: "No Hotels found" });
    }
  } catch (error) {
    res.status(500).json({
      message: "Error in fetching Hotels",
      error: error.message,
    });
  }
};

const updateAllHotels = async (req, res) => {
  try {
    const updateData = req.body;
    const result = await hotelModel.updateMany({}, updateData);

    res.status(200).json({
      message: "Hotels updated successfully",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating Hotels", error: error.message });
  }
};

const getHotelById = async (req, res) => {
  try {
    const hotelId = req.params.id;
    const hotel = await hotelModel.findById(hotelId);

    if (hotel) {
      res.status(200).json({
        message: "Hotel retrieved successfully",
        data: hotel,
      });
    } else {
      res.status(404).json({ message: "Hotel not found" });
    }
  } catch (error) {
    res.status(500).json({
      message: "Error in fetching Hotel",
      error: error.message,
    });
  }
};

const updateHotel = async (req, res) => {
  try {
    const hotelId = req.params.id; // Get country ID from URL params
    const updateData = req.body; // Get the data to be updated from the request body

    const updatedhotel = await hotelModel.findByIdAndUpdate(
      hotelId,
      updateData,
      { new: true } // This option returns the updated document
    );

    if (updatedhotel) {
      res.status(200).json({
        message: "Hotel updated successfully",
        data: updatedhotel,
      });
    } else {
      res.status(404).json({ message: "Hotel not found" });
    }
  } catch (error) {
    res.status(500).json({
      message: "Error in updating Hotel",
      error: error.message,
    });
  }
};

const deleteHotel = async (req, res) => {
  try {
    const hotelId = req.params.id; // Get country ID from URL params

    const updatedhotel = await hotelModel.findByIdAndDelete(hotelId);

    if (updatedhotel) {
      res.status(200).json({
        message: "Hotel Deleted successfully",
      });
    } else {
      res.status(404).json({ message: "Hotel not found" });
    }
  } catch (error) {
    res.status(500).json({
      message: "Error in Deleting Hotel",
      error: error.message,
    });
  }
};

module.exports = {
  addHotel,
  getAllHotels,
  getHotelById,
  updateAllHotels,
  updateHotel,
  deleteHotel,
};
