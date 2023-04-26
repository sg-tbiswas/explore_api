const _ = require("lodash");
const MongoClient = require("mongodb").MongoClient;
const CONSTANTS = require("./constants");

const main = async (req, res) => {
  MongoClient.connect(CONSTANTS.DB_CONNECTION_URI)
    .then(async (client) => {
      const connect = client.db(CONSTANTS.DB_NAME);
      const collection = connect.collection("propertyData");
      let count = 1;
      await collection.find().forEach(async function (obj) {
        // CODE TO GENERATE FULL ADDRESS
        const place1 = [];
        if (obj?.address?.street_number) {
          place1.push(obj?.address?.street_number);
        }
        if (obj?.address?.street) {
          place1.push(obj?.address?.street);
        }
        if (obj?.address?.street_suffix) {
          place1.push(obj?.address?.street_suffix);
        }
        if (obj?.address?.street_dir_suffix) {
          place1.push(obj?.address?.street_dir_suffix);
        }
        if (obj?.address?.street_dir_prefix) {
          place1.push(obj?.address?.street_dir_prefix);
        }
        const addrPart1 = place1.join(" ");
        const addrArr = [];
        let zippart;
        if (obj?.address?.city) {
          addrArr.push(obj?.address?.city);
        }
        if (obj?.other_data?.state) {
          addrArr.push(obj?.other_data?.state);
        }
        if (obj?.other_data?.zipcode) {
          zippart = obj?.other_data?.zipcode;
        }
        const addrPart2 = addrArr.join(", ");
        const twoPartAddr = addrPart1.concat(", ", addrPart2);
        const fullAddr = twoPartAddr.concat(" ", zippart);
        // CODE TO GENERATE FULL ADDRESS

        const fullBathrooms =
          obj.bathrooms +
          (obj.other_data.half_bathrooms
            ? parseInt(obj?.other_data?.half_bathrooms)
            : 0);

        await collection.updateOne(
          { _id: obj._id },
          {
            $set: {
              fullBathrooms: fullBathrooms,
              // "address.fullAddress": fullAddr,
              // "other_data.DOM": obj?.other_data?.DOM
              //   ? parseInt(obj?.other_data?.DOM)
              //   : 0,
              // "other_data.HOA_Fee": obj?.other_data?.HOA_Fee
              //   ? parseInt(obj?.other_data?.HOA_Fee)
              //   : 0,
              // bedrooms: obj?.bedrooms ? parseInt(obj.bedrooms) : 0,
              // bathrooms: obj?.bathrooms ? parseInt(obj.bathrooms) : 0,
              // TaxTotalFinishedSqFt: obj?.TaxTotalFinishedSqFt
              //   ? parseInt(obj.TaxTotalFinishedSqFt)
              //   : 0,
              // listing_price: obj?.listing_price
              //   ? parseFloat(obj.listing_price)
              //   : 0,
              // "other_data.HOA_Y/N": obj?.other_data?.HOA_Yu2f_N
              //   ? obj?.other_data?.HOA_Yu2f_N
              //   : "0",
              // "other_data.Condo/Coop_Association_Y/N": obj?.other_data
              //   ?.Condou2f_Coop_Association_Yu2f_N
              //   ? obj?.other_data?.Condou2f_Coop_Association_Yu2f_N
              //   : "0",
              // "other_data.Condo/Coop_Fee": obj?.other_data?.Condou2f_Coop_Fee
              //   ? obj?.other_data?.Condou2f_Coop_Fee
              //   : "",
              // "other_data.Condo/Coop_Fee_Frequency": obj?.other_data
              //   ?.Condou2f_Coop_Fee_Frequency
              //   ? obj?.other_data?.Condou2f_Coop_Fee_Frequency
              //   : "",
            },
            // $unset: {
            //   __key__: "",
            //   __error__: "",
            //   __has_error__: "",
            //   "other_data.__key__": "",
            //   "address.__key__": "",
            //   "image.__key__": "",
            // },
          }
        );
        console.log(`${count} => update done`);
        count++;
      });
      console.log("update done");
    })
    .catch((err) => {
      console.log(err.Message);
    });
};

const concatePropertyImages = async () => {
  console.log("concatePropertyImages called");
  const client = new MongoClient(CONSTANTS.DB_CONNECTION_URI);
  try {
    await client.connect();
    const imagesCollection = client
      .db(CONSTANTS.DB_NAME)
      .collection("propertyDataImages");

    const propertyDataALL = await collection
      //   .find({ "other_data.list_date": { $eq: getTodayDate() } })
      // .find({
      //   $or: [
      //     { propertyDataImages: { $size: 0 } },
      //     { propertyDataImages: { $eq: null } },
      //   ],
      // })
      .find({
        $or: [{ propertyDataImages: { $eq: null } }],
      })
      .toArray();
    for (const result of propertyDataALL) {
      const propertyDataImages = [];
      const imageData = await imagesCollection
        .find({ ListingId: { $eq: result.listing_id } })
        .toArray();
      if (imageData && imageData.length > 0) {
        imageData.forEach((elm) => {
          let element = { ...elm };
          delete element["_id"];
          propertyDataImages.push(element);
        });
      }

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

const removeDuplicateData = async () => {
  const client = new MongoClient(CONSTANTS.DB_CONNECTION_URI);
  const collection = client.db(CONSTANTS.DB_NAME).collection("propertyData");
  let count = 1;
  const gpdt = collection.aggregate([
    { $group: { _id: "$listing_id", count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
    { $unwind: "$_id" },
    { $match: { _id: { $ne: null } } },
  ]);
  let cnt = 1;
  let dupIds = [];

  for (const doc of await gpdt.toArray()) {
    const dup = await collection.find({ listing_id: doc._id }).skip(1);
    for (const iterator of await dup.toArray()) {
      dupIds.push(iterator._id);
    }
    console.log(`${cnt} data deleted ${doc._id} => ${doc.count}`);
    cnt++;
  }
  collection.deleteMany({ _id: { $in: dupIds } });
};

const removeDuplicateImage = async () => {
  const client = new MongoClient(CONSTANTS.DB_CONNECTION_URI);
  const collection = client
    .db(CONSTANTS.DB_NAME)
    .collection("propertyDataImages");
  let count = 1;
  const gpdt = collection.aggregate([
    { $group: { _id: "$MediaURL", count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
    { $unwind: "$_id" },
    { $match: { _id: { $ne: null } } },
  ]);
  let cnt = 1;
  let dupIds = [];

  for (const doc of await gpdt.toArray()) {
    const dup = await collection.find({ MediaURL: doc._id }).skip(1);
    for (const iterator of await dup.toArray()) {
      dupIds.push(iterator._id);
    }
    console.log(`${cnt} deleted ${doc.count}`);
    if (cnt === 500) break;
    cnt++;
  }
  collection.deleteMany({ _id: { $in: dupIds } });
  console.log("DELETE COMPLETED !!!");
};

//concatePropertyImages();
//main();
// removeDuplicateData();

removeDuplicateImage();
