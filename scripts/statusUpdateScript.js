const fs = require("fs");
const _ = require("lodash");
const feildsValues = require("../selected_feild.js");
const keyMapping = require("../name_change.js");
const image_list = require("../image_list.js");
const main_field = require("../main_field.js");
const addres_field = require("../addres_field.js");
const MongoClient = require("mongodb").MongoClient;
const CONSTANTS = require("../constants.js");
const { RETS_CLIENT } = require("../utils.js");
const dbConn = require("../dbConnection.js");

const temp = fs.readFileSync("../metaDataLookup.json");
const lookupValues = JSON.parse(temp);

const statusUpdate = async () => {
  try {
    const db = new dbConn();
    const client = await db.connect();
    try {
      const now = new Date();
      const fromDateTime = new Date(new Date("2023-09-01"));
      const formattedFromDateTime = fromDateTime.toISOString().slice(0, -1);

      const toDateTime = new Date(new Date("2023-10-05"));
      const formattedToDateTime = toDateTime.toISOString().slice(0, -1);

      const currentDate = new Date(now.getTime()).toISOString().slice(0, -1);
      console.log(formattedFromDateTime, "  ", formattedToDateTime);

      const temp = await RETS_CLIENT.search(
        "Property",
        "ALL",
        `~(StandardStatus=|Active,Pending,Active Under Contract) AND (ModificationTimestamp=${formattedToDateTime}+)`,
        { Select: feildsValues.join(",") }
      );
      let allRecords = [];
      const recordsWithUpdatedFields = [];

      let totalCount = parseInt(temp.TotalCount);
      console.log("totalCount>>>>", totalCount);

      if (temp.Objects && Array.isArray(temp.Objects)) {
        allRecords = allRecords.concat(temp.Objects);
        function getStatusString(statusCode) {
          if (statusCode == 10000069142) {
            return "Active";
          } else if (statusCode == 10000069143) {
            return "Closed";
          } else if (statusCode == 200004325489) {
            return "Withdrawn";
          } else if (statusCode == 200004325487) {
            return "Hold";
          } else if (statusCode == 200005504193) {
            return "Delete";
          } else if (statusCode == 10000069146) {
            return "Pending";
          } else if (statusCode == 200003535148) {
            return "Coming Soon";
          } else if (statusCode == 200004325488) {
            return "Canceled";
          } else if (statusCode == 10000069144) {
            return "Expired";
          } else if (statusCode == 85049738628) {
            return "Active Under Contract";
          }
        }
        for (let i = 0; i < allRecords.length; i++) {
          const record = allRecords[i];
          recordsWithUpdatedFields.push({
            listingId: record.ListingId,
            status: getStatusString(record.StandardStatus),
          });
        }
        console.log(
          "getting formated record",
          new Date(now.getTime()).toUTCString()
        );

        console.log("recordsWithUpdatedFields>>", recordsWithUpdatedFields.length);

        if (recordsWithUpdatedFields && recordsWithUpdatedFields.length > 0) {
          let cnt = 1;
          for (const item of recordsWithUpdatedFields) {
            await crossCheckRecords(item, client);
            cnt++;
          }
          console.log(`${cnt} statusUpdate Done!`);
        }
      }
      await db.disconnect();
    } catch (error) {
      console.error(
        `Error occurred in statusUpdate function: ${new Date().toUTCString()} ${
          error.message
        }`
      );
    } finally {
      await db.disconnect();
    }
  } catch (error) {
    console.log("DB connection error!", error.message);
  }
};

const crossCheckRecords = async (result, client) => {
  try {
    const collection = client.db(CONSTANTS.DB_NAME).collection("propertyData");

    const imageCollection = client
      .db(CONSTANTS.DB_NAME)
      .collection("propertyDataImages");

    if (result["status"] == "Closed") {
      await collection.deleteOne({
        listing_id: result["listingId"],
      });
      await imageCollection.deleteMany({
        ListingId: result["listingId"],
      });
    } else {
      await collection.updateOne(
        { listing_id: result["listingId"] },
        {
          $set: { status: result["status"] },
        }
      );
    }
  } catch (error) {
    console.error(
      `error while updating data from crossCheckRecords() ${new Date().toUTCString()}`,
      error
    );
  }
};

statusUpdate();
