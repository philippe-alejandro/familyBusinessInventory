const express = require('express');
const User = require("../models/user");
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const { check, body, validationResult } = require("express-validator");

exports.user_list =  (req, res, next, user) => {
  User.find()
    .sort([["username", "ascending"]])
    .exec(function (err, list_user) {
    if (err) {
      return next(err);
    }
    //Successful, so render
    res.render("user_approval", {
      title: "Users Pending Approval",
      user_list: list_user,
      user: user
    });
  });
};

exports.user_list_approval_power = (req, res, next, user) => {
  User.find()
      .sort([["username", "ascending"]])
      .exec(function (err, list_user) {
        if (err) {
          return next(err);
        }
        // Exclude the document with the specific _id from the user list
        const excluded_user = list_user.filter((item) => {
          return String(item._id) === '63ee438a16dafa473dd9b93f';
        });
        const filtered_user_list = list_user.filter((item) => {
          return String(item._id) !== '63ee438a16dafa473dd9b93f';
        });
        //Successful, so render
        res.render("approval_power", {
          title: "Users With No Approval Power",
          user_list: filtered_user_list,
          excluded_user: excluded_user,
          user: user
        });
      });
};

exports.logout_get = (req, res) => {
  console.log('logout runs');
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    console.log('login intent');
    res.render('initialPage');
  });
}

exports.login_get = (req, res) => {
  res.render('login');
}

exports.login_post = [
  // Validate email and password fields
  body("email")
    .trim()
    .isLength({ min: 1 })
    .escape()
    .withMessage("Email must be specified."),
  body("password")
    .trim()
    .isLength({ min: 1 })
    .escape()
    .withMessage("Password must be specified."),
  (req, res, next) => {
    const errors = validationResult(req);
    console.log("login_post CallBack Running");
    if (!errors.isEmpty()) {
      // There are errors. Render form again with sanitized values/errors messages.
      res.render("login", {
        errors: errors.array(),
      });
      return;
    }

    passport.authenticate('local', (err, user, info) => {
      console.log("login_post authenticate running");
      if (err) { 
        console.log("err");
        return next(err); 
      }
      if (!user) {
        console.log("!user");
        req.flash('error', info.message);
        console.log(info.message);
        return res.redirect('/catalog/login');
      }
      req.logIn(user, (err) => {
        if (err) { 
          console.log("logIn err");
          return next(err); 
        }
        console.log("redirect /");
        return res.redirect('/');
      });
    })(req, res, next);
  }
];

exports.signup_get = (req, res) => {
  res.render('signUp', { 
    user: req.user 
  });
}

exports.signup_post = (req, res, next) => {
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
        res.redirect('/catalog/login');
      });
    });
  });
}