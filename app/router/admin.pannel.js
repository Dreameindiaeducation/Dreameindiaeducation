const express = require('express');
const router = express.Router();
const Form = require('../model/from'); // Import Form Model 
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

// Fetch all forms
const PAGE_SIZE = 10; // Number of forms per page

router.get('/forms', async (req, res) => {
    try {
        let page = parseInt(req.query.page) || 1; // Get page number from query params
        let skip = (page - 1) * PAGE_SIZE; // Calculate how many documents to skip
        
        const totalForms = await Form.countDocuments(); // Count total number of forms
        const totalPages = Math.ceil(totalForms / PAGE_SIZE); // Calculate total pages

        const forms = await Form.find().skip(skip).limit(PAGE_SIZE);

        res.render('admindashboard', { 
            message: req.session.message,
            forms,
            currentPage: page,
            totalPages
        });

        req.session.message = null; // Clear session message

    } catch (error) {
        console.error(error);
        req.session.message = { type: 'danger', text: 'Error fetching forms' };
        res.redirect('/admin/forms');
    }
});
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.ADMIN_EMAIL, // Using environment variables
        pass: process.env.ADMIN_PASSWORD // Your app password (not your actual password)
    }
});

router.post('/forms/update-status/:id', async (req, res) => {
    try {
        const { status } = req.body;
        if (!['Pending', 'Approved', 'Rejected'].includes(status)) {
            req.session.message = { type: 'danger', text: 'Invalid status' };
            return res.redirect('/admin/forms');
        }

        const updatedForm = await Form.findByIdAndUpdate(
            req.params.id, 
            { status }, 
            { new: true }
        );

        if (!updatedForm) {
            req.session.message = { type: 'danger', text: 'Form not found' };
            return res.redirect('/admin/forms');
        }

        // Send Email Notification
        const mailOptions = {
            from: '"NGO Support" <support@ngo.com>',
            to: `${updatedForm.email}, ${process.env.ADMIN_EMAIL}`, // Send to user and admin
            subject: `Status Update: ${status}`,
            html: `
                <div style="font-family: Arial, sans-serif; border: 1px solid #ddd; border-radius: 10px; padding: 20px; max-width: 600px;">
                    <h2 style="text-align: center; color: #4CAF50;">NGO Form Status Update</h2>
                    <p>Dear <strong>${updatedForm.name}</strong>,</p>
                    <p>Your form status has been updated to: <strong style="color: ${status === 'Approved' ? 'green' : status === 'Rejected' ? 'red' : 'orange'};">${status}</strong></p>
                    <p><strong>Details:</strong></p>
                    <ul>
                        <li>Email: ${updatedForm.email}</li>
                        <li>Mobile: ${updatedForm.mobileNo}</li>
                        <li>Amount: ₹${updatedForm.amount}</li>
                    </ul>
                    <p>Thank you for your patience.</p>
                    <hr>
                    <p style="text-align: center;">NGO Support Team</p>
                </div>
            `
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error("Error sending email:", error);
            } else {
                console.log("Email sent:", info.response);
            }
        });

        // Set success message
        req.session.message = { type: 'success', text: 'Status updated successfully and email sent' };
        res.redirect('/admin/forms');

    } catch (error) {
        console.error(error);
        req.session.message = { type: 'danger', text: 'Error updating status' };
        res.redirect('/admin/forms');
    }
});
router.get('/forms/delete/:id',async (req, res) => {
    try {
        const { id } = req.params;

        // Find the form by ID
        const form = await Form.findById(id);
        if (!form) {
            req.session.message = { type: 'danger', text: 'Form not found' };
            return res.redirect('/admin/forms');
        }

        // Helper function to delete images
        const deleteImages = (imagePaths) => {
            if (imagePaths && imagePaths.length > 0) {
                imagePaths.forEach(filePath => {
                    // Correct the file path to the actual uploads folder
                    const fullPath = path.join(__dirname, '../../uploads', path.basename(filePath));
        
                    // Check if file exists before deleting
                    if (fs.existsSync(fullPath)) {
                        fs.unlink(fullPath, (err) => {
                            if (err) {
                                console.error(`Failed to delete file: ${fullPath}`, err);
                            } else {
                                console.log(`Successfully deleted: ${fullPath}`);
                            }
                        });
                    } else {
                        console.warn(`File not found: ${fullPath}`);
                    }
                });
            }
        };
        // Delete Aadhar and Student photos
        deleteImages(form.documents?.aadharPhotos);
        deleteImages(form.documents?.studentPhotos);

        // Delete the form from the database
        await Form.findByIdAndDelete(id);

        req.session.message = { type: 'success', text: 'Form deleted successfully' };
        res.redirect('/admin/forms'); // Redirect to the appropriate page
    } catch (error) {
        console.error(error);
        req.session.message = { type: 'danger', text: 'Error deleting form' };
        res.redirect('/admin/forms');
    }
});

module.exports = router;
