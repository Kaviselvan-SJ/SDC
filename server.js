const express = require('express');
const path = require('path');
const cors = require('cors');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
require('dotenv').config();


const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;



// Enable CORS & Body Parsing
app.use(express.json());
app.use(cors({ origin: '*' }));

// Connect to MongoDB
mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
    .then(() => console.log('✅ MongoDB Atlas connected!'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

const compression = require('compression');
app.use(compression());

// Define Event Schema & Model
const eventSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    date: { type: Date, required: true },
    registerLink: { type: String, required: false },
    image: { type: String, required: false } // Base64 or URL
});

// Define Member Schema & Model
const memberSchema = new mongoose.Schema({
    name: { type: String, required: true },
    department: { type: String, required: true },
    year: { type: String, required: true },
    role: { type: String, required: true },
    photo: { type: String, required: true }, // Base64 or URL
    linkedin: { type: String },
    instagram: { type: String },
    academicYear: { type: String, required: true },
    priority: { type: Number}
  });
  
memberSchema.index({ priority: 1 });

const eventImageSchema = new mongoose.Schema({
    image: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now }
});

// Schema for members gallery images
const memberGalleryImageSchema = new mongoose.Schema({
    image: { type: String, required: true },          // Image URL or file path
    uploadedAt: { type: Date, default: Date.now }     // Timestamp of the upload
});

// Model for members gallery images
const MemberGalleryImage = mongoose.model('MemberGalleryImage', memberGalleryImageSchema);
const EventImage = mongoose.model('EventImage', eventImageSchema);
const Member = mongoose.model('Member', memberSchema);
const Event = mongoose.model('Event', eventSchema);




// Serve static files from the current directory
app.use(express.static(__dirname));

// Increase request body size limit
app.use(express.json({ limit: "50mb" })); // Allows up to 50MB JSON payload
app.use(express.urlencoded({ limit: "50mb", extended: true })); // For form data


// Route to serve home.html on root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'home.html'));
});



// Route to fetch events
app.get('/events', async (req, res) => {
    try {
        const events = await Event.find();
        res.json(events);
    } catch (error) {
        res.status(500).json({ message: "Error fetching events", error });
    }
});

// Route to upload a new event
app.post('/add-event', async (req, res) => {
    try {
        const { title, description, date, link, image } = req.body;

        if (!title || !description || !date || !image) {
            return res.status(400).json({ success: false, message: "⚠️ Missing required fields!" });
        }

        const newEvent = new Event({
            title: title,  // Ensure correct mapping
            description,
            date: new Date(date), // Convert to Date object
            registerLink: link,
            image
        });

        await newEvent.save();
        res.json({ success: true, message: "✅ Event added successfully!" });

    } catch (error) {
        console.error("Error adding event:", error);
        res.status(500).json({ success: false, message: "❌ Failed to add event", error });
    }
});




app.post("/delete-event", async (req, res) => {
    const { title } = req.body;
    if (!title) {
        return res.status(400).json({ success: false, message: "Title is required!" });
    }
    try {
        let result;

        if (title) {
            result = await Event.deleteOne({ title }); // Delete specific event
        } else {
            result = await Event.deleteMany({ title: { $exists: false } }); // Delete all unnamed events
        }

        if (result.deletedCount === 0) {
            return res.status(404).json({ success: false, message: "❌ Event not found" });
        }

        res.json({ success: true, message: "✅ Event deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: "❌ Error deleting event", error });
    }
});


// Route to fetch members sorted by priority (lower number = higher priority)
app.get('/members', async (req, res) => {
    try {
        const members = await Member.find({})
            .sort({ priority: 1 })
            .lean() // Improves performance by returning plain JS objects
            .allowDiskUse(true); // Helps with large datasets in MongoDB
        res.json(members);
    } catch (error) {
        console.error("Error fetching members:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// Route to fetch only basic member info (fast)
app.get('/members/summary', async (req, res) => {
    try {
        const members = await Member.find({}, 'name role department year priority') // only essential fields
            .sort({ priority: 1 })
            .lean();

        res.json(members);
    } catch (error) {
        console.error("Error fetching member summary:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});


// Route to upload a new member
app.post('/add-member', async (req, res) => {
    try {
        const { name, department, year, role, photo, linkedin, instagram,academicYear,priority} = req.body;

        if (!name || !department || !year || !role || !photo) {
            return res.status(400).json({ success: false, message: "⚠️ Missing required fields!" });
        }

        if (priority === undefined || isNaN(priority)) {
            return res.status(400).json({ success: false, message: "⚠️ Invalid priority value!" });
        }

        const newMember = new Member({
            name,
            department,
            year,
            role,
            photo,
            linkedin,
            instagram,
            academicYear,
            priority
        });

        await newMember.save();
        res.json({ success: true, message: "✅ Member added successfully!" });

    } catch (error) {
        console.error("Error adding member:", error);
        res.status(500).json({ success: false, message: "❌ Failed to add member", error });
    }
});


  

// Route to delete a member
app.post("/delete-member", async (req, res) => {
    const { name } = req.body;
    if (!name) {
        return res.status(400).json({ success: false, message: "Name is required!" });
    }

    try {
        const memberToDelete = await Member.findOne({ name });
        if (!memberToDelete) {
            return res.status(404).json({ success: false, message: "❌ Member not found" });
        }

        await Member.deleteOne({ _id: memberToDelete._id });


        res.json({ success: true, message: "✅ Member deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: "❌ Error deleting member", error });
    }
});

// Upload event image only
app.post('/add-event-image', async (req, res) => {
    try {
        const { image } = req.body;
        if (!image) return res.status(400).json({ success: false, message: "⚠️ No image provided!" });

        const newImage = new EventImage({ image });
        await newImage.save();

        res.json({ success: true, message: "✅ Image uploaded successfully!" });
    } catch (error) {
        console.error("Error uploading image:", error);
        res.status(500).json({ success: false, message: "❌ Failed to upload image", error });
    }
});

// Get all event images
app.get('/event-images', async (req, res) => {
    try {
        const images = await EventImage.find().sort('-uploadedAt');
        res.json(images);
    } catch (error) {
        res.status(500).json({ success: false, message: "❌ Failed to fetch images", error });
    }
});

// Delete event image
app.post('/delete-event-image', async (req, res) => {
    const { id } = req.body;
    if (!id) return res.status(400).json({ success: false, message: "Image ID required!" });

    try {
        const deleted = await EventImage.findByIdAndDelete(id);
        if (!deleted) return res.status(404).json({ success: false, message: "❌ Image not found" });

        res.json({ success: true, message: "✅ Image deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: "❌ Error deleting image", error });
    }
});

// Upload member gallery image
app.post('/add-members-image', async (req, res) => {
    try {
        const { image } = req.body;
        if (!image) return res.status(400).json({ success: false, message: "⚠️ No image provided!" });

        const newImage = new MemberGalleryImage({ image });
        await newImage.save();

        res.json({ success: true, message: "✅ Member image uploaded successfully!" });
    } catch (error) {
        console.error("Error uploading member image:", error);
        res.status(500).json({ success: false, message: "❌ Failed to upload member image", error });
    }
});

// Get all member gallery images
app.get('/members-images', async (req, res) => {
    try {
        const images = await MemberGalleryImage.find().sort('-uploadedAt');
        res.json(images);
    } catch (error) {
        res.status(500).json({ success: false, message: "❌ Failed to fetch member images", error });
    }
});

// Delete member gallery image
app.post('/delete-members-image', async (req, res) => {
    const { id } = req.body;
    if (!id) return res.status(400).json({ success: false, message: "⚠️ Image ID required!" });

    try {
        const deleted = await MemberGalleryImage.findByIdAndDelete(id);
        if (!deleted) return res.status(404).json({ success: false, message: "❌ Image not found" });

        res.json({ success: true, message: "✅ Member image deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: "❌ Error deleting member image", error });
    }
});



// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});


