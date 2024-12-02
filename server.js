import express from 'express';
import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

// MongoDB connection
const uri = "mongodb+srv://technicalengineer96:N29i52y8ro9jdD4f@cluster0.2uixw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const client = new MongoClient(uri);
const dbName = 'workHours';
const db = client.db(dbName);

const userCollection = 'users';
const settingsCollection = 'settings';
const entriesCollection = 'entries';

app.get('/api/test', async (req, res) => {
      res.status(200).json({ response: 'app is running' });
});

app.post('/api/createNewUser', async (req, res) => {
  try {
    const userId = new ObjectId().toString();
    await db.collection(userCollection).insertOne({ _id: userId, created_at: new Date() });
    await db.collection(settingsCollection).insertOne({
      user_id: userId,
      working_days_per_week: 5,
      hours_per_day: 9,
      working_days_per_month: 22,
    });
    res.status(200).json({ userId });
  } catch (error) {
    console.error('Failed to create new user:', error);
    res.status(500).json({ error: 'Failed to create new user' });
  }
});

app.get('/api/getUserSettings/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const settings = await db.collection(settingsCollection).findOne({ user_id: userId });
    if (!settings) {
      return res.status(404).json({ error: 'User settings not found' });
    }
    res.status(200).json({
      userId,
      workingDaysPerWeek: settings.working_days_per_week,
      hoursPerDay: settings.hours_per_day,
      workingDaysPerMonth: settings.working_days_per_month,
    });
  } catch (error) {
    console.error('Failed to get user settings:', error);
    res.status(500).json({ error: 'Failed to get user settings' });
  }
});

app.put('/api/saveUserSettings', async (req, res) => {
  try {
    const { userId, workingDaysPerWeek, hoursPerDay, workingDaysPerMonth } = req.body;
    await db.collection(settingsCollection).updateOne(
      { user_id: userId },
      {
        $set: {
          working_days_per_week: workingDaysPerWeek,
          hours_per_day: hoursPerDay,
          working_days_per_month: workingDaysPerMonth,
        },
      }
    );
    res.status(200).json({ message: 'User settings updated successfully' });
  } catch (error) {
    console.error('Failed to save user settings:', error);
    res.status(500).json({ error: 'Failed to save user settings' });
  }
});

app.get('/api/getWorkEntries', async (req, res) => {
  try {
    const { userId, month, year } = req.query;
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);
    const entries = await db
      .collection(entriesCollection)
      .find({
        user_id: userId,
        date: { $gte: startDate.toISOString(), $lt: endDate.toISOString() },
      })
      .sort({ date: -1 })
      .toArray();
    res.status(200).json(entries);
  } catch (error) {
    console.error('Failed to get work entries:', error);
    res.status(500).json({ error: 'Failed to get work entries' });
  }
});

app.post('/api/saveWorkEntry', async (req, res) => {
  try {
    const { id, userId, date, entryTime, exitTime, minutesWorked, type, description } = req.body;
    if (id) {
      await db.collection(entriesCollection).updateOne(
        { _id: new ObjectId(id), user_id: userId },
        {
          $set: {
            date,
            entry_time: entryTime,
            exit_time: exitTime,
            minutes_worked: minutesWorked,
            type,
            description,
          },
        }
      );
    } else {
      const result = await db.collection(entriesCollection).insertOne({
        user_id: userId,
        date,
        entry_time: entryTime,
        exit_time: exitTime,
        minutes_worked: minutesWorked,
        type,
        description,
        created_at: new Date(),
      });
      res.status(200).json({ id: result.insertedId });
    }
  } catch (error) {
    console.error('Failed to save work entry:', error);
    res.status(500).json({ error: 'Failed to save work entry' });
  }
});

app.delete('/api/deleteWorkEntry', async (req, res) => {
  try {
    const { id, userId } = req.body;
    await db.collection(entriesCollection).deleteOne({ _id: new ObjectId(id), user_id: userId });
    res.status(200).json({ message: 'Work entry deleted successfully' });
  } catch (error) {
    console.error('Failed to delete work entry:', error);
    res.status(500).json({ error: 'Failed to delete work entry' });
  }
});

app.listen(3000, async () => {
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    console.log('Server is running on http://localhost:3000');
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
  }
});
