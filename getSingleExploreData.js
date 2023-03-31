const _ = require("lodash");
const MongoClient = require("mongodb").MongoClient;
const CONSTANTS = require("./constants");

const queryObjectFilter = (objData, fieldName) => {
  if (Object.keys(objData).length === 0) return "";
  return {
    [fieldName]: objData,
  };
};

const getSingleExploreData = async (req, res) => {
  let customQuery = [];

  const params = req.query;
  if (!params.listingId) {
    res.status(400).json({ message: "Please provide Listing Id" });
    return;
  }

  console.log("here", params);
  MongoClient.connect(CONSTANTS.DB_CONNECTION_URI)
    .then(async (client) => {
      const connect = client.db(CONSTANTS.DB_NAME);
      // Connect to collection
      const collection = connect.collection("propertyData");
      const imagesCollection = connect.collection("propertyDataImages");
      collection
        .find({ listing_id: { $eq: params.listingId } })
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
          if (dataCollection.length > 0) {
            res.status(200).send({ ...dataCollection[0] });
          } else {
            res.status(404).json({ message: "Invalid Listing Id" });
          }
        });
    })
    .catch((err) => {
      // Printing the error message
      console.log(err.Message);
    });
};

module.exports = getSingleExploreData;
