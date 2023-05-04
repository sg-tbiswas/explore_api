const _ = require("lodash");
const MongoClient = require("mongodb").MongoClient;
const CONSTANTS = require("./constants");

const getCitiesAndState = async (req, res) => {
  MongoClient.connect(CONSTANTS.DB_CONNECTION_URI)
    .then(async (client) => {
      const connect = client.db(CONSTANTS.DB_NAME);
      // Connect to collection
      const collection = connect.collection("propertyData");
      collection
        .aggregate([
          {
            $group: {
              _id: null,
              locations: {
                $addToSet: {
                  $concat: [
                    { $ifNull: ["$address.city", ""] },
                    ",",
                    { $ifNull: [{ $concat: [" ", "$other_data.state"] }, ""] },
                    ",",
                    { $ifNull: [{ $concat: [" ", "$address.country"] }, ""] },
                  ],
                },
              },
            },
          },
          { $unset: "_id" },
        ])
        .toArray()
        .then(async (data) => {
          res.status(200).json({ properities: data[0] });
        });
    })
    .catch((err) => {
      console.log(err.Message);
    });
};

module.exports = getCitiesAndState;
