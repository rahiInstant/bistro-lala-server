const express = require("express");
const cors = require("cors");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 8000;
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@food.qtnfwys.mongodb.net/?retryWrites=true&w=majority&appName=food`;

app.use(cors({
  origin:['http://localhost:5173']
}));
app.use(express.json());

const { MongoClient, ServerApiVersion } = require("mongodb");

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
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    const bistroDB = client.db("bistroDB");
    const foodCollection = bistroDB.collection("food");
    const orderCollection = bistroDB.collection("order");
    const userCollection = bistroDB.collection("users");
    // This part for user data entry
    app.post('/users', async(req, res) => {
      // console.log(req.body)
      const userData = req.body
      console.log(req.body)
      const filter = {email:userData.email}
      const isUserExist = await userCollection.findOne(filter)
      if(isUserExist) {
        return res.send({message:'user already exist.', insertedId:null})
      }
      const result = await userCollection.insertOne(userData)
      res.send(result)
      // console.log(result)
    }) 
    app.get("/food", async (req, res) => {   
      const category = req.query.category;
      const query = { category: category };     
      const result = await foodCollection.find(query).toArray();
      // console.log(category)
      res.send(result);
    });

    app.post("/cart", async (req, res) => {
      const data = req.body;
      const result = await orderCollection.insertOne(data);
      res.send(result);
    });

      

    app.get("/cart", async (req, res) => {
      const userEmail = req.query.userMail;
      console.log(userEmail);
      const query = { email: userEmail };
      const result = await orderCollection.find(query).toArray();
      // console.log(result)
      res.send(result); 
    }); 

    app.delete("/escape", async (req, res) => {
      const query = req.query.name;
      const filter = { name: query };
      const result = await orderCollection.deleteOne(filter);
      // console.log(query)
      res.send(result);
    });

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
  res.send("Yummy Yummy food here");
});

app.listen(port, () => {
  console.log(`server running port:${port}`);
});
