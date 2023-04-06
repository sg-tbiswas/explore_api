const MongoClient = require("mongodb").MongoClient;
const CONSTANTS = require("./constants");

function getTodayDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = (today.getMonth() + 1).toString().padStart(2, "0");
  const day = today.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const concatePropertyImages = async () => {
  console.log("concatePropertyImages called");
  const client = new MongoClient(CONSTANTS.DB_CONNECTION_URI);
  try {
    await client.connect();
    const imagesCollection = client
      .db(CONSTANTS.DB_NAME)
      .collection("propertyDataImages");

    const collection = client.db(CONSTANTS.DB_NAME).collection("propertyData");

    await collection
      //   .find({ "other_data.list_date": { $eq: getTodayDate() } })
      .find()
      .toArray()
      .then(async (data) => {
        for (const result of data) {
          const propertyDataImages = [];
          await imagesCollection
            .find({ ListingId: { $eq: result.listing_id } })
            .toArray()
            .then((imageData) => {
              imageData.forEach((elm) => {
                let element = { ...elm };
                delete element["_id"];
                propertyDataImages.push(element);
              });
            });
          // console.log("imagesCollection", imagesCollection);
          //dataCollection.push({ ...result });
          if (propertyDataImages.length > 0) {
            await collection.updateOne(
              { listing_id: result["listing_id"] },
              {
                $set: { propertyDataImages: propertyDataImages },
                //   $unset: { propertyDataImages: "" },
              }
            );
          }
          /// ENDS HERE
        }
        console.log("DATA UPDATED");
      });
  } catch (error) {
    console.log(error);
  }
};

module.exports = concatePropertyImages;
