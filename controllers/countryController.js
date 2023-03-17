const Country = require("../models/country");
const Business = require("../models/business");
const Warranty = require("../models/warranty");
const Category = require("../models/categoryOfBusiness");
const async = require("async");
const { body, validationResult } = require("express-validator");

// Display list of all Countries.
exports.country_list = function (req, res, next) {
  console.log("countries list");
  Country.find()
    .sort([["country_name", "ascending"]])
    .exec(function (err, list_countries) {
    if (err) {
      return next(err);
    }
    //Successful, so render
    res.render("country_list", {
      title: "Country List",
      country_list: list_countries,
    });
  });
};

// Display detail page for a specific Country.
exports.country_detail = (req, res, next) => {
  console.log('country_detail');
  async.parallel(
    {
      country(callback) {
        Country.findById(req.params.id).exec(callback);
      },

      country_businesses(callback) {
        Business.find({ country_of_investment: req.params.id })
        .populate("warranty")
        .exec(callback);
      },

      warranties(callback) {
        Warranty.find().exec(callback);
      },

      categories(callback) {
        Category.find().exec(callback);
      }
    },
    (err, results) => {
      if (err) {
        return next(err);
      }
      if (results.country == null) {
        // No results.
        const err = new Error("Country not found");
        err.status = 404;
        return next(err);
      }
      // Successful, so render
      res.render("country_detail", {
        title: "Country Detail",
        country: results.country,
        country_businesses: results.country_businesses,
        warranties: results.warranties,
        categories: results.categories
      });
    }
  );
};

// Display Country create form on GET.
exports.country_create_get = (req, res, next) => {
  res.render("country_form", { title: "Create Country" });
};

// Handle Country create on POST.
exports.country_create_post = [
  // Validate and sanitize the name field.
  body("country_name", "Country name required").trim().isLength({ min: 1 }).escape(),

  // Process request after validation and sanitization.
  (req, res, next) => {
    // Extract the validation errors from a request.
    const errors = validationResult(req);

    // Create a country object with escaped and trimmed data.
    const country = new Country({ country_name: req.body.country_name });

    if (!errors.isEmpty()) {
      // There are errors. Render the form again with sanitized values/error messages.
      res.render("country_form", {
        title: "Create Country",
        country,
        errors: errors.array(),
      });
      return;
    } else {
      // Data from form is valid.
      // Check if Country with same name already exists.
      Country.findOne({ country_name: req.body.country_name }).exec((err, found_country) => {
        if (err) {
          return next(err);
        }

        if (found_country) {
          // Country exists, redirect to its detail page.
          res.redirect(found_country.url);
        } else {
          country.save((err) => {
            if (err) {
              return next(err);
            }
            // Country saved. Redirect to country detail page.
            res.redirect(country.url);
          });
        }
      });
    }
  },
];

// Display Country delete form on GET.
exports.country_delete_get = (req, res, next) => {
  async.parallel(
    {
      country(callback) {
        Country.findById(req.params.id).exec(callback);
      },
      countries_businesses(callback) {
        Business.find({ country_of_residence: req.params.id }).exec(callback);
      },
      countries_warranties(callback) {
        Warranty.find({ country: req.params.id }).exec(callback);
      },
    },
    (err, results) => {
      if (err) {
        return next(err);
      }
      if (results.country == null) {
        // No results.
        res.redirect("/catalog/countries");
      }
      // Successful, so render.
      res.render("country_delete", {
        title: "Delete Country",
        country: results.country,
        country_businesses: results.countries_businesses,
        country_warranties: results.countries_warranties
      });
    }
  );
};

// Handle Genre delete on POST.
exports.country_delete_post = (req, res, next) => {
  async.parallel(
    {
      country(callback) {
        Country.findById(req.body.countryid).exec(callback);
      },
      countries_businesses(callback) {
        Business.find({ country_of_residence: req.body.countryid }).exec(callback);
      },
      countries_warranties(callback) {
        Warranty.find({ country: req.body.countryid }).exec(callback);
      },
    },
    (err, results) => {
      if (err) {
        return next(err);
      }
      // Success
      if (results.countries_businesses.length > 0 || results.countries_warranties.length > 0) {
        // Country has businesses or warranties or both. Render in same way as for GET route.
        res.render("country_delete", {
          title: "Delete Country",
          country: results.country,
          country_businesses: results.countries_businesses,
          country_warranties: results.countries_warranties
        });
        return;
      }
      // Country has no businesses or warranties or both. Delete object and redirect to the list of countries.
      Country.findByIdAndRemove(req.body.countryid, (err) => {
        if (err) {
          return next(err);
        }
        // Success - go to country list
        res.redirect("/catalog/countries");
      });
    }
  );
};

// Display Country update form on GET.
exports.country_update_get = (req, res) => {
  async.parallel(
    {
      country(callback) {
        Country.findById(req.params.id).exec(callback);
      }
    },
    (err, results) => {
      if (err) {
        return next(err);
      }
      if (results.country == null) {
        // No results.
        const err = new Error("Country not found");
        err.status = 404;
        return next(err);
      }
      res.render("country_form", {
        title: "Update Country",
        country: results.country,
      });
    }
  );
};

// Handle Country update on POST.
exports.country_update_post = [
  // Validate and sanitize the name field.
  body("country_name", "Country name required")
  .trim()
  .isLength({ min: 1 })
  .escape(),

  // Process request after validation and sanitization.
  (req, res, next) => {
    // Extract the validation errors from a request.
    const errors = validationResult(req);

    // Create a country object with escaped and trimmed data.
    const country = new Country({ 
      country_name: req.body.country_name,
      _id: req.params.id, //This is required, or a new ID will be assigned!
    });

    if (!errors.isEmpty()) {
      // There are errors. Render the form again with sanitized values/error messages.
      res.render("country_form", {
        title: "Update Country",
        country,
        errors: errors.array(),
      });
      return;
    }
    // Data from form is valid. 
    Country.findByIdAndUpdate(req.params.id, country, {}, (err, theCountry) => {
      if (err) {
        return next(err);
      }
      // Successful - redirect to new author record.
      res.redirect(theCountry.url);
    });
  },
];

