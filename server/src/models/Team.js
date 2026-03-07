const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Team name is required'],
        trim: true,
        maxlength: [100, 'Team name cannot exceed 100 characters']
    },
    description: {
        type: String,
        maxlength: [500, 'Description cannot exceed 500 characters']
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    members: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        role: {
            type: String,
            enum: ['admin', 'member', 'viewer'],
            default: 'member'
        },
        joinedAt: {
            type: Date,
            default: Date.now
        },
        isActive: {
            type: Boolean,
            default: true
        }
    }],
    isActive: {
        type: Boolean,
        default: true
    },
    settings: {
        allowMemberInvite: {
            type: Boolean,
            default: false
        },
        defaultMeetingDuration: {
            type: Number,
            default: 60 // minutes
        },
        timezone: {
            type: String,
            default: 'UTC'
        }
    }
}, {
    timestamps: true
});

// Index for faster queries
teamSchema.index({ createdBy: 1 });
teamSchema.index({ 'members.user': 1 });

// Method to check if user is member
teamSchema.methods.isMember = function(userId) {
    return this.members.some(member => 
        member.user.toString() === userId.toString() && member.isActive
    );
};

// Method to get user role in team
teamSchema.methods.getUserRole = function(userId) {
    const member = this.members.find(member => 
        member.user.toString() === userId.toString() && member.isActive
    );
    return member ? member.role : null;
};

// Method to add member
teamSchema.methods.addMember = function(userId, role = 'member') {
    // Check if user is already a member
    if (this.isMember(userId)) {
        throw new Error('User is already a team member');
    }
    
    this.members.push({
        user: userId,
        role: role,
        joinedAt: new Date(),
        isActive: true
    });
    
    return this.save();
};

// Method to remove member
teamSchema.methods.removeMember = function(userId) {
    const memberIndex = this.members.findIndex(member => 
        member.user.toString() === userId.toString()
    );
    
    if (memberIndex === -1) {
        throw new Error('User is not a team member');
    }
    
    this.members[memberIndex].isActive = false;
    return this.save();
};

const { createModel } = require('./modelHelper');
module.exports = createModel('Team', teamSchema, 'teams');
