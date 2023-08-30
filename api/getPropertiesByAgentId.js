const _ = require("lodash");
const { connectToDatabase, disconnectFromDatabase } = require("../utils");

const getPropertiesByAgentId = async (req, res) => {
  const params = req.query;
  const { agentId } = params;
  if (!agentId) {
    res.status(400).json({ message: "Please provide Agent Id" });
    return;
  }
  console.log("here", params);
  try {
    const db = await connectToDatabase();
    const collection = db.collection("propertyData");
    const data = await collection
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
        { $sort: { "other_data.list_date": -1 } },
        { $limit: 10 },
      ])
      .toArray();
    await disconnectFromDatabase();
    if (data && data.length > 0) {
      res.status(200).send({ responseData: data });
    } else {
      res.status(404).json({ message: "No data found for this Agent Id" });
    }
  } catch (error) {
    console.log(
      `Error occurred at ${new Date().toUTCString()}: ${error.message}`
    );
    res.status(500).json({ error: "Something went wrong." });
  }
};

module.exports = getPropertiesByAgentId;
