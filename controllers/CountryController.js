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

const getAllCountriesByQuery = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      sortBy = "CountryName",
      sortDirection = "asc"
    } = req.query;

    // Parse query parameters
    const parsedPage = parseInt(page);
    const parsedLimit = parseInt(limit);
    const skip = (parsedPage - 1) * parsedLimit;

    // Build the query for filtering
    const query = {};

    // Handle search term
    if (search) {
      query.CountryName = { $regex: search, $options: "i" };
    }

    // Build sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortDirection === "desc" ? -1 : 1;

    // Fetch countries with pagination and populate the States field
    const countries = await countryModel.find(query)
      .populate("States")
      .sort(sortOptions)
      .skip(skip)
      .limit(parsedLimit)
      .lean();

    // Get the total count of countries for pagination metadata
    const totalCount = await countryModel.countDocuments(query);

    // Calculate total pages
    const totalPages = Math.ceil(totalCount / parsedLimit);

    // Cache only if fetching all countries without filters
    if (!search && parsedPage === 1 && parsedLimit >= totalCount) {
      cache.set("allCountries", countries);
    }

    res.status(200).json({
      message: "Countries retrieved successfully",
      data: countries,
      pagination: {
        totalCount,
        totalPages,
        currentPage: parsedPage,
        limit: parsedLimit,
      },
    });
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

// const getCountryByName = async (req, res) => {
//   try {
//     const { name } = req.params; // Get country name from URL params
//     const cacheKey = `country_${name}`; // Create a unique cache key for each country

//     // Check if country data is cached
//     const cachedCountry = cache.get(cacheKey);

//     if (cachedCountry) {
//       return res.status(200).json({
//         message: "Country retrieved successfully from cache",
//         data: cachedCountry,
//       });
//     }

//     // Fetch country data from the database
//     const country = await countryModel
//       .findOne({ CountryName: name }) // Find country by name
//       .populate({
//         path: "States",
//         select: "Packages StatePhotoUrl StateName",
//         populate: {
//           path: "Packages",
//           select: "price",
//         },
//       })
//       .lean(); // Convert the result to a plain JavaScript object for easier manipulation

//     if (country) {
//       // Process the data to limit to one state and one package
//       const processedCountry = {
//         ...country,
//         States: country.States.map((state) => ({
//           ...state,
//           Packages: state.Packages.slice(0, 1), // Limit to the first package for the state
//         })),
//       };

//       // Cache the retrieved country data
//       cache.set(cacheKey, processedCountry);

//       res.status(200).json({
//         message: "Country retrieved successfully",
//         data: processedCountry,
//       });
//     } else {
//       res.status(404).json({ message: "Country not found" });
//     }
//   } catch (error) {
//     res.status(500).json({
//       message: "Error in fetching country",
//       error: error.message,
//     });
//   }
// };

const getCountryByName = async (req, res) => {
  try {
    const { name } = req.params;
    const cacheKey = `country_${name}`;

    // Check if country data is cached
    const cachedCountry = cache.get(cacheKey);

    // if (cachedCountry) {
    //   return res.status(200).json({
    //     message: "Country retrieved successfully from cache",
    //     data: cachedCountry,
    //   });
    // }

    // Fetch country data from the database
    const country = await countryModel
      .findOne({ CountryName: name })
      .populate({
        path: "States",
        select: "Packages StatePhotoUrl StateName",
        populate: {
          path: "Packages",
          select: "price pricing title", // Include title for better identification
        },
      })
      .lean();

    if (country) {
      // Process the data to limit to one state and one package
      const processedCountry = {
        ...country,
        States: country.States.map((state) => {
          // First process all packages to ensure they have valid pricing
          const processedPackages = state.Packages.map((pkg) => {
            // Create a new package object to avoid modifying the original
            const processedPkg = { ...pkg };

            // Try to find the lowest basePrice from pricing array
            let finalPrice = undefined;

            // Check if pricing array exists and has items
            if (processedPkg.pricing && processedPkg.pricing.length > 0) {
              // Filter out invalid basePrice values and find the minimum
              const validPrices = processedPkg.pricing
                .filter(
                  (p) =>
                    p.basePrice !== undefined &&
                    p.basePrice !== null &&
                    !isNaN(p.basePrice)
                )
                .map((p) => p.basePrice);

              if (validPrices.length > 0) {
                finalPrice = Math.min(...validPrices);
              }
            }

            // If no valid basePrice was found, fall back to the existing price field
            if (
              finalPrice === undefined ||
              finalPrice === null ||
              isNaN(finalPrice)
            ) {
              finalPrice = processedPkg.price;
            }

            // Update the price field with our final determined price
            processedPkg.price = finalPrice;

            return processedPkg;
          });

          // Filter packages to only include those with valid pricing
          const validPackages = processedPackages.filter((pkg) => {
            return (
              pkg.price !== undefined && pkg.price !== null && !isNaN(pkg.price)
            );
          });

          // If we have valid packages, select the first one
          // If not, return an empty array for this state's packages
          return {
            ...state,
            Packages: validPackages.length > 0 ? [validPackages[0]] : [],
          };
        }),
      };

      // Filter out states that don't have any packages with valid pricing
      processedCountry.States = processedCountry.States.filter(
        (state) => state.Packages.length > 0
      );

      // Cache the retrieved country data
      cache.set(cacheKey, processedCountry);

      // Check if we have any states with packages after filtering
      if (processedCountry.States.length === 0) {
        return res.status(404).json({
          message:
            "No states with valid package pricing found for this country",
        });
      }

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
  getAllCountriesByQuery,
  updateCountry,
  deleteCountry,
};
