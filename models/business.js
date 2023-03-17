const mongoose = require("mongoose");
const Schema = mongoose.Schema; 

const BusinessSchema = new Schema({
  first_name: { type: String, required: true, maxLength: 100 },
  last_name: { type: String, required: true, maxLength: 100 },
  date_of_birth: { type: Date, required: true },
  date_of_death: { type: Date },
  country_of_investment: { type:  Schema.Types.ObjectId, ref: "Country", required: true},
  amount_invested: { type: Number,  required:true },
  warranty: { type:  Schema.Types.ObjectId, ref: "Warranty", required: true},
  interest_rate: { type: Number, required: true}
});

// Virtual for business's full name
BusinessSchema.virtual("name").get(function () {
  // To avoid errors in cases where an business does not have either a family name or first name
  // We want to make sure we handle the exception by returning an empty string for that case
  let fullname = "";
  if (this.first_name && this.last_name) {
    fullname = `${this.last_name}, ${this.first_name}`;
  }
  if (!this.first_name || !this.last_name) {
    fullname = "";
  }
  return fullname;
});

// Virtual for business's URL
BusinessSchema.virtual("url").get(function () {
  // We don't use an arrow function as we'll need the this object
  return `/catalog/business/${this._id}`;
});

// Export model
module.exports = mongoose.model("Business", BusinessSchema);