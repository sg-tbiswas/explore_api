const MongoClient = require("mongodb").MongoClient;
const CONSTANTS = require("./constants");

function getTodayDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = (today.getMonth() + 1).toString().padStart(2, "0");
  const day = today.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const updateBindPropertyImages = async (data) => {
  console.log("updateBindPropertyImages called");
  const client = new MongoClient(CONSTANTS.DB_CONNECTION_URI);
  try {
    await client.connect();
    const imagesCollection = client
      .db(CONSTANTS.DB_NAME)
      .collection("propertyDataImages");

    const collection = client.db(CONSTANTS.DB_NAME).collection("propertyData");
    for (const result of data) {
      const propertyDataImages = [];
      const imageData = await imagesCollection
        .find({ ListingId: { $eq: result.listing_id } })
        .toArray();
      imageData.forEach((elm) => {
        let element = { ...elm };
        delete element["_id"];
        propertyDataImages.push(element);
      });

      await collection.updateOne(
        { listing_id: result["listing_id"] },
        {
          $set: { propertyDataImages: propertyDataImages },
          //   $unset: { propertyDataImages: "" },
        }
      );
      console.log(
        `${count} DATA UPDATED" ${result["listing_id"]} => ${propertyDataImages.length}`
      );
      count++;
      /// ENDS HERE
    }
    console.log("DATA UPDATED");
  } catch (error) {
    console.log(error);
  }
};

module.exports = updateBindPropertyImages;
