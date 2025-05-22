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

const getAllHotelsByQuery = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, sortBy = "hotelName", sortDirection = "asc" } = req.query

    // Parse query parameters
    const parsedPage = Number.parseInt(page)
    const parsedLimit = Number.parseInt(limit)
    const skip = (parsedPage - 1) * parsedLimit

    // Build the query for filtering
    const query = {}

    // Handle search term
    if (search) {
      query.hotelName = { $regex: search, $options: "i" }
    }

    // Build sort options
    const sortOptions = {}
    sortOptions[sortBy] = sortDirection === "desc" ? -1 : 1

    // Fetch hotels with pagination
    const hotels = await hotelModel.find(query).sort(sortOptions).skip(skip).limit(parsedLimit).lean()

    // Get the total count of hotels for pagination metadata
    const totalCount = await hotelModel.countDocuments(query)

    // Calculate total pages
    const totalPages = Math.ceil(totalCount / parsedLimit)

    // Cache only if fetching all hotels without filters
    if (!search && parsedPage === 1 && parsedLimit >= totalCount) {
      cache.set("allHotels", hotels)
    }

    res.status(200).json({
      message: "Hotels retrieved successfully",
      data: hotels,
      pagination: {
        totalCount,
        totalPages,
        currentPage: parsedPage,
        limit: parsedLimit,
      },
    })
  } catch (error) {
    res.status(500).json({
      message: "Error in fetching Hotels",
      error: error.message,
    })
  }
}

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
  getAllHotelsByQuery,
  getHotelById,
  updateAllHotels,
  updateHotel,
  deleteHotel,
};
