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
  let customQuery = [];

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
    garageFilter.$ne = "0";
  }
  if (params.fireplace) {
    fireplaceFilter.$ne = "0";
  }
  if (params.basement) {
    basementFilter.$ne = "0";
  }
  if (params.waterView) {
    waterViewFilter.$ne = "0";
  }
  if (params.noHOA) {
    noHOAFilter.$ne = "0";
  }

  if (params.maxHOA) {
    maxHOAFilter.$lte = parseInt(params.maxHOA);
  }
  if (params.maxDOM) {
    maxDOMFilter.$lte = parseInt(params.maxDOM);
  }

  const garageFilterResult = queryObjectFilter(
    garageFilter,
    "other_data.Garage YN"
  );
  const fireplaceFilterResult = queryObjectFilter(
    fireplaceFilter,
    "other_data.Fireplace YN"
  );
  const basementFilterResult = queryObjectFilter(
    basementFilter,
    "other_data.Basement YN"
  );
  const waterViewFilterResult = queryObjectFilter(
    waterViewFilter,
    "other_data.Water View YN"
  );
  const noHOAFilterResult = queryObjectFilter(
    noHOAFilter,
    "other_data.HOA Y/N"
  );

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

  const maxHOAFilterResult = queryObjectFilter(
    maxHOAFilter,
    "other_data.HOA_Fee"
  );

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

  if (garageFilterResult) customQuery.push(garageFilterResult);
  if (fireplaceFilterResult) customQuery.push(fireplaceFilterResult);
  if (basementFilterResult) customQuery.push(basementFilterResult);
  if (waterViewFilterResult) customQuery.push(waterViewFilterResult);
  if (noHOAFilterResult) customQuery.push(noHOAFilterResult);

  if (maxHOAFilterResult) customQuery.push(maxHOAFilterResult);
  if (maxDOMFilterResult) customQuery.push(maxDOMFilterResult);

  console.log("here", params, cityFilter);
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
        .skip(0)
        .limit(10)
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
          res.json({ responseData: dataCollection, params });
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
