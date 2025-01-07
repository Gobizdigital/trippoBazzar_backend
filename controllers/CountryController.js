const countryModel = require("../models/CountryModel");
const auth = require("../auth/AuthValidation");
const NodeCache = require("node-cache");
const cache = new NodeCache({ stdTTL: 1800 });

require("dotenv").config();

const addCountry = async (req, res) => {
  try {
    const savedCountry = await countryModel.create(req.body);
    if (savedCountry) {
      res.status(201).json({
        message: "Country Added Successfully",
        data: savedCountry,
      });
      cache.del("allCountries");
    } else {
      res.status(400).json({ message: "Incomplete Country Details" });
    }
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error in creating", error: error.message });
  }
};

const getAllCountries = async (req, res) => {
  try {
    // Check cache for all countries data
    const cachedCountries = cache.get("allCountries");
    if (cachedCountries) {
      return res.status(200).json({
        message: "Countries retrieved successfully from cache",
        data: cachedCountries,
      });
    }

    // Fetch countries from database
    const countries = await countryModel.find().populate("States");

    if (countries.length > 0) {
      // Cache the result
      cache.set("allCountries", countries);

      res.status(200).json({
        message: "Countries retrieved successfully",
        data: countries,
      });
    } else {
      res.status(404).json({ message: "No countries found" });
    }
  } catch (error) {
    res.status(500).json({
      message: "Error in fetching countries",
      error: error.message,
    });
  }
};

const getCountryById = async (req, res) => {
  try {
    const countryId = req.params.id; // Get country ID from URL params
    const country = await countryModel.findById(countryId).populate("States"); // Find country by ID

    if (country) {
      res.status(200).json({
        message: "Country retrieved successfully",
        data: country,
      });
    } else {
      res.status(404).json({ message: "Country not found" });
    }
  } catch (error) {
    res.status(500).json({
      message: "Error in fetching country",
      error: error.message,
    });
  }
};

const getCountryByName = async (req, res) => {
  try {
    const { name } = req.params; // Get country name from URL params
    const cacheKey = `country_${name}`; // Create a unique cache key for each country

    // Check if country data is cached
    const cachedCountry = cache.get(cacheKey);

    if (cachedCountry) {
      return res.status(200).json({
        message: "Country retrieved successfully from cache",
        data: cachedCountry,
      });
    }

    // Fetch country data from the database
    const country = await countryModel
      .findOne({ CountryName: name }) // Find country by name
      .populate({
        path: "States",
        select: "Packages StatePhotoUrl StateName",
        populate: {
          path: "Packages",
          select: "price",
        },
      })
      .lean(); // Convert the result to a plain JavaScript object for easier manipulation

    if (country) {
      // Process the data to limit to one state and one package
      const processedCountry = {
        ...country,
        States: country.States.map((state) => ({
          ...state,
          Packages: state.Packages.slice(0, 1), // Limit to the first package for the state
        })),
      };

      // Cache the retrieved country data
      cache.set(cacheKey, processedCountry);

      res.status(200).json({
        message: "Country retrieved successfully",
        data: processedCountry,
      });
    } else {
      res.status(404).json({ message: "Country not found" });
    }
  } catch (error) {
    res.status(500).json({
      message: "Error in fetching country",
      error: error.message,
    });
  }
};

const updateCountry = async (req, res) => {
  try {
    const countryId = req.params.id; // Get country ID from URL params
    const updateData = req.body; // Get the data to be updated from the request body

    const updatedCountry = await countryModel.findByIdAndUpdate(
      countryId,
      updateData,
      { new: true } // This option returns the updated document
    );

    if (updatedCountry) {
      res.status(200).json({
        message: "Country updated successfully",
        data: updatedCountry,
      });
      cache.del("allCountries");
    } else {
      res.status(404).json({ message: "Country not found" });
    }
  } catch (error) {
    res.status(500).json({
      message: "Error in updating country",
      error: error.message,
    });
  }
};

const deleteCountry = async (req, res) => {
  try {
    const countryId = req.params.id; // Get country ID from URL params
    const deletedCountry = await countryModel.findByIdAndDelete(countryId); // Delete the country

    if (deletedCountry) {
      res.status(200).json({
        message: "Country deleted successfully",
        data: deletedCountry,
      });
      cache.del("allCountries");
    } else {
      res.status(404).json({ message: "Country not found" });
    }
  } catch (error) {
    res.status(500).json({
      message: "Error in deleting country",
      error: error.message,
    });
  }
};

module.exports = {
  addCountry,
  getAllCountries,
  getCountryById,
  getCountryByName,
  updateCountry,
  deleteCountry,
};
