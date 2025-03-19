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
    host: "smtp.gmail.com",
    port: 587,
    secure: false, 
    auth: {
        user: process.env.ADMIN_EMAIL || "no-reply@yourdomain.com",
        pass: process.env.ADMIN_PASSWORD || "your_app_password",
    },
});

async function sendEmail(mailOptions, recipientType) {
    try {
        console.log(`Sending ${recipientType} Email to:`, mailOptions.to);
        const info = await transporter.sendMail(mailOptions);
        console.log(`${recipientType} email sent successfully:`, info.response);
    } catch (error) {
        console.error(`Error sending ${recipientType} email:`, error);
    }
}

router.post("/forms/update-status/:id", async (req, res) => {
    try {
        const { status } = req.body;
        if (!["Pending", "Approved", "Rejected"].includes(status)) {
            req.session.message = { type: "danger", text: "Invalid status" };
            return res.redirect("/admin/forms");
        }

        const updatedForm = await Form.findByIdAndUpdate(req.params.id, { status }, { new: true });
        if (!updatedForm) {
            req.session.message = { type: "danger", text: "Form not found" };
            return res.redirect("/admin/forms");
        }

        console.log("User Email:", updatedForm.email);
        console.log("Admin Email:", process.env.ADMIN_EMAIL);

        const userMailOptions = {
            from: `"NGO Support" <no-reply@yourdomain.com>`, // ✅ Fixed sender
            to: updatedForm.email,
            replyTo: "support@yourdomain.com", 
            subject: `Update for ${updatedForm.name} - Status: ${status}`,
            headers: {
                "List-Unsubscribe": "<mailto:unsubscribe@yourdomain.com>",
                "X-Priority": "1",
                "X-Mailer": "NodeMailer",
            },
            text: `Dear ${updatedForm.name},\n\nYour form status has been updated to ${status}.\n\nThank you, \nNGO Support Team`,
            html: `
                <div style="font-family: Arial, sans-serif; border: 1px solid #ddd; padding: 20px; max-width: 600px;">
                    <h2 style="text-align: center; color: #4CAF50;">NGO Form Status Update</h2>
                    <p>Dear <strong>${updatedForm.name}</strong>,</p>
                    <p>Your form status has been updated to: <strong style="color: ${status === 'Approved' ? 'green' : status === 'Rejected' ? 'red' : 'orange'};">${status}</strong></p>
                    <p>Thank you for your patience.</p>
                    <hr>
                    <p style="text-align: center;">NGO Support Team</p>
                </div>
            `,
        };

        const adminMailOptions = {
            from: `"NGO Support" <no-reply@yourdomain.com>`, 
            to: process.env.ADMIN_EMAIL,
            subject: `Admin Notification: Form Updated - ${status}`,
            text: `Form for ${updatedForm.name} has been updated to ${status}.`,
            html: `
                <div style="font-family: Arial, sans-serif; border: 1px solid #ddd; padding: 20px; max-width: 600px;">
                    <h2 style="text-align: center; color: #FF5733;">NGO Admin Notification</h2>
                    <p>Dear Admin,</p>
                    <p>The form for <strong>${updatedForm.name}</strong> has been updated to ${status}.</p>
                    <p>Keep track of further updates.</p>
                    <hr>
                    <p style="text-align: center;">NGO Support Team</p>
                </div>
            `,
        };

        await sendEmail(userMailOptions, "User");
        await new Promise((resolve) => setTimeout(resolve, 5000)); // ✅ 5-sec delay
        await sendEmail(adminMailOptions, "Admin");

        req.session.message = { type: "success", text: "Status updated and email sent" };
        res.redirect("/admin/forms");
    } catch (error) {
        console.error(error);
        req.session.message = { type: "danger", text: "Error updating status" };
        res.redirect("/admin/forms");
    }
});

module.exports = router;

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
