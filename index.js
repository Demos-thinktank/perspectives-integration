var mongoose = require("mongoose");
const express = require("express");
const cors = require("cors");
// const axios = require("axios");
const Perspective = require("perspective-api-client");
const perspective = new Perspective({
  apiKey: "<API key>",
});

const app = express();

app.use(cors());

mongoose.Promise = global.Promise;

const uri = "<mongo uri>";
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });

mongoose.connection
  .once("open", () => {
    console.log(
      "Connected to MongoDB successfully",
      new Date().toLocaleTimeString()
    );
  })
  .on("error", (error) => {
    console.log("Connection error: ", error);
  });

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  next();
});

app.get("/api/toxicity", (req, res, next) => {
  start();
});

app.get("/api/test", async (req, res, next) => {
  mongoose.connection.db.collection(
    "<test db collection name>",
    async function (err, collection) {
      let results = await collection.find({}).toArray();
      results.map((entry) =>
        console.log(entry["comma seperated collection fields>"])
      );
    }
  );
});

app.get("/api/toxicity", (req, res, next) => {
  toxicity();
});

function start() {
  mongoose.connection.db.collection("<collection name>", async function (
    err,
    collection
  ) {
    const results = await collection.find({}).toArray();

    const arrayOfStr = results.map(
      (entry) => entry["comma seperated collection fields>"]
    );
    const arrayOfIds = results.map((entry) => entry["_id"]);
    let counter = 0;
    start2(arrayOfStr, counter);

    async function start2(arr, counter) {
      const existingToxicityScore = await collection
        .find({
          $and: [
            {
              _id: arrayOfIds[counter],
            },
            {
              toxicity_score: {
                $exists: true,
                $ne: null,
              },
            },
          ],
        })
        .toArray();
      const toxicityScoreCheck = existingToxicityScore[0] == null;
      if (counter < arr.length) {
        let text = arr[counter].toString().trim();
        if (text[0] === "<") {
          text = text.slice(1, text.length - 1);
        }
        const wordTest = /[a-zA-Z]/g.test(text);
        if (toxicityScoreCheck && text != undefined && wordTest) {
          let result = await perspective
            .analyze({
              comment: { text },
              languages: ["en"],
            })
            .catch((err) => {
              console.log("err", err);
              counter++;
              start2(arr, counter);
            });
          const score = result.attributeScores.TOXICITY.summaryScore.value;
          // console output to visually track progress
          console.log(
            "======================================================\n",
            // text,
            score,
            new Date().toLocaleTimeString(),
            "\n------------------------------------------------------\n",
            counter + 1 + "/" + arr.length + " added",
            "\n======================================================"
          );
          await collection.update(
            { _id: arrayOfIds[counter] },
            { $set: { toxicity_score: score } }
          );
          counter++;
          // the all important recursive function call to ensure the code runs at the specified interval (at least after 120ms in this case)
          setTimeout(function () {
            start2(arr, counter);
          }, 120);
          // pushed a little lower than 200 (increased quota of 5 reqs a second) based on google perspective api usage graph
        } else {
          console.log(counter + 1 + "/" + arr.length + "  completed");
          counter++;
          start2(arr, counter);
        }
      }
    }
  });
}

async function toxicity() {
  mongoose.connection.db.collection("<collection name>", async function (
    err,
    collection
  ) {
    const existingToxicityScore = await collection
      .find({
        toxicity_score: {
          $exists: false,
        },
      })
      .toArray();
    existingToxicityScore.map((entry) =>
      collection.update({ _id: entry._id }, { $set: { toxicity_score: null } })
    );
    console.log(existingToxicityScore);
  });
}

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`listening on ${PORT}`));

// Mongo Command Line import and export examples
// mongoimport --uri "mongodb+srv://<user>:<password>@<cluster>.higyj.mongodb.net/<dbname>?retryWrites=true&w=majority" --collection <name of collection> --type=csv --headerline --drop --file <path to file to import>
// mongoexport --forceTableScan --uri "mongodb+srv://<user>:<password>@<cluster>.ljbkl.mongodb.net/<dbname>" --collection <name of collection> --fields="<comma seperated list of fields>" --type=csv --out=<path to desired export location>
