const { MongoClient, ServerApiVersion } = require("mongodb");
const express = require("express");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const app = express();
require("dotenv").config();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.dsklw.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});
console.log(uri);

async function run() {
  try {
    await client.connect();
    console.log("db connected");
    const serviceCollection = client
      .db("doctors_portal")
      .collection("services");
    const bookingCollection = client
      .db("doctors_portal")
      .collection("bookings");
    const userCollection = client.db("doctors_portal").collection("users");

    /**
     * GET OPERATIONS
     */

    app.get("/services", async (req, res) => {
      const query = {};
      const cursor = serviceCollection.find(query);
      const services = await cursor.toArray();
      res.send(services);
    });

    // Warning: This is not the proper way to query multiple collection.
    // After learning more about mongodb. use aggregate, lookup, pipeline, match, group
    app.get("/available", async (req, res) => {
      const date = req.query.date;

      //1. get all services
      const services = await serviceCollection.find().toArray();

      //2. get the booking of that day. output: [{},{},{},{},{},{},{},{},{}]
      const query = { date: date };
      console.log(query);
      const bookings = await bookingCollection.find(query).toArray();
      // 3. for each service, find bookings for that service
      services.forEach((service) => {
        // 4. find bookings for that service. output: [{},{},{}]
        const serviceBookings = bookings.filter(
          (book) => book.treatment === service.name
        );
        // 5. select slots for the service bookings: ['', '','','','','',]
        const bookedSlots = serviceBookings.map((book) => book.slot);
        // 6. select those slots that are not in bookedSlots
        const available = service.slots.filter(
          (slot) => !bookedSlots.includes(slot)
        );
        // 7: set available to slots to make it easier
        service.slots = available;
      });
      res.send(services);
    });

    app.get("/booking", async (req, res) => {
      const patient = req.query.patient;
     
      console.log("auth", authorization);
      const query = { patient: patient };
      const bookings = await bookingCollection.find(query).toArray();
      res.send(bookings);
    });

    /**
     * API Naming Convention
     * app.get('/booking)// get all bookings in this collection or get more than one or filter
     * app.get('/booking/:id')// get a specific booking
     * app.post('/booking')// add a new booking
     * app.patch('/booking/:id')// update a booking
     * app.put('/booking/:id')// upsert ===>  update (if exists) or insert (if doesn't exist)
     * app.delete('/booking/:id')// delete a booking
     */

    /**
     * POST OPERATIONS
     */

    app.post("/booking", async (req, res) => {
      const booking = req.body;
      const query = {
        treatment: booking.treatment,
        date: booking.date,
        patient: booking.patient,
      };
      const exists = await bookingCollection.findOne(query);
      if (exists) {
        return res.send({ success: false, booking: exists });
      }
      const result = await bookingCollection.insertOne(booking);
      return res.send({ success: true, result });
    });

    /**
     * PUT OPERATIONS
     */

    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updatedDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      const token = jwt.sign(
        { email: email },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "1h" }
      );
      res.send({ result, accessToken: token });
    });
  } finally {
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello Doctor!");
});

app.listen(port, () => {
  console.log("Example app listening on port", port);
});
