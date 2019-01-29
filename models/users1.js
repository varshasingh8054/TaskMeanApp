const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const config = require('../config/database');

const UserSchema = mongoose.Schema({

    name: {
        type: String
    },

    username: {
        type: String,
        unique : true,
        required : true
    },
    email: {
        type: String,
        unique : true,
        required : true
    },
    password :{
        type: String,
        required : true
    } ,
    active: {
        type: Boolean,
        defaultValue: false,
        required : true
    },
    token: String,
    date: {
        type: Date,
        default: Date.now
    },
    resetPasswordToken: String,
    resetPasswordExpires: Date
   
     
});

const User=module.exports=mongoose.model('User',UserSchema);

module.exports.getUserById=function(id,callback)
{
    User.findById(id,callback);
}

module.exports.getUserByUsername=function(username,callback)
{
    const query={username: username};
    User.findOne(query, callback);
}

module.exports.addUser= function(newUser, callback)
{
    bcrypt.genSalt(10,(err,salt) =>{
        bcrypt.hash(newUser.password, salt, (err, hash) =>
        {
            if(err) throw err;
            newUser.password= hash;
            newUser.save(callback);
        });
    });
 
    console.log(newUser.active);
}


module.exports.comparePassword = function(candidatePassword, hash, callback) {
    bcrypt.compare(candidatePassword, hash, (err, isMatch) => {
      if(err) throw err;
      callback(null, isMatch);
    });
  }
  

 
