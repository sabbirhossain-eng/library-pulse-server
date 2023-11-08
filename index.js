const express = require("express");
const cors = require("cors");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

// middleware

app.use(cors());
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

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const bookCollection = client.db("libraryPulse").collection("book");
    const borrowCollection = client.db("libraryPulse").collection("borrow");

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
        const result = await bookCollection.updateOne(filter, { $set: bookUpdate });
    
        if (result.matchedCount > 0 && result.modifiedCount > 0) {
          res.status(200).json({ success: true, message: "Book updated successfully" });
        } else {
          res.status(404).json({ success: false, message: "Book not found or not modified" });
        }
      } catch (error) {
        console.error("Error updating book:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
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
