const mongoose = require("mongoose");

const AdminSessionSchema = new mongoose.Schema({
  session_id: { type: String, unique: true, required: true }, 
  session_name: { type: String, required: true },
  password: { type: String, required: true }, // Store hashed passwords
  open: { type: Boolean, default: true }, // Determines if session is active
  admin_id: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", required: true }, 
  personas: [
    new mongoose.Schema(
      {
        name: String,
        persona_id: { type: mongoose.Schema.Types.ObjectId, ref: "Persona", required: true },
        active: Boolean,
        properties: {
          open: Boolean,
          Reserved: Boolean,
          Receptive: Boolean,
          Needs_Persuasion: Boolean,
        },
      },
      { _id: false } // <-- This prevents MongoDB from creating an `_id` for each persona entry
    ),
  ],
  created_at: { type: Date, default: Date.now },
}, { collection: 'admin_sessions', strict: false });

module.exports = mongoose.model("AdminSession", AdminSessionSchema);
