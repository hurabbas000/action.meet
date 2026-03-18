/**
 * modelHelper.js
 * Utility to switch between real Mongoose models and Mock models.
 */
const mongoose = require('mongoose');

/**
 * Helper to create a model that switches between Mongoose and MockModel
 * @param {string} modelName - Name of the model (e.g., 'User')
 * @param {mongoose.Schema} schema - Mongoose schema
 * @param {string} collectionName - Optional collection name for the mock store
 */
const createModel = (modelName, schema, collectionName) => {
    if (global.MOCK_DATABASE) {
        // Lazy load MockModel to avoid circular dependencies
        const MockModel = require('../db/MockModel');
        const cName = collectionName || modelName.toLowerCase() + 's';
        console.log(`🛠️ Role: MOCK - Initializing mock for [${modelName}] using collection [${cName}]`);
        return new MockModel(cName, schema);
    }
    
    return mongoose.model(modelName, schema);
};

module.exports = { createModel };
