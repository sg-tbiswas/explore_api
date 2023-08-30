const _ = require("lodash");
const MongoClient = require("mongodb").MongoClient;

const getCitiesAndState = async (req, res) => {
  try {
    const client = await MongoClient.connect(CONSTANTS.DB_CONNECTION_URI);
    const db = client.db(CONSTANTS.DB_NAME);
    const collection = db.collection("propertyData");
    const data = await collection
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
      .toArray();
    await client.close();
    res.status(200).json({ properities: data[0] });
  } catch (error) {
    console.log(
      `Error occurred at ${new Date().toUTCString()}: ${error.message}`
    );
  }
};

module.exports = getCitiesAndState;
