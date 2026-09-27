
import {ConnectDB}  from "./db/index.js";
import { app } from "./app.js";
const PORT = process.env.PORT || 8080;

ConnectDB()
.then(()=>{
    app.listen(PORT ,(err)=>{
        if(err) {
            console.log(err)
            return
        }
        console.log(`the port is running at ${PORT}`)
    })
})
.catch((err)=>{
    console.log(err)
})
