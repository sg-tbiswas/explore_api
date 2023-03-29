// const admin = require("firebase-admin");
//const serviceAccount = require("./gobyhomes-qa-firebase-adminsdk-3r0gx-ac944a27b6.json");

const RETS = require("node-rets");
const fs = require("fs");
const feildsValues = require("./selected_feild.js");
const keyMapping = require("./name_change.js");
const main_field = require("./main_field.js");
const addres_field = require("./addres_field.js");
const MongoClient = require("mongodb").MongoClient;
// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
//   databaseURL: "https://gobyhomes-qa.firebaseio.com",
// });

// const db = admin.firestore();

const client = RETS.initialize({
  loginUrl: "http://bright-rets.brightmls.com:6103/cornerstone/login",
  username: "3348441",
  password: "vUjeyasAmepri7eqehIPhifib",
  version: "RETS/1.8",
  userAgent: "Bright RETS Application/1.0",
  logLevel: "info",
});
const temp = fs.readFileSync("metaDataLookup.json");
const lookupValues = JSON.parse(temp);

// const addRecordsToFirestore = async (records, className) => {
//   try {
//     const collectionRef = db.collection("propertyData");
//     const batchSize = 500; // Set the batch size as per your requirement
//     let batchCount = 0;

//     for (let i = 0; i < records.length; i += batchSize) {
//       const batch = db.batch();

//       for (let j = i; j < i + batchSize && j < records.length; j++) {
//         const record = records[j];
//         const docRef = collectionRef.doc();
//         batch.set(docRef, {
//           ...record,
//           className,
//         });
//       }

//       await batch.commit();
//       batchCount++;
//       console.log(
//         `Successfully added ${batchSize} records to firestore. Batch ${batchCount}`
//       );
//     }

//     console.log(
//       `Successfully added all ${records.length} records to firestore.`
//     );
//   } catch (err) {
//     console.error("Error adding records to firestore", err.message);
//     return err;
//   }
// };

async function addRecordsToMongoDB(records, className) {
  /**
   * Connection URI. Update <username>, <password>, and <your-cluster-url> to reflect your cluster.
   * See https://docs.mongodb.com/ecosystem/drivers/node/ for more details
   */
  const uri = "mongodb://localhost:27017?retryWrites=true&w=majority";
  const client = new MongoClient(uri);

  try {
    // Connect to the MongoDB cluster
    await client.connect();

    // Make the appropriate DB calls
    const collection = client.db("gobyHomes").collection("propertyData");
    await collection.insertMany(records, (err, res) => {
      if (err) throw err;
      console.log(`${res.insertedCount} documents inserted`);
      client.close();
    });
  } catch (e) {
    console.error(e);
  } finally {
    await client.close();
  }
}

const fetchRecords = async (resource, className, keyMapping) => {
  try {
    let allRecords = [];
    let offset = 1;
    let count;
    const now = new Date();
    console.log(now);

    // Subtract 45 minutes from the current datetime
    const fortyFiveMinutesAgo = new Date(now.getTime() - 45 * 60000);

    // Format the datetime string without the timezone indicator
    const formattedTime = fortyFiveMinutesAgo.toISOString().slice(0, -1);
    function getTodayDate() {
      const today = new Date();
      const year = today.getFullYear();
      const month = (today.getMonth() + 1).toString().padStart(2, "0");
      const day = today.getDate().toString().padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
    do {
      const records = await client.search(
        resource,
        className,
        `(StandardStatus=|Active,Pending,Active Under Contract) AND (MLSListDate=${getTodayDate()}) AND (ModificationTimestamp=${formattedTime}+)`,
        {
          limit: 500,
          offset,
          Select: feildsValues.join(","),
        }
      );

      allRecords = allRecords.concat(records.Objects);

      count = parseInt(records.TotalCount);

      offset += 500;
      console.log(count, offset);
    } while (offset < count);
    console.log("allRecords", allRecords.length);

    const recordsWithUpdatedFields = allRecords.map((record, key) => {
      console.log(key);
      const updatedRecord = {};
      Object.keys(record).forEach((field) => {
        const fieldValues = record[field].split(",");
        const updatedFieldValues = fieldValues.map((value) => {
          const matchingLookup = lookupValues.find(
            (lookup) => lookup.MetadataEntryID === value.trim()
          );
          if (matchingLookup) {
            return matchingLookup.LongValue;
          }
          return value;
        });

        // Check if the field name exists in keyMapping
        if (keyMapping.hasOwnProperty(field)) {
          if (!updatedRecord.hasOwnProperty("other_data")) {
            updatedRecord["other_data"] = {};
          }
          const newField = keyMapping[field] || field;
          updatedRecord["other_data"][newField] = updatedFieldValues.join(",");
        } else {
          // Check if the field name exists in the main_field
          if (main_field.hasOwnProperty(field)) {
            // If it exists in main_field's key, use the value as the new field name
            const newField = main_field[field];
            updatedRecord[newField] = updatedFieldValues.join(",");
          } else {
            // Check if the field name exists in address_field
            if (addres_field.hasOwnProperty(field)) {
              // If it exists in address_field's key, add it to the array of addresses in updatedRecord
              if (!updatedRecord.hasOwnProperty("address")) {
                updatedRecord["address"] = {};
              }
              const newField = addres_field[field];
              updatedRecord["address"][newField] = updatedFieldValues.join(",");
            } else {
              updatedRecord[field] = updatedFieldValues.join(",");
            }
          }
        }
      });
      return updatedRecord;
    });
    console.log(recordsWithUpdatedFields, className);
    //await addRecordsToMongoDB(recordsWithUpdatedFields, className);
    //await addRecordsToFirestore(recordsWithUpdatedFields, className);
  } catch (err) {
    console.error(`Error occurred in fetchRecords function: ${err.message}`);
    throw err;
  }
};

const gobyHomes = async () => {
  try {
    const loginResponse = await client.login();
    if (loginResponse) {
      console.log("Successfully logged in to server");
    } else {
      console.log("There was an error connecting to the server");
      return;
    }

    const Class = "Property";
    const Resource = "ALL";
    const records = await fetchRecords(Class, Resource, keyMapping);

    console.log("All records fetched and written successfully!");
    client.logout();
  } catch (err) {
    console.error(`Error occurred in gobyHomes function: ${err.message}`);
  }
};

gobyHomes();
