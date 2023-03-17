const express = require("express");
const session = require('express-session');
const mongodb = require('mongodb');
const MONGO_URI = 'mongodb+srv://philippealejandrob:AnaVic1949@familyoffice.4rigyby.mongodb.net/family_office?retryWrites=true&w=majority&authSource=admin';
const path = require('path');
const router = express.Router();
// Require controller modules.
const category_controller = require("../controllers/categoryController");
const warranty_controller = require("../controllers/warrantyController");
const country_controller = require("../controllers/countryController");
const business_controller = require("../controllers/businessController");
const user_controller = require("../controllers/usersController");
const dataViz_controller = require("../controllers/dataChartsController");
// const router = require("../router").router;
const flash = require("connect-flash");
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const User = require('../models/user');
const { nextTick } = require("async");
/// SESSION ROUTES ///
// Set up express middleware
router.use(express.urlencoded({ extended: true }));
router.use(session({
  secret: 'mySecret',
  resave: false,
  saveUninitialized: false,
}));
// Configure flash middleware
router.use(flash());

// Initialize passport middleware
router.use(passport.initialize());
router.use(passport.session());

// view engine setup
/*router.set('views', path.join(__dirname, 'views'));
router.set('view engine', 'pug');
router.use(logger('dev'));
router.use(express.json());
router.use(express.urlencoded({ extended: false }));
router.use(cookieParser());
router.use(express.static(path.join(__dirname, 'public')));*/

// Function One: setting up the LocalStrategy for the Log In of users
// This function is what will be called when we use the passport.
// authenticate() function later. Basically, it takes a username and password, 
// tries to find the user in our DB, and then makes sure that the user’s 
// password matches the given password.
// Passport configuration
passport.use(new LocalStrategy({ usernameField: 'email' }, (email, password, done) => {
  console.log(`Attempting to authenticate user with email: ${email}`);
  User.findOne({ email: email }, (err, user) => {
    if (err) { return done(err); }
    if (!user) {
      console.log(`User not found with email: ${email}`);
      return done(null, false, { message: 'Incorrect email.' });
    }
    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err) { return done(err); }
      if (isMatch) {
        console.log(`User authenticated with email: ${email}`);
        return done(null, user);
      } else {
        console.log(`Incorrect password for user with email: ${email}`);
        return done(null, false, { message: 'Incorrect password.' });
      }
    });
  });
}));

// To make sure our user is logged in, and to allow them to stay logged in as 
// they move around our router, passport will use some data to create a cookie which 
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

/// AUTHENTICATION ROUTES ///

// Routes for user authentication
router.get('/login', user_controller.login_get);

router.post('/login', user_controller.login_post);

// Route to display sign up form
router.get('/signUp', user_controller.signup_get);

// Route to handle sign up form submission
router.post('/signUp', user_controller.signup_post);

router.get("/initialPage", user_controller.logout_get);

// Middleware function to check user is authenticated in order to use
// any route in the app. 
const auth_func = (req, res, next) => {
  if (req.isAuthenticated()) {
    console.log("req.user:" + req.user)
    req.user = req.user;
    return next();
  } else {
    res.redirect('/catalog/login');
  }
}

// middleware which checks if any user has been given access
// by the app's owner to see data in any route and interact
// with the app. 
const checkAccessLevel = (req, res, next) => {
  const { user } = req;

  if (!user._doc || user._doc.accessLevel !== "admin") {
    console.log("checkAccessLevel: " + user._doc.accessLevel);
    // create a modal and render it with the message "Access not granted yet"
    const modal = `
      <div class="modal" style="display: flex; align-items: center; justify-content: center; position: fixed; top: 0; left: 0; height: 100%; width: 100%; background-color: rgba(0,0,0,0.5); z-index: 999;">
        <div class="modal-content" style="background-color: white; padding: 20px; border-radius: 5px; text-align: center;">
          <h4>Access Denied</h4>
          <p style="margin-top: 10px;">Access not granted yet</p>
        </div>
      </div>
    `;
    return res.send(modal);
  }
  next();
};

// middleware which provides access to route for giving access power
// to any user that signs up
const checkPowerApproval = (req, res, next) => {
  const { user } = req;

  if (!user._doc || user._doc.approver === "false" || user._doc.approver === false) {
    console.log("checkPowerApproval: " + user._doc.approver);
    // create a modal and render it with the message "Access not granted yet"
    const modal = `
      <div class="modal" style="display: flex; align-items: center; justify-content: center; position: fixed; top: 0; left: 0; height: 100%; width: 100%; background-color: rgba(0,0,0,0.5); z-index: 999;">
        <div class="modal-content" style="background-color: white; padding: 20px; border-radius: 5px; text-align: center;">
          <h4>Access Denied</h4>
          <p style="margin-top: 10px;">Access not granted yet</p>
        </div>
      </div>
    `;
    return res.send(modal);
  }
  next();
};

// It's possible that req.user is still undefined at the time when the router.get callback is executed. One possible solution is to move the middleware function auth_func inside the router.get callback and call it before calling user_controller.user_list
// This way, auth_func is only called after the router.get callback is invoked, which ensures that req.user is defined before trying to use it.
router.get("/pendingApproval", (req, res, next) => {
  const auth_func1 = (req, res, next) => {
    if (req.isAuthenticated()) {
      return next();
    } else {
      res.redirect('/catalog/login');
    }
  }

  // Call the auth middleware function
  auth_func1(req, res, () => {
    // After the user is authenticated, capture the user object
    const user = req.user;

    // Call user_controller.user_list with the captured user object
    user_controller.user_list(req, res, next, user);
  });
});

/// GRANT ACCESS ROUTES ///

// PATCH approver property of a specific user document in the users collection
router.patch('/approvalPower/:id', checkPowerApproval, async (req, res) => {
  console.log("route: '/approvalPower/:id'");
  try {
    const usersCollection = await loadUsersCollection();

    // Retrieve the user document from the database
    const user = await usersCollection.findOne({ _id: new mongodb.ObjectId(req.params.id) });

    // Access the current value of the approver property and modify it
    const currentApproverValue = user.approver;
    const newApproverValue = !currentApproverValue;

    // Update the user document with the new approver value
    await usersCollection.updateOne(
      { _id: new mongodb.ObjectId(req.params.id) },
      { $set: { approver: newApproverValue } }
    );

    res.status(200).send('User updated successfully');
  } catch (err) {
      console.error(err);
      res.status(500).send('Server error');
  }
});

router.get("/approvalPower", checkPowerApproval, (req, res, next) => {
  const auth_func1 = (req, res, next) => {
    if (req.isAuthenticated()) {
      return next();
    } else {
      res.redirect('/catalog/login');
    }
  }

  // Call the auth middleware function
  auth_func1(req, res, () => {
    // After the user is authenticated, capture the user object
    const user = req.user;
    console.log("route: '/approvalPower'");
    console.log(user);
    // Call user_controller.user_list with the captured user object
    user_controller.user_list_approval_power(req, res, next, user);
  });
});

// PATCH the accessLevel property of a user document in the users collection
router.patch('/users/:id', async (req, res) => {
  try {
    const usersCollection = await loadUsersCollection();

    await usersCollection.updateOne(
      { _id: new mongodb.ObjectId(req.params.id) },
      { $set: { accessLevel: 'admin' } }
    );

    res.status(200).send('User updated successfully');
  } catch (err) {
      console.error(err);
      res.status(500).send('Server error');
  }
});

async function loadUsersCollection() {
  const client = await mongodb.MongoClient.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });

  return client.db('family_office').collection('users');
}

/// BUSINESS ROUTES ///

// GET catalog home page.
router.get("/", auth_func, checkAccessLevel, business_controller.index);

// GET request for creating a Business. NOTE This must come before routes that display Business (uses id).
router.get("/business/create", auth_func, checkAccessLevel, business_controller.business_create_get);

// POST request for creating Business.
router.post("/business/create", auth_func, checkAccessLevel, business_controller.business_create_post);

// GET request to delete Business.
router.get("/business/:id/delete", auth_func, checkAccessLevel, business_controller.business_delete_get);

// POST request to delete Business.
router.post("/business/:id/delete", auth_func, checkAccessLevel, business_controller.business_delete_post);

// GET request to update Business.
router.get("/business/:id/update", auth_func, checkAccessLevel, business_controller.business_update_get);

// POST request to update Business.
router.post("/business/:id/update", auth_func, checkAccessLevel, business_controller.business_update_post);

// GET request for one Business.
router.get("/business/:id", auth_func, checkAccessLevel, business_controller.business_detail);

// GET request for list of all Business items.
router.get("/businesses", auth_func, checkAccessLevel, business_controller.business_list);


/// CATEGORY ROUTES ///

// GET request for creating a Category. NOTE This must come before route that displays Category (uses id).
router.get("/category/create", auth_func, checkAccessLevel, category_controller.category_create_get);

//POST request for creating Category.
router.post("/category/create", auth_func, checkAccessLevel, category_controller.category_create_post);

// GET request to delete Category.
router.get("/category/:id/delete", auth_func, checkAccessLevel, category_controller.category_delete_get);

// POST request to delete Category.
router.post("/category/:id/delete", auth_func, checkAccessLevel, category_controller.category_delete_post);

// GET request to update Category.
router.get("/category/:id/update", auth_func, checkAccessLevel, category_controller.category_update_get);

// POST request to update Category.
router.post("/category/:id/update", auth_func, checkAccessLevel, category_controller.category_update_post);

// GET request for one Category.
router.get("/category/:id", auth_func, checkAccessLevel, category_controller.category_detail);

// GET request for list of all Category.
router.get("/categories", auth_func, checkAccessLevel, category_controller.category_list);

/// WARRANTY ROUTES ///

// GET request for creating a Business. NOTE This must come before routes that display Business (uses id).
router.get("/warranty/create", auth_func, checkAccessLevel, warranty_controller.warranty_create_get);

// POST request for creating Business.
router.post("/warranty/create", auth_func, checkAccessLevel, warranty_controller.warranty_create_post);

// GET request to delete Business.
router.get("/warranty/:id/delete", auth_func, checkAccessLevel, warranty_controller.warranty_delete_get);

// POST request to delete Business.
router.post("/warranty/:id/delete", auth_func, checkAccessLevel, warranty_controller.warranty_delete_post);

// GET request to update Business.
router.get("/warranty/:id/update", auth_func, checkAccessLevel, warranty_controller.warranty_update_get);

// POST request to update Business.
router.post("/warranty/:id/update", auth_func, checkAccessLevel, warranty_controller.warranty_update_post);

// GET request for one Business.
router.get("/warranty/:id", auth_func, checkAccessLevel, warranty_controller.warranty_detail);

// GET request for list of all Business items.
router.get("/warranties", auth_func, checkAccessLevel, warranty_controller.warranty_list);

/// COUNTRY ROUTES ///

// GET request for creating a Country. NOTE This must come before routes that display Business (uses id).
router.get("/country/create", auth_func, checkAccessLevel, country_controller.country_create_get);

// POST request for creating Country.
router.post("/country/create", auth_func, checkAccessLevel, country_controller.country_create_post);

// GET request to delete Country.
router.get("/country/:id/delete", auth_func, checkAccessLevel, country_controller.country_delete_get);

// POST request to delete Country.
router.post("/country/:id/delete", auth_func, checkAccessLevel, country_controller.country_delete_post);

// GET request to update Country.
router.get("/country/:id/update", auth_func, checkAccessLevel, country_controller.country_update_get);

// POST request to update Country.
router.post("/country/:id/update", auth_func, checkAccessLevel, country_controller.country_update_post);

// GET request for one Country.
router.get("/country/:id", auth_func, checkAccessLevel, country_controller.country_detail);

// GET request for list of all Country items.
router.get("/countries", auth_func, checkAccessLevel, country_controller.country_list);

/// VISUALIZATION ROUTES ///
router.get('/charts', dataViz_controller.chartsData);
router.get('/charts/data', dataViz_controller.getChartData);

module.exports = router;


