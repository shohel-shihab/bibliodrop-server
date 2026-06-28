const dns = require("node:dns");
dns.setServers(["1.1.1.1", "8.8.8.8"]);
const express = require('express');
require('dotenv').config()
const cors = require("cors")
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000

//bibiliodropDB
//k1p3APvf6mDWHuYO


//middleware 
app.use(cors())
app.use(express.json())
const uri = process.env.MONGODB_URI;
console.log(uri)
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});
async function run() {
    try {


        const db = client.db("bibilio_db")
        const booksCollections = db.collection("books")


        // add book related api 

        app.get("/api/dashboard/librarian/overview", async (req, res) => {
            try {
                const email = req.query.email;

                if (!email) {
                    return res.status(400).send({
                        success: false,
                        message: "Email is required",
                    });
                }

                // All books of this librarian
                const books = await booksCollections
                    .find({
                        librarianEmail: email,
                    })
                    .toArray();

                // Statistics
                const totalBooks = books.length;

                const publishedBooks = books.filter(
                    (book) => book.status === "Published"
                ).length;

                const pendingBooks = books.filter(
                    (book) => book.status === "Pending Approval"
                ).length;

                const unpublishedBooks = books.filter(
                    (book) => book.status === "Unpublished"
                ).length;

                res.send({
                    success: true,

                    stats: {
                        totalBooks,
                        publishedBooks,
                        pendingBooks,
                        unpublishedBooks,
                    },

                    books,
                });
            } catch (error) {
                console.log(error);

                res.status(500).send({
                    success: false,
                    message: "Internal Server Error",
                });
            }
        });
        app.post("/api/books", async (req, res) => {
            try {
                const bookData = req.body;

                // Create Book Object
                const newBook = {
                    title: bookData.title,
                    author: bookData.author,
                    description: bookData.description,
                    category: bookData.category,
                    image: bookData.image,
                    deliveryFee: Number(bookData.deliveryFee),

                    // Default values
                    status: "Pending Approval",
                    totalRequests: 0,

                    // Librarian Information
                    librarianId: bookData.librarianId,
                    librarianName: bookData.librarianName,
                    librarianEmail: bookData.librarianEmail,
                    createdAt: new Date(),
                };

                const result = await booksCollections.insertOne(newBook);

                res.status(201).json({
                    success: true,
                    message: "Book added successfully.",
                    insertedId: result.insertedId,
                });
            } catch (error) {
                console.error(error);

                res.status(500).json({
                    success: false,
                    message: "Internal Server Error",
                });
            }
        });

        app.get("/api/books/my-books", async (req, res) => {
            try {
                const email = req.query.email;

                if (!email) {
                    return res.status(400).send({
                        success: false,
                        message: "Email is required",
                    });
                }

                const books = await booksCollections
                    .find({
                        librarianEmail: email,
                    })
                    .sort({
                        createdAt: -1,
                    })
                    .toArray();

                res.send({
                    success: true,
                    books,
                });
            } catch (error) {
                console.log(error);

                res.status(500).send({
                    success: false,
                    message: "Internal Server Error",
                });
            }
        });

        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);








app.get('/', (req, res) => {
    res.send('Hello bibliodrop!');
});

app.listen(port, () => {
    console.log(`bibliodrop server is running on port ${port}`);
});