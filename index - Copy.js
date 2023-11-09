const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
require("dotenv").config();

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
// const db = new sqlite3.Database("./dua_main.sqlite");
const db = new sqlite3.Database(
  "./dua_main.sqlite",
  sqlite3.OPEN_READWRITE,
  (err) => {
    if (err) {
      console.error(err.message);
    } else {
      console.log("Connected to the database.");
    }
  }
);
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

    app.get("/category", (req, res) => {
      db.all("SELECT * FROM category", (err, categories) => {
        if (err) {
          console.error(err);
          res.status(500).send("Internal Server Error");
          return;
        }

        const categoriesWithSubcategories = categories.map((category) => {
          return new Promise((resolve) => {
            db.all(
              "SELECT * FROM sub_category WHERE cat_id = ?",
              category.id,
              (err, subcategories) => {
                if (err) {
                  console.error(err);
                  resolve({ ...category, subCategories: [] });
                } else {
                  const subCategoriesWithDuaNames = subcategories.map(
                    (subcategory) => {
                      return new Promise((resolveSub) => {
                        db.all(
                          "SELECT dua_id, dua_name_en FROM dua WHERE subcat_id = ?",
                          subcategory.subcat_id,
                          (err, duaData) => {
                            if (err) {
                              console.error(err);
                              resolveSub({
                                ...subcategory,
                                duaNames: [],
                                first_dua_id: null,
                              });
                            } else {
                              const duaNames = duaData.map((dua) => ({
                                dua_id: dua.dua_id,
                                dua_name: dua.dua_name_en,
                              }));
                              const firstDuaId =
                                duaNames.length > 0 ? duaNames[0].dua_id : null;
                              resolveSub({
                                ...subcategory,
                                duaNames,
                                first_dua_id: firstDuaId,
                              });
                            }
                          }
                        );
                      });
                    }
                  );

                  Promise.all(subCategoriesWithDuaNames).then(
                    (subCategoriesWithDuaNamesResolved) => {
                      resolve({
                        ...category,
                        subCategories: subCategoriesWithDuaNamesResolved,
                      });
                    }
                  );
                }
              }
            );
          });
        });

        Promise.all(categoriesWithSubcategories).then(async (results) => {
          // const result = await categoryCollection.insertMany(results);
          res.json(results);
        });
      });
    });

    app.get("/subcategory", (req, res) => {
      db.all("SELECT * FROM sub_category", async (err, rows) => {
        if (err) {
          console.error(err);
          res.status(500).send("Internal Server Error");
        } else {
          // const result = await subCategoryCollection.insertMany(rows);
          res.json(rows);
        }
      });
    });

    app.get("/duas", (req, res) => {
      const cat_id = req.query.cat_id;

      if (!cat_id || cat_id.trim() === "") {
        // If cat_id is not provided or is empty, return the whole table
        db.all("SELECT * FROM dua", async (err, duas) => {
          if (err) {
            console.error(err);
            res.status(500).send("Internal Server Error");
          } else {
            // const result = await duaCollection.insertMany(duas);

            res.json(duas);
          }
        });
      } else {
        // If cat_id is provided, filter by cat_id
        db.all("SELECT * FROM dua WHERE cat_id = ?", cat_id, (err, duas) => {
          if (err) {
            console.error(err);
            res.status(500).send("Internal Server Error");
          } else if (duas.length === 0) {
            res.status(404).send("Dua not found in Database");
          } else {
            res.json(duas);
          }
        });
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
