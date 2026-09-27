import 'dotenv/config'
import mongoose from 'mongoose';
import { DB_NAME } from '../constants.js';

const MONGODB_URI = process.env.MONGODB_URI;
export const ConnectDB = (async()=>{
    try{
        const connectInstance = await mongoose.connect(`${MONGODB_URI}/${DB_NAME}`);
        console.log(`DB is Connect for ${connectInstance.connection.host}`)
    }catch(error){
        console.log(error)
        process.exit(1);
    }
})
