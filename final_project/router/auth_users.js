const express = require('express');
const jwt = require('jsonwebtoken');
let books = require("./booksdb.js");
const regd_users = express.Router();
const session = require('express-session');

let users = [];

const isValid = (username)=>{ //returns boolean
//write code to check is the username is valid
    return users.every(user => user.username !== username);
}

const authenticatedUser = (username,password)=>{ //returns boolean
//write code to check if username and password match the one we have in records.
    // Filter the users array for any user with the same username and password
    let validusers = users.filter((user) => {
        return (user.username === username && user.password === password);
    });
    // Return true if any valid user is found, otherwise false
    if (validusers.length > 0) {
        return true;
    } else {
        return false;
    }
}


regd_users.use(session({secret:"fingerprint",resave:true,saveUninitialized:true}));
regd_users.use(express.json());

// Middleware to authenticate requests to "/login" endpoint
regd_users.use("/customer", function auth(req, res, next) {
    // Check if user is logged in and has valid access token
    if (req.session.authorization) {
        let token = req.session.authorization['accessToken'];
        // Verify JWT token
        jwt.verify(token, "access", (err, user) => {
            if (!err) {
                req.user = user;
                next(); // Proceed to the next middleware
            } else {
                return res.status(403).json({ message: "User not authenticated" });
            }
        });
    } else {
        return res.status(403).json({ message: "User not logged in" });
    }
});


//only registered users can login
regd_users.post("/login", (req,res) => {
    //Write your code here
    const username = req.body.username;
    const password = req.body.password;
    // Check if username or password is missing
    if (!username || !password) {
        return res.status(404).json({ message: "Error logging in" });
    }
    // Authenticate user
    if (authenticatedUser(username, password)) {
        // Generate JWT access token
        let accessToken = jwt.sign({
            data: password
        }, 'access', { expiresIn: 60 * 60 });
        // Store access token and username in session
        req.session.authorization = {
            accessToken, username
        }
        return res.status(200).send("User successfully logged in");
    } else {
        return res.status(208).json({ message: "Invalid Login. Check username and password"});
    }
});


// Add a book review
regd_users.put("/auth/review/:isbn", (req, res) => {
  //Write your code here
    const isbn = req.params.isbn
    console.log(`Request received for ISBN: ${isbn}`);
    let book = books[isbn];  // Retrieve book object associated with isbn
    let add_review = true;


    if (book) {  // Check book exists
        let username = req.body.username;
        let review = req.body.review;
        console.log(`Reviewing book: ${book.title}, username: ${username}, review: ${review}`);
        // Check if user already posted a review for this book
        for (const existing_review of book.reviews) {
            if (existing_review.username === username) {
                existing_review.review = review;  // Update existing review
                add_review = false;
                break;
            }
        }
        if (add_review) {
            // if user posts a review on a ISBN for 1st time, add review
            console.log(`Adding new review for ${book.title}`);
            book.reviews.push({ username, review });
        }    
        res.status(200).json({
            message: `${book.title} has a review added or updated. Existing reviews are below:`,
            reviews: book.reviews
        });;
    } else {
        // Respond if book with specified isbn is not found
        console.log("Unable to find book with ISBN:", isbn);
        res.status(404).send("Unable to find book!");
    }
});

// Delete a book review
regd_users.delete("/auth/review/:isbn", (req, res) => {
    const isbn = req.params.isbn
    let book = books[isbn];  // Retrieve book object associated with isbn

    if (book) {  // Check book exists
        let username = req.body.username;
        let review = req.body.review;
        // Check if user already posted a review for this book
        for (const existing_review of book.reviews) {
            if (existing_review.username === username) {
                delete existing_review.review;  // Delete existing review
                delete existing_review.username;
                break;
            }
        }
        res.status(200).json({
            message: `${book.title} has a review deleted. Existing reviews are below:`,
            reviews: book.reviews
        });;
    } else {
        // Respond if book with specified isbn is not found
        console.log("Unable to find book with ISBN:", isbn);
        res.status(404).send("Unable to find book!");
    }
})

module.exports.authenticated = regd_users;
module.exports.isValid = isValid;
module.exports.users = users;
