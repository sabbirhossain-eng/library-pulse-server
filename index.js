const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

// middleware

app.use(
  cors({
    origin: [
      "https://library-pulse.web.app",
      "https://library-pulse.firebaseapp.com"
    ],
    credentials: true,
  })
);
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.bfscg0l.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// token middleware

const logger = async (req, res, next) => {
  console.log("log info :", req.host, req.originalUrl);
  next();
};

const verifyToken = async (req, res, next) => {
  const token = req?.cookies?.token;
  // console.log('value of token in middleware :', token);

  if (!token) {
    return res.status(401).send({ message: "not authorized" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    // error
    if (err) {
      console.log(err);
      return res.status(401).send({ message: "unauthorized" });
    }
    // if token is valid it would be decoded
    console.log("value in the token", decoded);
    req.user = decoded;
    next();
  });
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const bookCollection = client.db("libraryPulse").collection("book");
    const borrowCollection = client.db("libraryPulse").collection("borrow");

    // auth api
    app.post("/jwt", logger, async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      console.log(user);
      res
        .cookie("token", token, {
          httpOnly: false,
          secure: false,
          sameSite: "none",
        })
        .send({ success: true });
    });

    app.post("/logout", async (req, res) => {
      const user = req.body;
      console.log("logging out", user);
      res.clearCookie("token", { maxAge: 0 }).send({ success: true });
    });

    // server api

    app.get("/book", async (req, res) => {
      const cursor = bookCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/book/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookCollection.findOne(query);
      res.send(result);
    });

    app.put("/book/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const bookUpdate = req.body;
      console.log(bookUpdate);

      try {
        const result = await bookCollection.updateOne(filter, {
          $set: bookUpdate,
        });

        if (result.matchedCount > 0 && result.modifiedCount > 0) {
          res
            .status(200)
            .json({ success: true, message: "Book updated successfully" });
        } else {
          res
            .status(404)
            .json({
              success: false,
              message: "Book not found or not modified",
            });
        }
      } catch (error) {
        console.error("Error updating book:", error);
        res
          .status(500)
          .json({ success: false, message: "Internal server error" });
      }
    });

    app.post("/book", async (req, res) => {
      const newBooks = req.body;
      const result = await bookCollection.insertOne(newBooks);
      res.send(result);
    });

    // Borrow api
    app.get("/borrow", async (req, res) => {
      const cursor = borrowCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.post("/borrow", async (req, res) => {
      const { newBorrow, book } = req.body;
      const result = await borrowCollection.insertOne({ newBorrow, book });
      res.send(result);
    });

    app.put("/book/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const { quantity } = req.body;

      try {
        const update = {
          $set: { quantity: quantity },
        };

        const result = await bookCollection.updateOne(filter, update);

        if (result.modifiedCount === 1) {
          res.status(200).json({ message: "Quantity updated successfully" });
        } else {
          res.status(404).json({ message: "Book not found" });
        }
      } catch (error) {
        console.error("Error updating quantity:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    });

    app.delete("/borrow/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await borrowCollection.deleteOne(query);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Library Pulse server is running");
});

app.listen(port, () => {
  console.log(`Library Pulse is running on port: ${port}`);
});
