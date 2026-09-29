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
app.use(cookieParser());
// routes
import UserRouter from './routes/user.routes.js';
app.use('/api/v1/user', UserRouter);
import SubscriptionRouter from './routes/subscription.routes.js';
app.use('/api/v1/subscriptions', SubscriptionRouter);

// error handler: must stay after all routes
import fs from 'fs';
app.use((err, req, res, next) => {
    console.log(err);
    // delete uploaded temp files left behind by a failed request
    for (const files of Object.values(req.files || {})) {
        for (const file of files) {
            if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        }
    }
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        statusCode,
        data: null,
        success: false,
        message: err.message || "Internal Server Error",
        errors: err.errors || [],
    });
});
