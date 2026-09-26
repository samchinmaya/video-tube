import cors from 'cors';
import cookieParser from "cookie-parser"
import express from 'express';
export const app = express();


app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credentials:true
}))
app.use(express.json({
    limit:"16kb"
}));
app.use(express.urlencoded({
    limit:"16kb"
}))
app.use(express.static("public"))
// routes
import UserRouter from './routes/user.routes.js';
app.use('/user', UserRouter);
app.use(cookieParser());
