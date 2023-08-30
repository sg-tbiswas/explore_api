const _ = require("lodash");
const { connectToDatabase, disconnectFromDatabase } = require("../utils");

const getCitiesAndState = async (req, res) => {
  try {
    const db = await connectToDatabase();
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
    await disconnectFromDatabase();
    res.status(200).json({ properities: data[0] });
  } catch (error) {
    console.log(
      `Error occurred at ${new Date().toUTCString()}: ${error.message}`
    );
  }
};

module.exports = getCitiesAndState;
