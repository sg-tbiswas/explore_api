const _ = require("lodash");
const MongoClient = require("mongodb").MongoClient;
const CONSTANTS = require("./constants");

const getPropertiesByOfficeId = async (req, res) => {
  const params = req.query;
  const { officeId } = params;
  if (!officeId) {
    res.status(400).json({ message: "Please provide Office Id" });
    return;
  }

  console.log("here", params);
  MongoClient.connect(CONSTANTS.DB_CONNECTION_URI)
    .then(async (client) => {
      const connect = client.db(CONSTANTS.DB_NAME);
      const collection = connect.collection("propertyData");
      collection
        .aggregate([
          {
            $match: { office_id: { $eq: officeId } },
          },
          {
            $lookup: {
              from: "propertyDataImages",
              localField: "listing_id",
              foreignField: "ListingId",
              as: "propertyImages",
            },
          },
          { $sort: { "other_data.list_date": -1 } },
          { $limit: 10 },
        ])
        .toArray()
        .then((data) => {
          if (data && data.length > 0) {
            res.status(200).send({responseData:data});
          } else {
            res.status(404).json({ message: "No data found for this Office Id" });
          }
        });
    })
    .catch((err) => {
      console.log(
        `error occured at ${new Date().toUTCString()} ${err.Message}`
      );
    });
};

module.exports = getPropertiesByOfficeId;
