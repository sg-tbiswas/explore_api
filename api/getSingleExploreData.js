const _ = require("lodash");
const MongoClient = require("mongodb").MongoClient;
const CONSTANTS = require("../constants");

const getSingleExploreData = async (req, res) => {
  const params = req.query;
  if (!params.listingId) {
    res.status(400).json({ message: "Please provide Listing Id" });
    return;
  }

  console.log("here", params);

  try {
    const client = await MongoClient.connect(CONSTANTS.DB_CONNECTION_URI);
    const db = client.db(CONSTANTS.DB_NAME);
    const collection = db.collection("propertyData");

    const data = await collection.aggregate([
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
    ]).toArray();

    if (data && data.length > 0) {
      res.status(200).send({ ...data[0] });
    } else {
      res.status(404).json({ message: "Invalid Listing Id" });
    }

    client.close();
  } catch (err) {
    console.log(
      `error occurred at ${new Date().toUTCString()} ${err.message}`
    );
    res.status(500).json({ error: "Something went wrong." });
  }
};

module.exports = getSingleExploreData;
