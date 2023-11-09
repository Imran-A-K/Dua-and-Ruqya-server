const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
require("dotenv").config();

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
const port = 4000;

const corsOptions = {
  origin: "*",
  credentials: true,
  optionSuccessStatus: 200,
};
app.use(cors(corsOptions));
// app.use(cors())
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.5j7d2x6.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const categoryCollection = client.db("IRD").collection("category");
    const duaCollection = client.db("IRD").collection("duas");
    const subCategoryCollection = client.db("IRD").collection("subcategory");

    app.get("/api/categories", async (req, res) => {
      try {
        const categories = await categoryCollection.find({}).toArray();

        for (const category of categories) {
          const cat_id = category.cat_id;

          const dua = await duaCollection.findOne({ cat_id });

          category.first_dua_id = dua ? dua.dua_id : null;
        }

        res.json(categories);
      } catch (error) {
        console.error("Error fetching categories:", error);
        res.status(500).json({ error: "Error fetching categories" });
      }
    });

    app.get("/api/duas", async (req, res) => {
      try {
        const cat_id = parseInt(req.query.cat_id);

        if (!cat_id) {
          const duas = await duaCollection.find({}).toArray();
          res.json(duas);
        } else {
          const matchingDuas = await duaCollection
            .find({ cat_id: cat_id })
            .toArray();

          if (matchingDuas.length > 0) {
            res.json(matchingDuas);
          } else {
            res
              .status(404)
              .json({ error: "No Duas found for the provided cat_id" });
          }
        }
      } catch (error) {
        console.error("Error fetching duas:", error);
        res.status(500).json({ error: "Error fetching duas" });
      }
    });
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("IRD Data Server is operating");
});
app.listen(port, () => {
  console.log(`IRD Data Server is operating on port ${port}`);
});
