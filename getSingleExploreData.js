const _ = require("lodash");
const MongoClient = require("mongodb").MongoClient;
const CONSTANTS = require("./constants");

const getSingleExploreData = async (req, res) => {
  const params = req.query;
  if (!params.listingId) {
    res.status(400).json({ message: "Please provide Listing Id" });
    return;
  }

  console.log("here", params);
  MongoClient.connect(CONSTANTS.DB_CONNECTION_URI)
    .then(async (client) => {
      const connect = client.db(CONSTANTS.DB_NAME);
      const collection = connect.collection("propertyData");
      // collection
      // .find({ listing_id: { $eq: params.listingId } })
      // .toArray()

      collection
        .aggregate([
          {
            $match: { listing_id: { $eq: params.listingId } },
          },
          {
            $lookup: {
              from: "propertyDataImages",
              localField: "listing_id",
              foreignField: "ListingId",
              as: "propertyImages",
            },
          },
        ])
        .toArray()
        .then((data) => {
          if (data && data.length > 0) {
            res.status(200).send({ ...data[0] });
          } else {
            res.status(404).json({ message: "Invalid Listing Id" });
          }
        });
    })
    .catch((err) => {
      console.log(err.Message);
    });
};

module.exports = getSingleExploreData;
