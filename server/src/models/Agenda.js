const mongoose = require('mongoose');

const agendaSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Agenda title is required'],
        trim: true,
        maxlength: [200, 'Title cannot exceed 200 characters']
    },
    description: {
        type: String,
        maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    meeting: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Meeting',
        required: true
    },
    order: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['open', 'in-progress', 'completed', 'cancelled'],
        default: 'open'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },
    responsiblePerson: {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        assignedAt: {
            type: Date,
            default: Date.now
        },
        assignedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    },
    estimatedDuration: {
        type: Number, // in minutes
        min: [1, 'Duration must be at least 1 minute'],
        max: [240, 'Duration cannot exceed 4 hours']
    },
    actualDuration: {
        type: Number, // in minutes
        min: [0, 'Duration cannot be negative']
    },
    tags: [{
        type: String,
        trim: true,
        maxlength: [50, 'Tag cannot exceed 50 characters']
    }],
    attachments: [{
        name: String,
        url: String,
        uploadedAt: {
            type: Date,
            default: Date.now
        },
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    }],
    notes: {
        type: String,
        maxlength: [2000, 'Notes cannot exceed 2000 characters']
    },
    decision: {
        type: String,
        maxlength: [1000, 'Decision cannot exceed 1000 characters']
    },
    actionItems: [{
        description: {
            type: String,
            required: true,
            maxlength: [500, 'Action item description cannot exceed 500 characters']
        },
        assignedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        dueDate: {
            type: Date,
            required: true
        },
        status: {
            type: String,
            enum: ['pending', 'in-progress', 'completed', 'overdue'],
            default: 'pending'
        },
        createdAt: {
            type: Date,
            default: Date.now
        },
        completedAt: Date
    }],
    carriedForwardFrom: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Agenda'
    },
    carriedForwardTo: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Agenda'
    }],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Indexes for better performance
agendaSchema.index({ meeting: 1, order: 1 });
agendaSchema.index({ 'responsiblePerson.user': 1 });
agendaSchema.index({ status: 1, meeting: 1 });
agendaSchema.index({ priority: 1, meeting: 1 });
agendaSchema.index({ carriedForwardFrom: 1 });
agendaSchema.index({ 'actionItems.assignedTo': 1 });

// Virtual for completion status
agendaSchema.virtual('isCompleted').get(function() {
    return this.status === 'completed';
});

// Virtual for has responsible person
agendaSchema.virtual('hasResponsiblePerson').get(function() {
    return this.responsiblePerson && this.responsiblePerson.user;
});

// Virtual for pending action items count
agendaSchema.virtual('pendingActionItems').get(function() {
    return this.actionItems.filter(item => item.status !== 'completed').length;
});

// Virtual for overdue action items count
agendaSchema.virtual('overdueActionItems').get(function() {
    const now = new Date();
    return this.actionItems.filter(item => 
        item.status !== 'completed' && item.dueDate < now
    ).length;
});

// Method to assign responsible person
agendaSchema.methods.assignResponsiblePerson = function(userId, assignedBy) {
    this.responsiblePerson = {
        user: userId,
        assignedAt: new Date(),
        assignedBy: assignedBy
    };
    return this.save();
};

// Method to add action item
agendaSchema.methods.addActionItem = function(description, assignedTo, dueDate) {
    this.actionItems.push({
        description,
        assignedTo,
        dueDate: new Date(dueDate),
        status: 'pending',
        createdAt: new Date()
    });
    return this.save();
};

// Method to update action item status
agendaSchema.methods.updateActionItemStatus = function(actionItemId, status) {
    const actionItem = this.actionItems.id(actionItemId);
    if (!actionItem) {
        throw new Error('Action item not found');
    }
    
    actionItem.status = status;
    if (status === 'completed') {
        actionItem.completedAt = new Date();
    }
    
    return this.save();
};

// Method to mark as completed
agendaSchema.methods.markAsCompleted = function(updatedBy) {
    this.status = 'completed';
    this.updatedBy = updatedBy;
    
    // Mark all pending action items as completed
    this.actionItems.forEach(item => {
        if (item.status === 'pending' || item.status === 'in-progress') {
            item.status = 'completed';
            item.completedAt = new Date();
        }
    });
    
    return this.save();
};

// Method to carry forward to next meeting
agendaSchema.methods.carryForward = function(newMeetingId) {
    const newAgenda = new this.constructor({
        title: this.title,
        description: this.description,
        meeting: newMeetingId,
        status: 'open',
        priority: this.priority,
        responsiblePerson: this.responsiblePerson,
        estimatedDuration: this.estimatedDuration,
        tags: this.tags,
        notes: this.notes,
        carriedForwardFrom: this._id,
        createdBy: this.createdBy
    });
    
    // Add reference to this agenda
    this.carriedForwardTo.push(newAgenda._id);
    
    return Promise.all([newAgenda.save(), this.save()]);
};

// Pre-save middleware to update order
agendaSchema.pre('save', async function() {
    if (this.isNew && !this.order) {
        const lastAgenda = await this.constructor
            .findOne({ meeting: this.meeting })
            .sort({ order: -1 });
        
        this.order = lastAgenda ? lastAgenda.order + 1 : 1;
    }
});

module.exports = mongoose.model('Agenda', agendaSchema);
