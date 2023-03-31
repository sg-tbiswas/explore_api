const _ = require("lodash");
const MongoClient = require("mongodb").MongoClient;
const CONSTANTS = require("./constants");

const queryObjectFilter = (objData, fieldName) => {
  if (Object.keys(objData).length === 0) return "";
  return {
    [fieldName]: objData,
  };
};

const getExploreData = async (req, res) => {
  let priceFilter = {};
  let bedsFilter = {};
  let bathFilter = {};
  let statusFilter = {};
  let cityFilter = {};
  let stateFilter = {};
  let streetNumberFilter = {};
  let streetFilter = {};
  let streetSuffixFilter = {};
  let streetDirFilter = {};
  let zipcodeFilter = {};
  let propertyTypeFilter = {};
  let minSqftFilter = {};
  let homeTypeFilter = {};

  let poolFilter = {};
  let garageFilter = {};
  let fireplaceFilter = {};
  let basementFilter = {};
  let waterViewFilter = {};
  let noHOAFilter = {};
  let maxHOAFilter = {};
  let maxDOMFilter = {};
  let DATA_COUNT = 24;
  let customQuery = [];
  let homeTypeCustomQuery = [];

  const params = req.query;
  if (params.pageno) {
    DATA_COUNT = 24 * parseInt(params.pageno);
  }

  if (!params.adtype) {
    cityFilter = { "address.city": "WASHINGTON" };
  }
  if (params.city) {
    cityFilter = { "address.city": params.city };
  }
  if (params.state) {
    stateFilter.$eq = params.state;
  }
  //   // Query for address
  if (params.street_number) {
    streetNumberFilter.$eq = params.street_number;
  }
  if (params.street) {
    streetFilter.$eq = params.street;
  }
  if (params.street_suffix) {
    streetSuffixFilter.$eq = params.street_suffix;
  }
  if (params.street_dir) {
    streetDirFilter = {
      $or: [
        { "address.street_dir_prefix": params.street_dir },
        { "address.street_dir_prefix": params.street_dir },
      ],
    };
  }

  if (params.property_type && params.property_type == "Rent") {
    propertyTypeFilter = {
      property_type: { $in: ["Residential Lease", "Commercial Lease"] },
    };
  }
  if (params.property_type && params.property_type == "Sale") {
    propertyTypeFilter = {
      property_type: { $nin: ["Residential Lease", "Commercial Lease"] },
    };
  }

  if (params.homeType) {
    if (params.homeType.indexOf("Houses") > -1) {
      homeTypeCustomQuery.push({
        $or: [
          { StructureDesignType: { $eq: "Detached" } },
          { StructureDesignType: { $eq: "Twin/Semi-Detached" } },
        ],
      });
    }
    if (params.homeType.indexOf("Townhouses") > -1) {
      homeTypeCustomQuery.push({
        $or: [
          { StructureDesignType: { $eq: "End of Row/Townhouse" } },
          { StructureDesignType: { $eq: "Interior Row/Townhouse" } },
        ],
      });
    }
    if (params.homeType.indexOf("Condos/Co-ops") > -1) {
      homeTypeCustomQuery.push({
        $and: [
          {
            $or: [
              { StructureDesignType: { $eq: "Unit/Flat/Apartment" } },
              { StructureDesignType: { $eq: "Penthouse Unit/Flat/Apartment" } },
            ],
          },
          { "other_data.Condo/Coop_Association_Y/N": { $ne: "0" } },
        ],
      });
    }

    if (params.homeType.indexOf("Apartments") > -1) {
      homeTypeCustomQuery.push({
        $and: [
          {
            $or: [
              { StructureDesignType: { $eq: "Unit/Flat/Apartment" } },
              { StructureDesignType: { $eq: "Penthouse Unit/Flat/Apartment" } },
            ],
          },
          { property_type: { $eq: "Residential Lease" } },
        ],
      });
    }

    if (params.homeType.indexOf("Manufactured") > -1) {
      homeTypeCustomQuery.push({
        StructureDesignType: { $eq: "Manufactured" },
      });
    }

    if (params.homeType.indexOf("Multi-Family") > -1) {
      homeTypeCustomQuery.push({ property_type: { $eq: "Multi-Family" } });
    }

    if (params.homeType.indexOf("Land") > -1) {
      homeTypeCustomQuery.push({ property_type: { $eq: "Land" } });
    }
  }

  if (params.zipcode) {
    zipcodeFilter.$eq = params.zipcode;
  }
  if (params.bathrooms) {
    bathFilter.$gt = parseInt(params.bathrooms);
  }
  if (params.bedrooms) {
    bedsFilter.$gt = parseInt(params.bedrooms);
  }
  if (params.minPrice) {
    priceFilter.$gte = parseInt(params.minPrice);
  }
  if (params.maxPrice) {
    priceFilter.$lte = parseInt(params.maxPrice);
  }

  if (params.minSqft) {
    minSqftFilter.$gte = parseInt(params.minSqft);
  }

  if (params.status) {
    statusFilter.$eq = params.status;
  }
  if (params.pool) {
    poolFilter = {
      "other_data.Pool": { $nin: ["No Pool", "No Pool,No Pool", ""] },
    };
  }
  if (params.garage) {
    garageFilter = {
      "other_data.Garage_YN": { $eq: "1" },
    };
  }
  if (params.fireplace) {
    fireplaceFilter = { "other_data.Fireplace_YN": { $eq: "1" } };
  }
  if (params.basement) {
    basementFilter = { "other_data.Basement_YN": { $eq: "1" } };
  }
  if (params.waterView) {
    waterViewFilter = { "other_data.Water_View_YN": { $eq: "1" } };
  }
  if (params.noHOA) {
    noHOAFilter = { "other_data.HOA_Y/N": { $eq: "1" } };
  }

  if (params.maxDOM) {
    maxDOMFilter.$lte = parseInt(params.maxDOM);
  }
  if (params.maxHOA) {
    maxHOAFilter = {
      $and: [
        { "other_data.HOA_Fee": { $ne: 0 } },
        { "other_data.HOA_Fee": { $lte: parseInt(params.maxHOA) } },
      ],
    };
  }

  const bedsFilterResult = queryObjectFilter(bedsFilter, "bedrooms");
  const bathsFilterResult = queryObjectFilter(bathFilter, "bathrooms");
  const stateFilterResult = queryObjectFilter(stateFilter, "other_data.state");
  const priceFilterResult = queryObjectFilter(priceFilter, "listing_price");
  const minSqftFilterResult = queryObjectFilter(
    minSqftFilter,
    "TaxTotalFinishedSqFt"
  );

  const streetNumberFilterResult = queryObjectFilter(
    streetNumberFilter,
    "address.street_number"
  );
  const streetFilterResult = queryObjectFilter(streetFilter, "address.street");
  const streetSuffixFilterResult = queryObjectFilter(
    streetSuffixFilter,
    "address.street_suffix"
  );
  const zipcodeFilterResult = queryObjectFilter(
    zipcodeFilter,
    "other_data.zipcode"
  );

  const statusFilterResult = queryObjectFilter(statusFilter, "status");

  const maxDOMFilterResult = queryObjectFilter(maxDOMFilter, "other_data.DOM");

  if (bedsFilterResult) customQuery.push(bedsFilterResult);
  if (bathsFilterResult) customQuery.push(bathsFilterResult);
  if (stateFilterResult) customQuery.push(stateFilterResult);

  if (streetNumberFilterResult) customQuery.push(streetNumberFilterResult);
  if (streetFilterResult) customQuery.push(streetFilterResult);
  if (streetSuffixFilterResult) customQuery.push(streetSuffixFilterResult);
  if (zipcodeFilterResult) customQuery.push(zipcodeFilterResult);
  if (priceFilterResult) customQuery.push(priceFilterResult);
  if (minSqftFilterResult) customQuery.push(minSqftFilterResult);
  if (statusFilterResult) customQuery.push(statusFilterResult);

  if (!_.isEmpty(propertyTypeFilter)) customQuery.push(propertyTypeFilter);
  if (!_.isEmpty(streetDirFilter)) customQuery.push(streetDirFilter);
  if (!_.isEmpty(poolFilter)) customQuery.push(poolFilter);
  if (!_.isEmpty(garageFilter)) customQuery.push(garageFilter);
  if (!_.isEmpty(fireplaceFilter)) customQuery.push(fireplaceFilter);
  if (!_.isEmpty(basementFilter)) customQuery.push(basementFilter);
  if (!_.isEmpty(waterViewFilter)) customQuery.push(waterViewFilter);
  if (!_.isEmpty(noHOAFilter)) customQuery.push(noHOAFilter);
  if (!_.isEmpty(maxHOAFilter)) customQuery.push(maxHOAFilter);

  if (maxDOMFilterResult) customQuery.push(maxDOMFilterResult);

  console.log("here", JSON.stringify(customQuery), cityFilter);
  MongoClient.connect(CONSTANTS.DB_CONNECTION_URI)
    .then(async (client) => {
      const connect = client.db(CONSTANTS.DB_NAME);
      // Connect to collection
      const collection = connect.collection("propertyData");
      const imagesCollection = connect.collection("propertyDataImages");
      collection
        .find({
          $and: [cityFilter, ...customQuery, ...homeTypeCustomQuery],
        })
        .limit(DATA_COUNT)
        .toArray()
        .then(async (data) => {
          const dataCollection = [];
          for (const result of data) {
            const propertyDataImages = [];
            await imagesCollection
              .find({ ListingId: { $eq: result.listing_id } })
              .toArray()
              .then((imageData) => {
                imageData.forEach((elm) => {
                  propertyDataImages.push({ ...elm });
                });
                dataCollection.push({ ...result, propertyDataImages });
              });
            // console.log("imagesCollection", imagesCollection);
            //dataCollection.push({ ...result });
          }
          res.status(200).json({ responseData: dataCollection, params });
        });

      // await collection.find().forEach(async function (obj) {
      //   await collection.updateOne(
      //     { _id: obj._id },
      //     {
      //       $set: {
      //         "other_data.DOM": obj?.other_data?.DOM
      //           ? parseInt(obj?.other_data?.DOM)
      //           : 0,
      //         "other_data.HOA_Fee": obj?.other_data?.HOA_Fee
      //           ? parseInt(obj?.other_data?.HOA_Fee)
      //           : 0,
      //         bedrooms: obj?.bedrooms ? parseInt(obj.bedrooms) : 0,
      //         bathrooms: obj?.bathrooms ? parseInt(obj.bathrooms) : 0,
      //         TaxTotalFinishedSqFt: obj?.TaxTotalFinishedSqFt
      //           ? parseInt(obj.TaxTotalFinishedSqFt)
      //           : 0,
      //         listing_price: obj?.listing_price
      //           ? parseFloat(obj.listing_price)
      //           : 0,
      //         "other_data.HOA_Y/N": obj?.other_data?.HOA_Yu2f_N
      //           ? obj?.other_data?.HOA_Yu2f_N
      //           : "0",
      //         "other_data.Condo/Coop_Association_Y/N": obj?.other_data
      //           ?.Condou2f_Coop_Association_Yu2f_N
      //           ? obj?.other_data?.Condou2f_Coop_Association_Yu2f_N
      //           : "0",
      //       },
      //       $unset: { __key__: "", __error__: "", __has_error__: "" },
      //       $unset: { "other_data.__key__": "" },
      //     }
      //   );
      // });
      // console.log("update done");
    })
    .catch((err) => {
      console.log(err.Message);
    });
};

module.exports = getExploreData;
