const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const userController = require('../controllers/userController');
const placeController = require('../controllers/placeController');
const bookingController = require('../controllers/bookingController');
const OtpController = require('../controllers/otpController');
const Place = require('../models/Place');
const imageDownload = require('image-downloader');
const multer = require('multer');
const mime = require('mime-types');
const uploadToS3 = require('../utils/uploadToS3');

router.use('/user', userController);
router.use('/place', placeController);
router.use('/booking', bookingController);
router.use('/otp', OtpController);

// Ensure local uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer storage saving into uploads folder
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname) || `.${mime.extension(file.mimetype) || 'jpg'}`;
        const uniqueName = `photo_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
        cb(null, uniqueName);
    }
});

const photosMiddleware = multer({ storage });

const hasS3Config = () => {
    return Boolean(
        process.env.BUCKET_NAME &&
        process.env.S3_ACCESS_KEY &&
        process.env.S3_SECRET_ACCESS_KEY
    );
};

// Route to get all places for index page
router.get('/places', async (req, res) => {
    try {
        const allPlaces = await Place.find();
        res.json(allPlaces);
    } catch (err) {
        console.error('Error fetching places:', err);
        res.status(500).json({ error: err.message });
    }
});

// Route to handle file uploads
router.post('/upload', photosMiddleware.array('photos', 50), async (req, res) => {
    try {
        const uploadedFiles = [];
        const files = req.files || [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (hasS3Config()) {
                try {
                    const s3Url = await uploadToS3(file.path, file.originalname, file.mimetype);
                    uploadedFiles.push(s3Url);
                    // Remove local temporary file after S3 upload
                    if (fs.existsSync(file.path)) {
                        fs.unlinkSync(file.path);
                    }
                } catch (s3Err) {
                    console.warn('S3 upload failed, falling back to local storage:', s3Err.message);
                    uploadedFiles.push(`/uploads/${file.filename}`);
                }
            } else {
                // S3 not configured: serve from local uploads
                uploadedFiles.push(`/uploads/${file.filename}`);
            }
        }
        res.json(uploadedFiles);
    } catch (err) {
        console.error('Error during photo upload:', err);
        res.status(500).json({ error: err.message });
    }
});

// Route to upload via external link
router.post('/upload_by_link', async (req, res) => {
    try {
        const { imgLink } = req.body;
        if (!imgLink) {
            return res.status(400).json({ error: 'imgLink is required' });
        }

        // If S3 is not configured and the link is already an external image URL, use it directly
        if (!hasS3Config() && /^https?:\/\//i.test(imgLink)) {
            return res.json(imgLink);
        }

        const ext = path.extname(new URL(imgLink).pathname) || '.jpg';
        const newName = `photo_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
        const destPath = path.join(uploadsDir, newName);

        await imageDownload.image({
            url: imgLink,
            dest: destPath,
        });

        if (hasS3Config()) {
            try {
                const detectedMime = mime.lookup(destPath) || 'image/jpeg';
                const s3Url = await uploadToS3(destPath, newName, detectedMime);
                if (fs.existsSync(destPath)) {
                    fs.unlinkSync(destPath);
                }
                return res.json(s3Url);
            } catch (s3Err) {
                console.warn('S3 upload by link failed, falling back to local storage:', s3Err.message);
                return res.json(`/uploads/${newName}`);
            }
        } else {
            return res.json(`/uploads/${newName}`);
        }
    } catch (err) {
        console.error('Error in upload_by_link:', err);
        // If image download failed, but the URL is valid, fallback to returning the link itself
        if (req.body?.imgLink && /^https?:\/\//i.test(req.body.imgLink)) {
            return res.json(req.body.imgLink);
        }
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
