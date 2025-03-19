const Form = require('../model/from');
const multer = require('multer');
const path = require('path');
const nodemailer = require('nodemailer');
const sharp = require('sharp');
require('dotenv').config();
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Storage Configuration (for PDF and images)
const storage = multer.memoryStorage();
const upload = multer({ storage }).fields([
    { name: 'documents[aadharPhotos]', maxCount: 2 },
    { name: 'documents[studentPhotos]', maxCount: 2 },
    { name: 'documents[additionalDocs]', maxCount: 2 } // Supports PDF uploads
]);

// Nodemailer Configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.ADMIN_EMAIL ||'vishalbhadana002@gmail.com',
        pass: process.env.ADMIN_PASSWORD || 'yfow rjzr olvn nxfs'
    }
});

// Function to handle images (compress and save)
const compressAndSaveImage = async (file, prefix) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${Date.now()}-${prefix}${ext}`;
    const outputPath = path.join('uploads', filename);

    // Compress only if the file is an image
    if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.svg', '.pdf'].includes(ext)) {
        await sharp(file.buffer)
            .resize(800, 800, { fit: 'inside' })
            .toFormat('jpeg')
            .jpeg({ quality: 80 })
            .toFile(outputPath);
    } else {
        fs.writeFileSync(outputPath, file.buffer); // Directly save non-image files (like PDFs)
    }
    
    return outputPath;
};

exports.createForm = async (req, res) => {
    upload(req, res, async (err) => {
        if (err) {
            req.session.message = { type: 'danger', text: "Something went wrong. Try again." };
            return res.redirect('/');
        }

        try {
            const { name, fatherName, mobileNo, date, occupation, aadharNo, amount, address, schoolDetails, email } = req.body;

            // Check if the user already exists
            const user = await Form.findOne({ email });
            if (user) {
                req.session.message = { type: 'danger', text: 'User already exists' };
                return res.redirect('/');
            }

            // Process images and PDFs
            const aadharPhotos = req.files['documents[aadharPhotos]']
                ? await Promise.all(req.files['documents[aadharPhotos]'].map(file => compressAndSaveImage(file, 'aadhar')))
                : [];

            const studentPhotos = req.files['documents[studentPhotos]']
                ? await Promise.all(req.files['documents[studentPhotos]'].map(file => compressAndSaveImage(file, 'student')))
                : [];

            const additionalDocs = req.files['documents[additionalDocs]']
                ? await Promise.all(req.files['documents[additionalDocs]'].map(file => compressAndSaveImage(file, 'document')))
                : [];

            // Save form data
            const form = new Form({
                name,
                fatherName,
                email,
                mobileNo,
                date,
                occupation,
                aadharNo,
                amount,
                address,
                schoolDetails,
                documents: { aadharPhotos, studentPhotos, additionalDocs }
            });

            await form.save();

            // Send confirmation emails (User & Admin)
            await transporter.sendMail({
                from: process.env.ADMIN_EMAIL,
                to: email,
                subject: 'Form Submission Confirmation',
                html: `<p>Dear ${name}, your form has been successfully submitted.</p>`
            });

            await transporter.sendMail({
                from: process.env.ADMIN_EMAIL,
                to: process.env.ADMIN_EMAIL,
                subject: 'New Form Submission',
                html: `<p>A new form has been submitted by ${name}.</p>`
            });

            req.session.message = { type: 'success', text: 'Form submitted successfully!' };
            res.redirect('/');
        } catch (error) {
            console.error(error);
            req.session.message = { type: 'danger', text: 'Form submission failed!' };
            res.redirect('/');
        }
    });
};
