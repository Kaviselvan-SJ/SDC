const express = require('express');
const path = require('path');
const cors = require('cors');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

const app = express();
const PORT = 5000;
const MONGO_URI = 'mongodb://localhost:27017/eventsDB'; // Your DB name

// Enable CORS & Body Parsing
app.use(cors());
app.use(bodyParser.json());

// Connect to MongoDB
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

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
    photo: { type: String, required: true }, // Base64 or URL
    position: { type: Number, required: true, unique: true } 
});

const Member = mongoose.model('Member', memberSchema);



const Event = mongoose.model('Event', eventSchema);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
// Increase request body size limit
app.use(express.json({ limit: "50mb" })); // Allows up to 10MB JSON payload
app.use(express.urlencoded({ limit: "50mb", extended: true })); // For form data


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

// Route to fetch members
app.get('/members', async (req, res) => {
    try {
        const members = await Member.find().sort('position'); // Sorted by position
        res.json(members);
    } catch (error) {
        res.status(500).json({ message: "Error fetching members", error });
    }
});


// Route to upload a new member
app.post('/add-member', async (req, res) => {
    try {
        const { name, department, year, photo } = req.body;

        if (!name || !department || !year || !photo) {
            return res.status(400).json({ success: false, message: "⚠️ Missing required fields!" });
        }

        // Get the highest position and increment it
        const lastMember = await Member.findOne().sort('-position');
        const newPosition = lastMember ? lastMember.position + 1 : 1;

        const newMember = new Member({
            name,
            department,
            year,
            photo,
            position: newPosition
        });

        await newMember.save();
        res.json({ success: true, message: "✅ Member added successfully!" });

    } catch (error) {
        console.error("Error adding member:", error);
        res.status(500).json({ success: false, message: "❌ Failed to add member", error });
    }
});


app.post('/update-member-order', async (req, res) => {
    try {
        const { orderedMembers } = req.body; // [{ _id: "123", position: 1 }, { _id: "456", position: 2 }]

        if (!orderedMembers || !Array.isArray(orderedMembers)) {
            return res.status(400).json({ success: false, message: "⚠️ Invalid data format" });
        }

        // Update each member's position
        const bulkOps = orderedMembers.map(member => ({
            updateOne: {
                filter: { _id: member._id },
                update: { position: member.position }
            }
        }));

        await Member.bulkWrite(bulkOps);
        res.json({ success: true, message: "✅ Member order updated successfully!" });

    } catch (error) {
        console.error("Error updating order:", error);
        res.status(500).json({ success: false, message: "❌ Failed to update order", error });
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

        // Shift positions of remaining members
        await Member.updateMany(
            { position: { $gt: memberToDelete.position } },
            { $inc: { position: -1 } }
        );

        res.json({ success: true, message: "✅ Member deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: "❌ Error deleting member", error });
    }
});



// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});


