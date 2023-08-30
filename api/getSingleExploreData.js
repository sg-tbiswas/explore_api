const _ = require("lodash");
const { getDB } = require("../dbConfig");

const getSingleExploreData = async (req, res) => {
  const params = req.query;
  if (!params.listingId) {
    res.status(400).json({ message: "Please provide Listing Id" });
    return;
  }

  console.log("here", params);

  try {
    const db = await getDB();
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

    
  } catch (err) {
    console.log(
      `error occurred at ${new Date().toUTCString()} ${err.message}`
    );
    res.status(500).json({ error: "Something went wrong." });
  }
};

module.exports = getSingleExploreData;
