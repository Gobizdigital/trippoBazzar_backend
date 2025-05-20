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



// const getAllContinent = async (req, res) => {
//   try {
//     // Check if the data is already cached
//     // const cachedContinents = cache.get("allContinents");

//     // if (cachedContinents) {
//     //   return res.status(200).json({
//     //     message: "Continent retrieved successfully from cache",
//     //     data: cachedContinents,
//     //   });
//     // }

//     // Fetch from the database
//     const continent = await continentModel
//       .find()
//       .populate({
//         path: "Countries",
//         populate: {
//           path: "States",
//           select: "Packages",
//           populate: {
//             path: "Packages",
//             select: "price description",
//           },
//         },
//       })
//       .lean();

//     const processedContinents = continent.map((continent) => ({
//       ...continent,
//       Countries: continent.Countries.map((country) => ({
//         ...country,
//         States: country.States.slice(0, 1).map((state) => ({
//           ...state,
//           Packages: state.Packages.slice(0, 1),
//         })),
//       })),
//     }));

//     if (processedContinents.length > 0) {
//       // Store the processed data in the cache
//       // cache.set("allContinents", processedContinents);

//       res.status(200).json({
//         message: "Continent retrieved successfully",
//         data: processedContinents,
//       });
//     } else {
//       res.status(404).json({ message: "No continent found" });
//     }
//   } catch (error) {
//     res
//       .status(500)
//       .json({ message: "Error in fetching continent", error: error.message });
//   }
// };


const getAllContinent = async (req, res) => {
  try {
    // Fetch all continents from the database
    const allContinents = await continentModel.find().lean();

    // Fetch continents with populated data for processing
    const populatedContinents = await continentModel
      .find()
      .populate({
        path: "Countries",
        populate: {
          path: "States",
          select: "Packages StateName StatePhotoUrl",
          populate: {
            path: "Packages",
            select: "price description pricing title",
          },
        },
      })
      .lean();

    // Process continents and their countries
    const processedContinents = populatedContinents.map((continent) => {
      // If continent has no Countries or empty Countries array, return just the continent
      if (!continent.Countries || continent.Countries.length === 0) {
        return {
          ...continent,
          Countries: [],
        };
      }

      // Process countries for continents that have them
      return {
        ...continent,
        Countries: continent.Countries.map((country) => {
          // If country has no States or empty States array, return just the country
          if (!country.States || country.States.length === 0) {
            return {
              ...country,
              States: [],
            };
          }

          // Process each state in the country
          const processedStates = country.States
            ? country.States.map((state) => {
                // If state has no Packages or empty Packages array, return just the state
                if (!state.Packages || state.Packages.length === 0) {
                  return {
                    ...state,
                    Packages: [],
                  };
                }

                // Process all packages to ensure they have valid pricing
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
                    pkg.price !== undefined &&
                    pkg.price !== null &&
                    !isNaN(pkg.price)
                  );
                });

                return {
                  ...state,
                  Packages: validPackages,
                };
              })
            : [];

          // Filter out states that don't have any packages with valid pricing
          const validStates = processedStates.filter(
            (state) => state.Packages && state.Packages.length > 0
          );

          return {
            ...country,
            States:
              validStates.length > 0
                ? validStates.slice(0, 1).map((state) => ({
                    ...state,
                    Packages: state.Packages.slice(0, 1),
                  }))
                : [],
          };
        }),
      };
    });

    // Create a map of continent IDs to their processed data
    const continentMap = new Map();
    processedContinents.forEach((continent) => {
      continentMap.set(continent._id.toString(), continent);
    });

    // Optimized approach to select at least 6 countries from multiple continents
    let selectedCountries = [];

    // First, collect up to 2 countries from each continent to ensure diversity
    processedContinents.forEach((continent) => {
      if (continent.Countries && continent.Countries.length > 0) {
        // Take up to 2 countries from each continent
        selectedCountries.push(...continent.Countries.slice(0, 6));
      }
    });

    // If we still don't have 6 countries, add more from any continent
    if (selectedCountries.length < 6) {
      const remainingNeeded = 6 - selectedCountries.length;
      const selectedIds = new Set(
        selectedCountries.map((c) => c._id.toString())
      );

      // Collect all remaining countries not already selected
      const remainingCountries = [];
      processedContinents.forEach((continent) => {
        if (continent.Countries) {
          continent.Countries.forEach((country) => {
            if (country._id && !selectedIds.has(country._id.toString())) {
              remainingCountries.push(country);
            }
          });
        }
      });

      // Add remaining countries up to the limit
      selectedCountries.push(...remainingCountries.slice(0, remainingNeeded));
    }

    // Create a set of selected country IDs
    const selectedCountryIds = new Set(
      selectedCountries.map((country) => country._id.toString())
    );

    // Create the final result with all continents
    const finalContinents = allContinents.map((continent) => {
      const processedContinent = continentMap.get(continent._id.toString());

      // If we have processed data for this continent
      if (processedContinent) {
        // Filter countries to only include those in our selected set
        const filteredCountries = processedContinent.Countries.filter(
          (country) =>
            country._id && selectedCountryIds.has(country._id.toString())
        );

        return {
          ...processedContinent,
          Countries: filteredCountries,
        };
      }

      // If no processed data, return the continent with empty Countries array
      return {
        ...continent,
        Countries: [],
      };
    });

    res.status(200).json({
      message:
        "All continents retrieved successfully with at least 6 countries from multiple continents",
      data: finalContinents,
    });
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
