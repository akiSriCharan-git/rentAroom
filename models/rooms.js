const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  type: String,
  description: String,
  createdat: {
    type: Date,
    default: Date.now()
  },
  occupied: {
    type: Boolean,
    default: false
  },
  owner: String,
  image: [String],
  price: Number,
  maxpeople: Number,
  location: String
});

mongoose.model('Room', roomSchema);
