/**
 * MockModel.js
 * A simple utility to mimic Mongoose models for in-memory operation.
 */
const store = require('./mockStore');

class MockModel {
    constructor(collectionName, schema) {
        this.collectionName = collectionName;
        this.schema = schema;
    }

    // Helper to wrap raw objects with Mongoose-like instance methods
    _wrap(doc) {
        if (!doc) return null;
        if (Array.isArray(doc)) return doc.map(d => this._wrap(d));
        
        const self = this;
        return {
            ...doc,
            _id: doc._id || doc.id,
            id: doc._id || doc.id,
            save: async function() { 
                const data = store[self.collectionName] || [];
                const idx = data.findIndex(item => item._id === this._id);
                if (idx !== -1) data[idx] = { ...this };
                return this; 
            },
            populate: async function(path, select) {
                if (!path) return this;
                
                // Mongoose can pass an object { path: '...', select: '...' }
                let actualPath = typeof path === 'object' ? path.path : path;
                if (!actualPath || typeof actualPath !== 'string') return this;

                // Simplified mock population
                const paths = actualPath.split(' ');
                for (const p of paths) {
                    const [objPath, subField] = p.split('.');
                    if (Array.isArray(this[objPath])) {
                        for (let i = 0; i < this[objPath].length; i++) {
                            const subDoc = this[objPath][i];
                            const targetId = subField ? subDoc[subField] : subDoc;
                            if (targetId) {
                                // Direct lookup from store to avoid circular Dependency with models
                                const found = (store.users || []).find(u => (u._id || u.id) === targetId.toString());
                                if (found) {
                                    if (subField) subDoc[subField] = found;
                                    else this[objPath][i] = found;
                                }
                            }
                        }
                    } else if (this[objPath]) {
                        const targetId = this[objPath];
                        const found = (store.users || []).find(u => (u._id || u.id) === targetId.toString());
                        if (found) this[objPath] = found;
                    }
                }
                return this;
            },
            toObject: function() { return { ...this }; },
            getProfile: function() {
                const u = { ...this };
                delete u.password;
                return u;
            },
            comparePassword: async function(candidate) {
                const bcrypt = require('bcryptjs');
                if (!this.password || !this.password.startsWith('$2a$')) {
                    console.log(`🔐 Mock Auth Check FALLBACK (Unhashed): [${candidate}] vs [${this.password}]`);
                    return candidate === this.password;
                }
                const match = await bcrypt.compare(candidate, this.password);
                console.log(`🔐 Mock Auth Check: [${candidate}] vs [${this.password?.substring(0,10)}...] -> ${match}`);
                return match;
            },
            // Subdocument support for lists (id() method)
            id: function(subId) {
                if (Array.isArray(this)) return this.find(i => (i._id || i.id) === subId);
                for (let key in this) {
                    if (Array.isArray(this[key])) {
                        const found = this[key].find(i => (i._id || i.id) === subId);
                        if (found) return found;
                    }
                }
                return null;
            },
            // Team Methods
            isMember: function(userId) {
                return (this.members || []).some(m => (m.user?._id || m.user || '').toString() === userId.toString());
            },
            getUserRole: function(userId) {
                const m = (this.members || []).find(m => (m.user?._id || m.user || '').toString() === userId.toString());
                return m ? m.role : null;
            },
            addMember: async function(userId, role = 'member') {
                if (!this.members) this.members = [];
                this.members.push({ user: userId, role, joinedAt: new Date(), isActive: true });
                return this.save();
            },
            removeMember: async function(userId) {
                this.members = (this.members || []).filter(m => (m.user?._id || m.user || '').toString() !== userId.toString());
                return this.save();
            },
            updateParticipantStatus: async function(userId, status) {
                const p = (this.participants || []).find(m => (m.user?._id || m.user || '').toString() === userId.toString());
                if (p) p.status = status;
                return this.save();
            },
            calculateNextMeetingDate: function() {
                const d = new Date(this.nextMeetingDate || this.scheduledFor);
                d.setDate(d.getDate() + 7);
                return d;
            },
            createNextMeeting: async function() {
                const nextDate = this.calculateNextMeetingDate();
                const Meeting = require('../models/Meeting');
                const m = await Meeting.create({
                    title: this.title,
                    description: this.description,
                    host: this.host,
                    scheduledFor: nextDate,
                    status: 'scheduled'
                });
                this.nextMeetingDate = nextDate;
                return this.save();
            }
        };
    }

    _wrapSub(doc) {
        if (!doc) return null;
        if (Array.isArray(doc)) {
            const arr = doc.map(d => this._wrapSub(d));
            arr.id = function(id) { return arr.find(item => (item._id || item.id) === id); };
            return arr;
        }
        return doc;
    }

    _query(promises) {
        let populationPaths = [];
        const query = {
            then: (resolve, reject) => promises.then(async res => {
                const wrapped = this._wrap(res);
                if (wrapped && populationPaths.length) {
                    if (Array.isArray(wrapped)) {
                        for (const doc of wrapped) {
                            for (const p of populationPaths) await doc.populate(p.path, p.select);
                        }
                    } else {
                        for (const p of populationPaths) await wrapped.populate(p.path, p.select);
                    }
                }
                resolve(wrapped);
            }, reject),
            select: () => query,
            sort: () => query,
            limit: () => query,
            skip: () => query,
            populate: (path, select) => {
                populationPaths.push({ path, select });
                return query;
            },
            exec: () => query.then(res => res)
        };
        return query;
    }

    // Advanced mocker for MongoDB query filtering
    _match(item, query) {
        if (!query || Object.keys(query).length === 0) return true;
        
        for (let key in query) {
            if (key === '$or') {
                const subQueries = query[key];
                const passedOr = subQueries.some(sq => this._match(item, sq));
                if (!passedOr) return false;
            } else {
                const val = query[key];
                
                // Handling operators like $in or $gte
                if (val && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
                    if (val.$in) {
                        const itemVal = item[key];
                        if (!val.$in.includes(itemVal)) return false;
                    }
                    if (val.$gte) {
                        if (new Date(item[key]) < new Date(val.$gte)) return false;
                    }
                } else {
                    // Handling Nested Object Paths (dot notation)
                    let itemVal = item;
                    if (key.includes('.')) {
                        const parts = key.split('.');
                        for (let p of parts) {
                            if (itemVal === undefined || itemVal === null) break;
                            if (Array.isArray(itemVal)) {
                                itemVal = itemVal.map(i => i[p]);
                            } else {
                                itemVal = itemVal[p];
                            }
                        }
                        if (Array.isArray(itemVal)) {
                            // Match if ANY element in the array matches the value
                            const matches = itemVal.some(i => (i?._id || i?.id || i || '').toString() === (val?._id || val?.id || val || '').toString());
                            if (!matches) return false;
                            continue;
                        }
                    } else {
                        itemVal = item[key];
                    }
                    
                    // Direct Equality Check
                    const strItemVal = (itemVal?._id || itemVal?.id || itemVal || '').toString();
                    const strQueryVal = (val?._id || val?.id || val || '').toString();
                    if (strItemVal !== strQueryVal) return false;
                }
            }
        }
        return true;
    }

    find(query = {}) {
        const data = store[this.collectionName] || [];
        const promise = Promise.resolve(data.filter(item => this._match(item, query)));
        return this._query(promise);
    }

    findOne(query = {}) {
        const data = store[this.collectionName] || [];
        const promise = Promise.resolve(data.find(item => this._match(item, query)) || null);
        return this._query(promise);
    }

    findById(id) {
        const data = store[this.collectionName] || [];
        const promise = Promise.resolve(data.find(item => item._id === id || item.id === id) || null);
        return this._query(promise);
    }

    async create(doc) {
        if (!store[this.collectionName]) store[this.collectionName] = [];
        const newDoc = { 
            _id: Math.random().toString(36).substr(2, 9),
            ...doc,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        store[this.collectionName].push(newDoc);
        return this._wrap(newDoc);
    }

    async insertMany(docs) {
        if (!store[this.collectionName]) store[this.collectionName] = [];
        const newDocs = docs.map(d => ({
            _id: Math.random().toString(36).substr(2, 9),
            ...d,
            createdAt: new Date(),
            updatedAt: new Date()
        }));
        store[this.collectionName].push(...newDocs);
        return this._wrap(newDocs);
    }

    async countDocuments(query = {}) {
        const res = await this.find(query);
        return res.length;
    }

    async findByIdAndUpdate(id, update, options = {}) {
        if (!store[this.collectionName]) return null;
        const index = store[this.collectionName].findIndex(item => item._id === id || item.id === id);
        if (index === -1) return null;
        store[this.collectionName][index] = { ...store[this.collectionName][index], ...update, updatedAt: new Date() };
        return this._wrap(store[this.collectionName][index]);
    }

    async findByIdAndDelete(id) {
        if (!store[this.collectionName]) return null;
        const index = store[this.collectionName].findIndex(item => item._id === id || item.id === id);
        if (index === -1) return null;
        const deleted = store[this.collectionName].splice(index, 1);
        return this._wrap(deleted[0]);
    }
}

module.exports = MockModel;
