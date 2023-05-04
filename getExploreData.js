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
  let fullAddressFilter = {};
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
  let DATA_COUNT = 36;
  let SKIP_ITEM = 0;
  let customQuery = [];
  let homeTypeCustomQuery = [];
  var homeTypeQueryWrap = {};

  const params = req.query;
  const sort = params.sort ? (params.sort === "Newest" ? -1 : 1) : -1;
  if (params.offset) {
    SKIP_ITEM = parseInt(params.offset);
  }

  if (params.city) {
    cityFilter = { "address.city": params.city };
  }
  if (params.state) {
    stateFilter.$eq = params.state;
  }
  //   // Query for address

  if (params.fullAddress) {
    // fullAddressFilter.$eq = params.fullAddress;
    const regex = new RegExp(params.fullAddress, "i");
    fullAddressFilter = {
      "address.fullAddress": {
        $regex: regex,
      },
    };
  }

  // if (params.street_number) {
  //   streetNumberFilter.$eq = params.street_number;
  // }
  // if (params.street) {
  //   streetFilter.$eq = params.street;
  // }
  // if (params.street_suffix) {
  //   streetSuffixFilter.$eq = params.street_suffix;
  // }
  // if (params.street_dir) {
  //   streetDirFilter = {
  //     $or: [
  //       { "address.street_dir_prefix": params.street_dir },
  //       { "address.street_dir_prefix": params.street_dir },
  //     ],
  //   };
  // }

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
    if (params.homeType.indexOf("Townhomes") > -1) {
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
    homeTypeQueryWrap = { $or: [...homeTypeCustomQuery] };
  }

  if (params.zipcode) {
    zipcodeFilter.$eq = params.zipcode;
  }
  if (params.bathrooms) {
    bathFilter.$gte = parseInt(params.bathrooms);
  }
  if (params.bedrooms) {
    bedsFilter.$gte = parseInt(params.bedrooms);
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
  if (params.extraServices) {
    if (params.extraServices.indexOf("pool") > -1) {
      poolFilter = {
        "other_data.Pool": { $nin: ["No Pool", "No Pool,No Pool", ""] },
      };
    }
    if (params.extraServices.indexOf("garage") > -1) {
      garageFilter = {
        "other_data.Garage_YN": { $eq: "1" },
      };
    }
    if (params.extraServices.indexOf("fireplace") > -1) {
      fireplaceFilter = { "other_data.Fireplace_YN": { $eq: "1" } };
    }
    if (params.extraServices.indexOf("basement") > -1) {
      basementFilter = { "other_data.Basement_YN": { $eq: "1" } };
    }
    if (params.extraServices.indexOf("waterView") > -1) {
      waterViewFilter = { "other_data.Water_View_YN": { $eq: "1" } };
    }
    if (params.extraServices.indexOf("nohoa") > -1) {
      noHOAFilter = { "other_data.HOA_Y/N": { $eq: "1" } };
    }
  }

  if (params.maxDOM) {
    maxDOMFilter = {
      $and: [
        { "other_data.DOM": { $ne: 0 } },
        { "other_data.DOM": { $lte: parseInt(params.maxDOM) } },
      ],
    };
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
  const bathsFilterResult = queryObjectFilter(bathFilter, "fullBathrooms");
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

  if (bedsFilterResult) customQuery.push(bedsFilterResult);
  if (bathsFilterResult) customQuery.push(bathsFilterResult);
  if (stateFilterResult) customQuery.push(stateFilterResult);

  // if (streetNumberFilterResult) customQuery.push(streetNumberFilterResult);
  // if (streetFilterResult) customQuery.push(streetFilterResult);
  // if (streetSuffixFilterResult) customQuery.push(streetSuffixFilterResult);
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
  if (!_.isEmpty(maxDOMFilter)) customQuery.push(maxDOMFilter);
  if (!_.isEmpty(fullAddressFilter)) customQuery.push(fullAddressFilter);

  console.log("here", JSON.stringify(customQuery), cityFilter, params);
  MongoClient.connect(CONSTANTS.DB_CONNECTION_URI)
    .then(async (client) => {
      const connect = client.db(CONSTANTS.DB_NAME);
      // Connect to collection
      const collection = connect.collection("propertyData");
      const imagesCollection = connect.collection("propertyDataImages");
      const totalDataCount = await collection.countDocuments({
        $and: [cityFilter, ...customQuery, homeTypeQueryWrap],
      });

      collection
        .aggregate([
          {
            $match: {
              $and: [cityFilter, ...customQuery, homeTypeQueryWrap],
            },
          },
          {
            $lookup: {
              from: "propertyDataImages",
              localField: "listing_id",
              foreignField: "ListingId",
              as: "propertyImages",
            },
          },
          { $match: { propertyImages: { $exists: true, $ne: [] } } },
          { $sort: { "other_data.list_date": sort } },
          { $skip: SKIP_ITEM },
          { $limit: DATA_COUNT },
        ])
        .toArray()
        .then(async (data) => {
          // const dataCollection = [];
          // for (const result of data) {
          //   const newData = { ...result };
          //   // const propertyDataImagesArr = newData?.propertyDataImages
          //   //   ? newData?.propertyDataImages
          //   //   : [];
          //   // const newPropertyDataImages = [];

          //   // const imageData = await imagesCollection
          //   //   .find({ ListingId: { $eq: result.listing_id } })
          //   //   .toArray();
          //   // if (imageData && imageData.length > 0) {
          //   //   imageData.forEach((elm) => {
          //   //     let element = { ...elm };
          //   //     delete element["_id"];
          //   //     newPropertyDataImages.push(element);
          //   //   });
          //   // }

          //   // newData.propertyDataImages = newPropertyDataImages;
          //   dataCollection.push(newData);

          //   // console.log("imagesCollection", imagesCollection);
          //   //dataCollection.push({ ...result });
          // }
          res.status(200).json({ properities: data, totalDataCount });
        });

      // collection
      //   .find({
      //     $and: [cityFilter, ...customQuery, homeTypeQueryWrap],
      //   })
      //   .limit(DATA_COUNT)
      //   .sort({ "other_data.list_date": sort })
      //   .toArray()
      //   .then(async (data) => {
      //     const dataCollection = [];
      //     for (const result of data) {
      //       const newData = { ...result };
      //       // const propertyDataImagesArr = newData?.propertyDataImages
      //       //   ? newData?.propertyDataImages
      //       //   : [];
      //       // const newPropertyDataImages = [];

      //       // const imageData = await imagesCollection
      //       //   .find({ ListingId: { $eq: result.listing_id } })
      //       //   .toArray();
      //       // if (imageData && imageData.length > 0) {
      //       //   imageData.forEach((elm) => {
      //       //     let element = { ...elm };
      //       //     delete element["_id"];
      //       //     newPropertyDataImages.push(element);
      //       //   });
      //       // }

      //       // newData.propertyDataImages = newPropertyDataImages;
      //       dataCollection.push(newData);

      //       // console.log("imagesCollection", imagesCollection);
      //       //dataCollection.push({ ...result });
      //     }
      //     res.status(200).json({ properities: dataCollection, totalDataCount });
      //   });
    })
    .catch((err) => {
      console.log(err.Message);
    });
};

module.exports = getExploreData;
