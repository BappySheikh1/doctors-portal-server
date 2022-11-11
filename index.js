const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app =express();
const port = process.env.PORT || 5000

// middleware
app.use(cors())
app.use(express.json())

app.get('/',(req,res)=>{
    res.send('doctors portal server is running')
})

app.listen(port,()=>{
    console.log(`doctors portal is running in port ${port}`);
})