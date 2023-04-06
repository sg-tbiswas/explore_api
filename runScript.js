const _ = require("lodash");
const MongoClient = require("mongodb").MongoClient;
const CONSTANTS = require("./constants");

const main = async (req, res) => {
  MongoClient.connect(CONSTANTS.DB_CONNECTION_URI)
    .then(async (client) => {
      const connect = client.db(CONSTANTS.DB_NAME);
      const collection = connect.collection("propertyData");
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

        await collection.updateOne(
          { _id: obj._id },
          {
            $set: {
              "address.fullAddress": fullAddr,
              "other_data.DOM": obj?.other_data?.DOM
                ? parseInt(obj?.other_data?.DOM)
                : 0,
              "other_data.HOA_Fee": obj?.other_data?.HOA_Fee
                ? parseInt(obj?.other_data?.HOA_Fee)
                : 0,
              bedrooms: obj?.bedrooms ? parseInt(obj.bedrooms) : 0,
              bathrooms: obj?.bathrooms ? parseInt(obj.bathrooms) : 0,
              TaxTotalFinishedSqFt: obj?.TaxTotalFinishedSqFt
                ? parseInt(obj.TaxTotalFinishedSqFt)
                : 0,
              listing_price: obj?.listing_price
                ? parseFloat(obj.listing_price)
                : 0,
              "other_data.HOA_Y/N": obj?.other_data?.HOA_Yu2f_N
                ? obj?.other_data?.HOA_Yu2f_N
                : "0",
              "other_data.Condo/Coop_Association_Y/N": obj?.other_data
                ?.Condou2f_Coop_Association_Yu2f_N
                ? obj?.other_data?.Condou2f_Coop_Association_Yu2f_N
                : "0",
            },
            // $unset: { __key__: "", __error__: "", __has_error__: "" },
            // $unset: { "other_data.__key__": "" },
            // $unset: { "address.__key__": "" },
            // $unset: { "image.__key__": "" },
          }
        );
      });
      console.log("update done");

      // const collection = connect.collection("propertyDataImages");
      //   await collection.find().forEach(async function (obj) {
      //       await collection.updateOne(
      //         { _id: obj._id },
      //         {
      //           $unset: { __key__: "", __error__: "", __has_error__: "" },
      //         }
      //       );
      //     });
      //     console.log("update done");
    })
    .catch((err) => {
      console.log(err.Message);
    });
};

main();
