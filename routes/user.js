const express = require('express');
const router = express.Router();
const passport = require('passport');
const jwt= require('jsonwebtoken');
const User= require('../models/users1');
const Task= require('../models/task');
const config= require('../config/database');
const nodemailer=require('nodemailer');
const crypto=require('crypto');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config();

if (typeof localStorage === "undefined" || localStorage === null) {
  var LocalStorage = require('node-localstorage').LocalStorage;
  localStorage = new LocalStorage('./mylocalStor');
}

router.post('/register', (req,res,next) => {
  const token = crypto.randomBytes(20).toString('hex');
  const today=new Date();
    let newUser = new User ({
        name: req.body.name,
        email: req.body.email,
        username: req.body.username,
        password: req.body.password,
        token:token,
        active: false,
        resetPasswordToken: '',
        resetPasswordExpires: '',
        created: today
    });

  
    const msg = `
    <p>You have a SignUp Request</p>
    <h3>Contact Details</h3>
    <ul>  
      <li>Email: ${req.body.email} </li>
    </ul>
    <h3>Message</h3>
    <p>Click <a href="http://localhost:3000/user/verifyuser/${token}/${req.body.email}">here</a> to activate.</p>
  `;

  let transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS
    },
    tls:{
      rejectUnauthorized:false
  }
  });

 
let mailOptions = {
  from: '"MEAN PROJECT" <varshasingh8054@gmail.com>',
  to: req.body.email,
  subject: 'Confirmation Email!',
  text: 'This is confirmation Email.',
  html: msg
};

transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
      return console.log(error);
  }
  console.log('Message sent: %s', info.messageId);
  console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
  
});
console.log("mail sent");
if(newUser.active=="true")
{
console.log("active is true");
}
else
{
    User.addUser(newUser,(err,user)=>
    {

        if(err)
        {
            res.json({success: false, msg: ' Failed to register user'});
        }
        else{
            res.json({success: true, msg: '  user registered'});
        }

    });
  }
  });

  router.get('/verifyuser/:token/:email', (req, res, next) => {

    User.findOne({
        email: req.params.email,
    }).then(user => {
        if(user.token === req.params.token)
        {

                console.log(user.active);
                user.active = true;
                console.log(user.active);
                user.save().then(emp => {
                  res.sendFile(path.join(__dirname, '../emailVerify', 'verify.html'));
                })

        }
        else{
            res.send("error");
        }
    })
    
 
  });

   

router.post('/authenticate', (req,res,next) => {

  const username = req.body.username;
  const password = req.body.password;

  User.getUserByUsername(username, (err, user) => {
    if(err) throw err;
    if(!user) {
      return res.json({success: false, msg: 'User not found, Please register first'});
    }
    if(!user.active)
    {
      return res.json({success: false, msg: 'User not active, Confirm your account from your mail'});
    }
    User.comparePassword(password, user.password,(err, isMatch) => {
      if(err) throw err;
      if(isMatch) {
        const token = jwt.sign({data : user}, config.secret, {
          expiresIn: 604800 // 1 week
        });
        res.json({
          success: true,
          token: 'JWT '+token,
          user: {
            id: user._id,
            name: user.name,
            username: user.username,
            email: user.email
          }
        })

      } else {
        return res.json({success: false, msg: 'Wrong password'});
      }
    });
  });
});


// =============================================================================
router.post('/forgotpassword', (req, res) => {
  if (req.body.email === '') {
    res.json('email required');
    //res.json({success: false, msg: 'email required'});
  }
  console.log(req.body.email);
  User.findOne({
      email: req.body.email
  })
  .then(user => {
    if (user === null) {
      console.log('email not in database');
     
      res.json('email not in db');
      //res.json({success: false, msg: 'email required'});
    } 
    else {
      const token = crypto.randomBytes(20).toString('hex');


          user.resetPasswordToken = token,
          user.resetPasswordExpires=Date.now() + 360000;
          user.save();

              const output = `
              <p>Click <a href="http://localhost:3000/user/reset/${token}/${req.body.email}">here</a> to reset password.</p>
          `;

          let transporter = nodemailer.createTransport({
              service: 'Gmail',
              auth: {
                  user: process.env.GMAIL_USER,
                  pass: process.env.GMAIL_PASS
              },
              tls:{
                  rejectUnauthorized:false
          }
          });

          let mailOptions = {
              from: '"MEAN Demo" <varshasingh8054@gmail.com>',
              to: req.body.email,
              subject: 'Reset Email!',
              text: 'This is Reset Email.',
              html: output
          };

          transporter.sendMail(mailOptions, function(err, response) {
              if (err) {
                console.error('there was an error: ', err);

              } else {
                console.log('here is the res: ', response);
                res.status(200).json('recovery email sent');
              }
            });
    }
  })
  .catch(err => {
      res.send('error: ' + err)
  })
});



router.get('/reset/:token/:email', (req, res, next) => {

  User.findOne({
      email: req.params.email,
  }).then(user => {
      if(Date.now() > user.resetPasswordExpires)
      {
          res.send("Reset Link Has Expired");
      }
      else{
          if(user.resetPasswordToken === req.params.token)
          {
        
            localStorage.setItem('email1',req.params.email);
            res.sendFile(path.join(__dirname, '../reset', 'reset.html'));          
          }
          else{
              res.send("error");
          }
      }
  })
});


router.put('/updatepassword', (req, res, next) => {
  var email1 =  localStorage.getItem('email1');; 
  User.findOne({
      email: email1
  }).then(user => {
    if (user != null) {
      console.log('user exists in db');
      bcrypt.genSalt(10, (err, salt)  =>  {
        bcrypt.hash(req.body.password, salt, (err, hash) => {
            if(err) throw err;
            console.log(hash)
            user.password = hash;
            user.resetPasswordToken = null;
            user.resetPasswordExpires = null;
            res.json({success: true, msg: 'password updated'});
            user.save();
        });
    });
  }
     else {
      console.log('no user exists in db to update');
      res.status(404).json('no user exists in db to update');
    }
  });
});


//=================================================================================

router.get('/profile', passport.authenticate('jwt', {session:false}), (req, res, next) => {
 // res.json({user: req.user});
 res.json({user: req.user});
});




router.post('/addtask', (req,res,next) => {
  console.log("Add Task");
  let newTask = new Task ({
    taskId: req.body.taskId,
    taskName: req.body.taskName,
    taskDesc: req.body.taskDesc,
    taskHandler: req.body.taskHandler,
    taskClientName : req.body.taskClientName
    });

    Task.addTask(newTask,(err,Task)=>
    {
        if(err)
        {
            res.json({success: false, msg: ' Failed to Add Task'});
        }
        else{
            res.json({success: true, msg: ' Added Task'});
        }

    });
  });


  //  router.get('/showtask',function(req,res)
  //  {  
  //     Task.find({},function(err,alltask)
  //  {
  //     if(err)
  //      {
  //          console.log("error");
  //      }
  //      else {
  //       console.log(alltask);
        
  //          res.json({task: JSON.stringify(alltask)});     
  //      } 
  //  }
  //  );     
  //  });


  // router.get('/showtask', function(req, res) {
  //   Task.find({}, function(err, tasks) {
  //     var taskMap = {};
    
  //     tasks.forEach(function(task) {
  //       taskMap[task._id] = task;
        
  //     });
  //    // console.log(taskMap);
  //     res.json({task: taskMap});
     
  //   });
  // });

  router.get('/showtask', function(req, res) {
  Task.getTask(function(err,tasks){
    if(err) throw err;
    res.json(tasks);
   console.log("show working");
  });
});


//UPDATE Task
router.put('/updateTask/:id', function(req, res, next){
  Task.findById(req.params.id, function (err, task) {
      if (!task) {
          console.log('error', 'No task found');
          return res.redirect('/updateTask/:id');
      }
      console.log('task found');
      var taskId = req.body.taskId;
      var taskName = req.body.taskName;
      var taskHandler= req.body.taskHandler;
      var taskClientName = req.body.taskClientName;
      var taskDesc=req.body.taskDesc;

      task.taskId = taskId;
      task.taskClientName = taskClientName;
      task.taskName = taskName;
      task.taskHandler= taskHandler;
      task.taskDesc=taskDesc;

      task.save();
      console.log("updated Task");
      res.redirect('/updateTask/:id');
    });
  });


  // router.get('/showtask', (req, res, next) => {
  //   res.json({task: req.task});
  //  });


//DELETE ROUTE
router.delete("/:id", function(req, res){
    Task.findByIdAndRemove(req.params.id, function(err){
         if(err) 
         {
           console.log("error");
        } else{
         console.log("Task deleted");
         
         return res.json({success: true, msg: 'refresh'});
        //  res.redirect('/showtask');
        
       }
    });


   
  });



 

module.exports= router;