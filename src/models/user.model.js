import mongoose, { Schema } from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt'


const UserSchema = new Schema({
    username:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true,
        index:true
    },
    email:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true
    },
    fullname:{
        type:String,
        required:true,
    },
    avatar:{
        type:String,
        required:true,
    },
    coverImage: {
        type: String,

    },
    watchHistory: [{
        type: Schema.Types.ObjectId,
        ref: 'Video',
    }],
    password: {
        type: String,
        required: true,
        select: false,
    },
    refreshToken: {
      type: String,
      select:false
  },
    su
}, { timestamps: true })

UserSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});// this is an middleware for checking the password before saving
UserSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password,this.password)
}
UserSchema.methods.generateAccessToken = function () {
  return jwt.sign({
    userId: this._id,//comes from the database
    username: this.username,
    fullname: this.fullname,
    email: this.email,
  },
    process.env.ACCESS_TOKEN_SECRET,
    {expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
  )
}

UserSchema.methods.generateRefreshToken = function () {
  return jwt.sign({
    userId: this._id,
  },
    process.env.REFRESH_TOKEN_SECRET,
    {expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
  )
}



export const User = mongoose.model('User',UserSchema)
