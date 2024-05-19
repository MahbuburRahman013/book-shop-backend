const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");
const port = process.env.PORT || 3000;
const app = express();

app.use(cors());
app.use(express.json()); // <-- Add this line to parse JSON request bodies

const uri =
  "mongodb+srv://book-store:KtWY12Wu9YVmkdZh@cluster0.bgxswf4.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function connectToMongo() {
  try {
    // await client.connect();
    const db = client.db("BookInventory");
    const bookCollection = db.collection("Books");
    const paymentInfoCollection = client.db("BookInventory").collection("paymentInfo");
    const userCollection = client.db("BookInventory").collection("all-user");
    const careerCollection = client.db("BookInventory").collection("career");

    // GET route to retrieve all books
    app.get("/all-books", async (req, res) => {
      try {
        const { count } = req.query;
        const convertNumber = parseInt(count);

        if (convertNumber === 5) {
          const books = await bookCollection
            .find()
            .limit(convertNumber)
            .toArray();
          res.json(books);
        } else {
          const books = await bookCollection.find().toArray();
          res.json(books);
        }
      } catch (err) {
        console.error("Error retrieving books:", err);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // all books data api for pagination
    app.get("/all-books-data", async (req, res) => {
      try {
        const { size, page, category } = req.query;

        if (category === "all-books") {
          const books = await bookCollection
            .find()
            .skip(parseInt(page) * parseInt(size))
            .limit(parseInt(size))
            .toArray();
          res.json(books);
        } else {
          const query = { category: category };
          const books = await bookCollection
            .find(query)
            .skip(parseInt(page) * parseInt(size))
            .limit(parseInt(size))
            .toArray();
          res.json(books);
        }
      } catch (err) {
        console.error("Error retrieving books:", err);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // GET route to retrieve a single book by its ID
    app.get("/book/:id", async (req, res) => {
      try {
        const bookId = req.params.id;

        const book = await bookCollection.findOne({
          _id: new ObjectId(bookId),
        });
        res.json(book);
      } catch (err) {
        console.error("Error retrieving book by ID:", err);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // POST route to add a new book
    app.post("/add-book", async (req, res) => {
      try {
        const newBook = req.body;
        const result = await bookCollection.insertOne(newBook);
        res.json({ message: "Book added successfully", id: result.insertedId });
      } catch (err) {
        console.error("Error adding book:", err);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // pagination count all books

    app.get("/all-books-count", async (req, res) => {
      try {
        const { category } = req.query;
        let pipeline = [];
        if (category === "all-books") {
          // Get total count of all books
          pipeline = [
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
              },
            },
          ];
        } else {
          // Get count of books for a specific category
          pipeline = [
            {
              $match: { category: category },
            },
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
              },
            },
          ];
        }

        const result = await bookCollection.aggregate(pipeline).toArray();
        console.log(result);
        const count = result.length > 0 ? result[0].count : 0;
        res.send({ result: count });
      } catch (err) {
        console.error("Error adding book:", err);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    app.get("/cart-books-data", async (req, res) => {
      try {
        const idsOfBooks = req?.query?.ids.split(",");

        const idsRefind = idsOfBooks?.map((book) => new ObjectId(book));
        const query = { _id: { $in: idsRefind } };

        const result = await bookCollection.find(query).toArray();
        res.send(result);
      } catch (err) {
        console.error("Error adding book:", err);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // search book

    app.get("/search-book", async (req, res) => {
      try {
        const { title } = req.query;
        const regex = new RegExp(title, "i");
        const result = await bookCollection
          .find({ bookTitle: regex })
          .toArray();
        res.send(result);
      } catch (err) {
        console.error("Error adding book:", err);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    app.post("/add-paymentData", async (req, res) => {
      try {
        const { payInfo, booksIds } = req.body;

        const result = await paymentInfoCollection.insertOne({
          payInfo,
          booksIds: booksIds,
        });
        res.send(result);
      } catch (err) {
        console.error("Error adding book:", err);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    app.get("/all-payment-data", async (req, res) => {
      try {
        const {email} = req.body;
        console.log(email);
        if(email){
          const result = await paymentInfoCollection.find({'payInfo.email':email}).toArray();
          res.send(result);
        }else{
          const result = await paymentInfoCollection.find().toArray();
          res.send(result);
        }
       
      } catch (err) {
        console.error("Error adding book:", err);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    app.get("/all-payment-data/:email", async (req, res) => {
      try {
        const email = req.params.email;
        // console.log(email);
        const query = {'payInfo.email': email};
        const result = await paymentInfoCollection.find(query).toArray()
        console.log(result);
        res.send(result)
       
      } catch (err) {
        console.error("Error adding book:", err);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    app.get("/payment-single/:id", async (req, res) => {
      try {
        const result = await paymentInfoCollection.findOne({
          _id: new ObjectId(req.params.id),
        });
        res.send(result);
      } catch (err) {
        console.error("Error adding book:", err);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // patch status from admin dashboard

    app.patch("/dashboard/change-status", async (req, res) => {
      try {
        const { status: updateStatus, id } = req.body;
        const query = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {'payInfo.status': updateStatus },
        };

        const result = await paymentInfoCollection.updateOne(query, updateDoc);
        res.send(result);

      } catch (err) {
        console.error("Error adding book:", err);
        res.status(500).json({ error: "Internal server error" });
      }
    });


    // all user email save

    app.post('/user', async(req,res)=> {
        try{
            const {email} = req.body;
            const findUser = await userCollection.findOne({email: email})
            if(findUser){
              res.send({message: 'loggedIn', role: findUser?.role});
              console.log(findUser);

            }else{
                const result = await userCollection.insertOne({email: email, role: 'user'})
                res.send({result, message: 'new user', role:'user'});
            }

        }
        catch (err) {
          console.error("Error adding book:", err);
          res.status(500).json({ error: "Internal server error" });
        }
    })

  app.get('/user-role/:email', async(req, res)=> {
       const email = req.params.email;
       const result = await userCollection.findOne({email: email});
       res.send(result);
  })

// search career data
  app.get("/search-career-data/:title", async (req, res) => {
    try {

      const title  = req.params.title;

     if(title === 'all'){
      const result = await careerCollection.find({}, { projection: { _id: 1, title: 1, location: 1 } }).toArray();
      res.send(result);
     }else{
      const regex = new RegExp(title, "i");
      const result = await careerCollection.find({ title: regex }, { projection: { _id: 1, title: 1, location: 1 } }).toArray();
      res.send(result);
     }

    } catch (err) {
      console.error("Error adding book:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

//career single data

app.get('/search-career-single-data/:id', async(req, res)=> {
  const id = req.params.id;
  const result = await careerCollection.findOne({_id: id});
  res.send(result);
})

  } catch (err) {
    console.error("Error connecting to MongoDB:", err);
  }
}

connectToMongo();

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
