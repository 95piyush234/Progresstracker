const multer = require('multer');

// Use memory storage so the file is held temporarily in buffer before uploading to Cloudinary
const storage = multer.memoryStorage();

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // Optional: limit file size to 5MB
});

module.exports = upload;