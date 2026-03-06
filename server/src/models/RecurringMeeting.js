const mongoose = require('mongoose');

const recurringMeetingSchema = new mongoose.Schema({
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
    host: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    team: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team'
    },
    recurrence: {
        type: {
            type: String,
            enum: ['daily', 'weekly', 'bi-weekly', 'monthly', 'custom'],
            required: true
        },
        interval: {
            type: Number,
            default: 1, // Every 1 week/month/etc.
            min: [1, 'Interval must be at least 1']
        },
        dayOfWeek: {
            type: Number, // 0-6 (Sunday-Saturday)
            min: [0, 'Day must be between 0 and 6'],
            max: [6, 'Day must be between 0 and 6']
        },
        dayOfMonth: {
            type: Number, // 1-31
            min: [1, 'Day must be between 1 and 31'],
            max: [31, 'Day must be between 1 and 31']
        },
        endDate: {
            type: Date,
            validate: {
                validator: function(value) {
                    return !value || value > new Date();
                },
                message: 'End date must be in the future'
            }
        },
        maxOccurrences: {
            type: Number,
            min: [1, 'Max occurrences must be at least 1']
        }
    },
    meetingSettings: {
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
        defaultParticipants: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }],
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
    nextMeetingDate: {
        type: Date,
        required: true
    },
    lastMeetingDate: {
        type: Date
    },
    isActive: {
        type: Boolean,
        default: true
    },
    followUpMeetings: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Meeting'
    }],
    statistics: {
        totalMeetings: {
            type: Number,
            default: 0
        },
        completedMeetings: {
            type: Number,
            default: 0
        },
        cancelledMeetings: {
            type: Number,
            default: 0
        },
        averageAttendance: {
            type: Number,
            default: 0
        }
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

// Indexes for better performance
recurringMeetingSchema.index({ host: 1, isActive: 1 });
recurringMeetingSchema.index({ team: 1, isActive: 1 });
recurringMeetingSchema.index({ nextMeetingDate: 1 });
recurringMeetingSchema.index({ 'recurrence.endDate': 1 });

// Virtual for next meeting formatted date
recurringMeetingSchema.virtual('formattedNextMeeting').get(function() {
    return this.nextMeetingDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
});

// Virtual for recurrence pattern description
recurringMeetingSchema.virtual('recurrencePattern').get(function() {
    const { type, interval, dayOfWeek, dayOfMonth } = this.recurrence;
    
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    switch (type) {
        case 'daily':
            return interval === 1 ? 'Daily' : `Every ${interval} days`;
        case 'weekly':
            if (interval === 1 && dayOfWeek !== undefined) {
                return `Weekly on ${dayNames[dayOfWeek]}`;
            }
            return interval === 1 ? 'Weekly' : `Every ${interval} weeks`;
        case 'bi-weekly':
            return 'Bi-weekly';
        case 'monthly':
            if (dayOfMonth) {
                return `Monthly on day ${dayOfMonth}`;
            }
            return 'Monthly';
        case 'custom':
            return 'Custom pattern';
        default:
            return 'Unknown';
    }
});

// Method to calculate next meeting date
recurringMeetingSchema.methods.calculateNextMeetingDate = function() {
    const now = new Date();
    const current = new Date(this.nextMeetingDate);
    const { type, interval, dayOfWeek, dayOfMonth, endDate, maxOccurrences } = this.recurrence;
    
    // Check if we've reached the end conditions
    if (endDate && current > endDate) {
        this.isActive = false;
        return null;
    }
    
    if (maxOccurrences && this.statistics.totalMeetings >= maxOccurrences) {
        this.isActive = false;
        return null;
    }
    
    let nextDate = new Date(current);
    
    switch (type) {
        case 'daily':
            nextDate.setDate(nextDate.getDate() + interval);
            break;
            
        case 'weekly':
            nextDate.setDate(nextDate.getDate() + (7 * interval));
            if (dayOfWeek !== undefined) {
                // Adjust to the specified day of week
                while (nextDate.getDay() !== dayOfWeek) {
                    nextDate.setDate(nextDate.getDate() + 1);
                }
            }
            break;
            
        case 'bi-weekly':
            nextDate.setDate(nextDate.getDate() + 14);
            break;
            
        case 'monthly':
            nextDate.setMonth(nextDate.getMonth() + interval);
            if (dayOfMonth) {
                nextDate.setDate(Math.min(dayOfMonth, new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate()));
            }
            break;
            
        default:
            // Default to weekly
            nextDate.setDate(nextDate.getDate() + 7);
    }
    
    return nextDate;
};

// Method to create next follow-up meeting
recurringMeetingSchema.methods.createNextMeeting = function() {
    const Meeting = mongoose.model('Meeting');
    const nextDate = this.calculateNextMeetingDate();
    
    if (!nextDate) {
        this.isActive = false;
        return this.save();
    }
    
    const meetingData = {
        title: this.title,
        description: this.description,
        scheduledFor: nextDate,
        duration: this.meetingSettings.duration,
        location: this.meetingSettings.location,
        host: this.host,
        team: this.team,
        meetingType: 'followup',
        parentMeeting: this._id,
        settings: {
            autoCarryForward: this.meetingSettings.autoCarryForward,
            sendReminders: this.meetingSettings.sendReminders,
            reminderTime: this.meetingSettings.reminderTime
        }
    };
    
    // Add default participants
    if (this.meetingSettings.defaultParticipants.length > 0) {
        meetingData.participants = this.meetingSettings.defaultParticipants.map(userId => ({
            user: userId,
            status: 'invited',
            invitedAt: new Date()
        }));
    }
    
    return Meeting.create(meetingData)
        .then(meeting => {
            this.followUpMeetings.push(meeting._id);
            this.lastMeetingDate = this.nextMeetingDate;
            this.nextMeetingDate = nextDate;
            this.statistics.totalMeetings++;
            
            return this.save();
        });
};

// Method to get upcoming meetings
recurringMeetingSchema.methods.getUpcomingMeetings = function(count = 5) {
    const Meeting = mongoose.model('Meeting');
    return Meeting.find({
        parentMeeting: this._id,
        scheduledFor: { $gte: new Date() },
        status: { $ne: 'cancelled' }
    })
    .sort({ scheduledFor: 1 })
    .limit(count)
    .populate('host', 'name email')
    .populate('participants.user', 'name email');
};

// Method to get meeting statistics
recurringMeetingSchema.methods.updateStatistics = async function() {
    const Meeting = mongoose.model('Meeting');
    
    const meetings = await Meeting.find({ parentMeeting: this._id });
    
    this.statistics.totalMeetings = meetings.length;
    this.statistics.completedMeetings = meetings.filter(m => m.status === 'completed').length;
    this.statistics.cancelledMeetings = meetings.filter(m => m.status === 'cancelled').length;
    
    // Calculate average attendance
    const totalAttendance = meetings.reduce((sum, meeting) => {
        return sum + meeting.participants.filter(p => p.status === 'attended').length;
    }, 0);
    
    this.statistics.averageAttendance = meetings.length > 0 ? totalAttendance / meetings.length : 0;
    
    return this.save();
};

module.exports = mongoose.model('RecurringMeeting', recurringMeetingSchema);
