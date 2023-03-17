const Warranty = require("../models/warranty");
const async = require("async");
const Business = require("../models/business");
const Category = require("../models/categoryOfBusiness");
const Country = require("../models/country");
const User = require("../models/user");

exports.chartsData = (req, res, next) => {
  console.log('charts');
  async.parallel(
    {
      warranties(callback) {
        Warranty.find()
          .populate("country")
          .populate("category")
          .exec(callback)
      },
      countries(callback) {
        Country.find().exec(callback)
      },
      businesses(callback) {
        Business.find()
          .populate("warranty")
          .populate("country_of_investment")
          .exec(callback)
      },
      users(callback) {
        User.find().exec(callback)
      },
      categories(callback) {
        Category.find().exec(callback)
      }
    },
    (err, results) => {
      if (err) {
        return next(err)
      }
      if (results == null) {
        // No results.
        const err = new Error("No warranties found");
        err.status = 404;
        return next(err);
      }
      console.log('charts');
      res.render('chartsSummary', { 
        title: 'Business Inventory Summary',
        results: JSON.stringify(results)
      });
    });
};

exports.getChartData = function(req, res, next) {
  console.log('chartsData');
  async.parallel(
    {
      warranties(callback) {
        Warranty.find()
          .populate("country")
          .populate("category")
          .exec(callback)
      },
      countries(callback) {
        Country.find().exec(callback)
      },
      businesses(callback) {
        Business.find()
          .populate("warranty")
          .populate("country_of_investment")
          .exec(callback)
      },
      users(callback) {
        User.find().exec(callback)
      },
      categories(callback) {
        Category.find().exec(callback)
      }
    },
    (err, results) => {
      if (err) {
        return next(err)
      }
      if (results == null) {
        // No results.
        const err = new Error("No warranties found");
        err.status = 404;
        return next(err);
      }
      console.log('chartsData');
      res.json(results);
    });
};

