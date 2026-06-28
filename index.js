const dns = require("node:dns");
dns.setServers(["1.1.1.1", "8.8.8.8"]);
const express = require('express');
require('dotenv').config()
const cors = require("cors")
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
        console.log("Database:", db.databaseName);
        const booksCollections = db.collection("books")
        const usersCollections = db.collection("user");
        const deliveryCollections = db.collection("bookRequests");
        const paymentCollections = db.collection("payments");



        // manage books related api

        app.get("/api/admin/books", async (req, res) => {
            try {
                const books = await booksCollections
                    .find({})
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

        app.patch("/api/admin/books/:id/unpublish", async (req, res) => {

            const { id } = req.params;

            const result = await booksCollections.updateOne(

                {
                    _id: new ObjectId(id)
                },

                {
                    $set: {
                        status: "Unpublished"
                    }
                }

            );

            res.send({
                success: true,
                modifiedCount: result.modifiedCount,
            });

        });
        app.delete("/api/admin/books/:id", async (req, res) => {

            const { id } = req.params;

            const result = await booksCollections.deleteOne({

                _id: new ObjectId(id)

            });

            res.send({
                success: true,
                deletedCount: result.deletedCount,
            });

        });


        // users related api 
        app.get("/api/admin/user", async (req, res) => {
            try {
                const users = await usersCollections
                    .find({})
                    .sort({ createdAt: -1 })
                    .toArray();
                console.log(users);

                res.status(200).send({
                    success: true,
                    users,
                });
            } catch (error) {
                console.log(error);

                res.status(500).send({
                    success: false,
                    message: "Internal Server Error",
                });
            }
        });
        //pending related api 
        app.get("/api/admin/pending-books", async (req, res) => {
            try {
                const books = await booksCollections
                    .find({
                        status: "Pending Approval",
                    })
                    .sort({
                        createdAt: -1,
                    })
                    .toArray();

                res.status(200).send({
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
        // admin related api 
        app.get("/api/dashboard/admin/overview", async (req, res) => {
            try {
                // Total Users
                const totalUsers = await usersCollections.countDocuments();
                // Total Books
                const totalBooks = await booksCollections.countDocuments();
                // Total Deliveries
                const totalDeliveries = await deliveryCollections.countDocuments();
                // Total Revenue
                const payments = await paymentCollections.find().toArray();
                const totalRevenue = payments.reduce((sum, payment) => {
                    return sum + Number(payment.amount || 0);
                }, 0);
                // Books by Category (Pie Chart)
                const categoryAggregation = await booksCollections.aggregate([
                    {
                        $match: {
                            status: "Published",
                        },
                    },
                    {
                        $group: {
                            _id: "$category",
                            value: {
                                $sum: 1,
                            },
                        },
                    },
                    {
                        $sort: {
                            value: -1,
                        },
                    },
                ]).toArray();

                const categoryData = categoryAggregation.map((item) => ({
                    name: item._id,
                    value: item.value,
                }));

                res.status(200).send({
                    success: true,
                    stats: {
                        totalUsers,
                        totalBooks,
                        totalDeliveries,
                        totalRevenue,
                    },
                    categories: categoryData,
                });

            } catch (error) {
                console.log(error);

                res.status(500).send({
                    success: false,
                    message: "Internal Server Error",
                });
            }
        });

        app.patch("/api/admin/user/:id", async (req, res) => {
            try {
                const { id } = req.params;
                const { role } = req.body;

                if (!ObjectId.isValid(id)) {
                    return res.status(400).send({
                        success: false,
                        message: "Invalid User ID",
                    });
                }

                const result = await usersCollections.updateOne(
                    {
                        _id: new ObjectId(id),
                    },
                    {
                        $set: {
                            role: role,
                        },
                    }
                );

                res.send({
                    success: true,
                    message: "User role updated successfully.",
                    modifiedCount: result.modifiedCount,
                });
            } catch (error) {
                console.log(error);

                res.status(500).send({
                    success: false,
                    message: "Internal Server Error",
                });
            }
        });

        app.delete("/api/admin/user/:id", async (req, res) => {
            try {
                const { id } = req.params;

                if (!ObjectId.isValid(id)) {
                    return res.status(400).send({
                        success: false,
                        message: "Invalid User ID",
                    });
                }

                const result = await usersCollections.deleteOne({
                    _id: new ObjectId(id),
                });

                if (result.deletedCount === 0) {
                    return res.status(404).send({
                        success: false,
                        message: "User not found",
                    });
                }

                res.send({
                    success: true,
                    message: "User deleted successfully.",
                });
            } catch (error) {
                console.log(error);

                res.status(500).send({
                    success: false,
                    message: "Internal Server Error",
                });
            }
        });



        app.get("/api/books", async (req, res) => {
            try {
                const { search, category, sort } = req.query;

                // Query Object
                const query = {
                    status: "published",
                };

                // Search
                if (search) {
                    query.title = {
                        $regex: search,
                        $options: "i",
                    };
                }

                // Category Filter
                if (category) {
                    query.category = category;
                }

                // Sorting
                let sortOption = {
                    createdAt: -1,
                };

                switch (sort) {
                    case "fee-asc":
                        sortOption = {
                            deliveryFee: 1,
                        };
                        break;

                    case "fee-desc":
                        sortOption = {
                            deliveryFee: -1,
                        };
                        break;

                    case "oldest":
                        sortOption = {
                            createdAt: 1,
                        };
                        break;

                    case "newest":
                        sortOption = {
                            createdAt: -1,
                        };
                        break;

                    default:
                        sortOption = {
                            createdAt: -1,
                        };
                }

                const books = await booksCollections
                    .find(query)
                    .sort(sortOption)
                    .toArray();

                res.status(200).send({
                    success: true,
                    total: books.length,
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


        app.get("/api/books/:id", async (req, res) => {
            try {
                const { id } = req.params;

                if (!ObjectId.isValid(id)) {
                    return res.status(400).send({
                        success: false,
                        message: "Invalid Book ID"
                    });
                }

                const book = await booksCollections.findOne({
                    _id: new ObjectId(id)
                });

                res.send({
                    success: true,
                    book
                });

            } catch (error) {
                console.log(error);
            }
        });
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



        // feature related api 
        app.get("/api/books/featured", async (req, res) => {
            try {
                const featuredBooks = await booksCollections
                    .find({
                        status: "Published",
                    })
                    .sort({
                        createdAt: -1,
                    })
                    .limit(6)
                    .toArray();

                res.send({
                    success: true,
                    books: featuredBooks,
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