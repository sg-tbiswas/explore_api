const _ = require("lodash");
const MongoClient = require("mongodb").MongoClient;
const uri = "mongodb://localhost:27017?retryWrites=true&w=majority";
const databasename = "gobyHomes";

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

  let poolFilter = {};
  let garageFilter = {};
  let fireplaceFilter = {};
  let basementFilter = {};
  let waterViewFilter = {};
  let noHOAFilter = {};
  let maxHOAFilter = {};
  let maxDOMFilter = {};
  let DATA_COUNT = 36;
  let customQuery = [];

  if (params.pageno) {
    DATA_COUNT = 36 * parseInt(params.pageno);
  }

  const params = req.query;
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
      $or: [
        { "other_data.Garage YN": { $eq: "1" } },
        { "other_data.Garage_YN": { $eq: "1" } },
      ],
    };
  }
  if (params.fireplace) {
    fireplaceFilter = {
      $or: [
        { "other_data.Fireplace YN": { $eq: "1" } },
        { "other_data.Fireplace_YN": { $eq: "1" } },
      ],
    };
  }
  if (params.basement) {
    basementFilter = {
      $or: [
        { "other_data.Basement YN": { $eq: "1" } },
        { "other_data.Basement_YN": { $eq: "1" } },
      ],
    };
  }
  if (params.waterView) {
    waterViewFilter = {
      $or: [
        { "other_data.Water View YN": { $eq: "1" } },
        { "other_data.Water_View_YN": { $eq: "1" } },
      ],
    };
  }
  if (params.noHOA) {
    noHOAFilter = {
      $or: [
        { "other_data.HOA Y/N": { $eq: "1" } },
        { "other_data.HOA_Yu2f_N": { $eq: "1" } },
      ],
    };
  }

  if (params.maxDOM) {
    maxDOMFilter.$lte = parseInt(params.maxDOM);
  }

  if (params.maxHOA) {
    maxHOAFilter = {
      $or: [
        { "other_data.HOA Fee": { $lte: parseInt(params.maxHOA) } },
        { "other_data.HOA_Fee": { $lte: parseInt(params.maxHOA) } },
      ],
    };
  }

  const bedsFilterResult = queryObjectFilter(bedsFilter, "bedrooms");
  const bathsFilterResult = queryObjectFilter(bathFilter, "bathrooms");
  const stateFilterResult = queryObjectFilter(stateFilter, "other_data.state");
  const priceFilterResult = queryObjectFilter(priceFilter, "listing_price");

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
  if (statusFilterResult) customQuery.push(statusFilterResult);

  if (!_.isEmpty(garageFilter)) customQuery.push(garageFilter);
  if (!_.isEmpty(fireplaceFilter)) customQuery.push(fireplaceFilter);
  if (!_.isEmpty(basementFilter)) customQuery.push(basementFilter);
  if (!_.isEmpty(waterViewFilter)) customQuery.push(waterViewFilter);
  if (!_.isEmpty(noHOAFilter)) customQuery.push(noHOAFilter);
  if (!_.isEmpty(maxHOAFilter)) customQuery.push(maxHOAFilter);

  if (maxDOMFilterResult) customQuery.push(maxDOMFilterResult);

  console.log("here", JSON.stringify(customQuery), cityFilter);
  MongoClient.connect(uri)
    .then(async (client) => {
      const connect = client.db(databasename);
      // Connect to collection
      const collection = connect.collection("propertyData");
      const imagesCollection = connect.collection("propertyDataImages");
      collection
        .find({
          $and: [
            cityFilter,
            propertyTypeFilter,
            streetDirFilter,
            poolFilter,
            ...customQuery,
          ],
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
      //           "other_data.HOA_Fee": obj?.other_data?.HOA_Fee
      //           ? parseInt(obj?.other_data?.HOA_Fee)
      //           : 0,
      //         bedrooms: obj?.bedrooms ? parseInt(obj.bedrooms) : 0,
      //         bathrooms: obj?.bathrooms ? parseInt(obj.bathrooms) : 0,
      //         listing_price: obj?.listing_price
      //           ? parseFloat(obj.listing_price)
      //           : 0,
      //       },
      //     }
      //   );
      // });
      // console.log("update done");
    })
    .catch((err) => {
      // Printing the error message
      console.log(err.Message);
    });
};

module.exports = getExploreData;
