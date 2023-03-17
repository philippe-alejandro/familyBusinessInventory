const Business = require("../models/business");
const Warranty = require("../models/warranty");
const Country = require("../models/country");
const Category = require("../models/categoryOfBusiness");
const { check, body, validationResult } = require("express-validator");
const async = require("async");

exports.index = (req, res, next) => {
  async.parallel(
    {
      business_count(callback) {
        Business.countDocuments({}, callback); // Pass an empty object as match condition to find all documents of this collection
      },
      allCountries(callback) {
        Country.find().exec(callback);
      },
      warranty_count(callback) {
        Warranty.countDocuments({}, callback);
      },
      country_count(callback) {
        Country.countDocuments({}, callback);
      },
      category_count(callback) {
        Category.countDocuments({}, callback);
      },
      business_count_by_country(callback) {
        Business.aggregate([
          {
            $group: {
              _id: "$country_of_investment", // Group by the fieldName
              total: { $count: { } } // Sum the values of the field "value"
            }
          }
        ], 
        (err, result) => {
          if (err) {
            return next(err);
          } else {
            callback(null, result);
          }
        });
      },
      capital_allocation_by_country(callback) {
        Business.aggregate([
          {
            $group: {
              _id: "$country_of_investment", // Group by the fieldName
              total: { $sum: "$amount_invested" } // Sum the values of the field "value"
            }
          }
        ], 
        (err, result) => {
          if (err) {
            return next(err);
          } else {
            callback(null, result);
          }
        });
      },
      warranty_valuation_by_country(callback) {
        Business.aggregate([
          {
            $group: {
              _id: "$country_of_investment", // Group by the fieldName
              total: { $sum: "$value_warranty" } // Sum the values of the field "value"
            }
          }
        ], 
        (err, result) => {
          if (err) {
            return next(err);
          } else {
            callback(null, result);
          }
        });
      },
    },
    (err, results) => {
      res.render("index", {
        title: "Family Business Inventory Home",
        error: err,
        data: results,
      });
    }
  );
};

// Display list of all businesses.
exports.business_list = function (req, res, next) {
  Business.find({}, "first_name last_name country_of_investment amount_invested value_warranty")
    .sort([["last_name", "ascending"]])
    .populate("country_of_investment")
    .populate("warranty")
    .exec(function (err, list_businesses) {
      if (err) {
        return next(err);
      }
      //Successful, so render
      // On success, the callback passed to the query renders the business_list(.pug) template, passing 
      // the title and business_list (list of businesses with warranties and countries) as variables.
      res.render("business_list", { 
      title: "Business List", 
      business_list: list_businesses, 
      user: req.user
    });
    });
};

// Display detail page for a specific business.
exports.business_detail = (req, res, next) => {
  async.parallel(
    {
      business(callback) {
        Business.findById(req.params.id)
          .populate("country_of_investment")
          .populate("warranty")
          .exec(callback);
      }
    },
    (err, results) => {
      if (err) {
        return next(err);
      }
      if (results.business == null) {
        // No results.
        const err = new Error("Business not found");
        err.status = 404;
        return next(err);
      }
      // Successful, so render.
      res.render("business_detail", {
        business: results.business,
        first_name: results.business.first_name,
        last_name: results.business.last_name,
        country_of_investment: results.business.country_of_investment
      });
    }
  );
};

// Display business create form on GET.
exports.business_create_get = (req, res, next) => {
  // Get all warranties and countries, which we can use for adding to our business.
  async.parallel(
    {
      warranties(callback) {
        Warranty.find(callback);
      },
      countries(callback) {
        Country.find(callback);
      },
    },
    (err, results) => {
      if (err) {
        return next(err);
      }
      res.render("business_form", {
        title: "Create Business",
        warranties: results.warranties,
        countries: results.countries,
      });
    }
  );
};

// Handle business create on POST.
exports.business_create_post = [
    // Convert the category to an array
    (req, res, next) => {
      if (!Array.isArray(req.body.warranty)) {
        req.body.warranty =
          typeof req.body.warranty === "undefined" ? [] : [req.body.warranty];
      }
      next();
    },
    // Convert the country to an array
    (req, res, next) => {
      if (!Array.isArray(req.body.country_of_investment)) {
        req.body.country_of_investment =
          typeof req.body.country_of_investment === "undefined" ? [] : [req.body.country_of_investment];
      }
      next();
    },
  // Validate and sanitize fields.
  body("first_name")
    .trim()
    .isLength({ min: 1 })
    .escape()
    .withMessage("Firstname must be specified.")
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage("First name should only contain letters."),
  body("last_name")
    .trim()
    .isLength({ min: 1 })
    .escape()
    .withMessage("Lastname must be specified.")
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage("Lastname should only contain letters."),
  body("date_of_birth", "Invalid date of birth")
    .optional({ checkFalsy: true })
    .isISO8601()
    .toDate(),
  body("date_of_death", "Invalid date of death")
    .optional({ checkFalsy: true })
    .isISO8601()
    .toDate(),
  check("amount_invested")
    .trim()
    .isLength({ min: 1 })
    .escape()
    .withMessage("Amount of investment must be specified.")
    .isNumeric()
    .withMessage("Amount of investment should only contain numbers."),
  check("interest_rate")
    .trim()
    .isLength({ min: 1 })
    .escape()
    .withMessage("Interest rate must be specified.")
    .isNumeric()
    .withMessage("Interest rate should only contain numbers."),
  body("country_of_investment.*").escape(),
  body("warranty.*").escape(),

  // Process request after validation and sanitization.
  (req, res, next) => {
    // Extract the validation errors from a request.
    const errors = validationResult(req);

    // Create a Business object with escaped/trimmed data and old id.
    const business = new Business({
      first_name: req.body.first_name,
      last_name: req.body.last_name,
      date_of_birth: req.body.date_of_birth,
      date_of_death: req.body.date_of_death,
      country_of_investment: req.body.country_of_investment,
      amount_invested: req.body.amount_invested,
      warranty: req.body.warranty,
      interest_rate: req.body.interest_rate,
    });


    if (!errors.isEmpty()) {
      // There are errors. Render form again with sanitized values/error messages.

      // Get all countries and categories for form.
      async.parallel(
        {
          countries(callback) {
            Country.find(callback);
          },
          warranties(callback) {
            Warranty.find(callback);
          },
        },
        (err, results) => {
          if (err) {
            return next(err);
          }
          /*
          // Mark our selected genres as checked.
          for (const genre of results.genres) {
            if (book.genre.includes(genre._id)) {
              genre.checked = "true";
            }
          }*/
          res.render("business_form", {
            title: "Create Business",
            countries: results.countries,
            warranties: results.warranties,
            business,
            errors: errors.array(),
          });
        }
      );
      return;
    }

    // Data from form is valid. Save business.
    business.save((err) => {
      if (err) {
        return next(err);
      }
      // Successful: redirect to new business record.
      res.redirect(business.url);
    });
  },
];

// Display business delete form on GET.
exports.business_delete_get = (req, res, next) => {
  async.parallel(
    {
      business(callback) {
        Business.findById(req.params.id).exec(callback);
      }
    },
    (err, results) => {
      if (err) {
        return next(err);
      }
      if (results.business == null) {
        // No results.
        res.redirect("/catalog/businesses");
      }
      // Successful, so render.
      res.render("business_delete", {
        title: "Delete Business",
        business: results.business
      });
    }
  );
};

// Handle business delete on POST.
exports.business_delete_post = (req, res, next) => {
  async.parallel(
    {
      business(callback) {
        Business.findById(req.body.businessid).exec(callback);
      }
    },
    (err, results) => {
      if (err) {
        return next(err);
      }/*
      // Success
      if (results.booksInstances.length > 0) {
        // Book has book instances. Render in same way as for GET route.
        res.render("book_delete", {
          title: "Delete Book",
          book: results.book,
          book_Instances: results.booksInstances,
        });
        return;
      }*/
      // Book has no book instances. Delete object and redirect to the list of authors.
      Business.findByIdAndRemove(req.body.businessid, (err) => {
        if (err) {
          return next(err);
        }
        // Success - go to business list
        res.redirect("/catalog/businesses");
      });
    }
  );
};

// Display business update form on GET.
exports.business_update_get = (req, res, next) => {
  // Get business, countries and warranties for form.
  async.parallel(
    {
      business(callback) {
        Business.findById(req.params.id)
          .populate("country_of_investment")
          .populate("warranty")
          .exec(callback);
      },
      warranties(callback) {
        Warranty.find(callback);
      },
      countries(callback) {
        Country.find(callback);
      },
    },
    (err, results) => {
      if (err) {
        return next(err);
      }
      if (results.business == null) {
        // No results.
        const err = new Error("Business not found");
        err.status = 404;
        return next(err);
      }
      // Success.
      // Mark our selected countries as checked.
      /*for (const country of results.countries) {
        for (const warrantyCountry of results.warranty.country) {
          if (country._id.toString() === warrantyCountry._id.toString()) {
            country.checked = "true";
          }
        }
      }*/
      res.render("business_form", {
        title: "Update Business",
        business: results.business,
        countries: results.countries,
        warranties: results.warranties,
      });
    }
  );
};

// Handle warranty update on POST.
exports.business_update_post = [
  // Convert the category to an array
  (req, res, next) => {
    if (!Array.isArray(req.body.warranty)) {
      req.body.warranty =
        typeof req.body.warranty === "undefined" ? [] : [req.body.warranty];
    }
    next();
  },
  // Convert the country to an array
  (req, res, next) => {
    if (!Array.isArray(req.body.country_of_investment)) {
      req.body.country_of_investment =
        typeof req.body.country_of_investment === "undefined" ? [] : [req.body.country_of_investment];
    }
    next();
  },
  // Validate and sanitize fields.
  // Validate and sanitize fields.
  check("first_name")
    .trim()
    .isLength({ min: 1 })
    .escape()
    .withMessage("First name must be specified.")
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage("First name should only contain letters."),
  check("last_name")
    .trim()
    .isLength({ min: 1 })
    .escape()
    .withMessage("Lastname must be specified.")
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage("Lastname should only contain letters."),
  body("date_of_birth", "Invalid date of birth")
    .optional({ checkFalsy: true })
    .isISO8601()
    .toDate(),
  body("date_of_death", "Invalid date of death")
    .optional({ checkFalsy: true })
    .isISO8601()
    .toDate(),
  check("amount_invested")
    .trim()
    .isLength({ min: 1 })
    .escape()
    .withMessage("Amount of investment must be specified.")
    .isNumeric()
    .withMessage("Amount of investment should only contain numbers."),
  body("country_of_investment.*").escape(),
  body("warranty.*").escape(),
  // Process request after validation and sanitization.
  (req, res, next) => {
    // Extract the validation errors from a request.
    const errors = validationResult(req);

    // Create a Business object with escaped/trimmed data and old id.
    const business = new Business({
      first_name: req.body.first_name,
      last_name: req.body.last_name,
      date_of_birth: req.body.date_of_birth,
      date_of_death: req.body.date_of_death,
      country_of_investment: typeof req.body.country_of_investment === "undefined" ? [] : req.body.country_of_investment,
      amount_invested: req.body.amount_invested,
      warranty: typeof req.body.warranty === "undefined" ? [] : req.body.warranty,
      interest_rate: req.body.interest_rate,
      _id: req.params.id, //This is required, or a new ID will be assigned!
    });

    if (!errors.isEmpty()) {
      // There are errors. Render form again with sanitized values/error messages.

      // Get all countries and categories for form.
      async.parallel(
        {
          business(callback) {
            Business.findById(req.params.id)
              .populate("country_of_investment")
              .populate("warranty")
              .exec(callback);
          },
          countries(callback) {
            Country.find(callback);
          },
          warranties(callback) {
            Warranty.find(callback);
          },
        },
        (err, results) => {
          if (err) {
            return next(err);
          }
          
          // Mark our selected countries as checked.
          /*for (const category of results.categories) {
            if (warranty.category.includes(category._id)) {
              category.checked = "true";
            }
          }*/
          res.render("business_form", {
            title: "Update Business",
            countries: results.countries,
            warranties: results.warranties,
            business,
            errors: errors.array(),
          });
        }
      );
      return;
    }

    // Data from form is valid. Update the record.
    Business.findByIdAndUpdate(req.params.id, business, {}, (err, thebusiness) => {
      if (err) {
        return next(err);
      }

      // Successful: redirect to warranty detail page.
      res.redirect(thebusiness.url);
    });
  },
];
