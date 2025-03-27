const mongoose = require("mongoose");

const AdminSchema = new mongoose.Schema({
    _id: { type: mongoose.Schema.Types.ObjectId, required: true }, // ✅ Change String to ObjectId
    user_id: { type: String, required: true },
    password: { type: String, required: true },
    created_at: { type: Date, default: Date.now },
}, { collection: 'admins', strict: false }); // Explicitly set the collection name

module.exports = mongoose.model("Admin", AdminSchema);
