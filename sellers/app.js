require('dotenv').config()   // for .env

// requiring all the modules
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const ejs = require('ejs');
const session = require('express-session');
const nodemailer = require('nodemailer');
var bcrypt = require('bcrypt-nodejs');
const ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn
var multer = require('multer');
var fs = require('fs');
var path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
      cb(null, 'public/uploads')
  },
  filename: (req, file, cb) => {
      const ext = file.mimetype.split('/')[1]
      cb(null, 'seller' + '-' + req.user.username + Date.now()+'.'+ext)
  }
});
const upload = multer({ storage: storage });



require('../models/sellers');
require('../models/rooms');
require('../models/users');


// for passportJS (for simplified authentication)
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
var LocalStrategy = require('passport-local').Strategy;


// app
const app = express();
app.use(bodyParser.urlencoded({extended: true}))
app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public'));

const Seller = mongoose.model('Seller');
const Room = mongoose.model('Room');
const User = mongoose.model('User');

app.get('/seller-login', (req, res)=>{
  res.render('login', {msg:'', seller: true})
});

app.get('/seller-signup', (req,res)=>{
  res.render('signup', {msg:'', name:'', birthday: '', housenumber: '', street:'', city: '', state: '', state:'', country:'', pincode:'', email:'', seller: true})
});

app.get('/seller-main', (req,res)=>{
  if(req.isAuthenticated()){
    if(req.user.seller){
      res.render('seller-main', {user: req.user})
    }else{
      res.redirect('/logout')
    }
  }else{
    res.render('login', {msg: 'please login', seller: true})
  }
});

app.get('/seller-forgot', (req, res)=>{
  res.render('forgot', {msg: '', seller: true})
})
let transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  service: 'gmail',
  auth:{
    user: process.env.EMAIL,
    pass: process.env.PASS
  }
})
app.post('/seller-signup', (req, res)=>{
  const seller = new Seller({
    name: req.body.name,
    birthday: req.body.birthday,
    address:{
      housenumber: req.body.housenumber,
      street: req.body.street,
      city: req.body.city,
      state: req.body.state,
      country: req.body.country,
      pincode: req.body.pincode
    },
    email: req.body.email
  })
  Seller.findOne({email: req.body.email}, (err, foundSeller)=>{
    if(err){
      console.log(err)
    }else if(foundSeller == null){
      let otp = Math.random();
      otp = otp * 1000000;
      otp = parseInt(otp);
      seller.otp = otp;
      seller.otpexpire = Date.now() + 3600000;

      seller.save()
      var mailOptions={
        to: req.body.email,
        subject: 'OTP for your registration for seller account',
        html: '<h3>OTP for verfication is </h3>' + '<h1>' + otp + '</h1>'
      };

      transporter.sendMail(mailOptions, (err, info)=>{
        if(err){
          console.log(err)
        }else{
          res.render('verifyotp', {msg: 'otp sent successfully to '+ req.body.email, email: req.body.email, seller: true})
        }
      })
    }else{
      res.render('signup', {name: req.body.name, email:'',birthday: req.body.birthday, housenumber: req.body.housenumber, street: req.body.street, city: req.body.city, state: req.body.state, country: req.body.country, pincode: req.body.pincode, msg: 'This email already exists please use different one', seller: true})
    }
  })
});

app.post('/seller-verify', (req, res)=>{
  Seller.findOne({email: req.body.email, otpexpire: {$gt: Date.now()}}, (err, foundSeller)=>{
    if(err){
      console.log(err)
    }else{
      if(!foundSeller){
        res.render('verifyotp', {email: req.body.email, msg: 'otp expired click resend otp', seller: true})
      }else{
        if(foundSeller.otp == req.body.otp){
          res.render('createusername', {msg:'', email: req.body.email, seller: true})
        }else{
          res.render('verifyotp', {email: req.body.email, msg: 'incorrectotp', seller: true})
        }
      }
    }
  })
});

app.post('/seller-resendotp', (req, res)=>{
  Seller.findOne({email: req.body.email}, (err, foundSeller)=>{
    if(err){
      console.log(err)
    }else{
      var otp = Math.random();
      otp = otp * 1000000;
      otp = parseInt(otp);
      Seller.findOneAndUpdate({email: req.body.email}, {otp: otp, otpexpire: Date.now()+3600000}, (err, done)=>{
        if(err){
          console.log(err)
        }
      })
    }
    var mailOptions = {
      to: req.body.email,
      subject: 'OTP for your registration for your seller account',
      html: '<h3>OTP for verfication is </h3>' + '<h1>' + otp + '</h1>'
    };

    transporter.sendMail(mailOptions, (err, info)=>{
      if(err){
        console.log(err)
      }else{
        res.render('verifyotp', {msg:'otp sent again to '+ req.body.email, email: req.body.email, seller: true})
      }
    })
  })
});

app.post('/createSeller', (req, res)=>{
  Seller.findOne({username: req.body.username}, (err, foundSeller)=>{
    if(err){
      console.log(err)
    }else if(foundSeller == null){
      if(req.body.password == req.body.confirmPassword){
        Seller.findOne({email: req.body.email}, (err, foundSeller)=>{
          if(err){
            console.log(err)
          }else{
            foundSeller.username = req.body.username;
            foundSeller.password = req.body.password;
            foundSeller.save((err) =>{
              req.logIn(foundSeller, err=>{
                if(!err){
                  res.redirect('/seller-main')
                }
              })
            })
          }
        })
      }else{
        res.render('createusername', {msg: "passwwords didn't match", email: req.body.email, seller: true})
      }
    }else{
      res.render('createusername', {msg: 'username already exists try another one', email: req.body.email, seller: true})
    }
  })
});

passport.use('seller-local', new LocalStrategy((username, password, done)=>{
  Seller.findOne({username: username}, (err, seller)=>{
    if(err) return done(err);
    if(!seller) return done(null, false, {message: 'Incorrect username'});
    seller.comparePassword(password, (err, isMatch)=>{
      if(isMatch){
        return done(null, seller)
      }else{
        return done(null, false, {message: 'Incorrect password'})
      }
    })
  })
}));

app.post('/seller-login', (req, res, next)=>{
  passport.authenticate('seller-local', (err, seller, info)=>{
    if(err) return next(err);
    if(!seller) return res.render('login', {msg: info.message, seller: true});
    req.logIn(seller, err=>{
      if(err) return next(err);
      return res.redirect('/seller-main')
    })
  })(req, res, next)
});

app.post('/seller-forgot', (req, res)=>{
  Seller.findOne({email: req.body.email}, (err, foundSeller)=>{
    if(err) {console.log(err)}
    else if(foundSeller == null){
      res.render('forgot', {msg: 'No account exists with that email, please enter valid email', seller: true})
    } else {
      var otp = ath.random();
      otp = otp * 1000000;
      otp = parseInt(otp);
      Seller.findOneAndUpdate({email: req.body.email}, {otp: otp, otpexpire: Date.now()+3600000}, (err, done)=>{
        if(err){
          console.log(err)
        }
      })
      var mailOptions = {
        to: req.body.email,
        subject: 'OTP for your password change',
        html: '<h3>Your username is </h3><h1>' + foundSeller.username + '</h1><h3>And OTP for password change is </h3><h1>' + otp + "</h1><h5> If you haven't asked for a password change then please ignore this mail </h5>"
      };
      transporter.sendMail(mailOptions, (err, info)=>{
        if(err){
          console.log(err)
        }else{
          res.render('passwordchange', {username: foundUser.username, msg:'', email:req.body.email, seller: true})
        }
      })
    }
  })
});

app.post('/seller-passwordchange', (req, res)=>{
  Seller.findOne({username: req.body.username}, (err, foundSeller)=>{
    if(err){
      console.log(err)
    }else if(foundSeller == null){
      res.render('passwordchange', {username: req.body.username, msg:'otp expired click resend', email: req.body.email, seller: true})
    }else{
      if(foundSeller.otp == req.body.otp){
        if(req.body.password == req.body.confirmPassword){
          Seller.findOne({username: req.body.username}, (err, foundSeller)=>{
            if(err){
              console.log(err)
            }else{
              foundSeller.password = req.body.password
              foundSeller.save(err=>{
                if(err){
                  console.log(err)
                }else{
                  res.redirect('/seller-main')
                }
              })
            }
          })
        }else{
          res.render('passwordchange', {username: req.body.username, msg: "password didn't match", email: req.body.email, seller: true})
        }
      }else{
        res.render('passwordchange', {username: req.body.username, msg: 'incorrect otp', email: req.body.email, seller: true})
      }
    }
  })
})

app.post('seller-resendotpforpasswordchange', (req, res)=>{
  var otp = Math.random();
  otp = otp * 1000000;
  otp = parseInt(otp);

  Seller.findOneAndUpdate({username: req.body.username}, {otp: otp, otpexpire: Date.now()+3600000}, (err, done)=>{
    if(err){
      console.log(err)
    }
  })
  var mailOptions = {
    to: req.body.email,
    subject: 'OTP for your passsword change',
    html: '<h3>Your username is </h3><h1>' + foundSeller.username + '</h1><h3>And OTP for password change is </h3><h1>' + otp + "</h1><h5> If you haven't asked for a password change then please ignore this mail </h5>"
  };

  transporter.sendMail(mailOptions, (err, info)=>{
    if(err){
      console.log(err)
    }else{
      res.render('passwordchange', {username: req.body.username, msg:'otp sent again to '+req.body.email, email: req.body.email, seller: true})
    }
  })
});

app.get('/add-a-room', (req, res)=>{
  if(req.isAuthenticated()){
    if(req.user.seller){
      res.render('add-a-room', {user: req.user, msg: ''})
    }else{
      res.redirect('/logout')
    }
  }else{
    res.render('login', {msg: 'please login', seller: true})
  }
});

app.post('/add-a-room', upload.array('images', 4), (req, res)=>{
  const imgArray = []
  req.files.forEach((item) => {
    imgArray.push(item.filename)
  });
  const room = new Room({
    type: req.body.type,
    description: req.body.description,
    owner: req.user.username,
    image: imgArray,
    price: req.body.price,
    maxpeople: req.body.maxpeople,
    location: req.body.location.toLowerCase(),
    address: req.body.address
  });
  room.save(err =>{
    if(!err){
      res.render('add-a-room', {msg: 'Added successfully', user: req.user})
    }
  });
});

app.get('/your-rooms', (req, res)=>{
  if(req.isAuthenticated()){
    if(req.user.seller){
      Room.find({owner: req.user.username}, (err, docs)=>{
        res.render('your-rooms', {user: req.user, rooms: docs})
      })
    }else{
      res.redirect('/logout')
    }
  }else{
    res.render('login', {msg: 'please login', seller: true})
  }
});

app.get('/room/:roomid', (req, res)=>{
  if (req.isAuthenticated()) {
    Room.findOne({_id: req.params.roomid}, (err, foundRoom)=>{
      if(err){
        console.log(err)
      }else if(!foundRoom){
        res.render('error', {msg: 'No room found', user: req.user, room: false})
      }else{
        res.render('room', {msg: '', user: req.user, room: foundRoom})
      }
    })
  }else{
    res.render('login', {msg: 'please login', seller: true})

  }
});

app.get('/edit/:roomid', (req, res)=>{
  if(req.isAuthenticated()){
    Room.findOne({_id: req.params.roomid}, (err, foundRoom)=>{
      // console.log(foundRoom)
      if(foundRoom.owner != req.user.username){
        res.render('error', {msg: 'You are not authorized to edit this room'})
      }else{
        res.render('edit-room', {room: foundRoom, user: req.user})
      }
    })
  }
});

app.post('/edited-room', (req, res)=>{
  // console.log(req.body.roomid)
  Room.findOne({_id: req.body.roomid}, (err, foundRoom)=>{
    foundRoom.type = req.body.type
    foundRoom.description = req.body.description
    foundRoom.price = req.body.price
    foundRoom.maxpeople = req.body.maxpeople
    foundRoom.location = req.body.location
    foundRoom.address = req.body.address

    foundRoom.save()
    req.logIn(req.user, err=>{
      if(!err){
        res.render('room', {msg: '', user: req.user, room: foundRoom})
      }
    })
  })
});

app.get('/:role/:username', (req, res)=>{
  if(req.params.role == 'seller'){
    Seller.findOne({username: req.params.username}, (err, foundSeller)=>{
      res.render('profile', {user: foundSeller})
    })
  }else {
    User.findOne({username: req.params.username}, (err, foundUser)=>{
      res.render('profile', {user: foundUser})
    })
  }
});

app.get('/edit-profile/:role/:username', (req, res)=>{
  if(req.isAuthenticated()){
    if(req.params.role == 'seller'){
      if(req.user.username == req.params.username){
        Seller.findOne({username: req.params.username}, (err, foundSeller)=>{
          res.render('editprofile', {user: foundSeller, seller: true})
        })
      }else{
        res.render('error', {msg: 'You are not authorized to edit this information'})
      }

    }else{
      User.findOne({username: req.params.username}, (err, foundUser)=>{
        res.render('editprofile', {user: foundUser, seller: false})
      })
    }
  }else{
    res.render('login', {msg: 'please login', seller: (req.params.role == 'seller')})
  }
});

app.post('edit-seller', (req, res)=>{
  Seller.findOne({username: req.user.username}, (err, foundUser)=>{
    foundUser.name = req.body.name
    foundUser.birthday = req.body.birthday
    foundUser.address.housenumber = req.body.housenumber
    foundUser.address.street = req.body.street
    foundUser.address.state = req.body.state
    foundUser.address.country = req.body.country
    foundUser.address.pincode = req.body.pincode
    foundUser.phone = req.body.phone

    foundUser.save()

    req.logIn(req.user, err=>{
      if(!err){
        res.redirect('/seller'+foundUser.username)
      }
    })
  })
});
app.post('edit-user', (req, res)=>{
  User.findOne({username: req.user.username}, (err, foundUser)=>{
    foundUser.name = req.body.name
    foundUser.birthday = req.body.birthday
    foundUser.address.housenumber = req.body.housenumber
    foundUser.address.street = req.body.street
    foundUser.address.state = req.body.state
    foundUser.address.country = req.body.country
    foundUser.address.pincode = req.body.pincode
    foundUser.phone = req.body.phone

    foundUser.save()

    req.logIn(req.user, err=>{
      if(!err){
        res.redirect('/user'+foundUser.username)
      }
    })
  })

})






module.exports = app;
