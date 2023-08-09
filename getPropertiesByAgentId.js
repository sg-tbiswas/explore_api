const _ = require("lodash");
const MongoClient = require("mongodb").MongoClient;
const CONSTANTS = require("./constants");

const getPropertiesByAgentId = async (req, res) => {
  const params = req.query;
  const { agentId } = params;
  if (!agentId) {
    res.status(400).json({ message: "Please provide Agent Id" });
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
            $match: { agent_id: { $eq: agentId } },
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
            res.status(200).send({responseData:data});
          } else {
            res.status(404).json({ message: "No data found for this Agent Id" });
          }
        });
    })
    .catch((err) => {
      console.log(
        `error occured at ${new Date().toUTCString()} ${err.Message}`
      );
    });
};

module.exports = getPropertiesByAgentId;
