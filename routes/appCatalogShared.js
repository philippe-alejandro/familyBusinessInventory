//------------------Libraries used------------------//
const createError = require('http-errors');
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const User = require('./models/user');
const { check, body, validationResult } = require('express-validator');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
// Import the mongoose module
const mongoose = require('mongoose');
const app = express();

// Set `strictQuery: false` to globally opt into filtering by properties that aren't in the schema
// Included because it removes preparatory warnings for Mongoose 7.
// See: https://mongoosejs.com/docs/migrating_to_6.html#strictquery-is-removed-and-replaced-by-strict
mongoose.set('strictQuery', false);

// Define the database URL to connect to.
const mongoDB = 'mongodb+srv://philippealejandrob:AnaVic1949@familyoffice.4rigyby.mongodb.net/family_office?retryWrites=true&w=majority';
// Wait for database to connect, logging an error if there is a problem 
/*main().catch(err => console.log(err));
async function main() {
  await mongoose.connect(mongoDB, { useUnifiedTopology: true, useNewUrlParser: true });
}*/

mongoose.connect(mongoDB, { useUnifiedTopology: true, useNewUrlParser: true });
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'mongo connection error'));

// Set up express middleware
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'mySecret',
  resave: false,
  saveUninitialized: false,
}));

app.use(passport.initialize());
app.use(passport.session());

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Function One: setting up the LocalStrategy for the Log In of users
// This function is what will be called when we use the passport.
// authenticate() function later. Basically, it takes a username and password, 
// tries to find the user in our DB, and then makes sure that the user’s 
// password matches the given password.
// Passport configuration
passport.use(new LocalStrategy({ usernameField: 'email' }, (email, password, done) => {
  User.findOne({ email: email }, (err, user) => {
    if (err) { return done(err); }
    if (!user) {
      return done(null, false, { message: 'Incorrect email.' });
    }
    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err) { return done(err); }
      if (isMatch) {
        return done(null, user);
      } else {
        return done(null, false, { message: 'Incorrect password.' });
      }
    });
  });
}));

// To make sure our user is logged in, and to allow them to stay logged in as 
// they move around our app, passport will use some data to create a cookie which 
// is stored in the user’s browser. These next two functions define what bit of 
// information passport is looking for when it creates and then decodes the cookie. 
// The reason they require us to define these functions is so that we can make sure 
// that whatever bit of data it’s looking for actually exists in our Database! 
// Function Two 
passport.serializeUser(function(user, done) {
  console.log('Serialize user ID:', user.id);
  done(null, user.id);
});
// Function Three
passport.deserializeUser(function(id, done) {
  console.log('Deserialize user ID:', id);
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

// Routes for user authentication
app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', (req, res, next) => {
  // Validate email and password fields
  req.checkBody('email', 'Email is required').notEmpty();
  req.checkBody('password', 'Password is required').notEmpty();
  const errors = req.validationErrors();
  if (errors) {
    return res.render('login', { errors });
  }

  // Use passport to authenticate user
  passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login',
    failureFlash: true,
  })(req, res, next);
});

app.get('/', (req, res) => {
  if (req.isAuthenticated()) {
    res.render('index', { user: req.user });
  } else {
    res.redirect('/login');
  }
});

// Route to display sign up form
app.get('/signUp', (req, res) => {
  res.render('signUp', { 
    user: req.user 
  });
});

// Route to handle sign up form submission
app.post('/signup', (req, res, next) => {
  const { username, email, password } = req.body;

  // Check if any field is missing
  if (!username || !email || !password) {
    return res.status(400).json({ message: 'Please fill in all fields' });
  }

  // Check if username and email already exist in the database
  User.findOne({ $or: [{ username }, { email }] }, (err, user) => {
    if (err) {
      console.log('Error in User Sign Up');
      return next(err);
    }
    if (user) {
      return res
        .status(400)
        .json({ message: 'Username or email already exists' });
    }

    // If all validation checks pass, hash the password and create the new user
    bcrypt.hash(password, 10, (err, hashedPassword) => {
      if (err) {
        console.log('Error hashing password');
        return next(err);
      }

      const newUser = new User({
        username,
        email,
        password: hashedPassword,
      });
      newUser.save((err) => {
        if (err) {
          console.log('Error in User Sign Up');
          return next(err);
        }
        res.redirect('/login');
      });
    });
  });
});

// Route to log out user
app.get('/initialPage', (req, res) => {
  req.logout();
  res.redirect('/login');
});

const auth_func =  (req, res, next) => {
  console.log("isAuthenticated runs");
  if (req.isAuthenticated()) {
    return next();
  } else {
    res.redirect('/login');
  }
}

const test_func = (req, res) => {
  console.log('Testing stuff');
}

// Require controller modules.
const category_controller = require("./controllers/categoryController");
const warranty_controller = require("./controllers/warrantyController");
const country_controller = require("./controllers/countryController");
const business_controller = require("./controllers/businessController");

/// BUSINESS ROUTES ///

// GET catalog home page.
app.get("/", auth_func, business_controller.index);

// GET request for creating a Business. NOTE This must come before routes that display Business (uses id).
app.get("/business/create", business_controller.business_create_get);

// POST request for creating Business.
app.post("/business/create", business_controller.business_create_post);

// GET request to delete Business.
app.get("/business/:id/delete", business_controller.business_delete_get);

// POST request to delete Business.
app.post("/business/:id/delete", business_controller.business_delete_post);

// GET request to update Business.
app.get("/business/:id/update", business_controller.business_update_get);

// POST request to update Business.
app.post("/business/:id/update", business_controller.business_update_post);

// GET request for one Business.
app.get("/business/:id", business_controller.business_detail);

// GET request for list of all Business items.
app.get("/businesses", business_controller.business_list);


/// CATEGORY ROUTES ///

// GET request for creating a Category. NOTE This must come before route that displays Category (uses id).
app.get("/category/create", category_controller.category_create_get);

//POST request for creating Category.
app.post("/category/create", category_controller.category_create_post);

// GET request to delete Category.
app.get("/category/:id/delete", category_controller.category_delete_get);

// POST request to delete Category.
app.post("/category/:id/delete", category_controller.category_delete_post);

// GET request to update Category.
app.get("/category/:id/update", category_controller.category_update_get);

// POST request to update Category.
app.post("/category/:id/update", category_controller.category_update_post);

// GET request for one Category.
app.get("/category/:id", category_controller.category_detail);

// GET request for list of all Category.
app.get("/categories", category_controller.category_list);

/// WARRANTY ROUTES ///

// GET request for creating a Business. NOTE This must come before routes that display Business (uses id).
app.get("/warranty/create", warranty_controller.warranty_create_get);

// POST request for creating Business.
app.post("/warranty/create", warranty_controller.warranty_create_post);

// GET request to delete Business.
app.get("/warranty/:id/delete", warranty_controller.warranty_delete_get);

// POST request to delete Business.
app.post("/warranty/:id/delete", warranty_controller.warranty_delete_post);

// GET request to update Business.
app.get("/warranty/:id/update", warranty_controller.warranty_update_get);

// POST request to update Business.
app.post("/warranty/:id/update", warranty_controller.warranty_update_post);

// GET request for one Business.
app.get("/warranty/:id", warranty_controller.warranty_detail);

// GET request for list of all Business items.
app.get("/warranties", warranty_controller.warranty_list);

/// COUNTRY ROUTES ///

// GET request for creating a Country. NOTE This must come before routes that display Business (uses id).
app.get("/country/create", country_controller.country_create_get);

// POST request for creating Country.
app.post("/country/create", country_controller.country_create_post);

// GET request to delete Country.
app.get("/country/:id/delete", country_controller.country_delete_get);

// POST request to delete Country.
app.post("/country/:id/delete", country_controller.country_delete_post);

// GET request to update Country.
app.get("/country/:id/update", country_controller.country_update_get);

// POST request to update Country.
app.post("/country/:id/update", country_controller.country_update_post);

// GET request for one Country.
app.get("/country/:id", country_controller.country_detail);

// GET request for list of all Country items.
app.get("/countries", country_controller.country_list);