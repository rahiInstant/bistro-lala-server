const express = require("express");
const cors = require("cors");
require("dotenv").config();
const app = express();
const jwt = require("jsonwebtoken");
const stripe = require("stripe")(process.env.SECRET_PAYMENT_KEY);
// const imageKit = require('imagekit')
const port = process.env.PORT || 8000;
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@food.qtnfwys.mongodb.net/?retryWrites=true&w=majority&appName=food`;

app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json());

// const Imagekit = new imageKit({
//   urlEndpoint: 'https://ik.imagekit.io/iamzjemjc',
//   publicKey: 'public_O+FS02k/YEBU4yxJpLoVQ376sNI=',
//   privateKey: 'private_qRCOj3ytBU6/iqpHowINq+AnZA0='
// });

// app.use(function(req, res, next) {
//   res.header("Access-Control-Allow-Origin", "*");
//   res.header("Access-Control-Allow-Headers",
//     "Origin, X-Requested-With, Content-Type, Accept");
//   next();
// });

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const verifyToken = (req, res, next) => {
  // console.log(req.headers.authorization);
  if (!req.headers.authorization) {
    return res.status(401).send({ message: "forbidden access" });
  }
  const token = req.headers.authorization.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decode) => {
    if (err) {
      return res.status(403).send({ message: "unauthorized" });
    }
    req.decoded = decode;
    next();
  });
  // console.log(token)
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    const bistroDB = client.db("bistroDB");
    const foodCollection = bistroDB.collection("food");
    const orderCollection = bistroDB.collection("order");
    const userCollection = bistroDB.collection("users");
    const paymentCollection = bistroDB.collection("payment");

    const checkAdmin = async (email) => {
      const filter = { email: email };
      const option = {
        projection: { _id: 0, isAdmin: 1 },
      };
      const result = await userCollection.findOne(filter, option);
      return result;
    };

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const check = await checkAdmin(email);
      // console.log(email);
      // console.log("from verify admin", check, check.isAdmin);
      if (check) {
        if (!check?.isAdmin) {
          // console.log("Thank You");
          return res.status(403).send({ message: "forbidden access" });
        }
        next();
      }
    };

    // app.get('/upload-img', function (req, res) {
    //   var result = Imagekit.getAuthenticationParameters();
    //   // console.log(req.body)
    //   console.log(result)
    //   res.send(result);
    // });

    // This part for jwt
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const access_token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ access_token });
    });

    // This part for user data entry
    app.post("/users", async (req, res) => {
      // console.log(req.body)
      const userData = req.body;
      // console.log(req.body);
      const filter = { email: userData.email };
      const isUserExist = await userCollection.findOne(filter);
      if (isUserExist) {
        return res.send({ message: "user already exist.", insertedId: null });
      }
      const result = await userCollection.insertOne(userData);
      res.send(result);
      // console.log(result)
    });
    app.get("/food", async (req, res) => {
      // const category = req.query.category;
      const query = {};
      // const option = { projection: { _id: 0 } };
      const result = await foodCollection.find(query).toArray();
      // console.log(category)
      res.send(result);
    });
    app.post("/menu", verifyToken, verifyAdmin, async (req, res) => {
      const data = req.body;
      console.log(data);
      const result = await foodCollection.insertOne(data);
      res.send(result);
    });

    app.delete(
      "/item-delete/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const itemId = req.params.id;
        console.log(itemId);
        const filter = { _id: new ObjectId(itemId) };
        const result = await foodCollection.deleteOne(filter);
        res.send(result);
      }
    );

    app.get("/user-role", async (req, res) => {
      const email = req.query.email;
      res.send(await checkAdmin(email));
    });

    app.post("/cart", async (req, res) => {
      const data = req.body;
      const filter = { menuID: data.menuID };
      const isItemExist = await orderCollection.findOne(filter);
      if (!!isItemExist) {
        return res.send({ insertedId: null });
      }
      const result = await orderCollection.insertOne(data);
      res.send(result);
    });
    app.patch("/update-quantity", async (req, res) => {
      const {value, id} = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          quantity: value,
        },
      };
      const result = await orderCollection.updateOne(filter,updateDoc)
      res.send(result)
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

    app.get("/all-user", verifyToken, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      // console.log(result);
      res.send(result);
    });

    app.delete("/remove-user", async (req, res) => {
      const query = req.query.email;
      const filter = { email: query };
      const result = await userCollection.deleteOne(filter);
      res.send(result);
    });

    app.patch("/give-power", verifyToken, async (req, res) => {
      const email = req.query.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const query = { email: email };
      // const option = { upsert: true };
      const updateDoc = {
        $set: {
          isAdmin: true,
        },
      };
      // console.log(email)
      const result = await userCollection.updateOne(query, updateDoc, option);
      res.send(result);
    });

    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      console.log(amount);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({ clientSecret: paymentIntent.client_secret });
    });

    app.post("/payment", async (req, res) => {
      const { email, price, date, cartID, menuID, transactionId, status } =
        req.body;
      const data = {
        email,
        price,
        date,
        transactionId,
        status,
        cartIDs: cartID.map((id) => new ObjectId(id)),
        menuIDs: menuID.map((id) => new ObjectId(id)),
      };
      const savePaymentHistory = await paymentCollection.insertOne(data);
      const filter = {
        _id: { $in: cartID?.map((id) => new ObjectId(id)) },
      };
      const clearCartAfterPayment = await orderCollection.deleteMany(filter);
      console.log(data);
      res.send({ savePaymentHistory, clearCartAfterPayment });
    });
    app.get("/payment-data/:email", async (req, res) => {
      const userMail = req.params.email;
      const filter = { email: userMail };
      const result = await paymentCollection.find(filter).toArray();
      console.log("payment", result);
      res.send(result);
    });
    app.get("/admin-stats",verifyToken, verifyAdmin, async (req, res) => {
      const user = await userCollection.estimatedDocumentCount();
      const menuItem = await foodCollection.estimatedDocumentCount();
      const order = await orderCollection.estimatedDocumentCount();
      const payment = await paymentCollection
        .aggregate([
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: "$price" },
            },
          },
        ])
        .toArray();
      // console.log(payment);
      const totalRevenue = payment.length > 0 ? payment[0].totalRevenue : 0;
      const salesData = await paymentCollection
        .aggregate([
          {
            $unwind: "$menuIDs",
          },
          {
            $lookup: {
              from: "food",
              localField: "menuIDs",
              foreignField: "_id",
              as: "menuItems",
            },
          },
          {
            $unwind: "$menuItems",
          },
          {
            $group: {
              _id: "$menuItems.category",
              totalSalesCount: { $sum: 1 },
              totalRevenue: { $sum: "$menuItems.price" },
            },
          },
          {
            $project: {
              category: "$_id",
              totalRevenue: 1,
              totalSalesCount: 1,
              _id: 0,
            },
          },
        ])
        .toArray();
      // console.log("payment", salesData);
      res.send({
        user,
        menuItem,
        order,
        totalRevenue,
        salesData,
      });
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

