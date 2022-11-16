const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app =express();
const port = process.env.PORT || 5000

// middleware
app.use(cors())
app.use(express.json())



const uri = process.env.MONGODB_ACCESS_TOKEN;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run(){
    try{
        const appointmentOptionCollection=client.db("doctorsPortal").collection('apoinntmentOptions')
        
        app.get('/appointmentOptions',async (req,res)=>{
            const query={}
            const cursor =appointmentOptionCollection.find(query)
            const options =await cursor.toArray()
            res.send(options)
        })

        app.get('/appointmentOptions/:id',async (req,res)=>{
            const id =req.params.id
            const query ={_id: ObjectId(id)}
            const options= await appointmentOptionCollection.findOne(query)
            res.send(options)
        })
    }
    finally{

    }
}
run().catch(err => console.log(err))


app.get('/',(req,res)=>{
    res.send('doctors portal server is running')
})

app.listen(port,()=>{
    console.log(`doctors portal is running in port ${port}`);
})