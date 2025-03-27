const mongoose = require("mongoose");

const PersonaSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    baseline: {
      type: Object, // Allow any structure for `baseline`
      default: {},
    },
    // before_test: { type: [String] },
    // after_test: { type: [String] },
    behavior_variations: {
      information_sharing: {
        open: { type: [String] },
        reserved: { type: [String] },
      },
      response_to_recommendations: {
        receptive: { type: [String] },
        needs_persuasion: { type: [String] },
      },
    },
    password_results: { type: String },
  },
  { collection: "personas", strict: false }
); // Disable strict mode globally for this schema

const Persona = mongoose.model("Persona", PersonaSchema);

module.exports = Persona;
