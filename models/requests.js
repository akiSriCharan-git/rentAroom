const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  from: String,
  to: String,
  expired: {
    type: Boolean,
    default: false
  },
  accepted: {
    type: Boolean,
    default: false
  },
  for: String,
  alloted: {
    type: Boolean,
    default: false
  }
});

mongoose.model('Request', requestSchema)
