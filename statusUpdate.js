const fs = require("fs");
const _ = require("lodash");
const feildsValues = require("./selected_feild.js");
const keyMapping = require("./name_change.js");
const image_list = require("./image_list.js");
const main_field = require("./main_field.js");
const addres_field = require("./addres_field.js");
const MongoClient = require("mongodb").MongoClient;
const CONSTANTS = require("./constants.js");
const { RETS_CLIENT } = require("./utils.js");

const temp = fs.readFileSync("metaDataLookup.json");
const lookupValues = JSON.parse(temp);

const statusUpdate = async (client) => {
  try {
    const loginResponse = await RETS_CLIENT.login();
    if (loginResponse) {
      console.log("Successfully logged in to server");
    } else {
      console.error("There was an error connecting to the server");
      return;
    }
    const now = new Date();

    // Subtract 3 hours from the current datetime

    const sixtyMinutesAgo = new Date(now.getTime() - 60 * 60000);
    const formattedTime = sixtyMinutesAgo.toISOString().slice(0, -1);
    const currentDate = new Date(now.getTime()).toISOString().slice(0, -1);
    console.log(formattedTime, currentDate);

    const temp = await RETS_CLIENT.search(
      "Property",
      "ALL",
      `~(StandardStatus=|Active,Pending,Active Under Contract) AND (ModificationTimestamp=${formattedTime}+)`,
      { Select: feildsValues.join(",") }
    );
    let allRecords = [];
    count = parseInt(temp.TotalCount);
    console.log("ST total",count);
    const recordsWithUpdatedFields = [];

    let totalCount = parseInt(temp.TotalCount);

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
      console.log("recordsWithFields>>", recordsWithUpdatedFields.length);

      console.log("statusUpdate started....");

      if (recordsWithUpdatedFields && recordsWithUpdatedFields.length > 0) {
        let cnt = 0;
        for (const item of recordsWithUpdatedFields) {
          await crossCheckRecords(item, client);
          cnt++;
        }
        console.log(`${cnt} statusUpdate Done!`);
      }
    }
    await RETS_CLIENT.logout();
    return true;
  } catch (error) {
    console.error(
      `Error occurred in statusUpdate function: ${new Date().toUTCString()} ${
        error.message
      }`
    );
    return true;
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

module.exports = statusUpdate;
