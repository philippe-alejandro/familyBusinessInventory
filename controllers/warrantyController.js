const Warranty = require("../models/warranty");
const async = require("async");
const Business = require("../models/business");
const Category = require("../models/categoryOfBusiness");
const Country = require("../models/country");
const { check, body, validationResult } = require("express-validator");
const { result } = require("lodash");

// Display list of all Warranties.
exports.warranty_list = function (req, res, next) {
  async.parallel(
    {
      warranties(callback) {
        Warranty.find()
        .sort([["family_name_owner", "ascending"]])
        .exec(callback);
      },
      categories(callback) {
        Category.find().exec(callback);
      },
    }, 
    (err, results) => {
      if (err) {
        return next(err);
      }
      if (results.warranties == null) {
        // No results.
        const err = new Error("No warranties found");
        err.status = 404;
        return next(err);
      }
      // Successful, so render
      res.render("warranty_list", {
        title: "Warranty List",
        warranty_list: results.warranties,
        categories: results.categories
      });
  });
};

// Display detail page for a specific Warranty.
exports.warranty_detail = (req, res, next) => {
  async.parallel(
    {
      warranty(callback) {
        Warranty.findById(req.params.id).exec(callback);
      },
      warranties(callback) {
        Warranty.find()
        .sort([["family_name_owner", "ascending"]])
        .exec(callback);
      },
      allBusinesses(callback) {
        Business.find().exec(callback);
      },
      warranties_businesses(callback) {
        Business.find({ warranty: req.params.id }, "first_name family_name amount_invested country_of_investment")
        .sort([["family_name", "ascending"]])
        .exec(callback);
      },
      countries(callback) {
        Country.find().exec(callback);
      },
      categories(callback) {
        Category.find().exec(callback);
      }
    },
    (err, results) => {
      if (err) {
        // Error in API usage.
        return next(err);
      }
      if (results.warranty == null) {
        // No results.
        const err = new Error("Warranty not found");
        err.status = 404;
        return next(err);
      }
      // Successful, so render.
      res.render("warranty_detail", {
        title: "Warranty Detail",
        warranty: results.warranty,
        warranties: results.warranties, 
        allBusinesses: results.allBusinesses,
        warranty_businesses: results.warranties_businesses,
        countries: results.countries,
        categories: results.categories
      });
    }
  );
};

// Display warranty create form on GET.
exports.warranty_create_get = (req, res, next) => {
  // Get all categories and countries, which we can use for adding to our warranty.
  async.parallel(
    {
      categories(callback) {
        Category.find(callback);
      },
      countries(callback) {
        Country.find(callback);
      },
    },
    (err, results) => {
      if (err) {
        return next(err);
      }
      res.render("warranty_form", {
        title: "Create Warranty",
        categories: results.categories,
        countries: results.countries,
      });
    }
  );
};

// Handle Warranty create on POST.
exports.warranty_create_post = [
  // Convert the category to an array.
  (req, res, next) => {
    if (!Array.isArray(req.body.category)) {
      req.body.category =
        typeof req.body.category === "undefined" ? [] : [req.body.category];
    }
    next();
  },
  // Convert the country to an array.
  (req, res, next) => {
    if (!Array.isArray(req.body.country)) {
      req.body.country =
        typeof req.body.country === "undefined" ? [] : [req.body.country];
    }
    next();
  },
  // Validate and sanitize fields.
  body("first_name_owner")
    .trim()
    .isLength({ min: 1 })
    .escape()
    .withMessage("First name must be specified.")
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage("Firstname should only contain letters."),
  body("family_name_owner")
    .trim()
    .isLength({ min: 1 })
    .escape()
    .withMessage("Family name must be specified.")
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage("Family name should only contain letters."),
  body("country.*").escape(),
  body("category.*").escape(),
  // Process request after validation and sanitization.
  (req, res, next) => {
    // Extract the validation errors from a request.
    const errors = validationResult(req);

    // Create a Warranty object with escaped and trimmed data.
    const warranty = new Warranty({
      first_name_owner: req.body.first_name_owner,
      family_name_owner: req.body.family_name_owner,
      country: req.body.country,
      valuation: req.body.valuation,
      category: req.body.category,
    });

    if (!errors.isEmpty()) {
      // There are errors. Render form again with sanitized values/error messages.

      // Get all authors and genres for form.
      async.parallel(
        {
          countries(callback) {
            Country.find(callback);
          },
          categories(callback) {
            Category.find(callback);
          },
        },
        (err, results) => {
          if (err) {
            return next(err);
          }
          /*
          // Mark our selected genres as checked.
          for (const category of results.categories) {
            if (warranty.category.includes(category._id)) {
              category.checked = "true";
            }
          }*/
          res.render("warranty_form", {
            title: "Create Warranty",
            countries: results.countries,
            categories: results.categories,
            warranty,
            errors: errors.array(),
          });
        }
      );
      return;
    }

    // Data from form is valid. Save warranty.
    warranty.save((err) => {
      if (err) {
        return next(err);
      }
      // Successful: redirect to new warranty record.
      res.redirect(warranty.url);
    });
  },
];

// Display warranty delete form on GET.
exports.warranty_delete_get = (req, res, next) => {
  async.parallel(
    {
      warranty(callback) {
        Warranty.findById(req.params.id).exec(callback);
      },
      warrantyBusinesses(callback) {
        Business.find({ warranty: req.params.id }).exec(callback);
      },
      categories(callback) {
        Category.find().exec(callback);
      },
      warranties(callback) {
        Warranty.find().exec(callback)
      }
    },
    (err, results) => {
      if (err) {
        return next(err);
      }
      if (results.warranty == null) {
        // No results.
        res.redirect("/catalog/warranties");
      }
      // Successful, so render.
      res.render("warranty_delete", {
        title: "Delete Warranty",
        warranty: results.warranty,
        warranty_Businesses: results.warrantyBusinesses,
        categories: results.categories,
        warranties: results.warranties
      });
    }
  );
};

// Handle warranty delete on POST.
exports.warranty_delete_post = (req, res, next) => {
  async.parallel(
    {
      warranty(callback) {
        Warranty.findById(req.body.warrantyid).exec(callback);
      },
      warrantyBusinesses(callback) {
        Business.find({ warranty: req.body.warrantyid })
        .populate("warranty")
        .exec(callback);
      },
      categories(callback) {
        Category.find().exec(callback);
      },
      warranties(callback) {
        Warranty.find().exec(callback)
      }
    },
    (err, results) => {
      if (err) {
        return next(err);
      }
      // Success
      if (results.warrantyBusinesses.length > 0) {
        // Book has warranty instances. Render in same way as for GET route.
        res.render("warranty_delete", {
          title: "Delete Warranty",
          warranty: results.warranty,
          warranty_Businesses: results.warrantyBusinesses,
          categories: results.categories,
          warranties: results.warranties
        });
        return;
      }
      // Business has no warranty instances. Delete object and redirect to the list of authors.
      Warranty.findByIdAndRemove(req.body.warrantyid, (err) => {
        if (err) {
          return next(err);
        }
        // Success - go to warranty list
        res.redirect("/catalog/warranties");
      });
    }
  );
};

// Display warranty update form on GET.
exports.warranty_update_get = (req, res, next) => {
  // Get warranty, countries and categories for form.
  async.parallel(
    {
      warranty(callback) {
        Warranty.findById(req.params.id)
          .populate("country")
          .populate("category")
          .exec(callback);
      },
      countries(callback) {
        Country.find(callback);
      },
      categories(callback) {
        Category.find(callback);
      },
    },
    (err, results) => {
      if (err) {
        return next(err);
      }
      if (results.warranty == null) {
        // No results.
        const err = new Error("Warranty not found");
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
      res.render("warranty_form", {
        title: "Update Warranty",
        countries: results.countries,
        categories: results.categories,
        warranty: results.warranty,
      });
    }
  );
};

// Handle warranty update on POST.
exports.warranty_update_post = [
  // Convert the category to an array
  (req, res, next) => {
    if (!Array.isArray(req.body.category)) {
      req.body.category =
        typeof req.body.category === "undefined" ? [] : [req.body.category];
    }
    next();
  },
  // Convert the country to an array
  (req, res, next) => {
    if (!Array.isArray(req.body.country)) {
      req.body.country =
        typeof req.body.country === "undefined" ? [] : [req.body.country];
    }
    next();
  },
  // Validate and sanitize fields.
  // Validate and sanitize fields.
  check("first_name_owner")
    .trim()
    .isLength({ min: 1 })
    .escape()
    .withMessage("First name must be specified.")
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage("First name should only contain letters."),
  check("family_name_owner")
    .trim()
    .isLength({ min: 1 })
    .escape()
    .withMessage("Family name must be specified.")
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage("Family name should only contain letters."),
  body("country.*").escape(),
  body("category.*").escape(),
  // Process request after validation and sanitization.
  (req, res, next) => {
    // Extract the validation errors from a request.
    const errors = validationResult(req);

    // Create a Book object with escaped/trimmed data and old id.
    const warranty = new Warranty({
      first_name_owner: req.body.first_name_owner,
      family_name_owner: req.body.family_name_owner,
      country: req.body.country,
      valuation: req.body.valuation,
      category: typeof req.body.category === "undefined" ? [] : req.body.category,
      _id: req.params.id, //This is required, or a new ID will be assigned!
    });

    if (!errors.isEmpty()) {
      // There are errors. Render form again with sanitized values/error messages.

      // Get all countries and categories for form.
      async.parallel(
        {
          warranty(callback) {
            Warranty.findById(req.params.id)
              .populate("country")
              .populate("category")
              .exec(callback);
          },
          countries(callback) {
            Country.find(callback);
          },
          categories(callback) {
            Category.find(callback);
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
          res.render("warranty_form", {
            title: "Update Warranty",
            countries: results.countries,
            categories: results.categories,
            warranty,
            errors: errors.array(),
          });
        }
      );
      return;
    }

    // Data from form is valid. Update the record.
    Warranty.findByIdAndUpdate(req.params.id, warranty, {}, (err, thewarranty) => {
      if (err) {
        return next(err);
      }

      // Successful: redirect to warranty detail page.
      res.redirect(thewarranty.url);
    });
  },
];