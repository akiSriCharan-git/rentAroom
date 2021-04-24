require('dotenv').config()   // for .env

// requiring all the modules
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const ejs = require('ejs');
const session = require('express-session');
const nodemailer = require('nodemailer');
var bcrypt = require('bcrypt-nodejs');

require('../models/sellers');
require('../models/rooms')

// for passportJS (for simplified authentication)
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
var LocalStrategy = require('passport-local').Strategy;


// app
const app = express();
app.use(bodyParser.urlencoded({extended: true}))
app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public'));

const Seller = mongoose.model('Seller');  // creating User model
// const Room = mongoose.model('Room');

app.get('/seller-login', (req, res)=>{
  res.render('login', {msg:'', seller: true})
});

app.get('/seller-signup', (req,res)=>{
  res.render('signup', {msg:'', name:'', birthday: '', housenumber: '', street:'', city: '', state: '', state:'', country:'', pincode:'', email:'', seller: true})
});

app.get('/seller-main', (req,res)=>{
  if(req.isAuthenticated()){
    res.render('seller-main', {user: req.user})
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

app.post('seller-resendotp', (req, res)=>{
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
      html: '<h3>OTP for verfication is </h3>' + '<h1>' + OTP + '</h1>'
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
            foundSeller.save(err =>{
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
    if(!user) return res.render('login', {msg: info.message, seller: true});
    req.logIn(seller, err=>{
      if(err) return next(err);
      return res.redirect('/main')
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
})






module.exports = app;
