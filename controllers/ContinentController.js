const continentModel = require("../models/ContinentModel");
const auth = require("../auth/AuthValidation");
// const NodeCache = require("node-cache");
// const cache = new NodeCache({ stdTTL: 1800 });
require("dotenv").config();

const addContinent = async (req, res) => {
  try {
    const savedContinent = await continentModel.create(req.body);
    if (savedContinent) {
      res.status(201).json({
        message: "Continent Added Successfully",
        data: savedContinent,
      });
      // cache.del("allContinents");
    } else {
      res.status(400).json({ message: "Incomplete Continent Details" });
    }
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error in creating", error: error.message });
  }
};

const getContinentByQuery = async (req, res) => {
  try {
    const { fields } = req.query;
    const projection = fields ? fields.split(",").join(" ") : "";

    let query = continentModel.find({}, projection);

    if (fields?.includes("Countries")) {
      query = query.populate({
        path: "Countries",
        select: "CountryName States", // fetch CountryName + States field
        populate: {
          path: "States",
          select: "StateName", // only get StateName from States
        },
      });
    }

    let continents = await query.lean();

    // 🔍 Keep States only for India
    continents = continents.map((continent) => {
      if (!continent.Countries) return continent;

      continent.Countries = continent.Countries.map((country) => {
        if (country.CountryName === "India") {
          return country; // Keep States populated
        } else {
          // Remove States from other countries
          const { States, ...rest } = country;
          return rest;
        }
      });

      return continent;
    });

    if (continents.length > 0) {
      res.status(200).json({
        message: "Continents retrieved successfully",
        data: continents,
      });
    } else {
      res.status(404).json({ message: "No continent found" });
    }
  } catch (error) {
    res.status(500).json({ message: "Error fetching continents", error: error.message });
  }
};



const getAllContinent = async (req, res) => {
  try {
    // Check if the data is already cached
    // const cachedContinents = cache.get("allContinents");

    // if (cachedContinents) {
    //   return res.status(200).json({
    //     message: "Continent retrieved successfully from cache",
    //     data: cachedContinents,
    //   });
    // }

    // Fetch from the database
    const continent = await continentModel
      .find()
      .populate({
        path: "Countries",
        populate: {
          path: "States",
          select: "Packages",
          populate: {
            path: "Packages",
            select: "price description",
          },
        },
      })
      .lean();

    const processedContinents = continent.map((continent) => ({
      ...continent,
      Countries: continent.Countries.map((country) => ({
        ...country,
        States: country.States.slice(0, 1).map((state) => ({
          ...state,
          Packages: state.Packages.slice(0, 1),
        })),
      })),
    }));

    if (processedContinents.length > 0) {
      // Store the processed data in the cache
      // cache.set("allContinents", processedContinents);

      res.status(200).json({
        message: "Continent retrieved successfully",
        data: processedContinents,
      });
    } else {
      res.status(404).json({ message: "No continent found" });
    }
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error in fetching continent", error: error.message });
  }
};

const getContinentById = async (req, res) => {
  try {
    const ContinentId = req.params.id;
    const Continent = await continentModel
      .findById(ContinentId)
      .populate("Countries");

    if (Continent) {
      res
        .status(200)
        .json({ message: "Continent retrieved successfully", data: Continent });
    } else {
      res.status(404).json({ message: "Continent not found" });
    }
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error in fetching Continent", error: error.message });
  }
};

const getContinentByName = async (req, res) => {
  try {
    const { name } = req.params;
    // const cacheKey = `continent_${name}`;

    // Check if the continent data is cached
    // const cachedContinent = cache.get(cacheKey);

    // if (cachedContinent) {
    //   return res.status(200).json({
    //     message: "Continent retrieved successfully from cache",
    //     data: cachedContinent,
    //   });
    // }

    const Continent = await continentModel
      .findOne({ name })
      .populate("Countries");

    if (Continent) {
      // Cache the retrieved continent data
      // cache.set(cacheKey, Continent);

      return res
        .status(200)
        .json({ message: "Continent retrieved successfully", data: Continent });
    } else {
      return res.status(404).json({ message: "Continent not found" });
    }
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error in fetching Continent", error: error.message });
  }
};

const updateContinent = async (req, res) => {
  try {
    const ContinentId = req.params.id;
    const updateData = req.body;

    const updatedContinent = await continentModel.findByIdAndUpdate(
      ContinentId,
      updateData,
      { new: true }
    );

    if (updatedContinent) {
      res
        .status(200)
        .json({
          message: "Continent updated successfully",
          data: updatedContinent,
        });
      // cache.del("allContinents");
    } else {
      res.status(404).json({ message: "Continent not found" });
    }
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error in updating Continent", error: error.message });
  }
};

const deleteContinent = async (req, res) => {
  try {
    const ContinentId = req.params.id;
    const deletedContinent = await continentModel.findByIdAndDelete(
      ContinentId
    );

    if (deletedContinent) {
      res
        .status(200)
        .json({
          message: "Continent deleted successfully",
          data: deletedContinent,
        });
      // cache.del("allContinents");
    } else {
      res.status(404).json({ message: "Continent not found" });
    }
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error in deleting Continent", error: error.message });
  }
};

module.exports = {
  addContinent,
  getAllContinent,
  getContinentById,
  getContinentByQuery,
  getContinentByName,
  updateContinent,
  deleteContinent,
};
