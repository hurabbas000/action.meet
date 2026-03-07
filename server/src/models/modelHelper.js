/**
 * modelHelper.js
 * Utility to switch between real Mongoose models and Mock models.
 */
const mongoose = require('mongoose');
const MockModel = require('../db/MockModel');

const createModel = (name, schema, collectionName) => {
    // If MOCK_DATABASE is true, return a MockModel instead of Mongoose model
    if (global.MOCK_DATABASE) {
        console.log(`🛠️ Mode: MOCK - Initializing mock for [${name}]`);
        return new MockModel(collectionName || name.toLowerCase() + 's', schema);
    }
    return mongoose.model(name, schema);
};

module.exports = { createModel };
