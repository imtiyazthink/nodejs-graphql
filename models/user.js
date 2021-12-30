const mongoose = require('mongoose');
const uniqueValid = require('mongoose-unique-validator')
const Schema = mongoose.Schema;
const userSchema =  new Schema({
    name: {type : String, required:true},
    email: {type : String, required:true, unique:true},
    password: {type: String, required:true, minLength: 6},
    posts:[{type:mongoose.Types.ObjectId, required:true, ref: 'Post'}]
});

userSchema.plugin(uniqueValid);
module.exports = mongoose.model('User', userSchema);