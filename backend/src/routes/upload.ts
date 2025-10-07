import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure multer for local storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Upload image to Cloudinary
router.post('/image', authenticateToken, upload.single('image'), async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image file provided'
      });
    }

    const { folder = 'antojosgo' } = req.body;

    let uploadResult;

    // Try to upload to Cloudinary if configured
    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
      try {
        uploadResult = await cloudinary.uploader.upload(req.file.path, {
          folder,
          public_id: `${Date.now()}-${req.file.filename}`,
          overwrite: true,
          resource_type: 'auto'
        });

        // Delete local file after successful Cloudinary upload
        fs.unlinkSync(req.file.path);

        res.json({
          success: true,
          url: uploadResult.secure_url,
          public_id: uploadResult.public_id,
          provider: 'cloudinary'
        });

      } catch (cloudinaryError) {
        console.error('Cloudinary upload error:', cloudinaryError);
        
        // Fall back to local storage
        const localUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
        
        res.json({
          success: true,
          url: localUrl,
          provider: 'local',
          message: 'Uploaded to local storage (Cloudinary unavailable)'
        });
      }
    } else {
      // Use local storage
      const localUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
      
      res.json({
        success: true,
        url: localUrl,
        provider: 'local'
      });
    }

  } catch (error) {
    console.error('Upload error:', error);
    
    // Clean up local file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed'
    });
  }
});

// Upload multiple images
router.post('/images', authenticateToken, upload.array('images', 5), async (req: AuthRequest, res) => {
  try {
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No image files provided'
      });
    }

    const { folder = 'antojosgo' } = req.body;
    const uploadPromises = [];

    for (const file of files) {
      if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
        uploadPromises.push(
          cloudinary.uploader.upload(file.path, {
            folder,
            public_id: `${Date.now()}-${file.filename}`,
            overwrite: true,
            resource_type: 'auto'
          }).then(result => {
            fs.unlinkSync(file.path); // Clean up local file
            return {
              success: true,
              url: result.secure_url,
              public_id: result.public_id,
              provider: 'cloudinary'
            };
          }).catch(error => {
            console.error('Cloudinary upload error:', error);
            const localUrl = `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;
            return {
              success: true,
              url: localUrl,
              provider: 'local',
              message: 'Uploaded to local storage (Cloudinary unavailable)'
            };
          })
        );
      } else {
        const localUrl = `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;
        uploadPromises.push(Promise.resolve({
          success: true,
          url: localUrl,
          provider: 'local'
        }));
      }
    }

    const results = await Promise.all(uploadPromises);

    res.json({
      success: true,
      uploads: results,
      count: results.length
    });

  } catch (error) {
    console.error('Multiple upload error:', error);
    
    // Clean up local files
    const files = req.files as Express.Multer.File[];
    if (files) {
      files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed'
    });
  }
});

// Delete image from Cloudinary
router.delete('/image/:public_id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { public_id } = req.params;

    if (!public_id) {
      return res.status(400).json({
        success: false,
        error: 'Public ID required'
      });
    }

    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
      const result = await cloudinary.uploader.destroy(public_id);
      
      res.json({
        success: true,
        result,
        message: 'Image deleted from Cloudinary'
      });
    } else {
      res.json({
        success: false,
        message: 'Cloudinary not configured'
      });
    }

  } catch (error) {
    console.error('Delete image error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Delete failed'
    });
  }
});

export default router;