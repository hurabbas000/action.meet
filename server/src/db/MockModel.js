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
        if (Array.isArray(doc)) {
            const arr = doc.map(d => this._wrap(d));
            arr.id = function(id) { return arr.find(item => (item._id || item.id) === id); };
            return arr;
        }
        
        const self = this;
        const wrapped = {
            ...doc,
            _id: doc._id || doc.id,
            id: doc._id || doc.id,
            save: async function() { 
                const data = store[self.collectionName] || [];
                const idx = data.findIndex(item => item._id === this._id);
                if (idx !== -1) {
                    const savedState = { ...this };
                    // Methods are lost in store save, that's intended for the JSON store
                    delete savedState.save;
                    delete savedState.populate;
                    delete savedState.toObject;
                    delete savedState.getProfile;
                    delete savedState.comparePassword;
                    delete savedState.id;
                    delete savedState.isMember;
                    delete savedState.getUserRole;
                    delete savedState.addMember;
                    delete savedState.removeMember;
                    delete savedState.updateParticipantStatus;
                    delete savedState.calculateNextMeetingDate;
                    delete savedState.createNextMeeting;

                    store[self.collectionName][idx] = savedState;
                }
                return this; 
            },
            populate: async function(path, select) {
                if (!path) return this;
                
                let paths = [];
                if (typeof path === 'string') {
                    paths = path.split(' ').map(p => ({ path: p.trim() }));
                } else if (Array.isArray(path)) {
                    paths = path;
                } else if (typeof path === 'object') {
                    paths = [path];
                }

                for (const p of paths) {
                    const actualPath = p.path;
                    const [objPath, subField] = actualPath.split('.');
                    
                    // Determine which collection to look into
                    // This is a heuristic for the mock: check schema if available, otherwise guess
                    let targetCollection = 'users'; // Default
                    if (actualPath.toLowerCase().includes('team')) targetCollection = 'teams';
                    else if (actualPath.toLowerCase().includes('meeting')) targetCollection = 'meetings';
                    else if (actualPath.toLowerCase().includes('agenda')) targetCollection = 'agendas';

                    if (Array.isArray(this[objPath])) {
                        for (let i = 0; i < this[objPath].length; i++) {
                            const subDoc = this[objPath][i];
                            const targetId = subField ? (subDoc[subField]?._id || subDoc[subField]) : (subDoc?._id || subDoc);
                            if (targetId) {
                                const found = (store[targetCollection] || []).find(u => (u._id || u.id) === targetId.toString());
                                if (found) {
                                    if (subField) subDoc[subField] = { ...found };
                                    else this[objPath][i] = { ...found };
                                }
                            }
                        }
                    } else if (this[objPath]) {
                        const targetId = this[objPath]?._id || this[objPath];
                        if (targetId) {
                            const found = (store[targetCollection] || []).find(u => (u._id || u.id) === targetId.toString());
                            if (found) this[objPath] = { ...found };
                        }
                    }
                }
                return this;
            },
            toObject: function(options) { 
                const obj = { ...this };
                delete obj.save;
                delete obj.populate;
                delete obj.toObject;
                return obj; 
            },
            getProfile: function() {
                const u = this.toObject();
                delete u.password;
                return u;
            },
            comparePassword: async function(candidate) {
                const bcrypt = require('bcryptjs');
                if (!this.password || !this.password.startsWith('$2a$')) {
                    return candidate === this.password;
                }
                return await bcrypt.compare(candidate, this.password);
            },
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
            isMember: function(userId) {
                const uid = userId?._id || userId || '';
                return (this.members || []).some(m => (m.user?._id || m.user || '').toString() === uid.toString());
            },
            getUserRole: function(userId) {
                const uid = userId?._id || userId || '';
                const m = (this.members || []).find(m => (m.user?._id || m.user || '').toString() === uid.toString());
                return m ? m.role : null;
            },
            addMember: async function(userId, role = 'member') {
                if (!this.members) this.members = [];
                // Check if already a member
                const exists = this.members.find(m => (m.user?._id || m.user || '').toString() === (userId?._id || userId || '').toString());
                if (exists) {
                    if (exists.isActive === false) exists.isActive = true;
                    return this.save();
                }
                this.members.push({ user: userId, role, joinedAt: new Date(), isActive: true });
                return this.save();
            },
            removeMember: async function(userId) {
                const uid = (userId?._id || userId || '').toString();
                const m = (this.members || []).find(m => (m.user?._id || m.user || '').toString() === uid);
                if (m) m.isActive = false;
                return this.save();
            },
            // Agenda specific methods
            assignResponsiblePerson: async function(userId, assignedBy) {
                this.responsiblePerson = {
                    user: userId,
                    assignedAt: new Date(),
                    assignedBy: assignedBy
                };
                return this.save();
            },
            addActionItem: async function(description, assignedTo, dueDate) {
                if (!this.actionItems) this.actionItems = [];
                this.actionItems.push({
                    _id: Math.random().toString(36).substr(2, 9),
                    description,
                    assignedTo,
                    dueDate: new Date(dueDate),
                    status: 'pending',
                    createdAt: new Date()
                });
                return this.save();
            },
            updateActionItemStatus: async function(actionItemId, status) {
                const item = (this.actionItems || []).find(i => (i._id || i.id) === actionItemId);
                if (item) {
                    item.status = status;
                    if (status === 'completed') item.completedAt = new Date();
                }
                return this.save();
            },
            markAsCompleted: async function(updatedBy) {
                this.status = 'completed';
                this.updatedBy = updatedBy;
                (this.actionItems || []).forEach(item => {
                    if (item.status === 'pending' || item.status === 'in-progress') {
                        item.status = 'completed';
                        item.completedAt = new Date();
                    }
                });
                return this.save();
            }
        };

        // Add model specific methods
        if (this.collectionName === 'meetings') {
            wrapped.addParticipant = async function(userId) {
                if (!this.participants) this.participants = [];
                const uid = (userId?._id || userId || '').toString();
                const existing = this.participants.find(p => (p.user?._id || p.user || '').toString() === uid);
                if (existing) {
                    existing.status = 'invited';
                } else {
                    this.participants.push({ user: userId, status: 'invited', invitedAt: new Date() });
                }
                return this.save();
            };
            wrapped.updateParticipantStatus = async function(userId, status) {
                const uid = (userId?._id || userId || '').toString();
                const p = (this.participants || []).find(m => (m.user?._id || m.user || '').toString() === uid);
                if (p) p.status = status;
                return this.save();
            };
        }

        // Recurring Meeting specific
        if (this.collectionName === 'recurring_meetings') {
            wrapped.calculateNextMeetingDate = function() {
                const nextDate = new Date(this.nextMeetingDate || Date.now());
                const type = this.recurrence?.type || 'weekly';
                const interval = this.recurrence?.interval || 1;
                
                if (type === 'daily') nextDate.setDate(nextDate.getDate() + interval);
                else if (type === 'weekly') nextDate.setDate(nextDate.getDate() + (7 * interval));
                else if (type === 'bi-weekly') nextDate.setDate(nextDate.getDate() + (14 * interval));
                else if (type === 'monthly') nextDate.setMonth(nextDate.getMonth() + interval);
                else nextDate.setDate(nextDate.getDate() + 7);
                
                return nextDate;
            };

            wrapped.createNextMeeting = async function() {
                const nextDate = this.calculateNextMeetingDate();
                const Meeting = require('../models/Meeting');
                const meetingData = {
                    title: this.title,
                    description: this.description,
                    scheduledFor: this.nextMeetingDate,
                    duration: this.meetingSettings?.duration || 60,
                    host: this.host,
                    team: this.team,
                    meetingType: 'followup',
                    parentMeeting: this._id,
                    status: 'scheduled',
                    participants: (this.meetingSettings?.defaultParticipants || []).map(u => ({
                        user: u,
                        status: 'invited'
                    }))
                };
                
                const meeting = await Meeting.create(meetingData);
                this.lastMeetingDate = this.nextMeetingDate;
                this.nextMeetingDate = nextDate;
                if (!this.statistics) this.statistics = { totalMeetings: 0 };
                this.statistics.totalMeetings++;
                
                await this.save();
                return meeting;
            };

            wrapped.getUpcomingMeetings = async function(count = 5) {
                const Meeting = require('../models/Meeting');
                return Meeting.find({
                    parentMeeting: this._id,
                    scheduledFor: { $gte: new Date() },
                    status: { $ne: 'cancelled' }
                }).limit(count);
            };

            wrapped.updateStatistics = async function() {
                const Meeting = require('../models/Meeting');
                const meetings = await Meeting.find({ parentMeeting: this._id });
                if (!this.statistics) this.statistics = {};
                this.statistics.totalMeetings = meetings.length;
                this.statistics.completedMeetings = meetings.filter(m => m.status === 'completed').length;
                return this.save();
            };
        }

        return wrapped;
    }

    _query(promises) {
        const populationPaths = [];
        const query = {
            then: (resolve, reject) => {
                return promises.then(async res => {
                    if (!res) {
                        if (resolve) resolve(null);
                        return null;
                    }
                    const wrapped = this._wrap(res);
                    if (wrapped && populationPaths.length) {
                        const docs = Array.isArray(wrapped) ? wrapped : [wrapped];
                        for (const doc of docs) {
                            for (const p of populationPaths) {
                                await doc.populate(p.path, p.select);
                            }
                        }
                    }
                    if (resolve) resolve(wrapped);
                    return wrapped;
                }, reject);
            },
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

    _match(item, query) {
        if (!query || Object.keys(query).length === 0) return true;
        
        for (let key in query) {
            if (key === '$or') {
                const matched = query[key].some(sq => this._match(item, sq));
                if (!matched) return false;
            } else if (key === '$and') {
                if (!query[key].every(sq => this._match(item, sq))) return false;
            } else {
                const val = query[key];
                let itemVal = item;

                if (key === '_id' || key === 'id') {
                    const itemID = (item._id || item.id || '').toString();
                    const queryID = (val?._id || val?.id || val || '').toString();
                    if (itemID !== queryID) return false;
                    continue;
                }

                if (key.includes('.')) {
                    const parts = key.split('.');
                    for (let p of parts) {
                        if (itemVal === undefined || itemVal === null) break;
                        itemVal = Array.isArray(itemVal) ? itemVal.map(i => i[p]) : itemVal[p];
                    }
                    if (Array.isArray(itemVal)) {
                        const targetId = (val?._id || val?.id || val || '').toString();
                        if (!itemVal.some(i => (i?._id || i?.id || i || '').toString() === targetId)) {
                            return false;
                        }
                        continue;
                    }
                } else {
                    itemVal = item[key];
                }

                if (val && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
                    if (val.$in && !val.$in.map(v => v.toString()).includes((itemVal || '').toString())) return false;
                    if (val.$ne !== undefined) {
                        const neVal = (val.$ne?._id || val.$ne?.id || val.$ne);
                        if (neVal === null) {
                            if (itemVal === null || itemVal === undefined) return false;
                        } else if ((itemVal || '').toString() === neVal.toString()) {
                            return false;
                        }
                    }

                    if (val.$gte && new Date(itemVal) < new Date(val.$gte)) return false;
                    if (val.$lte && new Date(itemVal) > new Date(val.$lte)) return false;
                    if (val.$regex) {
                        const re = new RegExp(val.$regex, val.$options || '');
                        if (!re.test(itemVal)) return false;
                    }
                } else {
                    const strItemVal = (itemVal?._id || itemVal?.id || itemVal || '').toString();
                    const strQueryVal = (val?._id || val?.id || val || '').toString();
                    if (strItemVal !== strQueryVal) {
                        return false;
                    }
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
        if (!id) return this._query(Promise.resolve(null));
        const data = store[this.collectionName] || [];
        const sid = (id?._id || id || '').toString();
        const found = data.find(item => (item._id || item.id || '').toString() === sid);
        const promise = Promise.resolve(found || null);
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
        const data = store[this.collectionName] || [];
        return data.filter(item => this._match(item, query)).length;
    }

    async findByIdAndUpdate(id, update, options = {}) {
        if (!store[this.collectionName]) return null;
        const sid = (id?._id || id || '').toString();
        const index = store[this.collectionName].findIndex(item => (item._id || item.id) === sid);
        if (index === -1) return null;
        
        let current = store[this.collectionName][index];
        
        // Handle $set
        if (update.$set) {
            current = { ...current, ...update.$set };
        } else if (!update.$push && !update.$pull) {
            current = { ...current, ...update };
        }

        // Handle $push
        if (update.$push) {
            for (let key in update.$push) {
                if (!current[key]) current[key] = [];
                current[key].push(update.$push[key]);
            }
        }

        // Handle $pull
        if (update.$pull) {
            for (let key in update.$pull) {
                if (!current[key]) continue;
                const pullVal = update.$pull[key];
                const pullId = (pullVal?._id || pullVal?.id || pullVal || '').toString();
                current[key] = current[key].filter(item => (item?._id || item?.id || item || '').toString() !== pullId);
            }
        }

        current.updatedAt = new Date();
        store[this.collectionName][index] = current;
        return this._wrap(current);
    }

    async findByIdAndDelete(id) {
        if (!store[this.collectionName]) return null;
        const sid = (id?._id || id || '').toString();
        const index = store[this.collectionName].findIndex(item => (item._id || item.id) === sid);
        if (index === -1) return null;
        const deleted = store[this.collectionName].splice(index, 1);
        return this._wrap(deleted[0]);
    }
}

module.exports = MockModel;


module.exports = MockModel;
