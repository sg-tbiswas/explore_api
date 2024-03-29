const _ = require("lodash");
const { getDB } = require("../dbConfig");

const getPropertiesByOfficeId = async (req, res) => {
  const params = req.query;
  const { officeId } = params;
  if (!officeId) {
    res.status(400).json({ message: "Please provide Office Id" });
    return;
  }

  console.log("here", params);
  try {
    const db = await getDB();
    const collection = db.collection("propertyData");
    const data = await collection
      .aggregate([
        {
          $match: { office_id: { $eq: officeId }, status: { $eq: "Active" } },
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
      .toArray();
    if (data && data.length > 0) {
      res.status(200).send({ responseData: data });
    } else {
      res.status(404).json({ message: "No data found for this Office Id" });
    }
  } catch (error) {
    console.log(`error occured at ${new Date().toUTCString()} ${err.Message}`);
    res.status(500).json({ error: "Something went wrong." });
  }
};

module.exports = getPropertiesByOfficeId;
