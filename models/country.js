const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const CountrySchema = new Schema({
  country_name: { type: String, required: true, maxLength: 100 , minLength: 3 },
  city_name: { type: String, required: true, maxLength: 100 , minLength: 3 }
});

// Virtual for country's URL
CountrySchema.virtual("url").get(function () {
  // We don't use an arrow function as we'll need the this object
  return `/catalog/country/${this._id}`;
});

// Export model
module.exports = mongoose.model("Country", CountrySchema);
