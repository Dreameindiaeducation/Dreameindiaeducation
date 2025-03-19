const mongoose = require('mongoose');

const formSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    fatherName: { type: String, required: true },
    mobileNo: { type: String, required: true, match: /^[0-9]{10}$/ , unique: true}, // Ensures 10-digit number
    date: { type: Date, required: true },
    
    address: {
        district: { type: String, required: true },
        state: { type: String, required: true },
        pincode: { type: String, required: true, match: /^[0-9]{6}$/ } // Ensures 6-digit PIN
    },

    occupation: { type: String, required: true },
    aadharNo: { type: String, required: true, match: /^[0-9]{12}$/, unique: true }, // Ensures 12-digit Aadhar
    
    schoolDetails: {
        name: { type: String, required: true },
        contactNo: { type: String, required: true, match: /^[0-9]{10}$/ }, 
        address: {
            district: { type: String, required: true },
            state: { type: String, required: true },
            pincode: { type: String, required: true, match: /^[0-9]{6}$/ }
        }
    },
    amount: { type: Number, required: true },

    documents: {
        aadharPhotos: { type: [String], required: true, validate: v => v.length >= 1 && v.length <= 2 },
        studentPhotos: { type: [String], required: true, validate: v => v.length >= 1 && v.length <= 2 }
    },
    status: { 
        type: String, 
        enum: ['Pending', 'Approved', 'Rejected'], 
        default: 'Pending' 
    }

}, { timestamps: true });

const Form = mongoose.model('Form', formSchema);
module.exports = Form;
