const mongoose = require("mongoose");
const Schema = mongoose.Schema; 

const WarrantySchema = new Schema({
  first_name_owner: { type: String, required: true, maxLength: 100 },
  family_name_owner: { type: String, required: true, maxLength: 100 },
  country: { type: Schema.Types.ObjectId, ref: "Country", required: true },
  valuation: { type: Number, required: true },
  category: { type: Schema.Types.ObjectId, ref: "Category", required: true }
});

// Virtual for warranty's full name
WarrantySchema.virtual("name").get(function () {
  // To avoid errors in cases where a warranty does not have either a family name or first name
  // We want to make sure we handle the exception by returning an empty string for that case
  let fullname = "";
  if (this.first_name_owner && this.family_name_owner) {
    fullname = `${this.family_name_owner}, ${this.first_name_owner}`;
  }
  if (!this.first_name_owner || !this.family_name_owner) {
    fullname = "";
  }
  return fullname;
});

// Virtual for warranty's URL
WarrantySchema.virtual("url").get(function () {
  // We don't use an arrow function as we'll need the this object
  return `/catalog/warranty/${this._id}`;
});

// Export model
module.exports = mongoose.model("Warranty", WarrantySchema);