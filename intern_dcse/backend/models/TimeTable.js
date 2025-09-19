const mongoose = require('mongoose');

const timeTableSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: false
    },
    panel: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Panel',
        required: true
    },
    team: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team',
        required: true
    },
    startTime: {
        type: Date,
        required: true
    },
    endTime: {
        type: Date,
        required: true
    },
    duration: {
        type: Number, // Duration in minutes
        required: true
    },
    slotType: {
        type: String,
        enum: ['review1', 'review2', 'review3', 'viva'],
        required: true
    },
    slotAssignedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true // The coordinator who assigned the slot
    },
    type: {
        type: String,
        enum: ['Team Review', 'Other'], // Can expand as needed
        required: true
    },
    status: {
        type: String,
        enum: ['scheduled', 'completed', 'cancelled'], // Changed from pending/approved/rejected
        default: 'scheduled'
    },
    isNotified: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('TimeTable', timeTableSchema); 