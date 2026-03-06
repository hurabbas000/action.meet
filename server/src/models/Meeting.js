const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Meeting title is required'],
        trim: true,
        maxlength: [200, 'Title cannot exceed 200 characters']
    },
    description: {
        type: String,
        maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    scheduledFor: {
        type: Date,
        required: [true, 'Meeting date is required']
    },
    duration: {
        type: Number,
        default: 60, // minutes
        min: [15, 'Meeting must be at least 15 minutes'],
        max: [480, 'Meeting cannot exceed 8 hours']
    },
    location: {
        type: String,
        maxlength: [200, 'Location cannot exceed 200 characters']
    },
    meetingType: {
        type: String,
        enum: ['regular', 'followup', 'recurring', 'adhoc'],
        default: 'regular'
    },
    status: {
        type: String,
        enum: ['scheduled', 'in-progress', 'completed', 'cancelled'],
        default: 'scheduled'
    },
    host: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    participants: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        status: {
            type: String,
            enum: ['invited', 'confirmed', 'declined', 'attended', 'absent'],
            default: 'invited'
        },
        invitedAt: {
            type: Date,
            default: Date.now
        }
    }],
    team: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team'
    },
    parentMeeting: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Meeting'
    },
    followUpMeetings: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Meeting'
    }],
    agenda: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Agenda'
    }],
    statistics: {
        totalAgendaItems: {
            type: Number,
            default: 0
        },
        completedAgendaItems: {
            type: Number,
            default: 0
        },
        openAgendaItems: {
            type: Number,
            default: 0
        },
        completionRate: {
            type: Number,
            default: 0
        }
    },
    settings: {
        autoCarryForward: {
            type: Boolean,
            default: true
        },
        sendReminders: {
            type: Boolean,
            default: true
        },
        reminderTime: {
            type: Number,
            default: 24 // hours before meeting
        }
    },
    notes: {
        type: String,
        maxlength: [2000, 'Notes cannot exceed 2000 characters']
    },
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
    }]
}, {
    timestamps: true
});

// Indexes for better performance
meetingSchema.index({ host: 1, scheduledFor: -1 });
meetingSchema.index({ 'participants.user': 1, scheduledFor: -1 });
meetingSchema.index({ team: 1, scheduledFor: -1 });
meetingSchema.index({ parentMeeting: 1 });
meetingSchema.index({ status: 1, scheduledFor: -1 });

// Virtual for meeting date formatting
meetingSchema.virtual('formattedDate').get(function() {
    return this.scheduledFor.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
});

// Virtual for meeting status based on date
meetingSchema.virtual('currentStatus').get(function() {
    const now = new Date();
    if (this.status === 'cancelled') return 'cancelled';
    if (this.status === 'completed') return 'completed';
    if (this.status === 'in-progress') return 'in-progress';
    
    if (this.scheduledFor > now) return 'upcoming';
    if (this.scheduledFor <= now) return 'overdue';
    
    return 'scheduled';
});

// Method to add participant
meetingSchema.methods.addParticipant = function(userId) {
    // Check if user is already a participant
    const existingParticipant = this.participants.find(p => 
        p.user.toString() === userId.toString()
    );
    
    if (existingParticipant) {
        existingParticipant.status = 'invited';
    } else {
        this.participants.push({
            user: userId,
            status: 'invited',
            invitedAt: new Date()
        });
    }
    
    return this.save();
};

// Method to update participant status
meetingSchema.methods.updateParticipantStatus = function(userId, status) {
    const participant = this.participants.find(p => 
        p.user.toString() === userId.toString()
    );
    
    if (!participant) {
        throw new Error('User is not a participant in this meeting');
    }
    
    participant.status = status;
    return this.save();
};

// Method to calculate completion rate
meetingSchema.methods.calculateCompletionRate = function() {
    const total = this.statistics.totalAgendaItems;
    const completed = this.statistics.completedAgendaItems;
    
    this.statistics.completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    this.statistics.openAgendaItems = total - completed;
    
    return this.save();
};

// Pre-save middleware to update statistics
meetingSchema.pre('save', function(next) {
    if (this.isModified('agenda')) {
        this.calculateCompletionRate();
    }
    next();
});

module.exports = mongoose.model('Meeting', meetingSchema);
