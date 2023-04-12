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
            const newData = { ...result };
            // const propertyDataImagesArr = newData?.propertyDataImages
            //   ? newData?.propertyDataImages
            //   : [];
            // const newPropertyDataImages = [];
            // if (
            //   newData?.propertyDataImages &&
            //   propertyDataImagesArr.length === 0
            // ) {
            //   const imageData = await imagesCollection
            //     .find({ ListingId: { $eq: result.listing_id } })
            //     .toArray();
            //   if (imageData && imageData.length > 0) {
            //     imageData.forEach((elm) => {
            //       let element = { ...elm };
            //       delete element["_id"];
            //       newPropertyDataImages.push(element);
            //     });
            //   }
            // }
            // newData.propertyDataImages = newData.propertyDataImages
            //   ? newData.propertyDataImages
            //   : newPropertyDataImages;
            dataCollection.push(newData);
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
