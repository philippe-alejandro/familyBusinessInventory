#! /usr/bin/env node

console.log('This script populates some test businesses, countries, categories and warranties to your database. Specified database as argument - e.g.: node populatedb "mongodb+srv://cooluser:coolpassword@familyOffice.4rigyby.mongodb.net/family_office?retryWrites=true&w=majority"');

// Get arguments passed on command line
const userArgs = process.argv.slice(2);

const async = require('async');
const Business = require('./models/business');
const Warranty = require('./models/warranty');
const Country = require('./models/country');
const Category = require('./models/categoryOfBusiness');


const mongoose = require('mongoose');
mongoose.set('strictQuery', false); // Prepare for Mongoose 7

const mongoDB = userArgs[0];

main().catch(err => console.log(err));
async function main() {
  await mongoose.connect(mongoDB);
}

const businesses = []
const warranties = []
const countries = []
const categories = []

function businessCreate(first_name, family_name, d_birth, d_death, city_of_investment, country_of_investment, amount_invested, warranty, value_warranty, interest_rate, cb) {
  businessdetail = {
    first_name: first_name, family_name: family_name, date_of_birth: d_birth,
    city_of_investment: city_of_investment, country_of_investment: country_of_investment, 
    amount_invested: amount_invested, warranty: warranty, 
    value_warranty: value_warranty, interest_rate: interest_rate
  }
  if (d_death != false) businessdetail.date_of_death = d_death
  
  const business = new Business(businessdetail);
       
  business.save(function (err) {
    if (err) {
      cb(err, null)
      return
    }
    console.log('New Business: ' + business);
    businesses.push(business)
    cb(null, business)
  }  );
}

function warrantyCreate(first_name_owner, family_name_owner, country, valuation, category, cb) {
  warrantydetail = { 
    first_name_owner: first_name_owner,
    family_name_owner: family_name_owner,
    country: country,
    valuation: valuation,
    category: category
  };

  const warranty = new Warranty(warrantydetail);
       
  warranty.save(function (err) {
    if (err) {
      cb(err, null);
      return;
    }
    console.log('New Warranty: ' + warranty);
    warranties.push(warranty)
    cb(null, warranty);
  });
}

function countryCreate(country_name, city_name, cb) {
  countrydetail = { 
    country_name: country_name,
    city_name: city_name
  }

  const country = new Country(countrydetail);    
  country.save(function (err) {
    if (err) {
      cb(err, null)
      return
    }
    console.log('New Country: ' + country);
    countries.push(country)
    cb(null, country)
  });
}

function categoryCreate(category_name, cb) {
  categorydetail = { 
    category_name: category_name
  }    
    
  const category = new Category(categorydetail);    
  category.save(function (err) {
    if (err) {
      console.log('ERROR CREATING Category: ' + category);
      cb(err, null)
      return
    }
    console.log('New Category: ' + category);
    categories.push(category)
    cb(null, category)
  });
}

function createCountries(cb) {
    async.series([
        function(callback) {
          countryCreate('Republic of Guatemala', 'Guatemala City', callback);
        },
        function(callback) {
          countryCreate('Republic of Costa Rica', 'San Jose', callback);
        }
        ], 
        cb);
}

function createBusinesses(cb) {
    async.parallel([
        function(callback) {
          businessCreate('Carlos', 'Enriquez', '1953-01-01', false, 'Guatemala City', countries[0], 300000, warranties[0], 600000, 10, callback);
        },
        function(callback) {
          businessCreate('Luis Mario', 'Contreras', '1984-01-01', false, 'Guatemala City', countries[0], 1200000, warranties[1], 3000000, 9, callback);
        },
        function(callback) {
          businessCreate('Armando', 'Dominguez', '1964-01-01', false, 'Guatemala City', countries[0], 100000, warranties[2], 300000, 10, callback);
        },
        function(callback) {
          businessCreate('Juan Manuel', 'Asturias', '1984-01-01', false, 'Antigua Guatemala', countries[0], 800000, warranties[3], 2400000, 10, callback);
        },
        function(callback) {
          businessCreate('Jorge', 'Pavia', '1952-01-01', false, 'Guatemala City', countries[0], 400000, warranties[4], 1000000, 8, callback);
        },
        function(callback) {
          businessCreate('Irvin', 'Gonzalez', '1959-01-01', false, 'Guatemala City', countries[0], 700000, warranties[5], 2100000, 10, callback);
        }
        ],
        // optional callback
        cb);
}

function createWarrantyCategories(cb) {
    async.series([
        function(callback) {
          categoryCreate("Company Shares", callback);
        },
        function(callback) {
          categoryCreate("Real State Assets", callback);
        },
        function(callback) {
          categoryCreate("Vehicles", callback);
        }
      ],
      cb);
}

function createWarranties(cb) {
    async.series([
        function(callback) {
          warrantyCreate('Carlos', 'Enriquez', countries[0], 600000, categories[1], callback);
        },
        function(callback) {
          warrantyCreate('Luis Mario', 'Contreras', countries[0], 3000000, categories[1], callback);
        },
        function(callback) {
          warrantyCreate('Armando', 'Dominguez', countries[0], 300000, categories[1], callback);
        },
        function(callback) {
          warrantyCreate('Juan Manuel', 'Asturias', countries[0], 2400000, categories[1], callback);
        },
        function(callback) {
          warrantyCreate('Jorge', 'Pavia', countries[0], 1000000, categories[1], callback);
        },
        function(callback) {
          warrantyCreate('Irvin', 'Gonzalez', countries[0], 2100000, categories[1], callback);
        }
        ],
        // optional callback
        cb);
}

async.series([
    createCountries,
    createWarrantyCategories,
    createWarranties,
    createBusinesses
],
// Optional callback
function(err, results) {
    if (err) {
        console.log('FINAL ERR: '+ err );
    }
    else {
        console.log('Businesses: '+ businesses);    
    }
    // All done, disconnect from database
    mongoose.connection.close();
});



