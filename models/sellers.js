const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');
var bcrypt = require('bcrypt-nodejs');


const sellerSchema = new mongoose.Schema({
  name: String,
  birthday: Date,
  address: {
    housenumber: String,
    street: String,
    city: String,
    state: String,
    country: String,
    pincode: Number,
  },
  email: String,
  username: String,
  password: String,
  phone: String,
  otp: Number,
  otpexpire: Date,
  seller:{
    type: Boolean,
    default: true
  }
});

// seller.save() hashes the passsword
sellerSchema.pre('save', function(next) {
  var seller = this;
  var SALT_FACTOR = 5;

  if (!seller.isModified('password')) return next();

  bcrypt.genSalt(SALT_FACTOR, function(err, salt) {
    if (err) return next(err);

    bcrypt.hash(seller.password, salt, null, function(err, hash) {
      if (err) return next(err);
      seller.password = hash;
      next();
    });
  });
});

sellerSchema.methods.comparePassword = function(candidatePassword, cb) {
  bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
    if (err) return cb(err);
    cb(null, isMatch);
  });
};

sellerSchema.plugin(passportLocalMongoose);

mongoose.model('Seller', sellerSchema);
